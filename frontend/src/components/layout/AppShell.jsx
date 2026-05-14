import React from 'react';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen w-full flex relative overflow-hidden">
      {/* Backgrounds */}
      <div className="gradient-bg"></div>
      <div className="grain-bg grain-app"></div>

      {/* Main Layout */}
      <div className="relative z-10 flex w-full h-screen">
        <Sidebar />
        <main className="flex-1 p-10 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
