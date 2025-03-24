import React, { useState, useEffect } from 'react';

/**
 * Main application component
 * In Phase 0, this is just a placeholder.
 * Will be expanded in later phases with proper routing and context providers.
 */
function App() {
  const [extensionStatus, setExtensionStatus] = useState('unknown');

  useEffect(() => {
    // This will be implemented fully in Phase 2
    // For now, it's just a placeholder
    const checkExtension = () => {
      // This will check if the extension is installed and connected
      console.log('Checking for DarnViz extension...');
      setExtensionStatus('not_connected');
    };

    checkExtension();
  }, []);

  return (
    <div className="darnviz-app">
      <header className="app-header">
        <h1>DarnViz</h1>
        <p>Real-time Music Visualization</p>
      </header>
      
      <main className="app-content">
        {extensionStatus === 'unknown' && (
          <p>Checking extension status...</p>
        )}
        
        {extensionStatus === 'not_connected' && (
          <div className="extension-info">
            <p>The DarnViz extension is not detected.</p>
            <p>Please install the extension to enable audio capture.</p>
            <button className="install-extension-button">
              Get the Extension
            </button>
          </div>
        )}
        
        {extensionStatus === 'connected' && (
          <div className="visualization-container">
            <p>Extension connected! Visualization will appear here.</p>
          </div>
        )}
      </main>
      
      <footer className="app-footer">
        <p>Phase 0: Initial Setup</p>
      </footer>
    </div>
  );
}

export default App;
