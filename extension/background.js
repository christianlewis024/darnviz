// Background script for DarnViz extension - Phase 2 implementation

// Always use demo mode initially until real audio capture is working
let demoMode = true;
let visualizerTabId = null;  // Tab ID where visualizations are displayed
let isCapturing = false;
let dataInterval = null;

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.action === 'startCapture') {
    console.log('Starting capture in demo mode');
    startDemoAudioCapture(sendResponse);
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
      visualizerTabId,
      demoMode
    });
  }
  else if (message.action === 'openVisualizer') {
    openVisualizerTab(sendResponse);
    return true;
  }
  else if (message.action === 'webAppReadyForData') {
    // The web app tab is ready to receive audio data
    console.log('Web app is ready to receive audio data', message);
    
    // Store the web app tab ID
    const receiverTabId = sender.tab ? sender.tab.id : null;
    visualizerTabId = receiverTabId;
    
    chrome.storage.local.set({ visualizerTabId: receiverTabId }, function() {
      console.log('Visualizer tab ID set:', receiverTabId);
      
      // If we're already capturing, start sending data to this tab
      if (isCapturing && receiverTabId) {
        try {
          chrome.tabs.sendMessage(receiverTabId, {
            type: 'DARNVIZ_CAPTURE_STATUS',
            isCapturing: true,
            demoMode: demoMode
          });
          
          // If no data interval is running, start it
          if (!dataInterval) {
            startAudioDataInterval();
          }
        } catch (error) {
          console.error('Error sending capture status:', error);
        }
      }
      
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Must return true for asynchronous response
  return true;
});

/**
 * Open the visualizer tab
 */
function openVisualizerTab(sendResponse) {
  console.log('Opening visualizer tab...');
  
  // Open the visualizer tab
  chrome.tabs.create({ url: 'http://localhost:3000/' }, function(tab) {
    if (chrome.runtime.lastError) {
      console.error('Error opening visualizer tab:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
      return;
    }
    
    console.log('Successfully opened visualizer tab with ID:', tab.id);
    visualizerTabId = tab.id;
    
    // Store the tab ID for reference
    chrome.storage.local.set({ visualizerTabId: tab.id }, function() {
      console.log('Stored visualizer tab ID:', tab.id);
      
      // If we aren't capturing yet, start demo capture
      if (!isCapturing) {
        console.log('Starting demo capture for new visualizer tab');
        startDemoAudioCapture();
      }
      
      sendResponse({ success: true, tabId: tab.id });
    });
  });
}

/**
 * Start demo audio capture with synthetic data
 */
function startDemoAudioCapture(sendResponse) {
  console.log('Starting demo audio capture...');
  
  // Set status flags
  demoMode = true;
  isCapturing = true;
  
  // Start sending audio data to the visualizer tab
  startAudioDataInterval();
  
  // Send success response if callback provided
  if (sendResponse) {
    sendResponse({ 
      success: true, 
      demoMode: true 
    });
  }
  
  // Broadcast status change
  broadcastCaptureStatus();
  
  return true;
}

/**
 * Start sending synthetic audio data at regular intervals
 */
function startAudioDataInterval() {
  // Clear any existing interval
  if (dataInterval) {
    clearInterval(dataInterval);
  }
  
  console.log('Starting synthetic audio data generation...');
  
  // Set interval to broadcast audio data every 50ms
  dataInterval = setInterval(() => {
    try {
      if (isCapturing) {
        // Get the visualizer tab ID from storage or use the stored variable
        chrome.storage.local.get(['visualizerTabId'], function(result) {
          const receiverTabId = result.visualizerTabId || visualizerTabId;
          
          if (receiverTabId) {
            // Log the sending process occasionally
            if (Date.now() % 3000 < 50) { // Every ~3 seconds
              console.log(`Sending synthetic audio data to visualizer tab ${receiverTabId}`);
            }
            
            // Create synthetic waveform data (time domain)
            const now = Date.now() / 1000; // Convert to seconds
            const frequency = 2; // 2 Hz
            const amplitude = 50; // Amplitude of the wave
            const baseValue = 128; // Center value (128 for unsigned 8-bit)
            
            // Create time domain data (sine wave)
            const timeData = new Array(128);
            for (let i = 0; i < timeData.length; i++) {
              const t = i / timeData.length;
              // Multiple sine waves at different frequencies for more interesting waveform
              timeData[i] = Math.floor(
                baseValue + 
                amplitude * Math.sin(2 * Math.PI * (t * 1 + now * frequency)) +
                amplitude/3 * Math.sin(2 * Math.PI * (t * 3 + now * frequency * 1.1)) +
                amplitude/5 * Math.sin(2 * Math.PI * (t * 5 + now * frequency * 0.9))
              );
            }
            
            // Create frequency domain data (spectrum)
            const frequencyData = new Array(64);
            for (let i = 0; i < frequencyData.length; i++) {
              // More bass-heavy spectrum (higher values for lower frequencies)
              const bassFactor = Math.pow(1 - i/frequencyData.length, 2); // Higher for lower indices
              
              // Base spectrum shape (falloff from low to high frequencies)
              let value = 200 * bassFactor;
              
              // Add some temporal variation based on time
              const variation = Math.sin(now * 2 + i/10) * 20 * bassFactor;
              value += variation;
              
              // Add some randomness
              value += (Math.random() * 30 - 15) * bassFactor;
              
              // Ensure value is within valid range (0-255)
              frequencyData[i] = Math.max(0, Math.min(255, Math.floor(value)));
            }
            
            // Send to the visualizer tab
            try {
              chrome.tabs.sendMessage(receiverTabId, {
                type: 'DARNVIZ_AUDIO_DATA',
                frequencyData: frequencyData,
                timeData: timeData,
                timestamp: Date.now()
              }, function(response) {
                if (chrome.runtime.lastError) {
                  console.log(`Error sending to visualizer tab ${receiverTabId}:`, chrome.runtime.lastError);
                  
                  // Check if the tab still exists
                  chrome.tabs.get(receiverTabId, function() {
                    if (chrome.runtime.lastError) {
                      console.log('Visualizer tab no longer exists, stopping data transmission');
                      stopAudioCapture();
                    }
                  });
                }
              });
            } catch (err) {
              console.log(`Error sending audio data to tab ${receiverTabId}:`, err);
            }
          } else {
            console.log('No visualizer tab ID available, stopping data generation');
            stopAudioCapture();
          }
        });
      }
    } catch (error) {
      console.error('Error in audio data interval:', error);
    }
  }, 50); // 50ms = ~20fps
}

/**
 * Stop audio capture and clean up resources
 */
function stopAudioCapture() {
  console.log('Stopping audio capture...');
  
  // Stop audio data interval
  if (dataInterval) {
    clearInterval(dataInterval);
    dataInterval = null;
  }
  
  // Reset flags
  isCapturing = false;
  
  // Send update to any connected web app
  broadcastCaptureStatus();
  
  console.log('Audio capture stopped successfully');
}

/**
 * Broadcast capture status to connected tabs
 */
function broadcastCaptureStatus() {
  if (visualizerTabId) {
    try {
      chrome.tabs.sendMessage(visualizerTabId, {
        type: 'DARNVIZ_CAPTURE_STATUS',
        isCapturing: isCapturing,
        demoMode: demoMode
      });
      console.log('Broadcast capture status to visualizer tab:', { isCapturing, demoMode });
    } catch (error) {
      console.error('Error sending capture status to visualizer tab:', error);
    }
  }
}

console.log('DarnViz background script loaded (Phase 2) - Demo mode enabled');
