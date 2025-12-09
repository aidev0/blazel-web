'use client';

import { useState, useEffect, useCallback } from 'react';
import Editor, { InlineComment } from '@/components/Editor';
import DiffViewer from '@/components/DiffViewer';
import Landing from '@/components/Landing';
import TrainingPanel from '@/components/TrainingPanel';
import {
  generatePost,
  submitFeedback,
  checkHealth,
  getDrafts,
  getDraftsForCustomer,
  getDraft,
  deleteDraft,
  getCustomers,
  setToken,
  getCurrentUser,
  login,
  logout,
  getTrainingJobStatus,
  getAdapters,
  activateAdapter,
  deactivateAdapter,
  User,
  Draft,
  DraftDetail,
  Customer,
  Adapter,
} from '@/lib/api';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Customers (for admins)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Drafts list
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  // Selected draft for editing
  const [selectedDraft, setSelectedDraft] = useState<DraftDetail | null>(null);
  const [editedText, setEditedText] = useState('');
  const [comments, setComments] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const [inlineComments, setInlineComments] = useState<InlineComment[]>([]);
  const [rating, setRating] = useState<'like' | 'dislike' | null>(null);

  // New draft form
  const [showNewDraft, setShowNewDraft] = useState(false);
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [variationsInput, setVariationsInput] = useState('1');
  const variations = Math.max(1, Math.min(10, parseInt(variationsInput) || 1));

  // UI state
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [apiHealth, setApiHealth] = useState<string>('checking...');
  const [showDiff, setShowDiff] = useState(true);
  const [activeTab, setActiveTab] = useState<'drafts' | 'training' | 'adapters'>('drafts');

  // Training job state (lifted from TrainingPanel for persistence)
  const [trainingJobId, setTrainingJobId] = useState<string | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);
  const [trainingCustomerId, setTrainingCustomerId] = useState<string | null>(null);

  // Adapters state
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [adaptersLoading, setAdaptersLoading] = useState(false);

  // Handle auth callback and check auth state
  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const error = params.get('error');

      if (token) {
        setToken(token);
        window.history.replaceState({}, '', window.location.pathname);
      }

      if (error) {
        setStatus(`Login error: ${error}`);
        window.history.replaceState({}, '', window.location.pathname);
      }

      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setAuthLoading(false);
    };

    handleAuth();
  }, []);

  // Load drafts and customers when user changes
  useEffect(() => {
    if (user) {
      // Admins load customers first, then drafts will load when customer is selected
      if (user.is_admin) {
        loadCustomers();
      } else {
        // Regular users just load their own drafts
        loadDrafts();
      }
    }
  }, [user]);

  // When customer selection changes (for admins), load that customer's drafts
  useEffect(() => {
    if (user?.is_admin && selectedCustomerId) {
      loadDraftsForCustomer(selectedCustomerId);
    }
  }, [selectedCustomerId, user?.is_admin]);

  const loadCustomers = async () => {
    try {
      const response = await getCustomers();
      setCustomers(response.customers);
      // Auto-select first customer if available
      if (response.customers.length > 0) {
        setSelectedCustomerId(response.customers[0].customer_id);
      }
    } catch (error: any) {
      setStatus(`Error loading customers: ${error.message}`);
    }
  };

  const loadDraftsForCustomer = async (customerId: string) => {
    setDraftsLoading(true);
    try {
      const response = await getDraftsForCustomer(customerId);
      setDrafts(response.drafts);
    } catch (error: any) {
      setStatus(`Error loading drafts: ${error.message}`);
    } finally {
      setDraftsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth()
      .then((h) => setApiHealth(h.status === 'healthy' ? 'Connected' : 'Error'))
      .catch(() => setApiHealth('Disconnected'));
  }, []);

  // Load adapters when Adapters tab is selected or customer changes
  useEffect(() => {
    const loadAdapters = async () => {
      const customerId = user?.is_admin ? selectedCustomerId : user?.customer_id;
      if (!customerId || activeTab !== 'adapters') return;

      setAdaptersLoading(true);
      try {
        const res = await getAdapters(customerId);
        setAdapters(res.adapters);
      } catch (err: any) {
        setStatus(`Error loading adapters: ${err.message}`);
      } finally {
        setAdaptersLoading(false);
      }
    };

    loadAdapters();
  }, [activeTab, selectedCustomerId, user?.is_admin, user?.customer_id]);

  // Poll for training job status (persists across tab switches)
  useEffect(() => {
    if (!trainingJobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await getTrainingJobStatus(trainingJobId);
        setTrainingStatus(status.progress || status.status);

        if (status.status === 'completed') {
          clearInterval(interval);
          setTrainingJobId(null);
          setTrainingStatus(null);
          setTrainingCustomerId(null);
          setStatus('Training completed! Adapter saved.');
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setTrainingJobId(null);
          setTrainingStatus(null);
          setTrainingCustomerId(null);
          setStatus(`Training failed: ${status.error || 'Unknown error'}`);
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [trainingJobId]);

  const loadDrafts = async () => {
    setDraftsLoading(true);
    try {
      const response = await getDrafts();
      setDrafts(response.drafts);
    } catch (error: any) {
      setStatus(`Error loading drafts: ${error.message}`);
    } finally {
      setDraftsLoading(false);
    }
  };

  const handleSelectDraft = async (draftId: string) => {
    setLoading(true);
    try {
      const draft = await getDraft(draftId);
      setSelectedDraft(draft);
      setEditedText(draft.feedback?.edited || draft.text);
      setComments(draft.feedback?.comments || []);
      setNewComment('');
      setInlineComments([]);
      // Load existing rating - handle both string and null cases
      const existingRating = draft.feedback?.rating;
      setRating(existingRating === 'like' || existingRating === 'dislike' ? existingRating : null);
      // Show diff if there's existing feedback with changes
      setShowDiff(!!draft.feedback && draft.feedback.edited !== draft.text);
      setShowNewDraft(false);
    } catch (error: any) {
      setStatus(`Error loading draft: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInlineComment = useCallback((selectedText: string, comment: string) => {
    const newComment: InlineComment = {
      id: `ic-${Date.now()}`,
      text: selectedText,
      comment,
    };
    setInlineComments(prev => [...prev, newComment]);
  }, []);

  const handleRemoveInlineComment = useCallback((id: string) => {
    setInlineComments(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setStatus('Please enter a topic');
      return;
    }

    // For admins, require a customer selection
    if (user?.is_admin && !selectedCustomerId) {
      setStatus('Please select a customer first');
      return;
    }

    setLoading(true);
    setStatus(`Generating ${variations} variation${variations > 1 ? 's' : ''}...`);

    // Use selected customer for admins, otherwise use user's own customer_id
    const targetCustomerId = user?.is_admin ? selectedCustomerId : user?.customer_id;

    try {
      const response = await generatePost({
        topic,
        context: context || undefined,
        variations,
        customer_id: targetCustomerId || undefined,
      });

      // Add all drafts to the list
      const newDrafts: Draft[] = response.drafts.map((d) => ({
        id: d.draft_id,
        customer_id: targetCustomerId || '',
        topic,
        text: d.text,
        created_at: new Date().toISOString(),
        has_feedback: false,
        temperature: d.temperature,
      }));

      setDrafts((prev) => [...newDrafts, ...prev]);
      setTopic('');
      setContext('');
      setVariationsInput('1');
      setShowNewDraft(false);
      setStatus(`Generated ${response.drafts.length} draft${response.drafts.length > 1 ? 's' : ''}!`);

      // Select the first draft
      if (response.drafts.length > 0) {
        await handleSelectDraft(response.drafts[0].draft_id);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      setComments([...comments, newComment.trim()]);
      setNewComment('');
    }
  };

  const handleRemoveComment = (index: number) => {
    setComments(comments.filter((_, i) => i !== index));
  };

  const handleApprove = async () => {
    if (!selectedDraft) return;

    const hasChanges = editedText !== selectedDraft.text;
    const hasComments = comments.length > 0 || inlineComments.length > 0;
    const hasRating = rating !== null;

    if (!hasChanges && !hasComments && !hasRating) {
      setStatus('Please provide feedback: edit text, add comments, or rate the draft.');
      return;
    }

    setLoading(true);
    setStatus('Submitting feedback...');

    // Combine general comments with inline comments
    const allComments = [
      ...comments,
      ...inlineComments.map(ic => `[On "${ic.text}"]: ${ic.comment}`)
    ];

    try {
      await submitFeedback({
        draft_id: selectedDraft.id,
        original: selectedDraft.text,
        edited: editedText,
        comments: allComments,
        rating,
      });

      setStatus('Feedback submitted!');
      setShowDiff(true);
      await loadDrafts();
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDraft = () => {
    setSelectedDraft(null);
    setEditedText('');
    setComments([]);
    setInlineComments([]);
    setRating(null);
    setShowDiff(false);
    setStatus('');
  };

  const handleDeleteDraft = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the draft when clicking delete

    if (!confirm('Are you sure you want to delete this draft? This will also delete any associated feedback.')) {
      return;
    }

    try {
      const result = await deleteDraft(draftId);
      setStatus(`Draft deleted${result.feedback_deleted > 0 ? ` (${result.feedback_deleted} feedback removed)` : ''}`);

      // Remove from local state
      setDrafts(prev => prev.filter(d => d.id !== draftId));

      // Close if this was the selected draft
      if (selectedDraft?.id === draftId) {
        handleCloseDraft();
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </main>
    );
  }

  // Not authenticated - show landing page
  if (!user) {
    return <Landing onLogin={login} error={status || undefined} />;
  }

  // Authenticated - show app
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Blazel</h1>
            <p className="text-gray-600">LinkedIn Post Generator with Feedback Loop</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-700 mb-1">
              {user.first_name} {user.last_name} ({user.email})
              {user.is_admin && (
                <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                  Admin
                </span>
              )}
              <button
                onClick={logout}
                className="ml-3 text-blue-600 hover:underline"
              >
                Logout
              </button>
            </div>
            <div className={`text-sm ${apiHealth === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
              API: {apiHealth}
            </div>
          </div>
        </div>

        {/* Persistent Training Status Banner */}
        {trainingJobId && (
          <div className="mb-4 p-3 bg-purple-100 border border-purple-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-purple-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <div className="font-medium text-purple-800">Training in Progress</div>
                <div className="text-sm text-purple-600">{trainingStatus || 'Starting...'}</div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('training')}
              className="text-sm text-purple-700 hover:text-purple-900 underline"
            >
              View Details
            </button>
          </div>
        )}

        {status && (
          <div
            className={`mb-4 p-3 rounded text-sm ${
              status.includes('Error')
                ? 'bg-red-100 text-red-700'
                : status.includes('submitted') || status.includes('generated') || status.includes('completed')
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {status}
          </div>
        )}

        {/* Tabs - visible to all users */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('drafts')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'drafts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Drafts
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'training'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Training
            </button>
            <button
              onClick={() => setActiveTab('adapters')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'adapters'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Adapters
            </button>
          </nav>
        </div>

        {/* Training Tab Content */}
        {activeTab === 'training' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Selector (admin) or own training (user) */}
            {user.is_admin ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Select Customer</h2>
                {customers.length === 0 ? (
                  <p className="text-gray-500">No customers found</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {customers.map((customer) => (
                      <div
                        key={customer.customer_id}
                        onClick={() => setSelectedCustomerId(customer.customer_id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedCustomerId === customer.customer_id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">
                          {customer.first_name || customer.last_name
                            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                            : 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{customer.email || 'No email'}</div>
                        <div className="text-xs text-gray-400 mt-1">{customer.draft_count} drafts</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Training Panel */}
            {(user.is_admin ? selectedCustomerId : user.customer_id) ? (
              <TrainingPanel
                customerId={user.is_admin ? selectedCustomerId! : user.customer_id!}
                customerName={user.is_admin
                  ? (customers.find(c => c.customer_id === selectedCustomerId)?.first_name ||
                     customers.find(c => c.customer_id === selectedCustomerId)?.email)
                  : user.first_name}
                onStatusChange={setStatus}
                trainingJobId={trainingJobId}
                trainingStatus={trainingStatus}
                onTrainingStart={(jobId, custId) => {
                  setTrainingJobId(jobId);
                  setTrainingStatus('Training started...');
                  setTrainingCustomerId(custId);
                }}
              />
            ) : (
              <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
                <p className="text-gray-500">
                  {user.is_admin ? 'Select a customer to view training options' : 'Loading...'}
                </p>
              </div>
            )}
          </div>
        ) : activeTab === 'adapters' ? (
          /* Adapters Tab Content */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Selector (admin) or show own adapters (user) */}
            {user.is_admin ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Select Customer</h2>
                {customers.length === 0 ? (
                  <p className="text-gray-500">No customers found</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {customers.map((customer) => (
                      <div
                        key={customer.customer_id}
                        onClick={() => setSelectedCustomerId(customer.customer_id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedCustomerId === customer.customer_id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">
                          {customer.first_name || customer.last_name
                            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                            : 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{customer.email || 'No email'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Adapters List */}
            <div className={`bg-white rounded-lg shadow p-6 ${!user.is_admin ? 'lg:col-span-2' : ''}`}>
              <h2 className="text-lg font-semibold mb-2">
                {user.is_admin ? 'Customer Adapters' : 'Your Adapters'}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Select which adapter to use for inference, or choose "None" to use the base model only.
              </p>
              {adaptersLoading ? (
                <p className="text-gray-500">Loading adapters...</p>
              ) : adapters.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No adapters trained yet</p>
                  <p className="text-sm text-gray-400">
                    Go to the Training tab to train a LoRA adapter from your feedback
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Adapter options - sorted by version descending (newest first) */}
                  {[...adapters].sort((a, b) => b.version - a.version).map((adapter) => (
                    <div
                      key={adapter.id}
                      onClick={async () => {
                        if (!adapter.is_active) {
                          try {
                            const result = await activateAdapter(adapter.id);
                            setStatus(result.message);
                            // Reload adapters
                            const customerId = user.is_admin ? selectedCustomerId : user.customer_id;
                            if (customerId) {
                              const res = await getAdapters(customerId);
                              setAdapters(res.adapters);
                            }
                          } catch (err: any) {
                            setStatus(`Error: ${err.message}`);
                          }
                        }
                      }}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        adapter.is_active
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          adapter.is_active
                            ? 'border-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {adapter.is_active && (
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            Version {adapter.version}
                          </div>
                          <div className="text-sm text-gray-500">
                            {adapter.training_samples} samples, {adapter.epochs} epochs
                            <span className="mx-2">•</span>
                            {new Date(adapter.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* None option - at the bottom */}
                  <div
                    onClick={async () => {
                      const activeAdapter = adapters.find(a => a.is_active);
                      if (activeAdapter) {
                        try {
                          const result = await deactivateAdapter(activeAdapter.id);
                          setStatus(result.message);
                          // Reload adapters
                          const customerId = user.is_admin ? selectedCustomerId : user.customer_id;
                          if (customerId) {
                            const res = await getAdapters(customerId);
                            setAdapters(res.adapters);
                          }
                        } catch (err: any) {
                          setStatus(`Error: ${err.message}`);
                        }
                      }
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      !adapters.some(a => a.is_active)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        !adapters.some(a => a.is_active)
                          ? 'border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {!adapters.some(a => a.is_active) && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">None (Base Model)</div>
                        <div className="text-sm text-gray-500">Use the default model without any LoRA adapter</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
        <div className="flex gap-6">
          {/* Left Panel - Drafts List */}
          <div className="w-80 flex-shrink-0">
            {/* Customer Selector for Admins */}
            {user.is_admin && customers.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer
                </label>
                <select
                  value={selectedCustomerId || ''}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                      {customer.email || customer.first_name
                        ? `${customer.first_name || ''} ${customer.last_name || ''} (${customer.email || 'No email'})`
                        : customer.customer_id.substring(0, 20) + '...'}
                      {' '}({customer.draft_count} drafts)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">
                  {user.is_admin ? 'Customer Drafts' : 'Your Drafts'}
                </h2>
                <button
                  onClick={() => { setShowNewDraft(true); setSelectedDraft(null); }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  + New
                </button>
              </div>

              {draftsLoading ? (
                <div className="text-gray-500 text-sm">Loading drafts...</div>
              ) : drafts.length === 0 ? (
                <div className="text-gray-500 text-sm">No drafts yet. Create your first one!</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {drafts.map((draft) => {
                    // Find customer name for display (for admins)
                    const customer = customers.find(c => c.customer_id === draft.customer_id);
                    const customerLabel = customer
                      ? (customer.first_name || customer.email || draft.customer_id.substring(0, 12) + '...')
                      : draft.customer_id.substring(0, 12) + '...';

                    return (
                      <div
                        key={draft.id}
                        onClick={() => handleSelectDraft(draft.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedDraft?.id === draft.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-800 truncate">
                          {draft.topic}
                        </div>
                        {user?.is_admin && (
                          <div className="text-xs text-blue-600 mt-1">
                            Customer: {customerLabel}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {draft.text.substring(0, 100)}...
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {new Date(draft.created_at).toLocaleDateString()}
                            </span>
                            {draft.temperature && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                T:{draft.temperature.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {draft.has_feedback && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                Reviewed
                              </span>
                            )}
                            <button
                              onClick={(e) => handleDeleteDraft(draft.id, e)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Delete draft"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Panel - Editor or New Draft Form */}
          <div className="flex-1">
            {showNewDraft ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">New Draft</h2>
                  <button
                    onClick={() => setShowNewDraft(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>

                {/* Customer selector for admins */}
                {user?.is_admin && customers.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Create for Customer *
                    </label>
                    <select
                      value={selectedCustomerId || ''}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      {customers.map((customer) => (
                        <option key={customer.customer_id} value={customer.customer_id}>
                          {customer.email || customer.first_name
                            ? `${customer.first_name || ''} ${customer.last_name || ''} (${customer.email || 'No email'})`
                            : customer.customer_id.substring(0, 20) + '...'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select which customer this draft is for
                    </p>
                  </div>
                )}

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-4"
                  placeholder="e.g., Leadership lessons from my startup journey"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Context (optional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-4"
                  rows={4}
                  placeholder="Additional context or key points to include..."
                />

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variations
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={variationsInput}
                  onChange={(e) => setVariationsInput(e.target.value)}
                  onBlur={() => setVariationsInput(String(variations))}
                  className="w-full border rounded px-3 py-2 mb-2"
                />
                <p className="text-xs text-gray-500 mb-4">
                  1-10 variations with different temperatures (0.3 conservative → 1.0 creative)
                </p>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !topic.trim()}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {loading
                    ? `Generating ${variations} variation${variations > 1 ? 's' : ''}...`
                    : `Generate ${variations} Draft${variations > 1 ? 's' : ''}`}
                </button>
              </div>
            ) : selectedDraft ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedDraft.topic}</h2>
                    <span className="text-sm text-gray-500">
                      {new Date(selectedDraft.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={handleCloseDraft}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Edit the post
                  </label>
                  <Editor
                    content={editedText}
                    onChange={setEditedText}
                    placeholder="Edit the generated post here..."
                    inlineComments={inlineComments}
                    onAddInlineComment={handleAddInlineComment}
                    onRemoveInlineComment={handleRemoveInlineComment}
                  />
                </div>

                {/* Show diff if there are changes */}
                {selectedDraft.text !== editedText && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className="text-sm text-blue-600 hover:underline mb-2"
                    >
                      {showDiff ? 'Hide Changes' : 'Show Changes'}
                    </button>
                    {showDiff && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <DiffViewer original={selectedDraft.text} edited={editedText} />
                      </div>
                    )}
                  </div>
                )}

                {/* Comments */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback Comments
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                      className="flex-1 border rounded px-3 py-2 text-sm"
                      placeholder="e.g., Make it more conversational"
                    />
                    <button
                      onClick={handleAddComment}
                      className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {comments.map((comment, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-sm"
                      >
                        <span>{comment}</span>
                        <button
                          onClick={() => handleRemoveComment(idx)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rating Buttons */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate this draft
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRating(rating === 'like' ? null : 'like')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
                        rating === 'like'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <svg className="w-6 h-6" fill={rating === 'like' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <span className="font-medium">Like</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRating(rating === 'dislike' ? null : 'dislike')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
                        rating === 'dislike'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <svg className="w-6 h-6" fill={rating === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                      <span className="font-medium">Dislike</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                >
                  {loading ? 'Submitting...' : selectedDraft.feedback ? 'Update Feedback' : 'Submit Feedback'}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Select a draft or create a new one</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Click on a draft from the list or create a new one to get started
                </p>
                <button
                  onClick={() => setShowNewDraft(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create New Draft
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </main>
  );
}
