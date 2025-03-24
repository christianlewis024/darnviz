# DarnViz Implementation Plan

This document outlines the phased approach to implementing the DarnViz music visualizer as described in the whitepaper. Each phase focuses on specific components, with clear milestones and validation criteria to ensure steady progress.

## Phase 0: Initial Setup and Architecture

### 0.1 Project Repository and Environment Setup
- Initialize Git repository
- Set up project structure for both extension and web app
- Configure build tools (webpack, babel, etc.)
- Create README with setup instructions

```bash
# Initialize project directory
mkdir -p darnviz/{extension,webapp}
cd darnviz
git init
npm init -y

# Install core dependencies
npm install webpack webpack-cli babel-loader @babel/core @babel/preset-env @babel/preset-react --save-dev
```

### 0.2 Project Configuration Files
- Create webpack configuration
- Set up ESLint and Prettier for code quality
- Configure extension manifest files

```javascript
// webpack.config.js (basic setup for webapp)
const path = require('path');

module.exports = {
  entry: './webapp/src/index.js',
  output: {
    path: path.resolve(__dirname, 'webapp/dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
```

```json
// extension/manifest.json (Chrome Extension Manifest V3)
{
  "manifest_version": 3,
  "name": "DarnViz Audio Capturer",
  "version": "0.1.0",
  "description": "Captures audio from browser tabs for visualization",
  "permissions": ["tabCapture", "activeTab"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

### 0.3 Core Architecture Planning
- Document component interaction flow
- Define communication protocols between extension and web app
- Draft initial API interfaces

**Phase 0 Milestone Summary:**
- Complete project skeleton with proper directory structure
- Working build process that compiles without errors
- Validated extension manifest files for Chrome (and placeholder for Firefox)
- Documentation of the architecture and component interactions
- Git repository with initial commits and proper branching strategy

## Phase 1: Browser Extension Development

### 1.1 Chrome Extension - Basic Structure
- Create extension popup UI
- Implement background script
- Set up message handling

```javascript
// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startCapture") {
    startAudioCapture();
  } else if (message.action === "stopCapture") {
    stopAudioCapture();
  }
  return true;
});

async function startAudioCapture() {
  try {
    // Request tab capture permission
    const stream = await chrome.tabCapture.capture({
      audio: true,
      video: false
    });
    
    // Process the audio stream
    processAudioStream(stream);
  } catch (error) {
    console.error("Error capturing tab audio:", error);
  }
}

function processAudioStream(stream) {
  // Code to process and forward the audio data to the web app
  // Will be implemented in the next phase
}
```

### 1.2 Audio Capture Implementation
- Implement tab-specific audio capture using chrome.tabCapture API
- Add audio processing for stream manipulation
- Set up Web Audio API nodes for analysis

```javascript
// audioCapture.js
function processAudioStream(stream) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  
  // Configure the analyser
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  
  // Connect the nodes
  source.connect(analyser);
  
  // Create data arrays for analysis
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  // Function to capture audio data
  function captureAudioData() {
    analyser.getByteFrequencyData(dataArray);
    
    // Send data to web app (to be implemented)
    sendAudioDataToWebApp(dataArray);
    
    // Continue capturing data
    requestAnimationFrame(captureAudioData);
  }
  
  // Start capturing
  captureAudioData();
}
```

### 1.3 Permissions Management
- Implement permission request UI
- Create granular permission controls
- Add permission persistence

```javascript
// popup.js
document.getElementById('startButton').addEventListener('click', async () => {
  // Check and request necessary permissions
  const permissionStatus = await checkPermissions();
  
  if (permissionStatus) {
    // Start audio capture
    chrome.runtime.sendMessage({ action: "startCapture" });
    
    // Update UI to reflect active capture
    updateCaptureStatus(true);
  } else {
    showPermissionError();
  }
});

