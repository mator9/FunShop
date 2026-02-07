import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getList, addItem, updateItem, deleteItem, deleteList, updateListName } from '../api';
import { socket } from '../socket';
import ShoppingItem from '../components/ShoppingItem';
import ShareModal from '../components/ShareModal';
import AddItemForm from '../components/AddItemForm';

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

  // Load or prompt for username
  useEffect(() => {
    const stored = localStorage.getItem('shopping_list_username');
    if (stored) {
      setUserName(stored);
    } else {
      const name = `User-${Math.floor(Math.random() * 9999)}`;
      localStorage.setItem('shopping_list_username', name);
      setUserName(name);
    }
  }, []);

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
    socket.emit('join:list', id);

    socket.on('item:added', (item) => {
      setItems((prev) => {
        if (prev.find((i) => i.id === item.id)) return prev;
        return [...prev, item];
      });
    });

    socket.on('item:updated', (updatedItem) => {
      setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    });

    socket.on('item:deleted', ({ id: itemId }) => {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
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
      socket.off('item:added');
      socket.off('item:updated');
      socket.off('item:deleted');
      socket.off('list:updated');
      socket.off('list:deleted');
    };
  }, [id, navigate]);

  const handleAddItem = async (itemData) => {
    try {
      await addItem(id, { ...itemData, addedBy: userName });
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleToggleFound = async (item) => {
    try {
      await updateItem(item.id, {
        is_found: !item.is_found,
        found_by: !item.is_found ? userName : '',
      });
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
          <>
            {pendingItems.length > 0 && (
              <div className="items-section">
                <h3 className="section-title">
                  <span className="section-badge pending-badge">{pendingItems.length}</span>
                  To Find
                </h3>
                <div className="items-list">
                  {pendingItems.map((item) => (
                    <ShoppingItem
                      key={item.id}
                      item={item}
                      onToggle={() => handleToggleFound(item)}
                      onDelete={() => handleDeleteItem(item.id)}
                      onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                    />
                  ))}
                </div>
              </div>
            )}

            {foundItems.length > 0 && (
              <div className="items-section">
                <h3 className="section-title">
                  <span className="section-badge found-badge">{foundItems.length}</span>
                  Found
                </h3>
                <div className="items-list found-list">
                  {foundItems.map((item) => (
                    <ShoppingItem
                      key={item.id}
                      item={item}
                      onToggle={() => handleToggleFound(item)}
                      onDelete={() => handleDeleteItem(item.id)}
                      onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showShare && (
        <ShareModal
          list={list}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
