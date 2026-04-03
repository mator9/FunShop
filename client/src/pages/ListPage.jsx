import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getList, addItem, updateItem, deleteItem, deleteList, updateListName, reorderItems } from '../api';
import { socket } from '../socket';
import ShoppingItem from '../components/ShoppingItem';
import ShareModal from '../components/ShareModal';
import AddItemForm from '../components/AddItemForm';
import NicknameModal from '../components/NicknameModal';
import AmountUnitModal from '../components/AmountUnitModal';
import Toast from '../components/Toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function ListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [userName, setUserName] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'disconnected');
  const [amountUnitItem, setAmountUnitItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorderSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load or prompt for username
  useEffect(() => {
    const stored = localStorage.getItem('shopping_list_username');
    if (stored) {
      setUserName(stored);
    } else {
      setShowNicknameModal(true);
    }
  }, []);

  const handleNicknameSave = (name) => {
    localStorage.setItem('shopping_list_username', name);
    setUserName(name);
    setShowNicknameModal(false);
  };

  // Fetch list data
  const fetchList = useCallback(async () => {
    try {
      const data = await getList(id);
      setList(data);
      setItems(data.items || []);
      setNewName(data.name);
      setError('');
    } catch (err) {
      setError('List not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Socket.io real-time events
  useEffect(() => {
    const joinListAndRefresh = () => {
      socket.emit('join:list', id);
      fetchList();
    };

    // Initial join
    socket.emit('join:list', id);

    // Handle reconnection - re-join room and refresh data
    const handleConnect = () => {
      setConnectionStatus('connected');
      joinListAndRefresh();
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    socket.on('item:added', (item) => {
      setItems((prev) => {
        if (prev.find((i) => i.id === item.id)) return prev;
        return [item, ...prev];
      });
    });

    socket.on('item:updated', (updatedItem) => {
      setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    });

    socket.on('item:deleted', ({ id: itemId }) => {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    });

    socket.on('items:reordered', (reorderedItems) => {
      setItems(reorderedItems);
    });

    socket.on('list:updated', (updatedList) => {
      setList(updatedList);
      setNewName(updatedList.name);
    });

    socket.on('list:deleted', () => {
      navigate('/', { replace: true });
    });

    return () => {
      socket.emit('leave:list', id);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('item:added');
      socket.off('item:updated');
      socket.off('item:deleted');
      socket.off('items:reordered');
      socket.off('list:updated');
      socket.off('list:deleted');
    };
  }, [id, navigate, fetchList]);

  // Handle page visibility changes (wake from sleep/idle)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!socket.connected) {
          socket.connect();
        } else {
          socket.emit('join:list', id);
          fetchList();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, fetchList]);

  const handleAddItem = async (itemData) => {
    try {
      await addItem(id, { ...itemData, addedBy: userName });
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleAmountUnitSave = async ({ quantity, unit }) => {
    if (amountUnitItem) {
      try {
        await updateItem(amountUnitItem.id, { quantity, unit });
      } catch (err) {
        console.error('Failed to update amount/unit:', err);
      }
    }
    setAmountUnitItem(null);
  };

  const handleEditAmountUnit = (item) => {
    setAmountUnitItem(item);
  };

  const handleToggleFound = async (item) => {
    try {
      const updates = {
        is_found: !item.is_found,
        found_by: !item.is_found ? userName : '',
      };
      if (!item.is_found) {
        updates.looking_for_by = '';
      }
      await updateItem(item.id, updates);
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteItem(itemId);
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      await updateItem(itemId, updates);
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  };

  const handleDeleteList = async () => {
    if (window.confirm('Are you sure you want to delete this entire list? This cannot be undone.')) {
      try {
        await deleteList(id);
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Failed to delete list:', err);
      }
    }
  };

  const handleSaveName = async () => {
    try {
      if (newName.trim() && newName.trim() !== list.name) {
        await updateListName(id, newName.trim());
      }
    } catch (err) {
      console.error('Failed to update list name:', err);
    }
    setEditingName(false);
  };

  const handleChangeUserName = () => {
    const name = prompt('Enter your name:', userName);
    if (name && name.trim()) {
      const trimmed = name.trim();
      localStorage.setItem('shopping_list_username', trimmed);
      setUserName(trimmed);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Work out which section was being dragged in
    const activeItem = items.find((i) => i.id === active.id);
    if (!activeItem) return;

    // Determine which sub-list we're working with.
    // is_found comes from SQLite as an integer (0 or 1), so use !! to
    // coerce to boolean before comparing to avoid strict-equality mismatches.
    const isFoundSection = !!activeItem.is_found;
    const sectionItems = items.filter((i) => !!i.is_found === isFoundSection);
    const otherItems = items.filter((i) => !!i.is_found !== isFoundSection);

    const oldIndex = sectionItems.findIndex((i) => i.id === active.id);
    const newIndex = sectionItems.findIndex((i) => i.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder within the section
    const reordered = [...sectionItems];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Rebuild full items list: pending first, then found (preserving order)
    const pendingSection = isFoundSection ? otherItems : reordered;
    const foundSection = isFoundSection ? reordered : otherItems;
    const newItems = [...pendingSection, ...foundSection];

    // Optimistic update
    setItems(newItems);

    // Persist to server
    try {
      await reorderItems(id, newItems.map((i) => i.id));
    } catch (err) {
      console.error('Failed to reorder items:', err);
      // Revert on failure
      fetchList();
    }
  };

  const showToast = (message, undoAction) => {
    setToast({ id: Date.now(), message, undoAction });
  };

  const handleSwipeRight = async (item) => {
    if (item.is_found) {
      const prevFoundBy = item.found_by;
      try {
        await updateItem(item.id, { is_found: false, found_by: '' });
        showToast(`"${item.name}" restored`, async () => {
          try {
            await updateItem(item.id, { is_found: true, found_by: prevFoundBy || userName });
          } catch (err) {
            console.error('Failed to undo restore:', err);
          }
        });
      } catch (err) {
        console.error('Failed to restore item:', err);
        fetchList();
      }
    } else {
      const prevLookingFor = item.looking_for_by;
      try {
        await updateItem(item.id, { is_found: true, found_by: userName, looking_for_by: '' });
        showToast(`"${item.name}" done`, async () => {
          try {
            await updateItem(item.id, { is_found: false, found_by: '', looking_for_by: prevLookingFor || '' });
          } catch (err) {
            console.error('Failed to undo done:', err);
          }
        });
      } catch (err) {
        console.error('Failed to mark item done:', err);
        fetchList();
      }
    }
  };

  const handleSwipeLeft = async (item) => {
    const savedItem = { ...item };
    try {
      await deleteItem(item.id);
      showToast(`"${item.name}" deleted`, async () => {
        try {
          await addItem(id, { name: savedItem.name, addedBy: savedItem.added_by || userName });
        } catch (err) {
          console.error('Failed to undo delete:', err);
        }
      });
    } catch (err) {
      console.error('Failed to delete item:', err);
      fetchList();
    }
  };

  if (loading) {
    return (
      <div className="list-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading shopping list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="list-page">
        <div className="error-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <h2>List Not Found</h2>
          <p>This shopping list doesn't exist or has been deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const pendingItems = items.filter((i) => !i.is_found);
  const foundItems = items.filter((i) => i.is_found);
  const progress = items.length > 0 ? Math.round((foundItems.length / items.length) * 100) : 0;

  return (
    <div className="list-page">
      {connectionStatus !== 'connected' && (
        <div className={`connection-banner ${connectionStatus}`}>
          {connectionStatus === 'disconnected' && (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
                <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                <line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
              Connection lost. Reconnecting...
            </>
          )}
          {connectionStatus === 'reconnecting' && (
            <>
              <div className="spinner-small"></div>
              Reconnecting...
            </>
          )}
        </div>
      )}
      <header className="list-header">
        <div className="header-top">
          <button className="btn-icon" onClick={() => navigate('/')} title="Go home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>

          <div className="header-actions">
            <button className="btn-icon user-btn" onClick={handleChangeUserName} title={`Logged in as ${userName}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="user-name">{userName}</span>
            </button>
            <button className="btn btn-share" onClick={() => setShowShare(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share
            </button>
            <button className="btn-icon btn-danger" onClick={handleDeleteList} title="Delete list">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="list-title-area">
          {editingName ? (
            <div className="edit-name">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                onBlur={handleSaveName}
                autoFocus
                maxLength={100}
              />
            </div>
          ) : (
            <h1 onClick={() => setEditingName(true)} title="Click to edit name">
              {list.name}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="edit-icon">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </h1>
          )}
        </div>

        {items.length > 0 && (
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="progress-text">
              {foundItems.length} of {items.length} items found ({progress}%)
            </span>
          </div>
        )}
      </header>

      <main className="list-content">
        <AddItemForm onAdd={handleAddItem} />

        {items.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <h3>Your list is empty</h3>
            <p>Add items above to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={reorderMode ? reorderSensors : sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {pendingItems.length > 0 && (
              <div className="items-section">
                <h3 className="section-title">
                  <span className="section-badge pending-badge">{pendingItems.length}</span>
                  To Find
                </h3>
                <SortableContext
                  items={pendingItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="items-list">
                    {pendingItems.map((item) => (
                      <ShoppingItem
                        key={item.id}
                        item={item}
                        userName={userName}
                        onToggle={() => handleToggleFound(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                        onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                        onEditAmountUnit={() => handleEditAmountUnit(item)}
                        onSwipeRight={() => handleSwipeRight(item)}
                        onSwipeLeft={() => handleSwipeLeft(item)}
                        reorderMode={reorderMode}
                        onLongPress={() => setReorderMode(true)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}

            {foundItems.length > 0 && (
              <div className="items-section">
                <h3 className="section-title">
                  <span className="section-badge found-badge">{foundItems.length}</span>
                  Found
                </h3>
                <SortableContext
                  items={foundItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="items-list found-list">
                    {foundItems.map((item) => (
                      <ShoppingItem
                        key={item.id}
                        item={item}
                        userName={userName}
                        onToggle={() => handleToggleFound(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                        onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                        onEditAmountUnit={() => handleEditAmountUnit(item)}
                        onSwipeRight={() => handleSwipeRight(item)}
                        onSwipeLeft={() => handleSwipeLeft(item)}
                        reorderMode={reorderMode}
                        onLongPress={() => setReorderMode(true)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}
          </DndContext>
        )}
      </main>

      {showShare && (
        <ShareModal
          list={list}
          onClose={() => setShowShare(false)}
        />
      )}

      {showNicknameModal && (
        <NicknameModal onSave={handleNicknameSave} />
      )}

      {amountUnitItem && (
        <AmountUnitModal
          item={amountUnitItem}
          onSave={handleAmountUnitSave}
          onClose={() => setAmountUnitItem(null)}
        />
      )}

      {reorderMode && (
        <div className="reorder-bar">
          <button className="btn btn-primary reorder-done-btn" onClick={() => setReorderMode(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Done Reordering
          </button>
        </div>
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          onUndo={toast.undoAction}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
