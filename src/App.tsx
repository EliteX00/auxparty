import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { FloatingReactions } from './components/FloatingReactions';
import { AmbientBackground } from './components/AmbientBackground';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Global Dynamic Fluid Mesh Background driven by song cover colors */}
      <AmbientBackground />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomCode" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FloatingReactions />
    </BrowserRouter>
  );
};
