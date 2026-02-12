import React, { useState, useRef } from 'react';
import { timeAgo } from '../utils';

export default function CommentSection({ comments, taskId, onAddComment, onDeleteComment }) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const inputRef = useRef(null);

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      await onAddComment(taskId, trimmed);
      setText('');
      inputRef.current?.focus();
    } catch (err) {
      alert(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <div className="comments-section">
      <h3>💬 Comments</h3>
      <div className="comment-list">
        {comments.length === 0 ? (
          <div className="no-comments">No comments yet</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="comment-item">
              <div>
                <div className="comment-text">{c.text}</div>
                <div className="comment-time">{timeAgo(c.createdAt)}</div>
              </div>
              <button
                className="comment-delete"
                onClick={() => onDeleteComment(c.id, taskId)}
                title="Delete comment"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>
      <div className="comment-input-row">
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={posting}
        />
        <button
          type="button"
          className="btn btn-small"
          onClick={handlePost}
          disabled={posting}
        >
          {posting ? '...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
