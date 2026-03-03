import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ShoppingItem({ item, onToggle, onDelete, onUpdate }) {
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
              {!!item.is_found && item.found_by && (
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
