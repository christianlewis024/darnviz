import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import extensionBridge from '../utils/extensionBridge';

/**
 * Component to check for the presence of the DarnViz extension
 * 
 * Displays a message if the extension is not detected and provides
 * installation instructions.
 */
function ExtensionCheck() {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const { theme } = useContext(ThemeContext);
  
  useEffect(() => {
    // Set a timeout to change from "checking" to "not found" state
    const timer = setTimeout(() => {
      setCheckingStatus(false);
    }, 3000);
    
    // Clean up timer
    return () => clearTimeout(timer);
  }, []);
  
  const handleInstallClick = () => {
    // Open Chrome Web Store or Firefox Add-ons page
    // For now, just open the extensions page in Chrome
    window.open('chrome://extensions', '_blank');
  };
  
  if (checkingStatus) {
    return (
      <div className="extension-check checking" style={{ color: theme.text }}>
        <div className="message">
          <h2>Checking for DarnViz extension...</h2>
          <div className="loading-spinner" style={{ borderColor: `${theme.primary} transparent ${theme.primary} transparent` }}></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="extension-check not-found" style={{ color: theme.text }}>
      <div className="message">
        <h2>DarnViz Extension Required</h2>
        <p>To create visualizations, you need to install the DarnViz Chrome extension.</p>
        <div className="extension-instructions">
          <h3>How to Use DarnViz:</h3>
          <ol className="install-instructions">
            <li>First, load the DarnViz extension by following the installation steps below</li>
            <li>Navigate to a tab with audio (like YouTube, Spotify, etc.)</li>
            <li>Click the DarnViz extension icon and select "Start Capture"</li>
            <li>Return to this tab to see your visualizations</li>
          </ol>
          
          <h3>Extension Installation:</h3>
          <ol className="install-instructions">
            <li>Click the "Load Extension" button below</li>
            <li>Go to Chrome Extensions page</li>
            <li>Enable "Developer mode" in the top-right corner</li>
            <li>Click "Load unpacked" and select the <code>darnviz/extension</code> folder</li>
            <li>Return to this page and refresh</li>
          </ol>
        </div>
        <button 
          onClick={handleInstallClick} 
          className="install-extension-button"
          style={{ backgroundColor: theme.primary }}
        >
          Load Extension
        </button>
      </div>
    </div>
  );
}

export default ExtensionCheck;
