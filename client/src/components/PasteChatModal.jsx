import React, { useState, useRef } from 'react';
import { parseChatText } from '../api';
import ParsedItemsReview from './ParsedItemsReview';

export default function PasteChatModal({ onAdd, onClose }) {
  const [text, setText] = useState('');
  const [parsedItems, setParsedItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await parseChatText(text);
      if (!result.items || result.items.length === 0) {
        setError('No items could be extracted from this text. Try a different format or check the content.');
        return;
      }
      setParsedItems(result.items);
    } catch (err) {
      setError(err.message || 'Failed to parse chat text');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedText = e.dataTransfer.getData('text/plain');
    if (droppedText) {
      setText(droppedText);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleConfirm = (items) => {
    onAdd(items);
    onClose();
  };

  const handleBack = () => {
    setParsedItems(null);
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal paste-chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{parsedItems ? 'Review Items' : 'Paste from Chat'}</h2>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {parsedItems ? (
            <ParsedItemsReview
              items={parsedItems}
              onConfirm={handleConfirm}
              onBack={handleBack}
            />
          ) : (
            <>
              <p className="paste-chat-description">
                Paste or drop a block of chat messages (WhatsApp, Telegram, or a plain list) and we'll extract the items for you.
              </p>

              <div
                className={`paste-drop-zone ${dragging ? 'drag-active' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    '[10/03/2026, 14:32] Alice: We need milk\n' +
                    '[10/03/2026, 14:33] Bob: Also eggs and bread\n' +
                    '[10/03/2026, 14:35] Alice: 2 kg tomatoes\n\n' +
                    '...or just paste a plain list:\n' +
                    '- Milk\n- Eggs\n- Bread'
                  }
                  rows={8}
                />
                {dragging && (
                  <div className="drop-overlay">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Drop text here</span>
                  </div>
                )}
              </div>

              {error && <div className="paste-chat-error">{error}</div>}

              <div className="paste-chat-actions">
                <button className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleParse}
                  disabled={!text.trim() || loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Parsing...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 7 4 4 20 4 20 7" />
                        <line x1="9" y1="20" x2="15" y2="20" />
                        <line x1="12" y1="4" x2="12" y2="20" />
                      </svg>
                      Parse Items
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
