import { useState, useEffect } from 'react';

export default function Toast({ message, onUndo, onDismiss, duration = 4000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = () => {
    onUndo?.();
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div className={`toast ${visible ? 'toast-visible' : ''}`}>
      <span className="toast-message">{message}</span>
      {onUndo && (
        <button className="toast-undo-btn" onClick={handleUndo}>Undo</button>
      )}
    </div>
  );
}
