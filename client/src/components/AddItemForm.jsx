import React, { useState } from 'react';

export default function AddItemForm({ onAdd }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim() });
    setName('');
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
        <button type="submit" className="btn btn-add" disabled={!name.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add
        </button>
      </div>
    </form>
  );
}
