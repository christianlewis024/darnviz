/**
 * ExtensionBridge - Communication bridge between web app and browser extension
 * 
 * Handles messaging between the extension and web app.
 */
class ExtensionBridge {
  constructor() {
    this.listeners = new Map();
    this.isConnected = false;
    this.isCapturing = false;
    this.extensionVersion = null;
    
    // Initialize connection with extension
    this.initialize();
  }
  
  /**
   * Initialize the extension connection
   */
  initialize() {
    console.log('Initializing extension bridge...');
    
    // Set up listener for messages from the extension
    window.addEventListener('message', this.handleMessage.bind(this));
    
    // Announce that the web app is ready
    this.announceWebAppReady();
    
    // Periodically check for extension connection if not connected
    this.connectionCheckInterval = setInterval(() => {
      if (!this.isConnected) {
        this.announceWebAppReady();
      }
    }, 3000);
    
    return this;
  }
  
  /**
   * Handle incoming messages from the extension
   */
  handleMessage(event) {
    // Ensure message is from the same window (content script uses window.postMessage)
    if (event.source !== window) return;
    
    const data = event.data;
    if (!data || !data.type) return;
    
    // Log incoming messages occasionally
    if (Date.now() % 5000 < 50) { // Every ~5 seconds
      console.log(`ExtensionBridge received message type: ${data.type}`, {
        'hasFrequencyData': data.frequencyData ? 'Yes' : 'No',
        'hasTimeData': data.timeData ? 'Yes' : 'No',
        'timestamp': data.timestamp || 'None'
      });
    }
    
    // Process message based on type
    switch (data.type) {
      case 'DARNVIZ_EXTENSION_LOADED':
      case 'DARNVIZ_EXTENSION_CONNECTED':
        this.handleExtensionConnected(data.version);
        break;
        
      case 'DARNVIZ_CAPTURE_STATUS':
        this.handleCaptureStatus(data.isCapturing, data.tabId);
        break;
        
      case 'DARNVIZ_AUDIO_DATA':
        this.handleAudioData(data);
        break;
        
      case 'AUDIO_DATA_UPDATE': // Also handle this message type from content script
        console.log('Received AUDIO_DATA_UPDATE directly from content script');
        this.handleAudioData(data);
        break;
        
      case 'DARNVIZ_AUDIO_DATA_ERROR':
      case 'DARNVIZ_CAPTURE_ERROR':
      case 'DARNVIZ_AUDIO_PROCESSING_ERROR':
        this.handleError(data.type, data.error);
        break;
        
      case 'DARNVIZ_AUDIO_PROCESSING_READY':
        console.log('Audio processing is ready in the extension');
        this.notifyListeners('processingReady');
        break;
        
      case 'DARNVIZ_READY_ACKNOWLEDGED':
        console.log('Extension acknowledged our ready signal');
        this.notifyListeners('captureStatus', { isCapturing: true });
        break;
        
      default:
        console.log(`Received unknown message type: ${data.type}`);
        break;
    }
  }
  
  /**
   * Handle extension connected event
   */
  handleExtensionConnected(version) {
    console.log(`Extension connected (version ${version})`);
    this.isConnected = true;
    this.extensionVersion = version;
    this.notifyListeners('connected', { version });
  }
  
  /**
   * Handle capture status update
   */
  handleCaptureStatus(isCapturing, tabId) {
    console.log(`Capture status update: ${isCapturing ? 'Active' : 'Inactive'}`);
    this.isCapturing = isCapturing;
    this.notifyListeners('captureStatus', { isCapturing, tabId });
  }
  
  /**
   * Handle audio data
   */
  handleAudioData(data) {
    // Enhanced logging for audio data
    if (Date.now() % 3000 < 50) { // Every ~3 seconds
      console.log('Received audio data from extension:', {
        'timestamp': data.timestamp,
        'frequencyDataLength': data.frequencyData ? data.frequencyData.length : 'None',
        'timeDataLength': data.timeData ? data.timeData.length : 'None',
        'hasValidData': data.frequencyData && data.frequencyData.length > 0 && 
                        data.timeData && data.timeData.length > 0
      });
      
      // Check if we're getting actual data values
      if (data.frequencyData && data.frequencyData.length > 0) {
        const nonZeroCount = data.frequencyData.filter(v => v > 0).length;
        const percentage = (nonZeroCount / data.frequencyData.length * 100).toFixed(1);
        console.log(`Frequency data contains ${nonZeroCount} non-zero values (${percentage}%)`);
      }
    }
    
    // Ensure we have valid data before forwarding
    if (!data.frequencyData || !data.timeData) {
      console.warn('Received invalid audio data (missing frequency or time data)');
      return;
    }
    
    // Forward to listeners
    this.notifyListeners('audioData', {
      frequencyData: data.frequencyData,
      timeData: data.timeData,
      timestamp: data.timestamp
    });
  }
  
  /**
   * Handle error
   */
  handleError(errorType, errorMessage) {
    console.error(`Extension error (${errorType}):`, errorMessage);
    this.notifyListeners('error', { type: errorType, message: errorMessage });
  }
  
  /**
   * Announce that the web app is ready to the extension
   */
  announceWebAppReady() {
    window.postMessage({ type: 'DARNVIZ_WEBAPP_READY' }, '*');
  }
  
  /**
   * Request to start audio data streaming
   */
  startCapture() {
    if (!this.isConnected) {
      console.error('Cannot request audio data: Extension not connected');
      return false;
    }
    
    // Instead of trying to start capture, just tell the extension we're ready to receive data
    window.postMessage({ type: 'DARNVIZ_READY_FOR_DATA' }, '*');
    console.log('Sent READY_FOR_DATA signal to extension');
    return true;
  }
  
  /**
   * Request to stop audio capture
   */
  stopCapture() {
    if (!this.isConnected) {
      console.error('Cannot stop capture: Extension not connected');
      return false;
    }
    
    window.postMessage({ type: 'DARNVIZ_STOP_CAPTURE' }, '*');
    return true;
  }
  
  /**
   * Add a listener for a specific event type
   * @param {string} type - Event type to listen for
   * @param {Function} callback - Callback function to be called when event occurs
   * @returns {Function} Function to remove the listener
   */
  addListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type).add(callback);
    
    // Return function to remove listener
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(callback);
      }
    };
  }
  
  /**
   * Notify all listeners of a specific event type
   * @param {string} type - Event type
   * @param {*} data - Event data
   */
  notifyListeners(type, data) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${type}:`, error);
        }
      });
    }
  }
  
  /**
   * Check if the extension is connected
   * @returns {boolean} Connection status
   */
  isExtensionConnected() {
    return this.isConnected;
  }
  
  /**
   * Get the extension version
   * @returns {string|null} Extension version or null if not connected
   */
  getExtensionVersion() {
    return this.extensionVersion;
  }
  
  /**
   * Cleanup resources when the component unmounts
   */
  cleanup() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    window.removeEventListener('message', this.handleMessage);
    this.listeners.clear();
  }
}

// Export a singleton instance
export default new ExtensionBridge();
