import React, { useState, useEffect } from 'react';
import Waveform from './visualizations/Waveform';
import BarEqualizer from './visualizations/BarEqualizer';
import ThreeDGeometry from './visualizations/ThreeDGeometry';
import ParticleSystem from './visualizations/ParticleSystem';

// Visualization registry
const VISUALIZATIONS = {
  waveform: {
    name: 'Waveform',
    component: Waveform,
    description: 'Classic waveform visualization showing audio amplitude over time',
    intricacy: 'simple',
    is3D: false
  },
  equalizer: {
    name: 'Bar Equalizer',
    component: BarEqualizer,
    description: 'Frequency spectrum analyzer with equalizer bars',
    intricacy: 'simple',
    is3D: false
  },
  geometry: {
    name: '3D Geometry',
    component: ThreeDGeometry,
    description: '3D shapes that react to different audio frequencies',
    intricacy: 'medium',
    is3D: true
  },
  particles: {
    name: 'Particle System',
    component: ParticleSystem,
    description: 'Dynamic particle system that flows with the music',
    intricacy: 'high',
    is3D: true
  }
};

/**
 * Visualization Manager Component
 * 
 * Manages and switches between different visualization types.
 */
function VisualizationManager({ 
  width, 
  height, 
  selectedViz = 'waveform', 
  intricacy = 'medium',
  onVizInfoChange = () => {} 
}) {
  // State for current visualization and transitions
  const [currentViz, setCurrentViz] = useState(selectedViz);
  const [transitioning, setTransitioning] = useState(false);
  
  // Get available visualizations based on intricacy level
  const getAvailableVisualizations = () => {
    return Object.entries(VISUALIZATIONS).filter(([key, viz]) => {
      if (intricacy === 'simple') return viz.intricacy === 'simple';
      if (intricacy === 'medium') return ['simple', 'medium'].includes(viz.intricacy);
      return true; // All visualizations for 'high' intricacy
    }).reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  };
  
  // Available visualizations based on current intricacy
  const availableVizualizations = getAvailableVisualizations();
  
  // Update current visualization when selected or intricacy changes
  useEffect(() => {
    if (selectedViz !== currentViz) {
      // Check if selected visualization is available at current intricacy
      if (availableVizualizations[selectedViz]) {
        setTransitioning(true);
        
        // Delay the actual switch for transition effect
        const timer = setTimeout(() => {
          setCurrentViz(selectedViz);
          setTransitioning(false);
        }, 500); // 500ms transition
        
        return () => clearTimeout(timer);
      } else {
        // If not available, find the first available one
        const firstAvailable = Object.keys(availableVizualizations)[0];
        if (firstAvailable && firstAvailable !== currentViz) {
          setCurrentViz(firstAvailable);
          
          // Inform parent about the change
          onVizInfoChange({
            id: firstAvailable,
            ...availableVizualizations[firstAvailable]
          });
        }
      }
    }
  }, [selectedViz, currentViz, intricacy, availableVizualizations, onVizInfoChange]);
  
  // Get current visualization component
  const CurrentVisualization = VISUALIZATIONS[currentViz]?.component || Waveform;
  
  // Provide info about current visualization to parent
  useEffect(() => {
    if (VISUALIZATIONS[currentViz]) {
      onVizInfoChange({
        id: currentViz,
        ...VISUALIZATIONS[currentViz]
      });
    }
  }, [currentViz, onVizInfoChange]);
  
  return (
    <div 
      className={`visualization-container ${transitioning ? 'transitioning' : ''}`}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <CurrentVisualization width={width} height={height} />
    </div>
  );
}

export default VisualizationManager;