async function checkPermissions() {
  try {
    // Request permissions if not already granted
    const result = await chrome.permissions.request({
      permissions: ['tabCapture']
    });
    return result;
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
}
```

### 1.4 Firefox Extension Compatibility
- Adapt Chrome extension for Firefox WebExtensions API
- Test cross-browser functionality
- Implement browser-specific code paths

```javascript
// browser-compat.js
const browserAPI = (function() {
  const isChrome = navigator.userAgent.indexOf("Chrome") !== -1;
  const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1;
  
  return {
    captureTab: async function(options) {
      if (isChrome) {
        return await chrome.tabCapture.capture(options);
      } else if (isFirefox) {
        return await browser.tabs.captureTab(options);
      }
      throw new Error("Unsupported browser");
    },
    
    sendMessage: function(message) {
      if (isChrome) {
        return chrome.runtime.sendMessage(message);
      } else if (isFirefox) {
        return browser.runtime.sendMessage(message);
      }
      throw new Error("Unsupported browser");
    }
  };
})();
```

**Phase 1 Milestone Summary:**
- Functioning Chrome extension that can capture audio from the current tab
- Audio analysis pipeline set up with Web Audio API
- Permission management system with user-friendly dialogs
- Cross-browser compatibility with Firefox (basic functionality)
- Ability to verify audio capture by testing stream data in the console

## Phase 2: Web App Foundation & Communication

### 2.1 React Application Setup
- Initialize React app with core components
- Set up routing and state management
- Create component hierarchy

```bash
# Create React app structure
mkdir -p webapp/src/{components,hooks,utils,context}
touch webapp/src/index.js webapp/src/App.js

# Install React dependencies
npm install react react-dom react-router-dom --save
```

```javascript
// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Visualizer from './components/Visualizer';
import ExtensionCheck from './components/ExtensionCheck';
import AudioProvider from './context/AudioContext';

function App() {
  const [extensionConnected, setExtensionConnected] = useState(false);
  
  useEffect(() => {
    // Check if extension is installed and connected
    window.addEventListener('message', (event) => {
      if (event.data.type === 'DARNVIZ_EXTENSION_CONNECTED') {
        setExtensionConnected(true);
      }
    });
    
    // Announce web app is ready to extension
    window.postMessage({ type: 'DARNVIZ_WEBAPP_READY' }, '*');
  }, []);
  
  return (
    <Router>
      <AudioProvider>
        <div className="darnviz-app">
          {!extensionConnected && <ExtensionCheck />}
          <Routes>
            <Route path="/" element={<Visualizer />} />
          </Routes>
        </div>
      </AudioProvider>
    </Router>
  );
}

export default App;
```

### 2.2 Web Audio API Integration
- Create Audio Context wrapper
- Set up analyzer nodes
- Build audio data processing utility functions

```javascript
// context/AudioContext.js
import React, { createContext, useState, useRef, useEffect } from 'react';

export const AudioContext = createContext();

function AudioProvider({ children }) {
  const [audioData, setAudioData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  
  useEffect(() => {
    // Create Web Audio API context
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    
    // Configure analyser
    analyserRef.current.fftSize = 2048;
    analyserRef.current.smoothingTimeConstant = 0.8;
    
    return () => {
      // Clean up audio context when component unmounts
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Function to process incoming audio stream from extension
  const processStream = (stream) => {
    if (!audioContextRef.current) return;
    
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    setIsPlaying(true);
  };
  
  // Function to get current frequency data
  const getFrequencyData = () => {
    if (!analyserRef.current) return new Uint8Array();
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    return dataArray;
  };
  
  return (
    <AudioContext.Provider 
      value={{ 
        processStream, 
        getFrequencyData, 
        isPlaying, 
        audioData,
        setAudioData
      }}>
      {children}
    </AudioContext.Provider>
  );
}

export default AudioProvider;
```

### 2.3 Extension-Web App Communication
- Implement WebSocket or Message Passing communication
- Create serialization for audio data
- Add secure communication channel

```javascript
// In extension/background.js
function sendAudioDataToWebApp(dataArray) {
  // Use Chrome's message passing API to communicate with the web page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      type: 'AUDIO_DATA',
      data: Array.from(dataArray) // Convert to regular array for serialization
    });
  });
}

// In webapp/src/utils/extensionBridge.js
class ExtensionBridge {
  constructor() {
    this.listeners = new Map();
    this.initializeListener();
  }
  
  initializeListener() {
    // Listen for messages from the extension's content script
    window.addEventListener('message', (event) => {
      // Verify origin for security
      if (event.source !== window) return;
      
      const { type, data } = event.data;
      if (type && this.listeners.has(type)) {
        this.listeners.get(type).forEach(callback => callback(data));
      }
    });
  }
  
  addListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.listeners.get(type).delete(callback);
  }
  
  sendMessage(type, data) {
    window.postMessage({ type, data }, '*');
  }
}

export default new ExtensionBridge();
```

**Phase 2 Milestone Summary:**
- Functional React application structure with core components
- Audio context set up with proper analyzer configuration
- Communication channel established between extension and web app
- Ability to receive and process audio data in the web app
- Verification that audio data flows correctly from extension to web app

## Phase 3: Visualization Implementation

### 3.1 Basic 2D Visualizations
- Implement Canvas-based visualization
- Create waveform visualization
- Add equalizer bars visualization

```javascript
// components/visualizations/Waveform.js
import React, { useRef, useEffect, useContext } from 'react';
import { AudioContext } from '../../context/AudioContext';

function Waveform({ width, height }) {
  const canvasRef = useRef(null);
  const { getFrequencyData, isPlaying } = useContext(AudioContext);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    function draw() {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      if (isPlaying) {
        const dataArray = getFrequencyData();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00CCFF';
        ctx.beginPath();
        
        const sliceWidth = width / dataArray.length;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * height / 2;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          
          x += sliceWidth;
        }
        
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
      
      requestAnimationFrame(draw);
    }
    
    draw();
  }, [width, height, getFrequencyData, isPlaying]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="waveform-visualization"
    />
  );
}

export default Waveform;
```

### 3.2 Three.js Setup and 3D Visualizations
- Set up Three.js environment
- Create 3D geometry visualization
- Implement basic particle system

```javascript
// components/visualizations/ThreeDGeometry.js
import React, { useRef, useEffect, useContext } from 'react';
import * as THREE from 'three';
import { AudioContext } from '../../context/AudioContext';

function ThreeDGeometry({ width, height }) {
  const containerRef = useRef(null);
  const { getFrequencyData, isPlaying } = useContext(AudioContext);
  
  useEffect(() => {
    // Set up scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    
    // Create geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x00ffff,
      emissive: 0x072534,
      side: THREE.DoubleSide,
      flatShading: true
    });
    
    // Create cube and add to scene
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Position camera
    camera.position.z = 5;
    
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      
      if (isPlaying) {
        const dataArray = getFrequencyData();
        
        // Use frequency data to modify cube
        const bassValue = dataArray[0] / 255;
        const midValue = dataArray[20] / 255;
        const trebleValue = dataArray[50] / 255;
        
        cube.scale.x = 1 + bassValue * 2;
        cube.scale.y = 1 + midValue * 2;
        cube.scale.z = 1 + trebleValue * 2;
        
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
      }
      
      renderer.render(scene, camera);
    }
    
    animate();
    
    // Clean up
    return () => {
      containerRef.current.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [width, height, getFrequencyData, isPlaying]);
  
  return <div ref={containerRef} className="three-d-container" />;
}

