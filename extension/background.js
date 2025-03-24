// Placeholder for background script - to be implemented in Phase 1
let isCapturing = false;
let captureStream = null;

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.action === 'startCapture') {
    // This is just a placeholder - actual implementation in Phase 1
    console.log('Starting audio capture...');
    sendResponse({ success: true });
    
    // Set status flag
    isCapturing = true;
  }
  else if (message.action === 'stopCapture') {
    // This is just a placeholder - actual implementation in Phase 1
    console.log('Stopping audio capture...');
    
    // Stop any active streams
    if (captureStream) {
      captureStream.getTracks().forEach(track => track.stop());
      captureStream = null;
    }
    
    // Set status flag
    isCapturing = false;
    
    sendResponse({ success: true });
  }
  else if (message.action === 'getStatus') {
    sendResponse({ isCapturing });
  }
  
  // Must return true for asynchronous response
  return true;
});

console.log('DarnViz background script loaded');
