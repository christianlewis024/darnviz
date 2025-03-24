import React, { useState, useEffect } from 'react';

/**
 * Component to check for the presence of the DarnViz extension
 * 
 * Placeholder for Phase 2 implementation.
 * Will detect if extension is installed and display appropriate message.
 */
function ExtensionCheck() {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [extensionPresent, setExtensionPresent] = useState(false);
  
  useEffect(() => {
    // Simulate checking for extension
    const checkExtension = async () => {
      // This will be replaced with actual extension detection in Phase 2
      console.log('Checking for extension...');
      
      // Simulate a delay for the check
      setTimeout(() => {
        setExtensionPresent(false);
        setCheckingStatus(false);
      }, 1500);
    };
    
    checkExtension();
  }, []);
  
  const handleInstallClick = () => {
    // Open Chrome Web Store or Firefox Add-ons page
    window.open('https://chrome.google.com/webstore/category/extensions', '_blank');
  };
  
  if (checkingStatus) {
    return (
      <div className="extension-check checking">
        <div className="message">
          <h2>Checking for DarnViz extension...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }
  
  if (!extensionPresent) {
    return (
      <div className="extension-check not-found">
        <div className="message">
          <h2>DarnViz Extension Required</h2>
          <p>To capture audio and create visualizations, you need to install the DarnViz extension.</p>
          <button onClick={handleInstallClick} className="install-extension-button">
            Install Extension
          </button>
        </div>
      </div>
    );
  }
  
  return null; // Extension is present, don't show anything
}

export default ExtensionCheck;
