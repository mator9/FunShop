import React, { useState } from 'react';

const CATEGORIES = [
  '', 'Produce', 'Dairy', 'Meat', 'Bakery', 'Frozen',
  'Beverages', 'Snacks', 'Canned Goods', 'Household', 'Personal Care', 'Other'
];

export default function ParsedItemsReview({ items: initialItems, onConfirm, onBack, onClose }) {
  const [items, setItems] = useState(
    initialItems.map((item, i) => ({ ...item, id: i, included: true }))
  );
  const [saving, setSaving] = useState(false);

  const toggleItem = (id) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, included: !it.included } : it));
  };

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it));
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const selectAll = () => {
    const allSelected = items.every((it) => it.included);
    setItems((prev) => prev.map((it) => ({ ...it, included: !allSelected })));
  };

  const handleConfirm = async () => {
    const selected = items.filter((it) => it.included);
    if (selected.length === 0) return;
    setSaving(true);
    try {
      await onConfirm(selected.map(({ name, quantity, category }) => ({ name, quantity, category })));
    } catch {
      setSaving(false);
    }
  };

  const includedCount = items.filter((it) => it.included).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal parsed-items-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Review Items ({items.length})
          </h2>
          <button className="btn-icon" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body parsed-items-body">
          <p className="parsed-items-description">
            Review and edit the extracted items. Uncheck any items you don't want to add.
          </p>

          <div className="parsed-items-toolbar">
            <button className="btn-text" onClick={selectAll}>
              {items.every((it) => it.included) ? 'Deselect All' : 'Select All'}
            </button>
            <span className="parsed-items-count">{includedCount} of {items.length} selected</span>
          </div>

          <div className="parsed-items-list">
            {items.map((item) => (
              <div key={item.id} className={`parsed-item ${item.included ? '' : 'excluded'}`}>
                <button
                  className={`check-btn ${item.included ? 'checked' : ''}`}
                  onClick={() => toggleItem(item.id)}
                  title={item.included ? 'Exclude item' : 'Include item'}
                >
                  {item.included ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <div className="empty-check"></div>
                  )}
                </button>

                <div className="parsed-item-fields">
                  <input
                    type="text"
                    className="parsed-item-name"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    disabled={!item.included}
                  />
                  <div className="parsed-item-meta">
                    <input
                      type="text"
                      className="parsed-item-qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      disabled={!item.included}
                      placeholder="Qty"
                    />
                    <select
                      className="parsed-item-category"
                      value={item.category}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      disabled={!item.included}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c || 'No category'}</option>
                      ))}
                    </select>
                    {item.sender && (
                      <span className="parsed-item-sender" title={`From: ${item.sender}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        {item.sender}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  className="btn-icon btn-delete-item"
                  onClick={() => removeItem(item.id)}
                  title="Remove item"
                  style={{ opacity: 1 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="parsed-items-empty">
              All items have been removed. Go back to re-parse.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={saving || includedCount === 0}
          >
            {saving ? (
              <>
                <div className="spinner-small"></div>
                Adding...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add {includedCount} Item{includedCount !== 1 ? 's' : ''} to List
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
