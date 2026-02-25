// @keepai/ui — React SPA entry point
// Placeholder — implementation in Phase 7
import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return React.createElement('div', null, 'KeepAI');
}

const root = createRoot(document.getElementById('root')!);
root.render(React.createElement(App));
