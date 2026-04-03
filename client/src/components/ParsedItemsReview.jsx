import React, { useState } from 'react';

export default function ParsedItemsReview({ items: initialItems, onConfirm, onBack }) {
  const [items, setItems] = useState(
    initialItems.map((item, i) => ({ ...item, _key: i }))
  );

  const updateItem = (key, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item._key === key ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((item) => item._key !== key));
  };

  const handleConfirm = () => {
    const cleaned = items
      .filter((item) => item.name.trim())
      .map(({ _key, ...rest }) => rest);
    onConfirm(cleaned);
  };

  return (
    <div className="parsed-items-review">
      <p className="review-description">
        {items.length} item{items.length !== 1 ? 's' : ''} found. Edit or remove items before adding to your list.
      </p>

      <div className="review-items-list">
        {items.map((item) => (
          <div key={item._key} className="review-item-row">
            <div className="review-item-fields">
              <input
                type="text"
                className="review-name-input"
                value={item.name}
                onChange={(e) => updateItem(item._key, 'name', e.target.value)}
                placeholder="Item name"
              />
              <input
                type="text"
                className="review-qty-input"
                value={item.quantity}
                onChange={(e) => updateItem(item._key, 'quantity', e.target.value)}
                placeholder="Qty"
              />
            </div>
            <button
              className="btn-icon btn-remove-item"
              onClick={() => removeItem(item._key)}
              title="Remove item"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="review-empty">
          All items removed. Go back to paste different text.
        </div>
      )}

      <div className="review-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={items.filter((i) => i.name.trim()).length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Add {items.filter((i) => i.name.trim()).length} Item{items.filter((i) => i.name.trim()).length !== 1 ? 's' : ''} to List
        </button>
      </div>
    </div>
  );
}