export default ThreeDGeometry;
```

### 3.3 Audio Reactivity Implementation
- Add frequency analysis utilities
- Implement bass, mid, and treble detection
- Create beat detection algorithm

```javascript
// utils/audioAnalysis.js
export function analyzeAudioData(dataArray) {
  // Split frequency ranges
  // Bass: 20-250Hz, Mids: 250-2000Hz, Treble: 2000-20000Hz
  // This is a simplified approach assuming linear distribution
  const binCount = dataArray.length;
  
  // Calculate approximate bin ranges for each frequency range
  const bassEnd = Math.floor(binCount * 0.1); // ~10% of bins for bass
  const midsEnd = Math.floor(binCount * 0.5); // ~40% of bins for mids
  
  // Calculate average values for each range
  let bassSum = 0;
  let midsSum = 0;
  let trebleSum = 0;
  
  // Calculate bass average (20-250Hz)
  for (let i = 0; i < bassEnd; i++) {
    bassSum += dataArray[i];
  }
  
  // Calculate mids average (250-2000Hz)
  for (let i = bassEnd; i < midsEnd; i++) {
    midsSum += dataArray[i];
  }
  
  // Calculate treble average (2000-20000Hz)
  for (let i = midsEnd; i < binCount; i++) {
    trebleSum += dataArray[i];
  }
  
  return {
    bass: bassSum / bassEnd,
    mids: midsSum / (midsEnd - bassEnd),
    treble: trebleSum / (binCount - midsEnd),
    // Normalized values (0-1)
    bassNorm: bassSum / (bassEnd * 255),
    midsNorm: midsSum / ((midsEnd - bassEnd) * 255),
    trebleNorm: trebleSum / ((binCount - midsEnd) * 255)
  };
}

// Beat detection using energy-based approach
export function detectBeat(dataArray, threshold = 0.15, decay = 0.98) {
  // Keep track of average volume over time
  if (!this.energyHistory) {
    this.energyHistory = new Array(8).fill(0);
    this.beatThreshold = threshold;
    this.beatDecay = decay;
    this.beatCutOff = 0;
  }
  
  // Calculate current energy (bass frequencies primarily)
  const bassEnd = Math.floor(dataArray.length * 0.1);
  let energy = 0;
  
  for (let i = 0; i < bassEnd; i++) {
    energy += dataArray[i];
  }
  
  energy = energy / bassEnd;
  
  // Update energy history
  this.energyHistory.unshift(energy);
  this.energyHistory = this.energyHistory.slice(0, 8); // Keep last 8 values
  
  // Calculate average energy
  const avgEnergy = this.energyHistory.reduce((sum, val) => sum + val, 0) / 
                    this.energyHistory.length;
  
  // Apply decay to beatCutOff
  this.beatCutOff *= this.beatDecay;
  this.beatCutOff = Math.max(this.beatCutOff, avgEnergy * this.beatThreshold);
  
  // Detect if current energy exceeds beatCutOff
  const isBeat = energy > this.beatCutOff;
  
  // If beat detected, increase the cutoff
  if (isBeat) {
    this.beatCutOff = energy;
  }
  
  return {
    isBeat,
    energy,
    beatCutOff: this.beatCutOff
  };
}
```

### 3.4 Visualization Manager
- Create visualization selector component
- Implement visualization switching
- Add transition effects between visualizations

```javascript
// components/VisualizationManager.js
import React, { useState, useEffect } from 'react';
import Waveform from './visualizations/Waveform';
import BarEqualizer from './visualizations/BarEqualizer';
import ThreeDGeometry from './visualizations/ThreeDGeometry';
import ParticleSystem from './visualizations/ParticleSystem';

const VISUALIZATIONS = {
  waveform: {
    name: 'Waveform',
    component: Waveform,
    intricacy: 'simple',
    is3D: false
  },
  equalizer: {
    name: 'Equalizer',
    component: BarEqualizer,
    intricacy: 'simple',
    is3D: false
  },
  threeDGeometry: {
    name: '3D Geometry',
    component: ThreeDGeometry,
    intricacy: 'medium',
    is3D: true
  },
  particles: {
    name: 'Particle System',
    component: ParticleSystem,
    intricacy: 'high',
    is3D: true
  }
};

