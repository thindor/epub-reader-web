
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 抑制 ResizeObserver 循环警告
// 这种错误通常是由于某些库（如 ePub.js 或 Lucide）在调整大小时触发了后续的布局更改
window.addEventListener('error', (e) => {
  if (
    e.message === 'ResizeObserver loop limit exceeded' ||
    e.message === 'ResizeObserver loop completed with undelivered notifications.'
  ) {
    e.stopImmediatePropagation();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
