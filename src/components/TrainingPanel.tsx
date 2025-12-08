'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTrainingData,
  trainAdapter,
  getAdapters,
  activateAdapter,
  Adapter,
  TrainingData,
} from '@/lib/api';

interface TrainingPanelProps {
  customerId: string;
  customerName?: string;
  onStatusChange?: (status: string) => void;
  // Lifted state from parent for persistence across tab switches
  trainingJobId?: string | null;
  trainingStatus?: string | null;
  onTrainingStart?: (jobId: string, customerId: string) => void;
}

export default function TrainingPanel({
  customerId,
  customerName,
  onStatusChange,
  trainingJobId,
  trainingStatus,
  onTrainingStart,
}: TrainingPanelProps) {
  const [trainingData, setTrainingData] = useState<TrainingData | null>(null);
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Training parameters
  const [epochs, setEpochs] = useState(3);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadData = useCallback(async () => {
    if (!customerId) return;

    try {
      const [dataResult, adaptersResult] = await Promise.all([
        getTrainingData(customerId),
        getAdapters(customerId),
      ]);
      setTrainingData(dataResult);
      setAdapters(adaptersResult.adapters);
    } catch (err: any) {
      setError(err.message);
    }
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload adapters when training completes (trainingJobId becomes null)
  const prevJobIdRef = useRef(trainingJobId);
  useEffect(() => {
    if (prevJobIdRef.current && !trainingJobId) {
      // Training just completed, reload adapters
      loadData();
    }
    prevJobIdRef.current = trainingJobId;
  }, [trainingJobId, loadData]);

  const handleTrain = async () => {
    if (!customerId || !trainingData || trainingData.count < 3) return;

    setLoading(true);
    setError(null);

    try {
      const result = await trainAdapter({
        customer_id: customerId,
        epochs,
      });
      // Notify parent to start tracking the job
      onTrainingStart?.(result.job_id, customerId);
      onStatusChange?.(`Training started with ${result.feedback_count} samples`);
    } catch (err: any) {
      setError(err.message);
      onStatusChange?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (adapterId: string) => {
    try {
      const result = await activateAdapter(adapterId);
      onStatusChange?.(result.message);
      loadData(); // Reload to update active status
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-lg mb-4">
        Training {customerName ? `for ${customerName}` : ''}
      </h3>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500">x</button>
        </div>
      )}

      {/* Training Data Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Available feedback:</span>
          <span className="font-medium">
            {trainingData?.count ?? '...'} samples
          </span>
        </div>
        {trainingData && trainingData.count < 3 && (
          <p className="text-xs text-orange-600 mt-2">
            Need at least 3 feedback samples to train
          </p>
        )}
      </div>

      {/* Training Parameters */}
      {trainingData && trainingData.count >= 3 && (
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:underline mb-2"
          >
            {showAdvanced ? 'Hide' : 'Show'} training options
          </button>

          {showAdvanced && (
            <div className="p-3 bg-gray-50 rounded space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Epochs</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={epochs}
                  onChange={(e) => setEpochs(parseInt(e.target.value) || 3)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Training Status */}
      {trainingStatus && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded text-sm">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {trainingStatus}
          </div>
        </div>
      )}

      {/* Train Button */}
      <button
        onClick={handleTrain}
        disabled={loading || !!trainingJobId || !trainingData || trainingData.count < 3}
        className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:bg-gray-400 font-medium mb-4"
      >
        {loading ? 'Starting...' : trainingJobId ? 'Training...' : 'Train LoRA Adapter'}
      </button>

      {/* Adapters List */}
      <div>
        <h4 className="font-medium text-sm text-gray-700 mb-2">Trained Adapters</h4>
        {adapters.length === 0 ? (
          <p className="text-sm text-gray-500">No adapters trained yet</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {adapters.map((adapter) => (
              <div
                key={adapter.id}
                className={`p-3 rounded border ${
                  adapter.is_active
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">
                      Version {adapter.version}
                      {adapter.is_active && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {adapter.training_samples} samples, {adapter.epochs} epochs
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(adapter.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {!adapter.is_active && (
                    <button
                      onClick={() => handleActivate(adapter.id)}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