function VisualizationManager({ selectedViz = 'waveform', intricacy = 'medium' }) {
  const [currentViz, setCurrentViz] = useState(selectedViz);
  const [transitioning, setTransitioning] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Filter visualizations based on intricacy level
  const availableVizualizations = Object.keys(VISUALIZATIONS).filter(key => {
    const viz = VISUALIZATIONS[key];
    if (intricacy === 'simple') return viz.intricacy === 'simple';
    if (intricacy === 'medium') return ['simple', 'medium'].includes(viz.intricacy);
    return true; // All visualizations for 'high' intricacy
  });
  
  // Handle visualization change with transition
  useEffect(() => {
    if (selectedViz !== currentViz) {
      setTransitioning(true);
      const timer = setTimeout(() => {
        setCurrentViz(selectedViz);
        setTransitioning(false);
      }, 500); // 500ms transition
      
      return () => clearTimeout(timer);
    }
  }, [selectedViz, currentViz]);
  
  // Handle window resize
  useEffect(() => {
    function handleResize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Render the current visualization component
  const VisualizationComponent = VISUALIZATIONS[currentViz].component;
  
  return (
    <div className={`visualization-container ${transitioning ? 'transitioning' : ''}`}>
      <VisualizationComponent 
        width={dimensions.width} 
        height={dimensions.height} 
      />
    </div>
  );
}

export default VisualizationManager;
```

**Phase 3 Milestone Summary:**
- Multiple working visualizations (2D and 3D) reacting to audio input
- Audio analysis system that extracts frequency and beat information
- Smooth transitions between different visualization types
- Performance optimized for midrange devices
- Verification that visualizations accurately reflect audio characteristics

## Phase 4: User Interface Development

### 4.1 Minimalistic UI Framework
- Create collapsible UI component
- Implement auto-hide functionality
- Design UI layout and animation

```javascript
// components/ui/CollapsibleUI.js
import React, { useState, useEffect, useRef } from 'react';
import './CollapsibleUI.css';

function CollapsibleUI({ children }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef(null);
  
  // Auto-hide UI after 3 seconds of inactivity
  useEffect(() => {
    function resetTimer() {
      setIsActive(true);
      setIsVisible(true);
      
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!isActive) return;
        setIsVisible(false);
        setIsActive(false);
      }, 3000);
    }
    
    // Set event listeners
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    
    // Initial timer
    resetTimer();
    
    // Cleanup
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timeoutRef.current);
    };
  }, [isActive]);
  
  // Handle keypress to toggle UI visibility
  useEffect(() => {
    function handleKeyPress(e) {
      if (e.key === ' ') { // spacebar
        setIsVisible(prev => !prev);
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  return (
    <div className={`ui-container ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="ui-content">
        {children}
      </div>
    </div>
  );
}

export default CollapsibleUI;
```

```css
/* CollapsibleUI.css */
.ui-container {
  position: fixed;
  bottom: 20px;
  left: 20px;
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 100;
}

.ui-container.visible {
  opacity: 1;
  transform: translateY(0);
}

.ui-container.hidden {
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
}

.ui-content {
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 12px;
  color: white;
  backdrop-filter: blur(5px);
}
```

### 4.2 Theme Implementation
- Create theme context and provider
- Implement predefined themes
- Add custom color palette options

```javascript
// context/ThemeContext.js
import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

// Predefined themes
const THEMES = {
  dark: {
    name: 'Dark',
    background: '#121212',
    primary: '#00CCFF',
    secondary: '#FF00CC',
    accent: '#FFCC00',
    text: '#FFFFFF'
  },
  neon: {
    name: 'Neon',
    background: '#000000',
    primary: '#FF00FF',
    secondary: '#00FFFF',
    accent: '#FFFF00',
    text: '#FFFFFF'
  },
  pastel: {
    name: 'Pastel',
    background: '#F0F0F0',
    primary: '#A5D8FF',
    secondary: '#FFAFD8',
    accent: '#FFFFA5',
    text: '#333333'
  }
};

function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [customColors, setCustomColors] = useState(null);
  
  // Apply theme to document
  useEffect(() => {
    const theme = customColors || THEMES[currentTheme];
    
    document.documentElement.style.setProperty('--color-background', theme.background);
    document.documentElement.style.setProperty('--color-primary', theme.primary);
    document.documentElement.style.setProperty('--color-secondary', theme.secondary);
    document.documentElement.style.setProperty('--color-accent', theme.accent);
    document.documentElement.style.setProperty('--color-text', theme.text);
  }, [currentTheme, customColors]);
  
  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('darnviz-theme');
    const savedColors = localStorage.getItem('darnviz-custom-colors');
    
    if (savedTheme && THEMES[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
    
    if (savedColors) {
      try {
        setCustomColors(JSON.parse(savedColors));
      } catch (e) {
        console.error('Error parsing saved colors:', e);
      }
    }
  }, []);
  
  // Save theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('darnviz-theme', currentTheme);
    
    if (customColors) {
      localStorage.setItem('darnviz-custom-colors', JSON.stringify(customColors));
    } else {
      localStorage.removeItem('darnviz-custom-colors');
    }
  }, [currentTheme, customColors]);
  
  return (
    <ThemeContext.Provider 
      value={{ 
        theme: customColors || THEMES[currentTheme],
        themes: THEMES,
        setTheme: setCurrentTheme,
        customColors,
        setCustomColors
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
```

### 4.3 Customization Controls
- Build theme selector
- Create intricacy level controls
- Implement full-screen toggle
- Add "Find the Vibe" button

```javascript
// components/ui/ControlPanel.js
import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { AudioContext } from '../../context/AudioContext';
import './ControlPanel.css';

function ControlPanel({ onVisualizationChange, currentVisualization, intricacy, setIntricacy }) {
  const { theme, themes, setTheme } = useContext(ThemeContext);
  const { isPlaying } = useContext(AudioContext);
  
  // Handle theme change
  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };
  
  // Handle intricacy change
  const handleIntricacyChange = (e) => {
    setIntricacy(e.target.value);
  };
  
  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };
  
  // Find the Vibe - randomize settings
  const findTheVibe = () => {
    // Choose random theme
    const themeKeys = Object.keys(themes);
    const randomTheme = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    setTheme(randomTheme);
    
    // Choose random visualization based on intricacy
    // This would be implemented using the visualization registry
    // For now, simply choose a random visualization
    onVisualizationChange('random');
  };
  
  return (
    <div className="control-panel">
      <div className="control-group">
        <label htmlFor="theme-select">Theme</label>
        <select 
          id="theme-select" 
          value={theme.name.toLowerCase()}
          onChange={handleThemeChange}
        >
          {Object.keys(themes).map(key => (
            <option key={key} value={key}>
              {themes[key].name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="control-group">
        <label htmlFor="intricacy-select">Detail Level</label>
        <select 
          id="intricacy-select" 
          value={intricacy}
          onChange={handleIntricacyChange}
        >
          <option value="simple">Simple</option>
          <option value="medium">Medium</option>
          <option value="high">High Detail</option>
        </select>
      </div>
      
      <button 
        className="control-button fullscreen-button"
        onClick={toggleFullscreen}
      >
        Fullscreen
      </button>
      
      <button 
        className="control-button vibe-button" 
        onClick={findTheVibe}
        disabled={!isPlaying}
      >
        Find the Vibe
      </button>
    </div>
  );
}

export default ControlPanel;
```

### 4.4 Local Storage Integration
- Implement preferences storage
- Add user preferences loading
- Create default settings fallback

```javascript
// utils/storage.js
const STORAGE_PREFIX = 'darnviz-';

export function savePreference(key, value) {
  try {
    const serializedValue = typeof value === 'object' 
      ? JSON.stringify(value) 
      : String(value);
      
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, serializedValue);
    return true;
  } catch (error) {
    console.error('Error saving preference:', error);
    return false;
  }
}

export function loadPreference(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    
    if (value === null) return defaultValue;
    
    // Try to parse as JSON, fall back to string value
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  } catch (error) {
    console.error('Error loading preference:', error);
    return defaultValue;
  }
}

export function removePreference(key) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    return true;
  } catch (error) {
    console.error('Error removing preference:', error);
    return false;
  }
}

export function clearAllPreferences() {
  try {
    // Only clear items with our prefix
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing preferences:', error);
    return false;
  }
}
```

**Phase 4 Milestone Summary:**
- Fully functional UI with auto-hide behavior
- Multiple themes with customizable color options
- Working controls for visualization selection and intricacy adjustment
- Fullscreen mode and "Find the Vibe" functionality
- Preferences saved and loaded from local storage
- Verification that UI is intuitive and responsive

## Phase 5: Performance Optimization

### 5.1 WebGL and Hardware Acceleration
- Optimize Three.js rendering
- Implement WebGL for 2D visualizations
- Add shader-based effects

```javascript
// utils/webglHelpers.js
import * as THREE from 'three';

// Create optimized renderer
export function createOptimizedRenderer(width, height, alpha = true) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha,
    powerPreference: 'high-performance',
    precision: 'highp'
  });
  
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1); // Cap at 2x for performance
  
  // Enable hardware acceleration
  renderer.physicallyCorrectLights = true;
  
  return renderer;
}

// Simple fragment shader for 2D effects
export const fragmentShader = `
  precision mediump float;
  
  uniform float time;
  uniform vec2 resolution;
  uniform sampler2D audioTexture;
  
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // Sample audio data from texture
    vec4 audioData = texture2D(audioTexture, vec2(uv.x, 0.0));
    
    // Create color based on audio and position
    vec3 color = vec3(0.5 + 0.5 * sin(time + uv.x * 10.0),
                       0.5 + 0.5 * sin(time + uv.y * 10.0),
                       0.5 + 0.5 * cos(time));
                       
    // Use audio amplitude to affect brightness
    float brightness = 0.7 + audioData.r * 0.5;
    
    gl_FragColor = vec4(color * brightness, 1.0);
  }
`;

// Simple vertex shader
export const vertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
```

### 5.2 Dynamic Quality Adjustment
- Implement stats.js for performance monitoring
- Create quality adjustment logic
- Add performance presets

```javascript
// utils/performanceMonitor.js
import Stats from 'stats.js';

class PerformanceMonitor {
  constructor(targetFPS = 60, adjustmentThreshold = 0.8) {
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    
    this.targetFPS = targetFPS;
    this.adjustmentThreshold = adjustmentThreshold;
    this.currentQuality = 'auto';
    this.adjustmentCallback = null;
    this.frameHistory = [];
    this.historyLength = 30; // Average over 30 frames
    this.enabled = true;
  }
  
  start() {
    document.body.appendChild(this.stats.dom);
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.top = '0px';
    this.stats.dom.style.left = '0px';
    this.stats.dom.style.zIndex = '1000';
    
    // Start monitoring
    this.monitorPerformance();
  }
  
  stop() {
    document.body.removeChild(this.stats.dom);
    this.enabled = false;
  }
  
  setQualityAdjustmentCallback(callback) {
    this.adjustmentCallback = callback;
  }
  
  monitorPerformance() {
    if (!this.enabled) return;
    
    this.stats.begin();
    
    // Record current FPS
    this.frameHistory.push(this.stats.end());
    
    // Keep history at defined length
    if (this.frameHistory.length > this.historyLength) {
      this.frameHistory.shift();
    }
    
    // Calculate average FPS
    const avgFPS = this.frameHistory.reduce((sum, fps) => sum + fps, 0) / 
                   this.frameHistory.length;
    
    // Check if adjustment needed
    if (this.adjustmentCallback && this.frameHistory.length >= this.historyLength) {
      if (avgFPS < this.targetFPS * this.adjustmentThreshold) {
        // FPS too low, decrease quality
        this.adjustmentCallback('decrease');
      } else if (avgFPS > this.targetFPS && this.currentQuality !== 'high') {
        // FPS good, can increase quality
        this.adjustmentCallback('increase');
      }
    }
    
    // Continue monitoring
    requestAnimationFrame(() => this.monitorPerformance());
  }
}

export default new PerformanceMonitor();
```

### 5.3 Intricacy Scaling
- Create intricacy-dependent rendering logic
- Implement quality profiles for visualizations
- Add resolution scaling

```javascript
// components/visualizations/ParticleSystem.js (with intricacy scaling)
import React, { useRef, useEffect, useContext, useMemo } from 'react';
import * as THREE from 'three';
import { AudioContext } from '../../context/AudioContext';
import { analyzeAudioData, detectBeat } from '../../utils/audioAnalysis';
import { createOptimizedRenderer } from '../../utils/webglHelpers';

function ParticleSystem({ width, height, intricacy = 'medium' }) {
  const containerRef = useRef(null);
  const { getFrequencyData, isPlaying } = useContext(AudioContext);
  
  // Define particle counts based on intricacy
  const particleCounts = useMemo(() => ({
    'simple': 1000,
    'medium': 5000,
    'high': 15000
  }), []);
  
  // Calculate particle count based on current intricacy
  const particleCount = particleCounts[intricacy];
  
  useEffect(() => {
    // Create scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = createOptimizedRenderer(width, height);
    
    containerRef.current.appendChild(renderer.domElement);
    
    // Create particle system
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Initialize particle positions and colors
    for (let i = 0; i < particleCount; i++) {
      // Random positions in a sphere
      const radius = Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Random colors
      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create particle material
    const particleMaterial = new THREE.PointsMaterial({
      size: intricacy === 'simple' ? 0.2 : (intricacy === 'medium' ? 0.1 : 0.05),
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    // Create the particle system
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // Position camera
    camera.position.z = 30;
    
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      
      if (isPlaying) {
        const dataArray = getFrequencyData();
        const analysis = analyzeAudioData(dataArray);
        const beatInfo = detectBeat(dataArray);
        
        // Update particles based on audio
        const positions = particles.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
          // Update positions based on audio
          const i3 = i * 3;
          
          // Base movement - slow rotation
          const x = positions[i3];
          const y = positions[i3 + 1];
          const z = positions[i3 + 2];
          
          // Calculate distance from center
          const distance = Math.sqrt(x*x + y*y + z*z);
          
          // Apply forces based on audio
          // Bass affects particles close to center
          if (distance < 5) {
            positions[i3] += x * analysis.bassNorm * 0.05;
            positions[i3 + 1] += y * analysis.bassNorm * 0.05;
            positions[i3 + 2] += z * analysis.bassNorm * 0.05;
          }
          // Mids affect particles in the middle range
          else if (distance < 12) {
            positions[i3] += x * analysis.midsNorm * 0.02;
            positions[i3 + 1] += y * analysis.midsNorm * 0.02;
            positions[i3 + 2] += z * analysis.midsNorm * 0.02;
          }
          // Treble affects outer particles
          else {
            positions[i3] += x * analysis.trebleNorm * 0.01;
            positions[i3 + 1] += y * analysis.trebleNorm * 0.01;
            positions[i3 + 2] += z * analysis.trebleNorm * 0.01;
          }
          
          // If beat detected, add pulse effect
          if (beatInfo.isBeat) {
            positions[i3] *= 1.05;
            positions[i3 + 1] *= 1.05;
            positions[i3 + 2] *= 1.05;
          }
          
          // Slowly pull particles back toward origin to prevent them from flying away
          positions[i3] *= 0.99;
          positions[i3 + 1] *= 0.99;
          positions[i3 + 2] *= 0.99;
        }
        
        // Update the particle positions
        particles.attributes.position.needsUpdate = true;
        
        // Rotate the entire system
        particleSystem.rotation.y += 0.002;
      }
      
      renderer.render(scene, camera);
    }
    
    animate();
    
    // Clean up
    return () => {
      containerRef.current.removeChild(renderer.domElement);
      particles.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, [width, height, getFrequencyData, isPlaying, particleCount, intricacy]);
  
  return <div ref={containerRef} className="particle-system-container" />;
}

export default ParticleSystem;
```

### 5.4 Audio Processing Efficiency
- Optimize audio data analysis
- Implement audio buffer management
- Add throttling for heavy calculations

```javascript
// utils/audioProcessingOptimizer.js
class AudioProcessingOptimizer {
  constructor(throttleInterval = 16) { // 16ms ≈ 60fps
    this.throttleInterval = throttleInterval;
    this.lastProcessTime = 0;
    this.cachedResults = {
      frequency: null,
      timeDomain: null,
      analysis: null,
      beat: null
    };
    this.processingActive = false;
  }
  
  // Throttled frequency analysis
  getFrequencyData(analyser, forceUpdate = false) {
    const now = performance.now();
    
    // Return cached data if within throttle interval
    if (!forceUpdate && 
        this.cachedResults.frequency && 
        now - this.lastProcessTime < this.throttleInterval) {
      return this.cachedResults.frequency;
    }
    
    // Get new frequency data
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Cache results
    this.cachedResults.frequency = dataArray;
    this.lastProcessTime = now;
    
    return dataArray;
  }
  
  // Throttled audio analysis (bass, mids, treble)
  analyzeAudioData(dataArray, forceUpdate = false) {
    const now = performance.now();
    
    // Return cached analysis if within throttle interval
    if (!forceUpdate && 
        this.cachedResults.analysis && 
        now - this.lastProcessTime < this.throttleInterval) {
      return this.cachedResults.analysis;
    }
    
    // Avoid overlapping heavy calculations
    if (this.processingActive) {
      return this.cachedResults.analysis || {}; // Return cached or empty object
    }
    
    this.processingActive = true;
    
    // Split frequency ranges (simple version of the full analysis)
    const binCount = dataArray.length;
    
    // Optimize by only analyzing a subset of the data for lower intricacy levels
    const step = window.darnvizIntricacy === 'simple' ? 4 : 
                (window.darnvizIntricacy === 'medium' ? 2 : 1);
    
    // Calculate approximate bin ranges
    const bassEnd = Math.floor(binCount * 0.1);
    const midsEnd = Math.floor(binCount * 0.5);
    
    // Calculate averages more efficiently
    let bassSum = 0, bassCount = 0;
    let midsSum = 0, midsCount = 0;
    let trebleSum = 0, trebleCount = 0;
    
    // Process bass (20-250Hz)
    for (let i = 0; i < bassEnd; i += step) {
      bassSum += dataArray[i];
      bassCount++;
    }
    
    // Process mids (250-2000Hz)
    for (let i = bassEnd; i < midsEnd; i += step) {
      midsSum += dataArray[i];
      midsCount++;
    }
    
    // Process treble (2000-20000Hz)
    for (let i = midsEnd; i < binCount; i += step) {
      trebleSum += dataArray[i];
      trebleCount++;
    }
    
    // Calculate results
    const analysis = {
      bass: bassSum / bassCount,
      mids: midsSum / midsCount,
      treble: trebleSum / trebleCount,
      bassNorm: bassSum / (bassCount * 255),
      midsNorm: midsSum / (midsCount * 255),
      trebleNorm: trebleSum / (trebleCount * 255)
    };
    
    // Cache results
    this.cachedResults.analysis = analysis;
    this.lastProcessTime = performance.now();
    this.processingActive = false;
    
    return analysis;
  }
  
  // Reset cache (call when audio input changes)
  resetCache() {
    this.cachedResults = {
      frequency: null,
      timeDomain: null,
      analysis: null,
      beat: null
    };
    this.lastProcessTime = 0;
  }
  
  // Adjust throttle interval based on performance
  setThrottleInterval(interval) {
    this.throttleInterval = interval;
  }
}

export default new AudioProcessingOptimizer();
```

**Phase 5 Milestone Summary:**
- Optimized WebGL rendering with hardware acceleration
- Performance monitoring and dynamic quality adjustment
- Variable rendering quality based on intricacy levels
- Efficient audio processing with throttling
- Verification that visualizer runs smoothly across target devices
- Measurement of resource usage showing optimization improvements

## Phase 6: Final Integration and Testing

### 6.1 Integration of All Components
- Link extension with web app components
- Ensure all systems work together
- Refine interaction flow

```javascript
// App.js (final integration)
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Visualizer from './components/Visualizer';
import ExtensionCheck from './components/ExtensionCheck';
import CollapsibleUI from './components/ui/CollapsibleUI';
import ControlPanel from './components/ui/ControlPanel';
import VisualizationManager from './components/VisualizationManager';
import AudioProvider from './context/AudioContext';
import ThemeProvider from './context/ThemeContext';
import performanceMonitor from './utils/performanceMonitor';
import { loadPreference, savePreference } from './utils/storage';
import './App.css';

function App() {
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [selectedVisualization, setSelectedVisualization] = useState(
    loadPreference('visualization', 'waveform')
  );
  const [intricacy, setIntricacy] = useState(
    loadPreference('intricacy', 'medium')
  );
  
  // Setup extension detection
  useEffect(() => {
    // Check if extension is installed and connected
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'DARNVIZ_EXTENSION_CONNECTED') {
        setExtensionConnected(true);
      }
    });
    
    // Announce web app is ready to extension
    window.postMessage({ type: 'DARNVIZ_WEBAPP_READY' }, '*');
    
    // Regularly check for extension connection
    const checkInterval = setInterval(() => {
      window.postMessage({ type: 'DARNVIZ_WEBAPP_READY' }, '*');
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(checkInterval);
  }, []);
  
  // Setup performance monitoring
  useEffect(() => {
    // Start performance monitoring
    performanceMonitor.start();
    
    // Set quality adjustment callback
    performanceMonitor.setQualityAdjustmentCallback((action) => {
      if (action === 'decrease' && intricacy !== 'simple') {
        const newIntricacy = intricacy === 'high' ? 'medium' : 'simple';
        setIntricacy(newIntricacy);
      } else if (action === 'increase' && intricacy !== 'high') {
        const newIntricacy = intricacy === 'simple' ? 'medium' : 'high';
        setIntricacy(newIntricacy);
      }
    });
    
    // Make intricacy available to optimization utilities
    window.darnvizIntricacy = intricacy;
    
    return () => {
      performanceMonitor.stop();
    };
  }, [intricacy]);
  
  // Save preferences when they change
  useEffect(() => {
    savePreference('visualization', selectedVisualization);
    savePreference('intricacy', intricacy);
    
    // Update global intricacy setting
    window.darnvizIntricacy = intricacy;
  }, [selectedVisualization, intricacy]);
  
  return (
    <Router>
      <ThemeProvider>
        <AudioProvider>
          <div className="darnviz-app">
            {!extensionConnected && <ExtensionCheck />}
            
            <Routes>
              <Route 
                path="/" 
                element={
                  <>
                    <VisualizationManager 
                      selectedViz={selectedVisualization}
                      intricacy={intricacy}
                    />
                    
                    <CollapsibleUI>
                      <ControlPanel
                        onVisualizationChange={setSelectedVisualization}
                        currentVisualization={selectedVisualization}
                        intricacy={intricacy}
                        setIntricacy={setIntricacy}
                      />
                    </CollapsibleUI>
                  </>
                } 
              />
            </Routes>
          </div>
        </AudioProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
```

### 6.2 Cross-Browser Testing
- Test on Chrome and Firefox
- Verify extension compatibility
- Address browser-specific issues

```bash
# Cross-browser testing setup
# Install necessary testing tools
npm install --save-dev jest puppeteer puppeteer-firefox

# Create browser compatibility test scripts
touch tests/chrome-compatibility.test.js tests/firefox-compatibility.test.js
```

```javascript
// tests/chrome-compatibility.test.js
const puppeteer = require('puppeteer');

describe('Chrome Compatibility Tests', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]
    });
    page = await browser.newPage();
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('Extension loads and connects in Chrome', async () => {
    // Navigate to test page
    await page.goto('http://localhost:3000');
    
    // Wait for extension check element
    await page.waitForSelector('.extension-check');
    
    // Verify extension connection logic works
    const extensionInstallButton = await page.$('.install-extension-button');
    expect(extensionInstallButton).not.toBeNull();
  });
  
  // Add more Chrome-specific tests here
});
```

### 6.3 Performance Testing
- Run benchmarks on different devices
- Measure frame rates
- Test CPU and memory usage

```javascript
// utils/benchmarkTest.js
class BenchmarkTest {
  constructor() {
    this.results = {
      fps: [],
      memory: [],
      cpuLoad: []
    };
    this.testDuration = 30000; // 30 seconds
    this.sampleInterval = 1000; // 1 second
    this.testActive = false;
  }
  
  async runBenchmark(visualizationType, intricacyLevel) {
    if (this.testActive) return null;
    
    this.testActive = true;
    this.results = {
      fps: [],
      memory: [],
      cpuLoad: []
    };
    
    console.log(`Starting benchmark: ${visualizationType} at ${intricacyLevel} intricacy`);
    
    // Set up visualization and intricacy
    window.darnviz.setVisualization(visualizationType);
    window.darnviz.setIntricacy(intricacyLevel);
    
    // Wait for visualization to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const startTime = performance.now();
    const endTime = startTime + this.testDuration;
    
    // Sample performance metrics at intervals
    const sampleInterval = setInterval(() => {
      // Collect performance data
      const fps = performanceMonitor.getCurrentFPS();
      const memory = performance.memory ? {
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize
      } : null;
      
      // Store results
      this.results.fps.push(fps);
      if (memory) this.results.memory.push(memory);
      
      // Check if test is complete
      if (performance.now() >= endTime) {
        clearInterval(sampleInterval);
        this.testActive = false;
        
        // Calculate summary statistics
        const summary = this.calculateSummary();
        console.log(`Benchmark complete:`, summary);
      }
    }, this.sampleInterval);
    
    // Return a promise that resolves when the test completes
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this.calculateSummary());
      }, this.testDuration + 500);
    });
  }
  
  calculateSummary() {
    // Calculate average FPS
    const avgFPS = this.results.fps.reduce((sum, val) => sum + val, 0) / 
                   this.results.fps.length;
                   
    // Calculate FPS stability (standard deviation)
    const fpsVariance = this.results.fps.reduce((sum, val) => {
      return sum + Math.pow(val - avgFPS, 2);
    }, 0) / this.results.fps.length;
    const fpsStdDev = Math.sqrt(fpsVariance);
    
    // Calculate memory statistics if available
    let memoryStats = null;
    if (this.results.memory.length > 0) {
      const avgMemoryUsed = this.results.memory.reduce((sum, val) => {
        return sum + val.usedJSHeapSize;
      }, 0) / this.results.memory.length;
      
      memoryStats = {
        averageUsedJS: avgMemoryUsed,
        peakUsedJS: Math.max(...this.results.memory.map(m => m.usedJSHeapSize))
      };
    }
    
    return {
      visualization: window.darnviz.currentVisualization,
      intricacy: window.darnviz.currentIntricacy,
      fps: {
        average: avgFPS,
        min: Math.min(...this.results.fps),
        max: Math.max(...this.results.fps),
        stability: fpsStdDev
      },
      memory: memoryStats,
      duration: this.testDuration / 1000
    };
  }
}

export default new BenchmarkTest();
```

### 6.4 Final Polishing
- Implement loading indicators
- Add error handling
- Refine user experience details

```javascript
// components/ui/LoadingIndicator.js
import React from 'react';
import './LoadingIndicator.css';

function LoadingIndicator({ text = 'Visualizing...' }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-inner"></div>
      </div>
      <div className="loading-text">{text}</div>
    </div>
  );
}

export default LoadingIndicator;
```

```javascript
// utils/errorHandling.js
class ErrorHandler {
  constructor() {
    this.errorListeners = [];
    this.setupGlobalErrorHandler();
  }
  
  setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
      this.handleError(event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });
  }
  
  handleError(error) {
    console.error('DarnViz Error:', error);
    
    // Determine error category
    let category = 'unknown';
    let recoverable = false;
    
    if (error.message && error.message.includes('WebGL')) {
      category = 'webgl';
      recoverable = true;
    } else if (error.message && error.message.includes('audio')) {
      category = 'audio';
      recoverable = false;
    } else if (error.message && error.message.includes('extension')) {
      category = 'extension';
      recoverable = true;
    }
    
    // Create error info object
    const errorInfo = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      category,
      recoverable,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // Notify listeners
    this.notifyListeners(errorInfo);
    
    // Attempt recovery if possible
    if (recoverable) {
      this.attemptRecovery(category);
    }
  }
  
  attemptRecovery(category) {
    switch (category) {
      case 'webgl':
        // Fall back to simple 2D visualization
        if (window.darnviz && window.darnviz.setVisualization) {
          window.darnviz.setVisualization('waveform');
          window.darnviz.setIntricacy('simple');
        }
        break;
        
      case 'extension':
        // Prompt for extension reinstall
        if (window.darnviz && window.darnviz.showExtensionPrompt) {
          window.darnviz.showExtensionPrompt();
        }
        break;
        
      default:
        // No recovery action
        break;
    }
  }
  
  addListener(callback) {
    this.errorListeners.push(callback);
    return () => {
      this.errorListeners = this.errorListeners.filter(cb => cb !== callback);
    };
  }
  
  notifyListeners(errorInfo) {
    this.errorListeners.forEach(callback => {
      try {
        callback(errorInfo);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }
}

export default new ErrorHandler();
```

**Phase 6 Milestone Summary:**
- Fully integrated application with all components working together
- Cross-browser compatibility confirmed on Chrome and Firefox
- Performance benchmarks showing acceptable frame rates across devices
- Error handling and recovery mechanisms in place
- Polished user experience with loading indicators and smooth transitions
- Final verification that all requirements from the whitepaper are met

## Conclusion and Next Steps

The implementation plan above outlines a comprehensive approach to building the DarnViz music visualizer as specified in the whitepaper. By following these phases, we'll create a polished, performant application that meets all the stated requirements.

### Key Features Implemented
- Browser extension for universal audio capture
- Dynamic 2D and 3D visualizations that react to audio
- Customizable themes and intricacy levels
- Minimalistic, auto-hiding UI
- Performance optimization for a range of devices
- Local storage for user preferences

### Future Enhancements (Post-MVP)
- System-wide audio capture
- Additional visualization styles
- More advanced "Find the Vibe" functionality
- Enhanced performance optimizations
- Mobile device support
- Audio effect processing
