import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const UNIT_LABELS = {
  'pcs': 'pcs', 'g': 'g', 'kg': 'kg', 'ml': 'ml', 'l': 'l',
  'oz': 'oz', 'lb': 'lb', 'cups': 'cups', 'tbsp': 'tbsp', 'tsp': 'tsp',
  'pack': 'pack', 'bottle': 'bottle', 'can': 'can', 'bag': 'bag',
  'box': 'box', 'bunch': 'bunch', 'loaf': 'loaf', 'dozen': 'dozen',
};

function formatQuantityUnit(quantity, unit) {
  if (!quantity || quantity === '1') {
    if (!unit) return null;
    return `1 ${UNIT_LABELS[unit] || unit}`;
  }
  if (!unit) return `x${quantity}`;
  return `${quantity} ${UNIT_LABELS[unit] || unit}`;
}

const SWIPE_THRESHOLD = 80;

export default function ShoppingItem({
  item, onToggle, onDelete, onUpdate, onEditAmountUnit, userName,
  onSwipeRight, onSwipeLeft, reorderMode, onLongPress,
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const touchStartRef = useRef(null);
  const directionRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const wrapperRef = useRef(null);

  const wobbleDelay = useMemo(() => Math.random() * -0.3, []);

  useEffect(() => {
    return () => clearTimeout(longPressTimerRef.current);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const combinedRef = useCallback((node) => {
    wrapperRef.current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleSave = () => {
    if (editName.trim() && editName.trim() !== item.name) {
      onUpdate({ name: editName.trim() });
    }
    setEditing(false);
  };

  const animateOut = (direction) => {
    const targetX = direction === 'right' ? window.innerWidth + 100 : -(window.innerWidth + 100);
    setSwipeX(targetX);
    setIsExiting(true);
    setIsSwiping(false);

    setTimeout(() => {
      const el = wrapperRef.current;
      if (el) {
        const height = el.offsetHeight;
        el.style.height = height + 'px';
        el.style.overflow = 'hidden';
        void el.offsetHeight;
        el.style.transition = 'height 0.2s ease-out, opacity 0.15s ease-out';
        el.style.height = '0px';
        el.style.opacity = '0';
      }

      setTimeout(() => {
        if (direction === 'right') onSwipeRight?.();
        else onSwipeLeft?.();
      }, 220);
    }, 250);
  };

  const handleTouchStart = (e) => {
    if (editing || reorderMode || isExiting) return;
    if (e.target.closest('button') || e.target.closest('input')) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    directionRef.current = null;

    longPressTimerRef.current = setTimeout(() => {
      touchStartRef.current = null;
      onLongPress?.();
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || editing || reorderMode || isExiting) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (!directionRef.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        clearTimeout(longPressTimerRef.current);
      }
    }

    if (directionRef.current === 'horizontal') {
      setIsSwiping(true);
      let dampedX = dx;
      if (Math.abs(dx) > 200) {
        const excess = Math.abs(dx) - 200;
        dampedX = (dx > 0 ? 1 : -1) * (200 + excess * 0.3);
      }
      setSwipeX(dampedX);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);

    if (!isSwiping) {
      touchStartRef.current = null;
      directionRef.current = null;
      return;
    }

    if (Math.abs(swipeX) > SWIPE_THRESHOLD) {
      animateOut(swipeX > 0 ? 'right' : 'left');
    } else {
      setSwipeX(0);
      setIsSwiping(false);
    }

    touchStartRef.current = null;
    directionRef.current = null;
  };

  const swipeProgress = Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1);
  const isPastThreshold = Math.abs(swipeX) > SWIPE_THRESHOLD;
  const rightLabel = item.is_found ? 'Restore' : 'Done';
  const rightColor = item.is_found ? 'var(--primary)' : 'var(--success)';

  return (
    <div ref={combinedRef} style={sortableStyle} className="sortable-wrapper">
      <div className="swipe-container" style={{ touchAction: reorderMode ? 'none' : 'pan-y' }}>
        {/* Positive action background (right swipe) */}
        <div
          className={`swipe-bg swipe-bg-positive ${isPastThreshold && swipeX > 0 ? 'past-threshold' : ''}`}
          style={{ opacity: swipeX > 0 ? swipeProgress : 0, background: rightColor }}
        >
          <div className="swipe-bg-content">
            {item.is_found ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
            <span>{rightLabel}</span>
          </div>
        </div>

        {/* Delete action background (left swipe) */}
        <div
          className={`swipe-bg swipe-bg-negative ${isPastThreshold && swipeX < 0 ? 'past-threshold' : ''}`}
          style={{ opacity: swipeX < 0 ? swipeProgress : 0 }}
        >
          <div className="swipe-bg-content">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <span>Delete</span>
          </div>
        </div>

        {/* The actual item */}
        <div
          className={`shopping-item ${item.is_found ? 'found' : ''} ${isDragging ? 'dragging' : ''} ${isSwiping ? 'swiping' : ''} ${isExiting ? 'exiting' : ''} ${reorderMode && !isDragging ? 'shaking' : ''}`}
          style={{
            transform: `translateX(${swipeX}px)`,
            opacity: isDragging ? 0.5 : undefined,
            ...(reorderMode && !isDragging ? { animationDelay: `${wobbleDelay}s` } : {}),
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          {...(reorderMode ? { ...attributes, ...listeners } : {})}
        >
          <button
            className="drag-handle"
            {...(reorderMode ? {} : { ...attributes, ...listeners })}
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
                <button
                  className="btn-icon btn-edit-item"
                  onClick={(e) => { e.stopPropagation(); setEditName(item.name); setEditing(true); }}
                  title="Edit item name"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <div className="item-meta">
                  {formatQuantityUnit(item.quantity, item.unit) ? (
                    <button
                      type="button"
                      className="item-quantity item-quantity-btn"
                      onClick={(e) => { e.stopPropagation(); onEditAmountUnit?.(); }}
                      title="Edit amount & unit"
                    >
                      {formatQuantityUnit(item.quantity, item.unit)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="item-quantity-add"
                      onClick={(e) => { e.stopPropagation(); onEditAmountUnit?.(); }}
                      title="Set amount & unit"
                    >
                      + qty
                    </button>
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
      </div>
    </div>
  );
}
