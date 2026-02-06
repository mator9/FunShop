import React, { useState } from 'react';

export default function ShoppingItem({ item, onToggle, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);

  const handleSave = () => {
    if (editName.trim() && editName.trim() !== item.name) {
      onUpdate({ name: editName.trim() });
    }
    setEditing(false);
  };

  const categoryColors = {
    'Produce': '#22c55e',
    'Dairy': '#3b82f6',
    'Meat': '#ef4444',
    'Bakery': '#f59e0b',
    'Frozen': '#06b6d4',
    'Beverages': '#8b5cf6',
    'Snacks': '#f97316',
    'Canned Goods': '#64748b',
    'Household': '#ec4899',
    'Personal Care': '#14b8a6',
    'Other': '#6b7280',
  };

  return (
    <div className={`shopping-item ${item.is_found ? 'found' : ''}`}>
      <button
        className={`check-btn ${item.is_found ? 'checked' : ''}`}
        onClick={onToggle}
        title={item.is_found ? 'Mark as not found' : 'Mark as found'}
      >
        {item.is_found ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <div className="empty-check"></div>
        )}
      </button>

      <div className="item-content">
        {editing ? (
          <input
            type="text"
            className="edit-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            onBlur={handleSave}
            autoFocus
            maxLength={200}
          />
        ) : (
          <div className="item-info" onDoubleClick={() => { setEditName(item.name); setEditing(true); }}>
            <span className="item-name">{item.name}</span>
            <div className="item-meta">
              {item.quantity && item.quantity !== '1' && (
                <span className="item-quantity">x{item.quantity}</span>
              )}
              {item.category && (
                <span
                  className="item-category"
                  style={{ backgroundColor: `${categoryColors[item.category] || '#6b7280'}20`, color: categoryColors[item.category] || '#6b7280' }}
                >
                  {item.category}
                </span>
              )}
              {item.is_found && item.found_by && (
                <span className="item-found-by">found by {item.found_by}</span>
              )}
              {!item.is_found && item.added_by && (
                <span className="item-added-by">by {item.added_by}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <button className="btn-icon btn-delete-item" onClick={onDelete} title="Remove item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
