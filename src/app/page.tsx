'use client';

import { useState, useEffect, useCallback } from 'react';
import Editor, { InlineComment } from '@/components/Editor';
import DiffViewer from '@/components/DiffViewer';
import Landing from '@/components/Landing';
import {
  generatePost,
  submitFeedback,
  triggerTraining,
  checkHealth,
  getDrafts,
  getDraft,
  GenerateResponse,
  setToken,
  getCurrentUser,
  login,
  logout,
  User,
  Draft,
  DraftDetail,
} from '@/lib/api';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
  const [showDiff, setShowDiff] = useState(false);

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

  // Load drafts when user is authenticated
  useEffect(() => {
    if (user) {
      loadDrafts();
    }
  }, [user]);

  useEffect(() => {
    checkHealth()
      .then((h) => setApiHealth(h.status === 'healthy' ? 'Connected' : 'Error'))
      .catch(() => setApiHealth('Disconnected'));
  }, []);

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

    setLoading(true);
    setStatus(`Generating ${variations} variation${variations > 1 ? 's' : ''}...`);

    try {
      const response: GenerateResponse = await generatePost({
        topic,
        context: context || undefined,
        variations,
      });

      // Reload drafts and select the first one
      await loadDrafts();
      if (response.drafts.length > 0) {
        await handleSelectDraft(response.drafts[0].draft_id);
      }

      setTopic('');
      setContext('');
      setVariationsInput('1');
      setShowNewDraft(false);
      setStatus(`Generated ${response.drafts.length} draft${response.drafts.length > 1 ? 's' : ''}!`);
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

  const handleTrain = async () => {
    setLoading(true);
    setStatus('Triggering training...');

    try {
      const response = await triggerTraining();
      setStatus(`Training ${response.status}: ${response.message}`);
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

  const feedbackCount = drafts.filter(d => d.has_feedback).length;

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

        {status && (
          <div
            className={`mb-4 p-3 rounded text-sm ${
              status.includes('Error')
                ? 'bg-red-100 text-red-700'
                : status.includes('submitted') || status.includes('generated')
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {status}
          </div>
        )}

        <div className="flex gap-6">
          {/* Left Panel - Drafts List */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Your Drafts</h2>
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
                  {drafts.map((draft) => (
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
                        {draft.has_feedback && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Training Panel */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-3">Model Training</h2>
              <p className="text-xs text-gray-500 mb-3">
                Train your personalized model after reviewing drafts
              </p>
              <button
                onClick={handleTrain}
                disabled={loading || feedbackCount < 3}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                Train Model ({feedbackCount}/3 reviews)
              </button>
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
                  {loading ? `Generating ${variations} variation${variations > 1 ? 's' : ''}...` : `Generate ${variations} Draft${variations > 1 ? 's' : ''}`}
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
      </div>
    </main>
  );
}
