import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createList, getListByShareCode } from '../api';

const SAVED_LISTS_KEY = 'shopping_list_saved_lists';

export function getSavedLists() {
  try {
    const saved = localStorage.getItem(SAVED_LISTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveListToStorage(list) {
  const lists = getSavedLists();
  const existingIndex = lists.findIndex(l => l.id === list.id);
  const listData = {
    id: list.id,
    name: list.name,
    shareCode: list.share_code,
    lastAccessed: Date.now(),
  };
  
  if (existingIndex >= 0) {
    lists[existingIndex] = { ...lists[existingIndex], ...listData };
  } else {
    lists.unshift(listData);
  }
  
  const sortedLists = lists.sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, 20);
  localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(sortedLists));
}

export function removeListFromStorage(listId) {
  const lists = getSavedLists().filter(l => l.id !== listId);
  localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(lists));
}

export default function HomePage() {
  const navigate = useNavigate();
  const [listName, setListName] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [savedLists, setSavedLists] = useState([]);

  useEffect(() => {
    setSavedLists(getSavedLists());
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!listName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const list = await createList(listName.trim());
      saveListToStorage(list);
      navigate(`/list/${list.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!shareCode.trim()) return;
    setJoining(true);
    setError('');
    try {
      const list = await getListByShareCode(shareCode.trim());
      saveListToStorage(list);
      navigate(`/list/${list.id}`);
    } catch (err) {
      setError('List not found. Check the share code and try again.');
      setJoining(false);
    }
  };

  const handleRemoveList = (e, listId) => {
    e.stopPropagation();
    e.preventDefault();
    removeListFromStorage(listId);
    setSavedLists(getSavedLists());
  };

  const formatLastAccessed = (timestamp) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="home-hero">
          <div className="logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1"/>
              <circle cx="19" cy="21" r="1"/>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
          </div>
          <h1>Shared Shopping List</h1>
          <p className="subtitle">Create a shopping list and collaborate in real-time with family and friends</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="home-cards">
          <div className="card">
            <div className="card-icon create-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <h2>Create New List</h2>
            <p>Start a fresh shopping list and share it with others</p>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="e.g. Weekly Groceries"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                maxLength={100}
              />
              <button type="submit" className="btn btn-primary" disabled={creating || !listName.trim()}>
                {creating ? 'Creating...' : 'Create List'}
              </button>
            </form>
          </div>

          <div className="divider-text">
            <span>or</span>
          </div>

          <div className="card">
            <div className="card-icon join-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </div>
            <h2>Join Existing List</h2>
            <p>Enter a share code to join someone else's list</p>
            <form onSubmit={handleJoin}>
              <input
                type="text"
                placeholder="Enter share code"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                maxLength={20}
              />
              <button type="submit" className="btn btn-secondary" disabled={joining || !shareCode.trim()}>
                {joining ? 'Joining...' : 'Join List'}
              </button>
            </form>
          </div>
        </div>

        {savedLists.length > 0 && (
          <div className="my-lists-section">
            <h3 className="my-lists-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              My Lists
            </h3>
            <div className="my-lists">
              {savedLists.map(list => (
                <div 
                  key={list.id} 
                  className="my-list-item"
                  onClick={() => navigate(`/list/${list.id}`)}
                >
                  <div className="my-list-info">
                    <span className="my-list-name">{list.name}</span>
                    <span className="my-list-meta">
                      <span className="my-list-code">{list.shareCode}</span>
                      <span className="my-list-time">{formatLastAccessed(list.lastAccessed)}</span>
                    </span>
                  </div>
                  <button 
                    className="btn-icon btn-remove-list" 
                    onClick={(e) => handleRemoveList(e, list.id)}
                    title="Remove from my lists"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="features">
          <div className="feature">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Real-time collaboration</span>
          </div>
          <div className="feature">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span>Mark items as found</span>
          </div>
          <div className="feature">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            <span>Easy sharing with a code or link</span>
          </div>
        </div>
      </div>
    </div>
  );
}
