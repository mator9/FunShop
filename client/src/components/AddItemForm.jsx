import React, { useState } from 'react';

export default function AddItemForm({ onAdd }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), quantity });
    setName('');
    setQuantity('1');
  };

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      <div className="add-item-main">
        <input
          type="text"
          className="item-name-input"
          placeholder="Add an item..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
        <button
          type="button"
          className="btn-icon expand-btn"
          onClick={() => setExpanded(!expanded)}
          title="More options"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <button type="submit" className="btn btn-add" disabled={!name.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add
        </button>
      </div>
      {expanded && (
        <div className="add-item-details">
          <div className="detail-field">
            <label>Qty</label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              maxLength={20}
            />
          </div>
        </div>
      )}
    </form>
  );
}
