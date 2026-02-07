import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getListByShareCode } from '../api';

export default function JoinPage() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    async function joinList() {
      try {
        const list = await getListByShareCode(shareCode);
        navigate(`/list/${list.id}`, { replace: true });
      } catch (err) {
        setError('List not found. The share code may be invalid or the list may have been deleted.');
      }
    }
    joinList();
  }, [shareCode, navigate]);

  if (error) {
    return (
      <div className="join-page">
        <div className="join-container">
          <div className="error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <h2>Unable to Join</h2>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="join-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Joining shopping list...</p>
        </div>
      </div>
    </div>
  );
}
