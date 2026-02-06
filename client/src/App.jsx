import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ListPage from './pages/ListPage';
import JoinPage from './pages/JoinPage';

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/list/:id" element={<ListPage />} />
        <Route path="/join/:shareCode" element={<JoinPage />} />
      </Routes>
    </div>
  );
}
