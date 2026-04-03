import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createList, getListByShareCode, parseChatText, batchAddItems } from '../api';

export default function HomePage() {
  const navigate = useNavigate();
  const [listName, setListName] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [chatText, setChatText] = useState('');
  const [chatListName, setChatListName] = useState('');
  const [parsingChat, setParsingChat] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!listName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const list = await createList(listName.trim());
      navigate(`/list/${list.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  const handleCreateFromChat = async (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    setParsingChat(true);
    setError('');
    try {
      const result = await parseChatText(chatText);
      if (!result.items || result.items.length === 0) {
        setError('No items could be extracted from the pasted text.');
        setParsingChat(false);
        return;
      }
      const name = chatListName.trim() || 'Shopping List';
      const list = await createList(name);
      const userName = localStorage.getItem('shopping_list_username') || 'Anonymous';
      await batchAddItems(list.id, result.items.map((item) => ({ ...item, addedBy: userName })));
      navigate(`/list/${list.id}`);
    } catch (err) {
      setError(err.message);
      setParsingChat(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!shareCode.trim()) return;
    setJoining(true);
    setError('');
    try {
      const list = await getListByShareCode(shareCode.trim());
      navigate(`/list/${list.id}`);
    } catch (err) {
      setError('List not found. Check the share code and try again.');
      setJoining(false);
    }
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
          <div className="divider-text">
            <span>or</span>
          </div>

          <div className="card">
            <div className="card-icon paste-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </div>
            <h2>Create from Chat</h2>
            <p>Paste a group chat and we'll extract the shopping items</p>
            <form onSubmit={handleCreateFromChat}>
              <input
                type="text"
                placeholder="List name (optional)"
                value={chatListName}
                onChange={(e) => setChatListName(e.target.value)}
                maxLength={100}
              />
              <textarea
                className="chat-paste-input"
                placeholder={'Paste chat messages here...\ne.g. "[10/03] Alice: We need milk"'}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                rows={4}
              />
              <button type="submit" className="btn btn-primary" disabled={parsingChat || !chatText.trim()}>
                {parsingChat ? 'Creating...' : 'Create from Chat'}
              </button>
            </form>
          </div>
        </div>

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
