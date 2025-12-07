'use client';

import * as Diff from 'diff';

interface DiffViewerProps {
  original: string;
  edited: string;
}

export default function DiffViewer({ original, edited }: DiffViewerProps) {
  // Use word-level diff for better granularity
  const diff = Diff.diffWords(original, edited);

  // Group consecutive changes for paragraph detection
  const groupedDiff: { type: 'added' | 'removed' | 'same'; text: string }[] = [];

  diff.forEach((part) => {
    const type = part.added ? 'added' : part.removed ? 'removed' : 'same';
    groupedDiff.push({ type, text: part.value });
  });

  // Check if there are any changes
  const hasChanges = groupedDiff.some(d => d.type !== 'same');

  if (!hasChanges) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
        No changes detected
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 bg-gray-100 border-b text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-200 rounded"></span>
          Removed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-200 rounded"></span>
          Added
        </span>
      </div>

      {/* Diff content */}
      <div className="p-4 bg-white text-sm leading-relaxed whitespace-pre-wrap">
        {groupedDiff.map((part, idx) => {
          if (part.type === 'removed') {
            return (
              <span
                key={idx}
                className="bg-red-100 text-red-800 line-through decoration-red-400"
              >
                {part.text}
              </span>
            );
          }
          if (part.type === 'added') {
            return (
              <span
                key={idx}
                className="bg-green-100 text-green-800"
              >
                {part.text}
              </span>
            );
          }
          return <span key={idx}>{part.text}</span>;
        })}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 border-t text-xs text-gray-500">
        <span className="text-red-600">
          -{groupedDiff.filter(d => d.type === 'removed').reduce((acc, d) => acc + d.text.length, 0)} chars
        </span>
        <span className="text-green-600">
          +{groupedDiff.filter(d => d.type === 'added').reduce((acc, d) => acc + d.text.length, 0)} chars
        </span>
      </div>
    </div>
  );
}
