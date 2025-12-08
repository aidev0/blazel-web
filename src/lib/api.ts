const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Auth token management
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('blazel_token');
}

export function setToken(token: string): void {
  localStorage.setItem('blazel_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('blazel_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Auth functions
export function login(): void {
  window.location.href = `${API_URL}/auth/login`;
}

export function logout(): void {
  clearToken();
  window.location.reload();
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  customer_id?: string;
  is_admin: boolean;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        clearToken();
        return null;
      }
      throw new Error('Failed to get user');
    }
    return response.json();
  } catch {
    return null;
  }
}

// Helper for authenticated requests
function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface GenerateRequest {
  topic: string;
  context?: string;
  variations?: number;
  customer_id?: string; // For marketing managers to generate for specific customer
}

// SSE event types for streaming draft generation
export interface DraftEvent {
  event: 'draft' | 'error' | 'done';
  draft_id?: string;
  text?: string;
  temperature?: number;
  error?: string;
  index?: number;
  total?: number;
}

export interface GeneratedDraft {
  draft_id: string;
  text: string;
  temperature: number;
}

export interface GenerateResponse {
  drafts: GeneratedDraft[];
}

export interface FeedbackRequest {
  draft_id: string;
  original: string;
  edited: string;
  comments: string[];
  rating?: 'like' | 'dislike' | null;
}

export interface FeedbackResponse {
  feedback_id: string;
  message: string;
}

export interface TrainResponse {
  job_id: string;
  status: string;
  message: string;
}

export async function generatePost(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(`${API_URL}/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Generation failed');
  }
  return response.json();
}

// SSE streaming version of draft generation
export function generatePostStream(
  request: GenerateRequest,
  onDraft: (event: DraftEvent) => void,
  onError: (error: string) => void,
  onDone: () => void
): () => void {
  const token = getToken();
  const params = new URLSearchParams({
    topic: request.topic,
    variations: String(request.variations || 1),
  });
  if (request.context) params.set('context', request.context);
  if (request.customer_id) params.set('customer_id', request.customer_id);

  const url = `${API_URL}/generate/stream?${params.toString()}`;

  // Use fetch with ReadableStream for SSE with auth headers
  const controller = new AbortController();

  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/event-stream',
    },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Stream failed' }));
        onError(error.detail || 'Generation failed');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('No response body');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as DraftEvent;
              if (data.event === 'error') {
                onError(data.error || 'Unknown error');
              } else if (data.event === 'done') {
                onDone();
              } else if (data.event === 'draft') {
                onDraft(data);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Stream error');
      }
    });

  // Return cleanup function
  return () => controller.abort();
}

export async function submitFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
  const response = await fetch(`${API_URL}/feedback`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Feedback submission failed');
  }
  return response.json();
}

export async function triggerTraining(): Promise<TrainResponse> {
  const response = await fetch(`${API_URL}/train`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ min_samples: 3 }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Training trigger failed');
  }
  return response.json();
}

export interface Customer {
  customer_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  draft_count: number;
}

export async function getCustomers(): Promise<{ customers: Customer[] }> {
  const response = await fetch(`${API_URL}/customers`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch customers');
  return response.json();
}

export async function getDraftsForCustomer(customerId: string): Promise<{ drafts: Draft[] }> {
  const response = await fetch(`${API_URL}/drafts?customer_id=${encodeURIComponent(customerId)}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch drafts');
  return response.json();
}

export async function getCustomerFeedback(customerId: string): Promise<any> {
  const response = await fetch(`${API_URL}/feedback/${customerId}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch feedback');
  return response.json();
}

export async function checkHealth(): Promise<{ status: string; database: string }> {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}

export interface Draft {
  id: string;
  customer_id: string;
  topic: string;
  text: string;
  created_at: string;
  has_feedback: boolean;
  temperature?: number;
}

export interface DraftDetail {
  id: string;
  topic: string;
  context?: string;
  text: string;
  created_at: string;
  feedback?: {
    edited: string;
    comments: string[];
    rating?: 'like' | 'dislike' | null;
  };
}

export async function getDrafts(): Promise<{ drafts: Draft[] }> {
  const response = await fetch(`${API_URL}/drafts`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch drafts');
  return response.json();
}

export async function getDraft(draftId: string): Promise<DraftDetail> {
  const response = await fetch(`${API_URL}/drafts/${draftId}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch draft');
  return response.json();
}


// ============== Adapter/Training API ==============

export interface Adapter {
  id: string;
  customer_id: string;
  version: number;
  gcs_url: string;
  is_active: boolean;
  epochs: number;
  training_samples: number;
  created_at: string;
}

export interface TrainingData {
  customer_id: string;
  count: number;
  examples: {
    id: string;
    input: string;
    output: string;
    original: string;
    rating?: string;
    created_at: string;
  }[];
}

export interface AdapterTrainRequest {
  customer_id: string;
  epochs?: number;
  learning_rate?: number;
  lora_r?: number;
  lora_alpha?: number;
}

export interface AdapterTrainResponse {
  job_id: string;
  status: string;
  customer_id: string;
  feedback_count: number;
  message: string;
}

export interface TrainingJobStatus {
  job_id: string;
  status: string;
  customer_id: string;
  progress?: string;
  adapter_path?: string;
  error?: string;
}

export async function getTrainingData(customerId: string): Promise<TrainingData> {
  const response = await fetch(`${API_URL}/adapters/training-data/${encodeURIComponent(customerId)}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch training data');
  return response.json();
}

export async function trainAdapter(request: AdapterTrainRequest): Promise<AdapterTrainResponse> {
  const response = await fetch(`${API_URL}/adapters/train`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Training failed to start');
  }
  return response.json();
}

export async function getAdapters(customerId?: string): Promise<{ adapters: Adapter[] }> {
  const url = customerId
    ? `${API_URL}/adapters?customer_id=${encodeURIComponent(customerId)}`
    : `${API_URL}/adapters`;
  const response = await fetch(url, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch adapters');
  return response.json();
}

export async function getActiveAdapter(customerId: string): Promise<{ adapter: Adapter | null }> {
  const response = await fetch(`${API_URL}/adapters/active/${encodeURIComponent(customerId)}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch active adapter');
  return response.json();
}

export async function activateAdapter(adapterId: string): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_URL}/adapters/${adapterId}/activate`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to activate adapter');
  }
  return response.json();
}

export async function getTrainingJobStatus(jobId: string): Promise<TrainingJobStatus> {
  const response = await fetch(`${API_URL}/training-jobs/${jobId}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch job status');
  return response.json();
}
