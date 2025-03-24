/**
 * DarnViz Extension Content Script - Phase 1 Implementation
 * 
 * This script runs in the context of web pages and facilitates communication
 * between the page and the extension.
 */

// Store connected status
let isConnected = false;
let isCapturing = false;

// Listen for messages from the web page
window.addEventListener('message', (event) => {
  // Make sure message is from the same window
  if (event.source !== window) return;
  
  const data = event.data;
  
  // Handle messages from the DarnViz web app or injected script
  if (data && data.type) {
    // Handle stream messages from our injected code
    if (data.type === 'DARNVIZ_STREAM_READY' && window.darnvizStream) {
      // We got the stream from the injected script
      console.log('Stream ready, setting up audio processing');
      
      // Set up audio processing
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create analyser node
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        
        // Create source from stream
        const source = audioContext.createMediaStreamSource(window.darnvizStream);
        
        // Connect source to analyser
        source.connect(analyser);
        
        // Store references for later use
        window.darnvizAudioContext = audioContext;
        window.darnvizAnalyser = analyser;
        
        console.log('Audio processing set up successfully');
        
        // Tell the web app we're ready
        sendToWebpage({
          type: 'DARNVIZ_AUDIO_PROCESSING_READY'
        });
      } catch (error) {
        console.error('Error setting up audio processing:', error);
        sendToWebpage({
          type: 'DARNVIZ_AUDIO_PROCESSING_ERROR',
          error: error.message
        });
      }
      return;
    }
    
    if (data.type === 'DARNVIZ_STREAM_ERROR') {
      console.error('Stream error:', data.error);
      sendToWebpage({
        type: 'DARNVIZ_CAPTURE_ERROR',
        error: data.error || 'Error creating audio stream'
      });
      return;
    
    switch (data.type) {
      case 'DARNVIZ_WEBAPP_READY':
        // Web app is ready, inform it that extension is installed
        sendToWebpage({
          type: 'DARNVIZ_EXTENSION_CONNECTED',
          version: chrome.runtime.getManifest().version
        });
        
        isConnected = true;
        
        // Get current capture status
        chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
          if (response) {
            isCapturing = response.isCapturing;
            
            // Inform web app of current status
            sendToWebpage({
              type: 'DARNVIZ_CAPTURE_STATUS',
              isCapturing: response.isCapturing,
              tabId: response.activeTabId
            });
          }
        });
        break;
        
      case 'DARNVIZ_REQUEST_AUDIO_DATA':
        // Web app is requesting audio data
        if (isCapturing) {
          requestAudioData();
        } else {
          sendToWebpage({
            type: 'DARNVIZ_AUDIO_DATA_ERROR',
            error: 'Not capturing audio'
          });
        }
        break;
        
      case 'DARNVIZ_START_CAPTURE':
        // Web app is requesting to start capture
        chrome.runtime.sendMessage({ action: 'startCapture' }, (response) => {
          if (response && response.success) {
            isCapturing = true;
            sendToWebpage({
              type: 'DARNVIZ_CAPTURE_STATUS',
              isCapturing: true,
              tabId: response.tabId
            });
          } else {
            sendToWebpage({
              type: 'DARNVIZ_CAPTURE_ERROR',
              error: response?.error || 'Failed to start capture'
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

// Request audio data from local analyzer or background script and send to webpage
function requestAudioData() {
  // If we have direct access to the analyser node in content script
  if (window.darnvizAnalyser) {
    try {
      const analyser = window.darnvizAnalyser;
      
      // Get frequency data
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      
      // Get time domain data
      const timeData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(timeData);
      
      // Send to webpage
      sendToWebpage({
        type: 'DARNVIZ_AUDIO_DATA',
        frequencyData: Array.from(frequencyData),
        timeData: Array.from(timeData),
        timestamp: Date.now()
      });
      return;
    } catch (error) {
      console.error('Error getting audio data from analyzer:', error);
      // Fall back to background script method
    }
  }
  
  // Fall back to background script method
  chrome.runtime.sendMessage({ action: 'getAudioData' }, (response) => {
    if (response && response.success) {
      sendToWebpage({
        type: 'DARNVIZ_AUDIO_DATA',
        frequencyData: response.frequencyData,
        timeData: response.timeData,
        timestamp: response.timestamp
      });
    } else {
      sendToWebpage({
        type: 'DARNVIZ_AUDIO_DATA_ERROR',
        error: response?.error || 'Failed to get audio data'
      });
    }
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward capture status changes to the web page
  if (message.type === 'CAPTURE_STATUS_CHANGED' && isConnected) {
    isCapturing = message.isCapturing;
    
    sendToWebpage({
      type: 'DARNVIZ_CAPTURE_STATUS',
      isCapturing: message.isCapturing,
      tabId: message.activeTabId
    });
  }
  
  // Always return true to signal we need the channel to stay open for async response
  return true;
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
  
  console.log('DarnViz extension content script loaded (Phase 1)');
}, 500);
