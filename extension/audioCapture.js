/**
 * DarnViz Audio Capture Module - Phase 1 Implementation
 * Provides audio capture and analysis functionality
 */

class AudioCapture {
  constructor() {
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaStreamSource = null;
    this.isCapturing = false;
    this.captureTabId = null;
    this.dataCallback = null;
    this.dataRequestInterval = null;
    this.lastError = null;
  }
  
  /**
   * Request audio capture from a tab using the background script
   * @param {number} tabId - Optional ID of tab to capture, defaults to active tab
   * @returns {Promise<boolean>} Success status
   */
  async requestCapture(tabId = null) {
    try {
      const response = await this._sendMessage({
        action: 'startCapture',
        tabId: tabId
      });
      
      if (response && response.success) {
        this.isCapturing = true;
        this.captureTabId = response.tabId;
        return true;
      } else {
        this.lastError = response?.error || 'Unknown error starting capture';
        console.error('Audio capture failed:', this.lastError);
        return false;
      }
    } catch (error) {
      this.lastError = error.message;
      console.error('Error requesting audio capture:', error);
      return false;
    }
  }
  
  /**
   * Start audio capture directly from a provided media stream
   * @param {MediaStream} stream - The media stream to capture audio from
   * @returns {boolean} Success status
   */
  startCapture(stream) {
    if (!stream) {
      this.lastError = 'No stream provided for audio capture';
      console.error(this.lastError);
      return false;
    }
    
    try {
      // Stop any existing capture
      this.stopCapture();
      
      this.stream = stream;
      
      // Create audio context and analyser node
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyser
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Create media stream source and connect to analyser
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.mediaStreamSource.connect(this.analyser);
      
      this.isCapturing = true;
      console.log('Audio capture started successfully');
      return true;
    } catch (error) {
      this.lastError = error.message;
      console.error('Error starting audio capture:', error);
      this.stopCapture();
      return false;
    }
  }
  
  /**
   * Stop audio capture and clean up resources
   */
  async stopCapture() {
    try {
      // Stop data collection interval if running
      if (this.dataRequestInterval) {
        clearInterval(this.dataRequestInterval);
        this.dataRequestInterval = null;
      }
      
      // If using background capture, tell it to stop
      if (this.captureTabId) {
        await this._sendMessage({
          action: 'stopCapture'
        });
        this.captureTabId = null;
      }
      
      // Stop all tracks in the stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      // Disconnect and clean up audio nodes
      if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect();
        this.mediaStreamSource = null;
      }
      
      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      this.analyser = null;
      this.isCapturing = false;
      this.dataCallback = null;
      
      console.log('Audio capture stopped successfully');
    } catch (error) {
      this.lastError = error.message;
      console.error('Error stopping audio capture:', error);
    }
  }
  
  /**
   * Get current capture status
   * @returns {Promise<Object>} Status object with isCapturing and tabId
   */
  async getStatus() {
    try {
      const response = await this._sendMessage({
        action: 'getStatus'
      });
      
      return {
        isCapturing: response?.isCapturing || this.isCapturing,
        captureTabId: response?.activeTabId || this.captureTabId
      };
    } catch (error) {
      console.error('Error getting capture status:', error);
      return {
        isCapturing: this.isCapturing,
        captureTabId: this.captureTabId,
        error: error.message
      };
    }
  }
  
  /**
   * Get frequency data from the analyser
   * @returns {Promise<Uint8Array>|Uint8Array|null} Frequency data or null if not capturing
   */
  async getFrequencyData() {
    // If using direct capture
    if (this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);
      return dataArray;
    }
    
    // If using background capture
    if (this.captureTabId) {
      try {
        const response = await this._sendMessage({
          action: 'getAudioData'
        });
        
        if (response && response.success) {
          return new Uint8Array(response.frequencyData);
        }
      } catch (error) {
        console.error('Error getting frequency data:', error);
      }
    }
    
    return null;
  }
  
  /**
   * Get time domain data from the analyser
   * @returns {Promise<Uint8Array>|Uint8Array|null} Time domain data or null if not capturing
   */
  async getTimeDomainData() {
    // If using direct capture
    if (this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteTimeDomainData(dataArray);
      return dataArray;
    }
    
    // If using background capture
    if (this.captureTabId) {
      try {
        const response = await this._sendMessage({
          action: 'getAudioData'
        });
        
        if (response && response.success) {
          return new Uint8Array(response.timeData);
        }
      } catch (error) {
        console.error('Error getting time domain data:', error);
      }
    }
    
    return null;
  }
  
  /**
   * Get both frequency and time domain data at once
   * @returns {Promise<Object>|Object|null} Object with frequencyData and timeData
   */
  async getAudioData() {
    // If using background capture
    if (this.captureTabId) {
      try {
        const response = await this._sendMessage({
          action: 'getAudioData'
        });
        
        if (response && response.success) {
          return {
            frequencyData: new Uint8Array(response.frequencyData),
            timeData: new Uint8Array(response.timeData),
            timestamp: response.timestamp
          };
        }
      } catch (error) {
        console.error('Error getting audio data:', error);
      }
    }
    
    // If using direct capture
    if (this.analyser) {
      const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(frequencyData);
      
      const timeData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteTimeDomainData(timeData);
      
      return {
        frequencyData,
        timeData,
        timestamp: Date.now()
      };
    }
    
    return null;
  }
  
  /**
   * Start streaming audio data at regular intervals
   * @param {Function} callback - Function to call with audio data
   * @param {number} interval - Interval in milliseconds (default: 50)
   */
  startDataStream(callback, interval = 50) {
    if (!this.isCapturing) {
      console.error('Cannot start data stream: not capturing');
      return false;
    }
    
    // Stop any existing stream
    if (this.dataRequestInterval) {
      clearInterval(this.dataRequestInterval);
    }
    
    this.dataCallback = callback;
    
    // Set up interval to request data
    this.dataRequestInterval = setInterval(async () => {
      const data = await this.getAudioData();
      if (data && this.dataCallback) {
        this.dataCallback(data);
      }
    }, interval);
    
    return true;
  }
  
  /**
   * Stop streaming audio data
   */
  stopDataStream() {
    if (this.dataRequestInterval) {
      clearInterval(this.dataRequestInterval);
      this.dataRequestInterval = null;
    }
    this.dataCallback = null;
  }
  
  /**
   * Get the last error message
   * @returns {string|null} Error message or null if no error
   */
  getLastError() {
    return this.lastError;
  }
  
  /**
   * Send a message to the background script
   * @private
   * @param {Object} message - Message to send
   * @returns {Promise<any>} Response from background script
   */
  _sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Create and export instance
const audioCapture = new AudioCapture();

// Export for use in other modules
try {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = audioCapture;
  } else {
    window.audioCapture = audioCapture;
  }
} catch (e) {
  // In Chrome extension context, just add to window
  window.audioCapture = audioCapture;
}
