// Placeholder for popup logic - to be implemented in Phase 1
document.addEventListener('DOMContentLoaded', function() {
  const startCaptureButton = document.getElementById('startCapture');
  const stopCaptureButton = document.getElementById('stopCapture');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const openVisualizerLink = document.getElementById('openVisualizer');
  
  // Check if audio capture is active
  chrome.runtime.sendMessage({ action: 'getStatus' }, function(response) {
    if (response && response.isCapturing) {
      updateUIForActiveCapture();
    }
  });
  
  // Start capture button click handler
  startCaptureButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'startCapture' }, function(response) {
      if (response && response.success) {
        updateUIForActiveCapture();
      } else {
        // Handle error
        statusText.textContent = 'Failed to start capture';
      }
    });
  });
  
  // Stop capture button click handler
  stopCaptureButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'stopCapture' }, function(response) {
      if (response && response.success) {
        updateUIForInactiveCapture();
      }
    });
  });
  
  // Open visualizer link
  openVisualizerLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://darnviz.example.com' });
  });
  
  // Helper function to update UI for active capture state
  function updateUIForActiveCapture() {
    startCaptureButton.disabled = true;
    stopCaptureButton.disabled = false;
    statusIndicator.classList.remove('status-inactive');
    statusIndicator.classList.add('status-active');
    statusText.textContent = 'Active - Capturing audio';
  }
  
  // Helper function to update UI for inactive capture state
  function updateUIForInactiveCapture() {
    startCaptureButton.disabled = false;
    stopCaptureButton.disabled = true;
    statusIndicator.classList.remove('status-active');
    statusIndicator.classList.add('status-inactive');
    statusText.textContent = 'Inactive';
  }
});
