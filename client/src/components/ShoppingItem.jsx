import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CATEGORY_COLORS = {
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

export default function ShoppingItem({ item, onToggle, onDelete, onUpdate, userName }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleSave = () => {
    if (editName.trim() && editName.trim() !== item.name) {
      onUpdate({ name: editName.trim() });
    }
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`shopping-item ${item.is_found ? 'found' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <button
        className="drag-handle"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="6" r="1" fill="currentColor"/>
          <circle cx="15" cy="6" r="1" fill="currentColor"/>
          <circle cx="9" cy="12" r="1" fill="currentColor"/>
          <circle cx="15" cy="12" r="1" fill="currentColor"/>
          <circle cx="9" cy="18" r="1" fill="currentColor"/>
          <circle cx="15" cy="18" r="1" fill="currentColor"/>
        </svg>
      </button>

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
                  style={{ backgroundColor: `${CATEGORY_COLORS[item.category] || '#6b7280'}20`, color: CATEGORY_COLORS[item.category] || '#6b7280' }}
                >
                  {item.category}
                </span>
              )}
              {!!item.is_found && item.found_by && (
                <span className="item-found-by">found by {item.found_by}</span>
              )}
              {!item.is_found && item.looking_for_by && (
                <span className="item-looking-for">looking for by {item.looking_for_by}</span>
              )}
              {!item.is_found && !item.looking_for_by && item.added_by && (
                <span className="item-added-by">by {item.added_by}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {!item.is_found && (
        <button
          className={`btn-icon btn-looking-for ${item.looking_for_by ? 'active' : ''}`}
          onClick={() => {
            const isCurrentlyLooking = item.looking_for_by === userName;
            onUpdate({ looking_for_by: isCurrentlyLooking ? '' : userName });
          }}
          title={item.looking_for_by === userName ? "Stop looking for this" : "I'm looking for this"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      )}

      <button className="btn-icon btn-delete-item" onClick={onDelete} title="Remove item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
