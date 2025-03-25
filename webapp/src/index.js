import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Debug code to check for extension
const checkForExtension = () => {
  console.log('Checking for DarnViz extension...');
  window.postMessage({ type: 'DARNVIZ_WEBAPP_READY' }, '*');
  
  // Listen for extension loaded messages
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    const data = event.data;
    if (!data || !data.type) return;
    
    if (data.type === 'DARNVIZ_EXTENSION_LOADED' || 
        data.type === 'DARNVIZ_EXTENSION_CONNECTED') {
      console.log(`Extension detected! Version: ${data.version}`);
    }
  });
  
  // Keep checking periodically
  setInterval(() => {
    console.log('Checking for extension...');
    window.postMessage({ type: 'DARNVIZ_WEBAPP_READY' }, '*');
  }, 5000);
};

// Run extension check
checkForExtension();

// Main entry point to the application
const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
