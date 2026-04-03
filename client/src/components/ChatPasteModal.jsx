import React, { useState, useRef, useCallback } from 'react';
import { parseChatMessages } from '../api';

export default function ChatPasteModal({ onParsed, onClose }) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setError('');
    try {
      const result = await parseChatMessages(text);
      if (!result.items || result.items.length === 0) {
        setError('No items could be extracted from the text. Try pasting a chat with shopping items.');
        setParsing(false);
        return;
      }
      onParsed(result.items);
    } catch (err) {
      setError(err.message || 'Failed to parse messages');
      setParsing(false);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedText = e.dataTransfer.getData('text/plain');
    if (droppedText) {
      setText(droppedText);
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleParse();
    }
  };

  const placeholder = `Paste your chat messages here...

Examples:
[12/03/2025, 14:05] Mom: We need milk, eggs and bread
[12/03/2025, 14:06] Dad: Don't forget coffee
[12/03/2025, 14:07] Mom: And 2kg chicken

Or a simple list:
- Milk
- 2x Eggs
- Bread
- Coffee`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal chat-paste-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Import from Chat
          </h2>
          <button className="btn-icon" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p className="chat-paste-description">
            Paste a message from WhatsApp, Telegram, or any chat — we'll extract the shopping items for you.
          </p>

          {error && <div className="error-banner">{error}</div>}

          <div
            className={`chat-paste-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={10}
              autoFocus
            />
            {!text && (
              <div className="drop-hint">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>or drag & drop text here</span>
              </div>
            )}
          </div>

          <div className="chat-paste-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>Supports WhatsApp, Telegram, plain lists, and free-form text</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleParse}
            disabled={parsing || !text.trim()}
          >
            {parsing ? (
              <>
                <div className="spinner-small"></div>
                Parsing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                Extract Items
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
