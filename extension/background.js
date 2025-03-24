// Background script for DarnViz extension - Phase 1 implementation
let isCapturing = false;
let captureStream = null;
let audioContext = null;
let analyser = null;
let activeTabId = null;

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.action === 'startCapture') {
    startAudioCapture(sendResponse);
    // Must return true for asynchronous response
    return true;
  }
  else if (message.action === 'stopCapture') {
    stopAudioCapture();
    sendResponse({ success: true });
  }
  else if (message.action === 'getStatus') {
    sendResponse({ 
      isCapturing,
      activeTabId
    });
  }
  else if (message.action === 'getAudioData') {
    // This will be used to send audio data to the web app
    sendAudioData(sendResponse);
    return true;
  }
  
  // Must return true for asynchronous response
  return true;
});

/**
 * Start audio capture from the current tab
 * @param {function} sendResponse - Callback function to send response to sender
 */
async function startAudioCapture(sendResponse) {
  try {
    // Get the current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs || tabs.length === 0) {
      console.error('No active tab found');
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }
    
    activeTabId = tabs[0].id;
    
    // The issue is here - we need to check if chrome.tabCapture is available
    if (!chrome.tabCapture) {
      console.error('Tab capture API not available');
      sendResponse({ 
        success: false, 
        error: 'Tab capture API not available. Make sure permissions are granted.' 
      });
      return;
    }
    
    // Request tab capture permission
    const constraints = {
      audio: true,
      video: false
    };
    
    // Add proper error handling for the tab capture API
    try {
      // Capture the tab's audio
      chrome.tabCapture.getMediaStreamId(
        { targetTabId: activeTabId },
        (streamId) => {
          if (chrome.runtime.lastError) {
            console.error('Error getting media stream ID:', chrome.runtime.lastError);
            sendResponse({ 
              success: false, 
              error: chrome.runtime.lastError.message 
            });
            return;
          }
          
          // We've got the stream ID, now we need to create a media stream
          // This needs to be done in the context of a tab via scripting.executeScript
          chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: (streamId) => {
              navigator.mediaDevices.getUserMedia({
                audio: {
                  mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                  }
                },
                video: false
              })
              .then(stream => {
                window.darnvizStream = stream;
                window.postMessage({ type: 'DARNVIZ_STREAM_READY' }, '*');
              })
              .catch(err => {
                console.error('Error creating stream:', err);
                window.postMessage({ 
                  type: 'DARNVIZ_STREAM_ERROR', 
                  error: err.message 
                }, '*');
              });
            },
            args: [streamId]
          }).then((injectionResults) => {
            if (!injectionResults || injectionResults.length === 0) {
              console.error('Script execution failed');
              sendResponse({ 
                success: false, 
                error: 'Script execution failed' 
              });
              return;
            }
            
            // Set status flag
            isCapturing = true;
            
            // Send success response
            sendResponse({ 
              success: true, 
              tabId: activeTabId 
            });
            
            // Send update to any connected web app
            broadcastCaptureStatus();
          }).catch(error => {
            console.error('Error executing script:', error);
            sendResponse({ 
              success: false, 
              error: error.message || 'Failed to execute script' 
            });
          });
        }
      );
    } catch (error) {
      console.error('Error during tab capture:', error);
      sendResponse({ 
        success: false, 
        error: error.message || 'Failed to capture tab audio' 
      });
    }
  } catch (error) {
    console.error('Error in startAudioCapture:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Set up audio processing for the captured stream
 * @param {MediaStream} stream - The captured audio stream
 */
function setupAudioProcessing(stream) {
  // Create audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create analyser node
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  
  // Create source from stream
  const source = audioContext.createMediaStreamSource(stream);
  
  // Connect source to analyser
  source.connect(analyser);
  
  console.log('Audio processing set up successfully');
}

/**
 * Stop audio capture and clean up resources
 */
function stopAudioCapture() {
  console.log('Stopping audio capture...');
  
  // If we have an active tab, send a message to stop the stream
  if (activeTabId) {
    try {
      // Execute script in the tab to clean up resources
      chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        func: () => {
          // Stop the stream tracks
          if (window.darnvizStream) {
            window.darnvizStream.getTracks().forEach(track => track.stop());
            window.darnvizStream = null;
          }
          
          // Close audio context
          if (window.darnvizAudioContext && window.darnvizAudioContext.state !== 'closed') {
            window.darnvizAudioContext.close();
            window.darnvizAudioContext = null;
          }
          
          // Clear analyser
          window.darnvizAnalyser = null;
          
          console.log('Audio capture resources cleaned up');
          return true;
        }
      }).then(results => {
        console.log('Cleanup script executed successfully', results);
      }).catch(error => {
        console.error('Error executing cleanup script:', error);
      });
    } catch (error) {
      console.error('Error cleaning up resources:', error);
    }
  }
  
  // Stop any active streams in background context
  if (captureStream) {
    captureStream.getTracks().forEach(track => track.stop());
    captureStream = null;
  }
  
  // Close audio context in background context
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
  
  // Clear analyser in background context
  analyser = null;
  
  // Reset tab ID
  activeTabId = null;
  
  // Set status flag
  isCapturing = false;
  
  // Send update to any connected web app
  broadcastCaptureStatus();
}

/**
 * Get audio data from the analyser and send it to the requester
 * @param {function} sendResponse - Callback function to send response to sender
 */
function sendAudioData(sendResponse) {
  if (!isCapturing || !analyser) {
    sendResponse({ 
      success: false, 
      error: 'Not capturing audio' 
    });
    return;
  }
  
  try {
    // Get frequency data
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);
    
    // Get time domain data
    const timeData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(timeData);
    
    // Send the data
    sendResponse({
      success: true,
      frequencyData: Array.from(frequencyData),
      timeData: Array.from(timeData),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting audio data:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Broadcast capture status to connected tabs
 */
function broadcastCaptureStatus() {
  chrome.runtime.sendMessage({
    type: 'CAPTURE_STATUS_CHANGED',
    isCapturing,
    activeTabId
  }).catch(error => {
    // Ignore errors from no listeners
    if (!error.message.includes('Could not establish connection')) {
      console.error('Error broadcasting status:', error);
    }
  });
}

console.log('DarnViz background script loaded (Phase 1)');
