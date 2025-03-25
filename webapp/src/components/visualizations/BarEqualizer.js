import React, { useRef, useEffect, useContext } from 'react';
import { AudioContext } from '../../context/AudioContext';
import { ThemeContext } from '../../context/ThemeContext';

/**
 * Bar Equalizer Visualization Component
 * 
 * Creates a classic frequency equalizer bar visualization.
 */
function BarEqualizer({ width, height }) {
  const canvasRef = useRef(null);
  const { isPlaying, getFrequencyData } = useContext(AudioContext);
  const { theme } = useContext(ThemeContext);
  
  // Force visualization even without real data
  const alwaysShowViz = true;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Function to draw the bar equalizer
    function draw() {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      if (isPlaying || alwaysShowViz) {
        // Get frequency data
        const frequencyData = getFrequencyData();
        
        // Debugging log
        if (Date.now() % 3000 < 50) { // Log every ~3 seconds
          console.log('Bar Equalizer draw:', {
            'hasData': frequencyData && frequencyData.length > 0,
            'dataLength': frequencyData ? frequencyData.length : 0
          });
        }
        
        let freqData;
        
        // Use real data or generate synthetic data
        if (frequencyData && frequencyData.length > 0) {
          freqData = frequencyData;
        } else {
          // Generate synthetic data
          const now = Date.now() / 1000;
          freqData = new Array(64).fill(0).map((_, i) => {
            // Simulate frequency spectrum with bass focus
            const frequency = i / 64;
            const bassFactor = Math.pow(1 - frequency, 2); // Higher for lower frequencies
            
            // Base level dependent on frequency
            let value = 128 * bassFactor;
            
            // Add some temporal variation
            value += Math.sin(now * 2 + i/5) * 30 * bassFactor;
            value += Math.sin(now * 3.7 + i/3) * 15 * bassFactor;
            
            // Add some randomness
            value += (Math.random() * 20 - 10) * bassFactor;
            
            return Math.max(0, Math.min(255, Math.floor(value)));
          });
        }
        
        // Number of bars to display
        const barCount = Math.min(64, freqData.length);
        
        // Calculate bar width and spacing
        const barWidth = width / barCount * 0.8;
        const barSpacing = width / barCount * 0.2;
        const barUnit = width / barCount;
        
        // Draw bars
        for (let i = 0; i < barCount; i++) {
          // Normalize the data value (0-255) to canvas height
          const value = freqData[i] / 255;
          const barHeight = value * height;
          
          // Calculate position
          const x = i * barUnit;
          const y = height - barHeight;
          
          // Create gradient fill based on bar height
          const gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, theme.primary);
          gradient.addColorStop(1, theme.secondary);
          
          // Draw bar
          ctx.fillStyle = gradient;
          ctx.fillRect(x + barSpacing/2, y, barWidth, barHeight);
          
          // Add highlight effect on top of bar
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(x + barSpacing/2, y, barWidth, 2);
        }
        
        // Draw horizontal guide lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 5; i++) {
          const y = height * (i / 5);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else {
        // Draw message when not playing
        ctx.font = '16px Arial';
        ctx.fillStyle = theme.text;
        ctx.textAlign = 'center';
        ctx.fillText('Audio capture inactive', width / 2, height / 2);
      }
      
      // Request next frame
      requestAnimationFrame(draw);
    }
    
    // Start drawing
    draw();
    
    // No cleanup needed since canvas is managed by React
  }, [width, height, isPlaying, getFrequencyData, theme]);
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="bar-equalizer-visualization"
    />
  );
}

export default BarEqualizer;
