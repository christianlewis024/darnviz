import React, { useRef, useEffect, useContext } from 'react';
import * as THREE from 'three';
import { AudioContext } from '../../context/AudioContext';
import { ThemeContext } from '../../context/ThemeContext';

/**
 * Particle System Visualization Component
 * 
 * Creates a 3D particle system visualization that reacts to audio.
 */
function ParticleSystem({ width, height }) {
  const containerRef = useRef(null);
  const { isPlaying, getFrequencyData, getAudioCharacteristics } = useContext(AudioContext);
  const { theme } = useContext(ThemeContext);
  
  // References for Three.js objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const particlesRef = useRef(null);
  const frameRef = useRef(null);
  
  // Force visualization even without real data
  const alwaysShowViz = true;
  
  useEffect(() => {
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Set up camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 30;
    cameraRef.current = camera;
    
    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // Transparent background
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }
    rendererRef.current = renderer;
    
    // Convert theme color to THREE.Color
    const getPrimaryColor = () => {
      const color = new THREE.Color(theme.primary);
      return color;
    };
    
    const getSecondaryColor = () => {
      const color = new THREE.Color(theme.secondary);
      return color;
    };
    
    // Create particle system
    const createParticles = () => {
      // Remove any existing particles
      if (particlesRef.current) {
        scene.remove(particlesRef.current);
        particlesRef.current.geometry.dispose();
        particlesRef.current.material.dispose();
      }
      
      // Create particle geometry
      const particleCount = 2000;
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      
      // Initialize particles in a sphere
      for (let i = 0; i < particleCount; i++) {
        // Random spherical coordinates
        const radius = Math.random() * 15;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        // Convert to Cartesian coordinates
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Gradient colors from primary to secondary based on distance from center
        const primaryColor = getPrimaryColor();
        const secondaryColor = getSecondaryColor();
        const mix = Math.min(1, radius / 15); // 0 to 1 based on distance
        
        colors[i * 3] = primaryColor.r * (1 - mix) + secondaryColor.r * mix;
        colors[i * 3 + 1] = primaryColor.g * (1 - mix) + secondaryColor.g * mix;
        colors[i * 3 + 2] = primaryColor.b * (1 - mix) + secondaryColor.b * mix;
      }
      
      // Set attributes
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      // Create material
      const particleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      // Create particle system and add to scene
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);
      particlesRef.current = particles;
    };
    
    // Create initial particles
    createParticles();
    
    // Animation function
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      if (particlesRef.current && (isPlaying || alwaysShowViz)) {
        // Get frequency data
        const audioData = getFrequencyData();
        
        // Get audio characteristics (bass, mid, treble, volume)
        const { bass, mid, treble, volume } = getAudioCharacteristics();
        
        // Use synth data if no real data
        const b = audioData.length > 0 ? bass : Math.abs(Math.sin(Date.now() / 1000)) * 0.5;
        const m = audioData.length > 0 ? mid : Math.abs(Math.sin(Date.now() / 800)) * 0.5;
        const t = audioData.length > 0 ? treble : Math.abs(Math.sin(Date.now() / 600)) * 0.5;
        const v = audioData.length > 0 ? volume : Math.abs(Math.sin(Date.now() / 500)) * 0.8;
        
        // Adjust particles based on audio
        const positions = particlesRef.current.geometry.attributes.position.array;
        
        // Apply transformations based on audio
        for (let i = 0; i < positions.length; i += 3) {
          // Get particle position
          const x = positions[i];
          const y = positions[i + 1];
          const z = positions[i + 2];
          
          // Calculate distance from center
          const distance = Math.sqrt(x*x + y*y + z*z);
          
          // Different effects based on distance (inner, middle, outer layers)
          if (distance < 5) {
            // Inner particles affected by bass
            const scale = 1.0 + b * 0.2;
            positions[i] = x * scale;
            positions[i + 1] = y * scale;
            positions[i + 2] = z * scale;
          } else if (distance < 10) {
            // Middle particles affected by mids
            // Apply a slight rotation and scaling
            const angle = m * 0.05;
            const nx = x * Math.cos(angle) - z * Math.sin(angle);
            const nz = x * Math.sin(angle) + z * Math.cos(angle);
            positions[i] = nx;
            positions[i + 2] = nz;
          } else {
            // Outer particles affected by treble
            // Apply some turbulence based on treble and time
            const time = Date.now() / 1000;
            const turbulence = t * 0.1;
            positions[i] += Math.sin(y * 0.1 + time) * turbulence;
            positions[i + 1] += Math.cos(x * 0.1 + time) * turbulence;
            positions[i + 2] += Math.sin(z * 0.1 + time) * turbulence;
          }
        }
        
        // Apply overall transformations based on volume
        particlesRef.current.rotation.y += 0.002 + v * 0.01;
        particlesRef.current.rotation.x += 0.001 + v * 0.005;
        
        // Update the geometry
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }
      
      // Render the scene
      renderer.render(scene, camera);
    };
    
    // Start animation
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && containerRef.current) {
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(newWidth, newHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      if (particlesRef.current) {
        sceneRef.current.remove(particlesRef.current);
        particlesRef.current.geometry.dispose();
        particlesRef.current.material.dispose();
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [width, height, isPlaying, getFrequencyData, getAudioCharacteristics, theme]);
  
  return <div ref={containerRef} className="particle-system" style={{ width, height }} />;
}

export default ParticleSystem;
