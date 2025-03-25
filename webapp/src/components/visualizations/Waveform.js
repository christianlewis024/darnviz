import React, { useRef, useEffect, useContext } from 'react';
import { AudioContext } from '../../context/AudioContext';
import { ThemeContext } from '../../context/ThemeContext';

/**
 * Waveform Visualization Component
 * 
 * Renders a waveform visualization of the audio using Canvas API.
 */
function Waveform({ width, height }) {
  const canvasRef = useRef(null);
  const { isPlaying, getTimeData, getFrequencyData } = useContext(AudioContext);
  const { theme } = useContext(ThemeContext);
  
  // Debug: Force always-on drawing
  const alwaysDrawSomething = true;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Function to draw waveform
    function draw() {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      if (isPlaying || alwaysDrawSomething) {
        const timeData = getTimeData();
        
        // Enhanced debug logging
        if (Date.now() % 2000 < 50) { // Log every ~2 seconds
          console.log('Waveform draw:', {
            'hasData': timeData && timeData.length > 0,
            'dataLength': timeData ? timeData.length : 0,
            'dataType': timeData ? timeData.constructor.name : 'None',
            'isPlaying': isPlaying
          });
          
          if (timeData && timeData.length > 0) {
            // Check if data contains reasonable values
            let min = 255, max = 0, sum = 0;
            for (let i = 0; i < timeData.length; i++) {
              const val = timeData[i];
              if (val < min) min = val;
              if (val > max) max = val;
              sum += val;
            }
            const avg = sum / timeData.length;
            const range = max - min;
            console.log(`Data analysis: min=${min}, max=${max}, avg=${avg.toFixed(2)}, range=${range}`);
          }
        }
        
        // ALWAYS draw something, even if we don't have real data
        if (timeData && timeData.length > 0) {
          // Draw waveform
          ctx.lineWidth = 2;
          ctx.strokeStyle = theme.primary;
          ctx.beginPath();
          
          const sliceWidth = width / timeData.length;
          let x = 0;
          
          for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0;
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
          
          // Also draw a frequency spectrum
          const freqData = getFrequencyData();
          if (freqData && freqData.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = theme.secondary;
            ctx.lineWidth = 1;
            
            const freqSliceWidth = width / freqData.length;
            x = 0;
            
            for (let i = 0; i < freqData.length; i++) {
              // Scale frequency data to fit in lower half of canvas
              const y = height - (freqData[i] / 255.0) * (height / 2);
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              x += freqSliceWidth;
            }
            
            ctx.stroke();
          }
        } else {
          // Draw a fallback sine wave if no real data
          const now = Date.now() / 1000; // Convert to seconds
          ctx.lineWidth = 2;
          ctx.strokeStyle = theme.primary;
          ctx.beginPath();
          
          for (let x = 0; x < width; x++) {
            const t = x / width; // Normalize x to 0-1
            // Multiple sine waves at different frequencies
            const y = height / 2 + 
                    Math.sin(2 * Math.PI * (t * 2 + now)) * height / 4 +
                    Math.sin(2 * Math.PI * (t * 5 + now * 1.1)) * height / 16;
            
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.stroke();
          
          // Also draw a fake frequency spectrum
          ctx.beginPath();
          ctx.strokeStyle = theme.secondary;
          ctx.lineWidth = 1;
          
          for (let x = 0; x < width; x++) {
            const t = x / width; // Normalize x to 0-1
            // Higher values for lower frequencies, declining towards higher frequencies
            const value = Math.max(0, 1 - t) * 0.8 + 0.2 * Math.sin(t * 10 + now * 2);
            const y = height - value * height / 2;
            
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.stroke();
        }
      } else {
        // Draw a message if not playing
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
    
    // Cleanup on unmount
    return () => {
      // No need to cancel animation frame explicitly as component will be unmounted
    };
  }, [width, height, isPlaying, getTimeData, getFrequencyData, theme]);
  
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
