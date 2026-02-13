import React, { useState, useEffect, useRef, useCallback } from 'react';

const MAX_CHARS = 500;

/**
 * Parses plain text content into structured blocks:
 * - Lines starting with # are bold headings
 * - Lines starting with - or • are bullet points
 * - Everything else is a regular paragraph
 */
function parseContent(text) {
  if (!text) return [];
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return { type: 'heading', text: line.slice(2), key: i };
    }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return { type: 'bullet', text: line.slice(2), key: i };
    }
    return { type: 'text', text: line, key: i };
  });
}

function ContentPreview({ content }) {
  const blocks = parseContent(content);

  return (
    <div className="note-preview">
      {blocks.map(block => {
        if (block.type === 'heading') {
          return <div key={block.key} className="note-heading">{block.text}</div>;
        }
        if (block.type === 'bullet') {
          return <div key={block.key} className="note-bullet">• {block.text}</div>;
        }
        return <div key={block.key} className="note-text">{block.text || '\u00A0'}</div>;
      })}
    </div>
  );
}

export default function PageEditor({ page, onSave }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const saveTimeout = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setTitle(page.title || '');
    setContent(page.content || '');
    setShowPreview(false);
  }, [page.id]);

  const doSave = useCallback(async (t, c) => {
    setSaving(true);
    try {
      await onSave(page.id, { title: t, content: c });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }, [page.id, onSave]);

  // Auto-save after 800ms of inactivity
  const scheduleAutosave = useCallback((t, c) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => doSave(t, c), 800);
  }, [doSave]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    scheduleAutosave(val, content);
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    if (val.length > MAX_CHARS) return;
    setContent(val);
    scheduleAutosave(title, val);
  };

  const insertPrefix = (prefix) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const before = content.slice(0, start);
    const after = content.slice(start);

    // Find the start of the current line
    const lineStart = before.lastIndexOf('\n') + 1;
    const linePrefix = before.slice(lineStart);

    let newContent;
    if (linePrefix === '' && start === lineStart) {
      // At start of line — insert prefix
      newContent = before + prefix + after;
    } else {
      // Insert on new line
      newContent = before + '\n' + prefix + after;
    }

    if (newContent.length > MAX_CHARS) return;
    setContent(newContent);
    scheduleAutosave(title, newContent);

    setTimeout(() => {
      const cursorPos = before.length + (linePrefix === '' ? prefix.length : prefix.length + 1);
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const remaining = MAX_CHARS - content.length;

  return (
    <div className="page-editor">
      <div className="page-editor-header">
        <input
          type="text"
          className="page-title-input"
          value={title}
          onChange={handleTitleChange}
          placeholder="Page title..."
          maxLength={100}
        />
        <div className="page-editor-actions">
          <span className={`char-count ${remaining < 50 ? 'warn' : ''} ${remaining < 20 ? 'danger' : ''}`}>
            {remaining} chars left
          </span>
          {saving && <span className="save-indicator">Saving...</span>}
          {!saving && <span className="save-indicator saved">✓ Saved</span>}
        </div>
      </div>

      <div className="page-toolbar">
        <button type="button" className="toolbar-btn" onClick={() => insertPrefix('# ')} title="Bold heading">
          <strong>H</strong>
        </button>
        <button type="button" className="toolbar-btn" onClick={() => insertPrefix('- ')} title="Bullet point">
          • List
        </button>
        <div className="toolbar-sep" />
        <button
          type="button"
          className={`toolbar-btn ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? '✏️ Edit' : '👁️ Preview'}
        </button>
      </div>

      {showPreview ? (
        <ContentPreview content={content} />
      ) : (
        <textarea
          ref={textareaRef}
          className="page-textarea"
          value={content}
          onChange={handleContentChange}
          placeholder={"Start writing...\n\nTips:\n# Heading (bold)\n- Bullet point"}
          maxLength={MAX_CHARS}
        />
      )}

      <div className="page-help">
        <span><code># text</code> = <strong>bold heading</strong></span>
        <span><code>- text</code> = • bullet point</span>
      </div>
    </div>
  );
}
