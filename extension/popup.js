/**
 * DarnViz Extension Popup - Phase 2 Implementation
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
  let isCapturing = false;
  
  // Initialize UI
  initializeUI();
  
  // Listen for status updates from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'CAPTURE_STATUS_CHANGED') {
      updateUI(message.isCapturing);
    }
  });
  
  // Start capture button click handler
  startCaptureButton.addEventListener('click', async function() {
    startCaptureButton.disabled = true;
    statusText.textContent = 'Starting capture...';
    console.log('Start Capture button clicked');
    
    try {
      const response = await sendMessage({ action: 'startCapture' });
      
      if (response && response.success) {
        updateUI(true);
        isCapturing = true;
        console.log('Capture started successfully', response);
      } else {
        // Handle error
        const errorMsg = response?.error || 'Unknown error';
        statusText.textContent = `Failed: ${errorMsg}`;
        statusText.className = 'status-value error';
        startCaptureButton.disabled = false;
        console.error('Failed to start capture:', errorMsg);
      }
    } catch (error) {
      console.error('Error starting capture:', error);
      statusText.textContent = `Error: ${error.message}`;
      statusText.className = 'status-value error';
      startCaptureButton.disabled = false;
    }
  });
  
  // Stop capture button click handler
  stopCaptureButton.addEventListener('click', async function() {
    console.log('Stop Capture button clicked');
    try {
      const response = await sendMessage({ action: 'stopCapture' });
      
      if (response && response.success) {
        updateUI(false);
        isCapturing = false;
        console.log('Capture stopped successfully');
      }
    } catch (error) {
      console.error('Error stopping capture:', error);
      statusText.textContent = `Error: ${error.message}`;
    }
  });
  
  // Open visualizer link
  openVisualizerLink.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Open Visualizer link clicked');
    
    // Add visual feedback that we're doing something
    const demoMessage = document.createElement('div');
    demoMessage.className = 'demo-message';
    demoMessage.textContent = 'Opening visualizer...';
    document.querySelector('.workflow-steps').appendChild(demoMessage);
    
    // Tell the background script to open the visualizer tab
    chrome.runtime.sendMessage({ action: 'openVisualizer' }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error opening visualizer:', chrome.runtime.lastError);
        demoMessage.textContent = 'Error: ' + chrome.runtime.lastError.message;
        demoMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        demoMessage.style.borderColor = '#ff0000';
        return;
      }
      
      console.log('Visualizer opened:', response);
      
      // Update message to show success
      if (response && response.success) {
        demoMessage.textContent = 'Visualizer opened successfully!';
        
        // Update UI to reflect that we're now capturing
        updateUI(true);
        isCapturing = true;
      } else {
        demoMessage.textContent = 'Error: ' + (response?.error || 'Failed to open visualizer');
        demoMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        demoMessage.style.borderColor = '#ff0000';
      }
    });
  });
  
  // Helper function to initialize UI with current status
  async function initializeUI() {
    try {
      const response = await sendMessage({ action: 'getStatus' });
      console.log('Status retrieved:', response);
      
      if (response) {
        updateUI(response.isCapturing);
        isCapturing = response.isCapturing;
        
        // Update step indicators
        document.getElementById('step1').classList.add('active');
        
        if (response.isCapturing) {
          document.getElementById('step1').classList.add('completed');
          document.getElementById('step2').classList.add('completed');
          document.getElementById('step3').classList.add('active');
        }
      }
    } catch (error) {
      console.error('Error initializing UI:', error);
    }
  }
  
  // Helper function to update UI based on capture state
  function updateUI(isActive) {
    if (isActive) {
      startCaptureButton.disabled = true;
      stopCaptureButton.disabled = false;
      statusIndicator.classList.remove('status-inactive');
      statusIndicator.classList.add('status-active');
      statusText.textContent = 'Active - Capturing audio';
      document.getElementById('step2').classList.add('completed');
      
      // Highlight step 3 if we're capturing
      document.getElementById('step3').classList.add('active');
    } else {
      startCaptureButton.disabled = false;
      stopCaptureButton.disabled = true;
      statusIndicator.classList.remove('status-active');
      statusIndicator.classList.add('status-inactive');
      statusText.textContent = 'Inactive';
      
      // Reset step indicators
      document.getElementById('step2').classList.remove('completed');
      document.getElementById('step3').classList.remove('active');
    }
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
  
  // Log initialization
  console.log('DarnViz Extension Popup (Phase 2) initialized');
});
