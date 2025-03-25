import React, { useContext, useState, useEffect, useRef } from 'react';
import AudioProvider, { AudioContext } from './context/AudioContext';
import ThemeProvider, { ThemeContext } from './context/ThemeContext';
import ExtensionCheck from './components/ExtensionCheck';
import Waveform from './components/visualizations/Waveform';
import './App.css';

/**
 * Main application component wrapper
 * Provides context providers and initial layout
 */
function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <AppContent />
      </AudioProvider>
    </ThemeProvider>
  );
}

/**
 * Main application content
 * Uses context values to render appropriate UI
 */
function AppContent() {
  const { isPlaying, extensionConnected, startCapture, stopCapture } = useContext(AudioContext);
  const { theme } = useContext(ThemeContext);
  const [visualizerSize, setVisualizerSize] = useState({ width: 800, height: 400 });
  const containerRef = useRef(null);

  // Update visualizer size based on container size
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setVisualizerSize({ 
          width: Math.floor(width * 0.95), 
          height: Math.floor(height * 0.9) 
        });
      }
    };
    
    // Initial size
    updateSize();
    
    // Update on resize
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [extensionConnected]);

  return (
    <div className="darnviz-app" style={{ backgroundColor: theme.background, color: theme.text }}>
      <header className="app-header">
        <h1 style={{ color: theme.primary }}>DarnViz</h1>
        <p>Real-time Music Visualization</p>
      </header>
      
      <main className="app-content">
        {!extensionConnected && <ExtensionCheck />}
        
        {extensionConnected && (
          <div className="visualization-container" ref={containerRef}>
            <div className="visualization-placeholder" 
                 style={{ backgroundColor: theme.background === '#121212' ? '#1E1E1E' : '#E0E0E0' }}>
              <div className="debug-info">
                <p>Extension Connected: {extensionConnected ? 'Yes' : 'No'}</p>
                <p>Audio Capture: {isPlaying ? 'Active' : 'Inactive'}</p>
              </div>
              
              {isPlaying ? (
                <Waveform width={visualizerSize.width} height={visualizerSize.height} />
              ) : (
                <div className="instruction-panel">
                  <h3>Audio Capture Instructions</h3>
                  <ol>
                    <li>Go to a tab with audio playing (YouTube, Spotify, etc.)</li>
                    <li>Click the DarnViz extension icon</li>
                    <li>Click <strong>Open Visualizer</strong> to begin capturing audio</li>
                    <li>Return to this tab to see the visualization</li>
                  </ol>
                  <p className="note">Note: The visualizer will use synthetic data for demonstration purposes.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      <footer className="app-footer">
        <p>Phase 2: Web App Foundation & Communication</p>
      </footer>
    </div>
  );
}

export default App;
