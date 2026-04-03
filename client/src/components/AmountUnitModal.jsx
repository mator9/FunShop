import React, { useState } from 'react';

const UNIT_OPTIONS = [
  { value: '', label: 'No unit', icon: '—' },
  { value: 'pcs', label: 'Pieces', icon: '🔢' },
  { value: 'g', label: 'Grams', icon: '⚖️' },
  { value: 'kg', label: 'Kilograms', icon: '⚖️' },
  { value: 'ml', label: 'Milliliters', icon: '🥤' },
  { value: 'l', label: 'Liters', icon: '🥛' },
  { value: 'oz', label: 'Ounces', icon: '⚖️' },
  { value: 'lb', label: 'Pounds', icon: '⚖️' },
  { value: 'cups', label: 'Cups', icon: '🥤' },
  { value: 'tbsp', label: 'Tablespoons', icon: '🥄' },
  { value: 'tsp', label: 'Teaspoons', icon: '🥄' },
  { value: 'pack', label: 'Packs', icon: '📦' },
  { value: 'bottle', label: 'Bottles', icon: '🍾' },
  { value: 'can', label: 'Cans', icon: '🥫' },
  { value: 'bag', label: 'Bags', icon: '🛍️' },
  { value: 'box', label: 'Boxes', icon: '📦' },
  { value: 'bunch', label: 'Bunches', icon: '🌿' },
  { value: 'loaf', label: 'Loaves', icon: '🍞' },
  { value: 'dozen', label: 'Dozen', icon: '🥚' },
];

const QUICK_AMOUNTS = ['1', '2', '3', '4', '5', '6', '100', '200', '250', '500'];

export default function AmountUnitModal({ item, onSave, onClose }) {
  const [quantity, setQuantity] = useState(item?.quantity || '1');
  const [unit, setUnit] = useState(item?.unit || '');
  const [customQty, setCustomQty] = useState('');

  const handleSave = () => {
    onSave({ quantity: quantity || '1', unit });
  };

  const handleQtyClick = (val) => {
    setQuantity(val);
    setCustomQty('');
  };

  const handleCustomQtyChange = (e) => {
    const val = e.target.value;
    setCustomQty(val);
    if (val.trim()) {
      setQuantity(val.trim());
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal amount-unit-modal">
        <div className="modal-header">
          <div>
            <h2>How much?</h2>
            <span className="amount-modal-item-name">{item?.name}</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="amount-preview">
            <span className="amount-preview-value">{quantity || '1'}</span>
            {unit && <span className="amount-preview-unit">{UNIT_OPTIONS.find(u => u.value === unit)?.label || unit}</span>}
            <span className="amount-preview-of">of {item?.name}</span>
          </div>

          <div className="amount-section">
            <label className="amount-section-label">Amount</label>
            <div className="quick-amounts">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`quick-amount-btn ${quantity === val && !customQty ? 'active' : ''}`}
                  onClick={() => handleQtyClick(val)}
                >
                  {val}
                </button>
              ))}
              <input
                type="text"
                className={`custom-amount-input ${customQty ? 'active' : ''}`}
                placeholder="Other"
                value={customQty}
                onChange={handleCustomQtyChange}
                maxLength={10}
              />
            </div>
          </div>

          <div className="amount-section">
            <label className="amount-section-label">Unit</label>
            <div className="unit-grid">
              {UNIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`unit-btn ${unit === opt.value ? 'active' : ''}`}
                  onClick={() => setUnit(opt.value)}
                >
                  <span className="unit-btn-icon">{opt.icon}</span>
                  <span className="unit-btn-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Skip</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
