/**
 * Browser Compatibility Module - Phase 1 Implementation
 * 
 * Provides a unified API for browser-specific functionality
 * to ensure compatibility with both Chrome and Firefox.
 */

// Determine which browser we're running in
const isFirefox = typeof browser !== 'undefined';
const isChrome = typeof chrome !== 'undefined';

// Create the browser API object with unified methods
const browserAPI = {
  // Runtime API
  runtime: {
    // Send a message to the background script
    sendMessage: function(message, callback) {
      if (isChrome) {
        return chrome.runtime.sendMessage(message, callback);
      } else if (isFirefox) {
        const sending = browser.runtime.sendMessage(message);
        if (callback) {
          sending.then(callback).catch(error => {
            console.error('Error sending message:', error);
            callback({ error: error.message });
          });
        }
        return sending;
      }
    },
    
    // Get the browser extension manifest
    getManifest: function() {
      if (isChrome) {
        return chrome.runtime.getManifest();
      } else if (isFirefox) {
        return browser.runtime.getManifest();
      }
      return {};
    },
    
    // Add a listener for messages
    onMessage: {
      addListener: function(listener) {
        if (isChrome) {
          chrome.runtime.onMessage.addListener(listener);
        } else if (isFirefox) {
          browser.runtime.onMessage.addListener(listener);
        }
      },
      removeListener: function(listener) {
        if (isChrome) {
          chrome.runtime.onMessage.removeListener(listener);
        } else if (isFirefox) {
          browser.runtime.onMessage.removeListener(listener);
        }
      }
    }
  },
  
  // Tabs API
  tabs: {
    // Query for tabs
    query: function(queryInfo) {
      if (isChrome) {
        return new Promise((resolve, reject) => {
          chrome.tabs.query(queryInfo, (tabs) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(tabs);
            }
          });
        });
      } else if (isFirefox) {
        return browser.tabs.query(queryInfo);
      }
      return Promise.resolve([]);
    },
    
    // Get a tab by ID
    get: function(tabId) {
      if (isChrome) {
        return new Promise((resolve, reject) => {
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(tab);
            }
          });
        });
      } else if (isFirefox) {
        return browser.tabs.get(tabId);
      }
      return Promise.resolve(null);
    },
    
    // Create a new tab
    create: function(createProperties) {
      if (isChrome) {
        return new Promise((resolve, reject) => {
          chrome.tabs.create(createProperties, (tab) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(tab);
            }
          });
        });
      } else if (isFirefox) {
        return browser.tabs.create(createProperties);
      }
      return Promise.resolve(null);
    }
  },
  
  // Tab Capture API (with Firefox compatibility)
  tabCapture: {
    // Capture a tab's media stream
    capture: function(constraints) {
      if (isChrome) {
        return new Promise((resolve, reject) => {
          chrome.tabCapture.capture(constraints, (stream) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(stream);
            }
          });
        });
      } else if (isFirefox) {
        // Firefox uses a different API for tab capture
        // Note: Firefox requires 'captureStream' permission
        const tabId = constraints.tabId;
        if (!tabId) {
          return Promise.reject(new Error('Tab ID required for Firefox tab capture'));
        }
        return browser.tabs.captureTab(tabId, { audio: true, video: false });
      }
      return Promise.resolve(null);
    }
  }
};

// Export the API for use in other modules
try {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = browserAPI;
  } else {
    window.browserAPI = browserAPI;
  }
} catch (e) {
  // In browser extension context, just add to window
  window.browserAPI = browserAPI;
}
