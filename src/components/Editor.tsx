'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useState, useCallback } from 'react';

// Helper to convert plain text to HTML paragraphs
function formatContentToHtml(text: string): string {
  if (!text) return '';
  // Split by double newlines for paragraphs, filter out empty ones
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  // For single newlines within paragraphs, use <br>
  return paragraphs
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export interface InlineComment {
  id: string;
  text: string;
  comment: string;
}

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  inlineComments?: InlineComment[];
  onAddInlineComment?: (selectedText: string, comment: string) => void;
  onRemoveInlineComment?: (id: string) => void;
}

const MenuButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded hover:bg-gray-200 transition-colors ${
      isActive ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

export default function Editor({
  content,
  onChange,
  placeholder = 'Start typing...',
  editable = true,
  inlineComments = [],
  onAddInlineComment,
  onRemoveInlineComment,
}: EditorProps) {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedText, setSelectedText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: 3000,
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'bg-yellow-200 cursor-pointer',
        },
      }),
    ],
    content: content ? formatContentToHtml(content) : '',
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[250px] p-4 text-gray-800 leading-relaxed',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getText()) {
      editor.commands.setContent(formatContentToHtml(content));
    }
  }, [content, editor]);

  const handleAddComment = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);

    if (text.trim()) {
      setSelectedText(text);
      setShowCommentInput(true);
    }
  }, [editor]);

  const submitComment = useCallback(() => {
    if (commentText.trim() && selectedText && onAddInlineComment) {
      // Apply highlight to selected text
      editor?.chain().focus().toggleHighlight().run();

      onAddInlineComment(selectedText, commentText.trim());
      setCommentText('');
      setSelectedText('');
      setShowCommentInput(false);
    }
  }, [commentText, selectedText, onAddInlineComment, editor]);

  const cancelComment = useCallback(() => {
    setCommentText('');
    setSelectedText('');
    setShowCommentInput(false);
  }, []);

  const charCount = editor?.storage.characterCount.characters() || 0;
  const isOverLimit = charCount > 3000;
  const isNearLimit = charCount > 2700;

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-lg bg-white min-h-[300px] animate-pulse" />
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
      {/* Bubble Menu - appears when text is selected */}
      {editable && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="bg-gray-900 rounded-lg shadow-lg flex items-center overflow-hidden"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-3 py-2 text-sm text-white hover:bg-gray-700 ${
              editor.isActive('bold') ? 'bg-gray-700' : ''
            }`}
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-3 py-2 text-sm text-white hover:bg-gray-700 ${
              editor.isActive('italic') ? 'bg-gray-700' : ''
            }`}
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-3 py-2 text-sm text-white hover:bg-gray-700 ${
              editor.isActive('strike') ? 'bg-gray-700' : ''
            }`}
          >
            <s>S</s>
          </button>
          <div className="w-px h-6 bg-gray-600" />
          <button
            onClick={handleAddComment}
            className="px-3 py-2 text-sm text-yellow-400 hover:bg-gray-700 flex items-center gap-1"
            title="Add comment to selection"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
            Comment
          </button>
        </BubbleMenu>
      )}

      {/* Comment Input Modal */}
      {showCommentInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96 max-w-[90vw]">
            <h3 className="font-semibold mb-2">Add Comment</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm">
              <span className="text-gray-500">Selected:</span> "{selectedText}"
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="What feedback do you have for this text?"
              className="w-full border rounded p-2 text-sm mb-3"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelComment}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
            </svg>
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>
            </svg>
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>
            </svg>
          </MenuButton>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
            </svg>
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
            </svg>
          </MenuButton>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
            </svg>
          </MenuButton>

          <div className="flex-1" />

          {/* Character Count */}
          <div className={`text-xs px-2 py-1 rounded ${
            isOverLimit
              ? 'bg-red-100 text-red-700'
              : isNearLimit
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {charCount.toLocaleString()} / 3,000
          </div>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Inline Comments List */}
      {inlineComments.length > 0 && (
        <div className="border-t border-gray-200 bg-yellow-50 p-3">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Inline Comments ({inlineComments.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {inlineComments.map((ic) => (
              <div key={ic.id} className="bg-white rounded border border-yellow-200 p-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="bg-yellow-200 px-1 rounded text-xs">"{ic.text}"</span>
                    <p className="text-gray-700 mt-1">{ic.comment}</p>
                  </div>
                  {onRemoveInlineComment && (
                    <button
                      onClick={() => onRemoveInlineComment(ic.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer hint */}
      {editable && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            Tip: Select text to add inline comments or apply formatting
          </p>
        </div>
      )}
    </div>
  );
}
