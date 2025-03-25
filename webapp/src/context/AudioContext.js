import React, { createContext, useState, useRef, useEffect } from 'react';
import extensionBridge from '../utils/extensionBridge';

// Create Audio Context
export const AudioContext = createContext();

/**
 * Audio Provider Component
 * 
 * Provides audio processing functionality to all components.
 * Handles interaction with the extension for audio data.
 */
function AudioProvider({ children }) {
  // State variables
  const [isPlaying, setIsPlaying] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [captureError, setCaptureError] = useState(null);
  const [audioData, setAudioData] = useState({
    frequencyData: new Uint8Array(),
    timeData: new Uint8Array(),
    bass: 0,
    mid: 0,
    treble: 0,
    volume: 0
  });
  
  // Refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const frameIdRef = useRef(null);
  
  // Initialize Web Audio API resources and extension connection
  useEffect(() => {
    console.log('AudioProvider initializing');
    
    // Create audio context
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Configure analyser
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      console.log('Web Audio API initialized');
    } catch (error) {
      console.error('Error initializing Web Audio API:', error);
      setCaptureError('Failed to initialize Web Audio API: ' + error.message);
    }
    
    // Set up extension bridge listeners
    const connectedListener = extensionBridge.addListener('connected', handleExtensionConnected);
    const captureStatusListener = extensionBridge.addListener('captureStatus', handleCaptureStatus);
    const audioDataListener = extensionBridge.addListener('audioData', handleAudioData);
    const errorListener = extensionBridge.addListener('error', handleError);
    
    // Clean up function
    return () => {
      // Remove extension bridge listeners
      connectedListener();
      captureStatusListener();
      audioDataListener();
      errorListener();
      
      // Clean up animation frame
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      console.log('AudioProvider cleanup complete');
    };
  }, []);
  
  // Handle extension connection
  const handleExtensionConnected = (data) => {
    console.log(`Extension connected (version ${data.version})`);
    setExtensionConnected(true);
    setCaptureError(null);
  };
  
  // Handle capture status updates
  const handleCaptureStatus = (data) => {
    console.log(`Capture status updated:`, data);
    setIsPlaying(data.isCapturing);
    
    if (!data.isCapturing) {
      // Reset audio data when capture stops
      setAudioData({
        frequencyData: new Uint8Array(),
        timeData: new Uint8Array(),
        bass: 0,
        mid: 0,
        treble: 0,
        volume: 0
      });
    }
    
    // Set demo mode flag if provided
    if (data.demoMode !== undefined) {
      console.log(`Demo mode: ${data.demoMode ? 'ENABLED' : 'DISABLED'}`);
    }
  };
  
  // Handle incoming audio data
  const handleAudioData = (data) => {
    // Log more detailed information about the received data
    if (Date.now() % 3000 < 50) { // Every ~3 seconds
      console.log(`AudioContext received data:`, {
        'frequencyDataLength': data.frequencyData ? data.frequencyData.length : 'None',
        'timeDataLength': data.timeData ? data.timeData.length : 'None', 
        'timestamp': data.timestamp,
        'hasData': data.frequencyData && data.frequencyData.length > 0 && data.timeData && data.timeData.length > 0
      });
      
      // Additional debug: Check if data arrays contain actual values
      if (data.frequencyData && data.frequencyData.length > 0) {
        const sum = data.frequencyData.reduce((a, b) => a + b, 0);
        console.log(`Frequency data sum: ${sum} (average: ${sum / data.frequencyData.length})`);
      }
    }
    
    // Process audio data for visualization
    const { frequencyData, timeData } = data;
    
    // Ensure we have valid data to work with
    if (!frequencyData || !timeData || frequencyData.length === 0 || timeData.length === 0) {
      console.warn('Received empty or invalid audio data');
      return; // Don't update state with invalid data
    }
    
    // Convert array data to TypedArrays for efficiency
    const freqArray = new Uint8Array(frequencyData);
    const timeArray = new Uint8Array(timeData);
    
    // Calculate audio characteristics
    const bass = calculateFrequencyRange(freqArray, 0, Math.floor(freqArray.length * 0.1));
    const mid = calculateFrequencyRange(freqArray, Math.floor(freqArray.length * 0.1), Math.floor(freqArray.length * 0.5));
    const treble = calculateFrequencyRange(freqArray, Math.floor(freqArray.length * 0.5), freqArray.length - 1);
    const volume = calculateVolume(timeArray);
    
    // Update audio data state and set isPlaying to true since we're receiving data
    setIsPlaying(true);
    setAudioData({
      frequencyData: freqArray,
      timeData: timeArray,
      bass,
      mid,
      treble,
      volume
    });
  };
  
  // Handle errors from the extension
  const handleError = (error) => {
    console.error('Extension error:', error);
    setCaptureError(error.message);
  };
  
  // Calculate average value for a frequency range
  const calculateFrequencyRange = (freqData, startIndex, endIndex) => {
    if (!freqData || freqData.length === 0) return 0;
    
    let sum = 0;
    for (let i = startIndex; i < endIndex; i++) {
      sum += freqData[i];
    }
    return sum / (endIndex - startIndex) / 255; // Normalize to 0-1
  };
  
  // Calculate audio volume from time domain data
  const calculateVolume = (timeData) => {
    if (!timeData || timeData.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const value = (timeData[i] - 128) / 128; // Convert to -1 to 1 range
      sum += value * value; // Square for RMS
    }
    const rms = Math.sqrt(sum / timeData.length);
    return Math.min(1, rms * 4); // Scale for better visualization
  };
  
  // Start audio capture
  const startCapture = () => {
    if (!extensionConnected) {
      setCaptureError('Extension not connected');
      return false;
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setCaptureError(null);
    return extensionBridge.startCapture();
  };
  
  // Stop audio capture
  const stopCapture = () => {
    if (!extensionConnected) {
      setCaptureError('Extension not connected');
      return false;
    }
    
    return extensionBridge.stopCapture();
  };
  
  // Get current frequency data
  const getFrequencyData = () => {
    return audioData.frequencyData;
  };
  
  // Get current time domain data
  const getTimeData = () => {
    return audioData.timeData;
  };
  
  // Get current audio characteristics
  const getAudioCharacteristics = () => {
    return {
      bass: audioData.bass,
      mid: audioData.mid, 
      treble: audioData.treble,
      volume: audioData.volume
    };
  };
  
  // Context value object
  const contextValue = {
    isPlaying,
    extensionConnected,
    captureError,
    startCapture,
    stopCapture,
    getFrequencyData,
    getTimeData,
    getAudioCharacteristics,
    audioData
  };
  
  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
}

export default AudioProvider;
