/**
 * DarnViz Extension Popup - Phase 1 Implementation
 * Manages the popup UI and interactions with the background script
 */
document.addEventListener('DOMContentLoaded', function() {
  // UI Elements
  const startCaptureButton = document.getElementById('startCapture');
  const stopCaptureButton = document.getElementById('stopCapture');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const openVisualizerLink = document.getElementById('openVisualizer');
  const capturedTabInfo = document.getElementById('capturedTabInfo');
  
  // Configuration
  const VISUALIZER_URL = 'http://localhost:3000'; // Change to actual URL when deployed
  let activeTabId = null;
  
  // Initialize UI
  initializeUI();
  
  // Listen for status updates from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'CAPTURE_STATUS_CHANGED') {
      updateUI(message.isCapturing, message.activeTabId);
    }
  });
  
  // Start capture button click handler
  startCaptureButton.addEventListener('click', async function() {
    startCaptureButton.disabled = true;
    statusText.textContent = 'Starting capture...';
    
    try {
      const response = await sendMessage({ action: 'startCapture' });
      
      if (response && response.success) {
        updateUI(true, response.tabId);
        activeTabId = response.tabId;
      } else {
        // Handle error
        const errorMsg = response?.error || 'Unknown error';
        statusText.textContent = `Failed: ${errorMsg}`;
        startCaptureButton.disabled = false;
      }
    } catch (error) {
      console.error('Error starting capture:', error);
      statusText.textContent = `Error: ${error.message}`;
      startCaptureButton.disabled = false;
    }
  });
  
  // Stop capture button click handler
  stopCaptureButton.addEventListener('click', async function() {
    try {
      const response = await sendMessage({ action: 'stopCapture' });
      
      if (response && response.success) {
        updateUI(false);
        activeTabId = null;
      }
    } catch (error) {
      console.error('Error stopping capture:', error);
      statusText.textContent = `Error: ${error.message}`;
    }
  });
  
  // Open visualizer link
  openVisualizerLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: VISUALIZER_URL });
  });
  
  // Helper function to initialize UI with current status
  async function initializeUI() {
    try {
      const response = await sendMessage({ action: 'getStatus' });
      
      if (response) {
        updateUI(response.isCapturing, response.activeTabId);
        activeTabId = response.activeTabId;
        
        // If capturing, get tab info
        if (response.isCapturing && response.activeTabId) {
          updateCapturedTabInfo(response.activeTabId);
        }
      }
    } catch (error) {
      console.error('Error initializing UI:', error);
    }
  }
  
  // Helper function to update UI based on capture state
  function updateUI(isCapturing, tabId = null) {
    if (isCapturing) {
      startCaptureButton.disabled = true;
      stopCaptureButton.disabled = false;
      statusIndicator.classList.remove('status-inactive');
      statusIndicator.classList.add('status-active');
      statusText.textContent = 'Active - Capturing audio';
      
      if (tabId) {
        updateCapturedTabInfo(tabId);
      }
    } else {
      startCaptureButton.disabled = false;
      stopCaptureButton.disabled = true;
      statusIndicator.classList.remove('status-active');
      statusIndicator.classList.add('status-inactive');
      statusText.textContent = 'Inactive';
      
      if (capturedTabInfo) {
        capturedTabInfo.textContent = '';
      }
    }
  }
  
  // Helper function to update captured tab information
  async function updateCapturedTabInfo(tabId) {
    if (!capturedTabInfo) return;
    
    try {
      const tab = await getTabInfo(tabId);
      
      if (tab) {
        const tabTitle = tab.title || 'Unknown tab';
        capturedTabInfo.textContent = `Capturing: ${tabTitle}`;
        capturedTabInfo.title = tabTitle; // For tooltip on hover
        capturedTabInfo.style.display = 'block';
      } else {
        capturedTabInfo.textContent = 'Capturing audio';
        capturedTabInfo.style.display = 'block';
      }
    } catch (error) {
      console.error('Error getting tab info:', error);
      capturedTabInfo.textContent = 'Capturing audio';
      capturedTabInfo.style.display = 'block';
    }
  }
  
  // Helper function to get tab information
  function getTabInfo(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(tab);
        }
      });
    });
  }
  
  // Helper function to send messages to background script
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  // Diagnostic: Log extension info
  console.log('DarnViz Extension Popup (Phase 1) initialized');
});
