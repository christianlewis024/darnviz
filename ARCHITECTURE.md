# DarnViz Architecture Documentation

This document outlines the component interaction flow and communication protocols for the DarnViz music visualizer project.

## Component Interaction Flow

### High-Level Architecture

DarnViz consists of two main components:

1. **Browser Extension**
   - Captures audio from the browser tab or system
   - Processes audio data through Web Audio API
   - Communicates with the web app

2. **Web Application**
   - Receives audio data from the extension
   - Analyzes audio characteristics
   - Renders visualizations based on audio data
   - Provides user interface for customization

```
┌─────────────────────┐     ┌──────────────────────────────────┐
│  Browser Extension  │     │           Web Application         │
│                     │     │                                  │
│  ┌───────────────┐  │     │  ┌────────────┐   ┌───────────┐  │
│  │ Audio Capture │──┼─────┼─▶│   Audio    │──▶│Visualizer │  │
│  └───────────────┘  │     │  │  Context   │   └───────────┘  │
│                     │     │  └────────────┘         │        │
│  ┌───────────────┐  │     │        │                │        │
│  │ User Consent  │  │     │        ▼                ▼        │
│  └───────────────┘  │     │  ┌────────────┐   ┌───────────┐  │
│                     │     │  │   Theme    │◀──│   User    │  │
└─────────────────────┘     │  │  Context   │   │ Interface │  │
                            │  └────────────┘   └───────────┘  │
                            │                                  │
                            └──────────────────────────────────┘
```

### Detailed Component Interaction

#### 1. Extension Initialization
- User installs the extension
- Extension registers with the browser
- Extension popup UI is initialized

#### 2. Web App Initialization
- User visits the DarnViz web app
- React application loads with default theme
- App checks for extension presence
- If extension is not detected, prompt user to install it

#### 3. Extension Connection
- Web app attempts to connect to the extension
- Extension responds with connection status
- If connected, extension prepares for audio capture

#### 4. Audio Capture Process
- User initiates audio capture from extension popup
- Extension requests necessary permissions
- Audio is captured from selected tab or source
- Audio stream is processed through Web Audio API
- Audio data is sent to the web app

#### 5. Visualization Rendering
- Web app receives audio data via messaging protocol
- Audio Context processes and analyzes the data
- Visualization components render based on audio characteristics
- Rendering is optimized using WebGL/Three.js

#### 6. User Interaction
- User interacts with UI controls
- Theme Context updates visualization appearance
- User selections are saved to localStorage
- UI auto-hides after period of inactivity

## Communication Protocols

### Extension to Web App Communication

The communication between the browser extension and web app is established through a secure channel using one of the following methods:

#### 1. Message Passing API (Primary Method)
```javascript
// In extension (sending data)
chrome.runtime.sendMessage({
  type: 'AUDIO_DATA',
  data: audioDataArray
});

// In web app (receiving data)
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AUDIO_DATA') {
    // Process audio data
    processAudioData(event.data.data);
  }
});
```

#### 2. Content Script Bridge (Alternative Method)
The extension injects a content script that acts as a bridge between the extension and web app, using `window.postMessage()` for communication.

```javascript
// In content script
window.postMessage({
  type: 'DARNVIZ_AUDIO_DATA',
  data: audioDataArray
}, '*');

// In web app
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  
  if (event.data && event.data.type === 'DARNVIZ_AUDIO_DATA') {
    // Process audio data
    processAudioData(event.data.data);
  }
});
```

### Audio Data Format

Audio data is transmitted in a standardized format:

```javascript
{
  type: 'AUDIO_DATA',
  data: {
    frequency: Uint8Array,  // Frequency domain data
    timeDomain: Uint8Array, // Time domain data (waveform)
    timestamp: Number,      // Timestamp for synchronization
    sampleRate: Number,     // Audio sample rate
    fftSize: Number         // FFT size used for analysis
  }
}
```

## Data Flow

1. **Audio Capture**:
   - Tab audio → Extension → Web Audio API → Analyser Node

2. **Audio Processing**:
   - Analyser Node → Frequency & Time Domain Data → Message Bridge

3. **Visualization**:
   - Audio Data → Audio Context → Audio Analysis → Visualization Components

4. **User Settings**:
   - User Input → Theme/Settings Context → localStorage → UI Components

## Security Considerations

- Extension requests minimal permissions (tabCapture, activeTab)
- User consent is required before audio capture begins
- No audio data is stored or transmitted beyond the local system
- Communication is limited to the specific web app domain
- Data is processed locally without external dependencies

## Performance Considerations

- Audio data transmission is optimized for minimal overhead
- Message frequency is throttled to maintain performance
- WebGL is used for hardware-accelerated rendering
- Web Workers may be used for intensive audio analysis
- Dynamic quality adjustment based on device capabilities

This architecture document will be updated as implementation progresses through the phases outlined in the IMPLEMENTATION.md file.
