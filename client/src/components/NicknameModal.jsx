import React, { useState } from 'react';

export default function NicknameModal({ onSave }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    
    if (!trimmed) {
      setError('Please enter a nickname');
      return;
    }
    
    if (trimmed.length < 2) {
      setError('Nickname must be at least 2 characters');
      return;
    }
    
    if (trimmed.length > 30) {
      setError('Nickname must be 30 characters or less');
      return;
    }
    
    onSave(trimmed);
  };

  const handleSkip = () => {
    const randomName = `User-${Math.floor(Math.random() * 9999)}`;
    onSave(randomName);
  };

  return (
    <div className="modal-overlay">
      <div className="modal nickname-modal">
        <div className="modal-header">
          <h2>Welcome!</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="nickname-description">
              Choose a nickname so others can identify you when you add or find items.
            </p>

            <div className="nickname-input-group">
              <label htmlFor="nickname">Your Nickname</label>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError('');
                }}
                placeholder="Enter your nickname"
                autoFocus
                maxLength={30}
              />
              {error && <span className="nickname-error">{error}</span>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleSkip}>
              Skip
            </button>
            <button type="submit" className="btn btn-primary">
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
