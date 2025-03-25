/**
 * DarnViz Extension Content Script - Phase 2 Implementation
 * 
 * This script runs in the context of the visualizer web app and handles
 * communication between the extension and the web app.
 */

// Store connected status
let isConnected = false;
let isCapturing = false;
let isVisualizerTab = false;

console.log('DarnViz content script loaded');

// Listen for messages from the web page (web app)
window.addEventListener('message', (event) => {
  // Make sure message is from the same window
  if (event.source !== window) return;
  
  const data = event.data;
  
  // Handle messages from the web app
  if (data && data.type) {
    // Log non-data messages
    if (data.type !== 'DARNVIZ_AUDIO_DATA' && data.type !== 'AUDIO_DATA_UPDATE') {
      console.log('Content script received message from web app:', data.type);
    }
    
    switch (data.type) {
      case 'DARNVIZ_WEBAPP_READY':
        // Web app is ready, inform it that extension is installed
        console.log('Web app is ready, sending connection message');
        sendToWebpage({
          type: 'DARNVIZ_EXTENSION_CONNECTED',
          version: chrome.runtime.getManifest().version
        });
        
        isConnected = true;
        isVisualizerTab = true;
        
        // Inform background script that this tab is ready for data
        chrome.runtime.sendMessage({ 
          action: 'webAppReadyForData'
        }, function(response) {
          console.log('Background response to webAppReadyForData:', response);
          
          // Tell the web app we acknowledged its ready signal
          sendToWebpage({
            type: 'DARNVIZ_READY_ACKNOWLEDGED'
          });
        });
        break;
        
      case 'DARNVIZ_READY_FOR_DATA':
        // Web app is ready to receive audio data
        console.log('Web app is ready to receive audio data');
        isVisualizerTab = true;
        
        chrome.runtime.sendMessage({ 
          action: 'webAppReadyForData'
        }, function(response) {
          console.log('Background response to ready for data:', response);
          // Send status update to web page
          if (response && response.success) {
            sendToWebpage({
              type: 'DARNVIZ_READY_ACKNOWLEDGED'
            });
          }
        });
        break;
        
      case 'DARNVIZ_STOP_CAPTURE':
        // Web app is requesting to stop capture
        chrome.runtime.sendMessage({ action: 'stopCapture' }, (response) => {
          if (response && response.success) {
            isCapturing = false;
            sendToWebpage({
              type: 'DARNVIZ_CAPTURE_STATUS',
              isCapturing: false
            });
          } else {
            sendToWebpage({
              type: 'DARNVIZ_CAPTURE_ERROR',
              error: response?.error || 'Failed to stop capture'
            });
          }
        });
        break;
    }
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages from background script
  if (message.type === 'DARNVIZ_CAPTURE_STATUS') {
    console.log('Received capture status from background:', message);
    isCapturing = message.isCapturing;
    
    // Forward to web app
    sendToWebpage(message);
  }
  
  // Handle audio data from background script
  if (message.type === 'DARNVIZ_AUDIO_DATA') {
    // Log occasionally to avoid console spam
    if (Date.now() % 3000 < 50) { // Every ~3 seconds
      console.log('Received audio data from background script');
    }
    
    // Forward to web app
    sendToWebpage(message);
    
    // If we're not formally connected, try to establish connection
    if (!isConnected) {
      isConnected = true;
      isVisualizerTab = true;
      console.log('Auto-establishing connection to forward audio data');
      sendToWebpage({
        type: 'DARNVIZ_EXTENSION_CONNECTED',
        version: chrome.runtime.getManifest().version
      });
    }
  }
  
  // Send a response if requested
  if (sendResponse) {
    sendResponse({ received: true });
  }
  
  return true; // Keep the message channel open for async responses
});

// Helper function to send messages to the webpage
function sendToWebpage(message) {
  window.postMessage(message, '*');
}

// Let the webpage know that the extension is loaded on this page
setTimeout(() => {
  sendToWebpage({
    type: 'DARNVIZ_EXTENSION_LOADED',
    version: chrome.runtime.getManifest().version
  });
  
  console.log('DarnViz extension content script loaded (Phase 2)');
}, 500);
