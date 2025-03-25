import React, { useRef, useEffect, useContext } from 'react';
import * as THREE from 'three';
import { AudioContext } from '../../context/AudioContext';
import { ThemeContext } from '../../context/ThemeContext';

/**
 * 3D Geometry Visualization Component
 * 
 * Creates a 3D geometric visualization that reacts to audio.
 */
function ThreeDGeometry({ width, height }) {
  const containerRef = useRef(null);
  const { isPlaying, getFrequencyData, getAudioCharacteristics } = useContext(AudioContext);
  const { theme } = useContext(ThemeContext);
  
  // References for Three.js objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const objectsRef = useRef([]);
  const frameRef = useRef(null);
  
  // Force visualization even without real data
  const alwaysShowViz = true;
  
  useEffect(() => {
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Set up camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 15;
    cameraRef.current = camera;
    
    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // Transparent background
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }
    rendererRef.current = renderer;
    
    // Convert theme colors to THREE.Color
    const primaryColor = new THREE.Color(theme.primary);
    const secondaryColor = new THREE.Color(theme.secondary);
    const accentColor = new THREE.Color(theme.accent || '#FFCC00');
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);
    
    // Create different 3D shapes
    const createObjects = () => {
      // Clear any existing objects
      objectsRef.current.forEach(obj => {
        scene.remove(obj);
        obj.geometry.dispose();
        obj.material.dispose();
      });
      objectsRef.current = [];
      
      // Create cube
      const cubeGeometry = new THREE.BoxGeometry(3, 3, 3);
      const cubeMaterial = new THREE.MeshPhongMaterial({
        color: primaryColor,
        emissive: primaryColor.clone().multiplyScalar(0.2),
        specular: 0x111111,
        shininess: 30,
        flatShading: true
      });
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.position.set(-4, 0, 0);
      scene.add(cube);
      objectsRef.current.push(cube);
      
      // Create sphere
      const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
      const sphereMaterial = new THREE.MeshPhongMaterial({
        color: secondaryColor,
        emissive: secondaryColor.clone().multiplyScalar(0.2),
        specular: 0x111111,
        shininess: 30
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(4, 0, 0);
      scene.add(sphere);
      objectsRef.current.push(sphere);
      
      // Create torus
      const torusGeometry = new THREE.TorusKnotGeometry(1.5, 0.5, 100, 16);
      const torusMaterial = new THREE.MeshPhongMaterial({
        color: accentColor,
        emissive: accentColor.clone().multiplyScalar(0.2),
        specular: 0x111111,
        shininess: 30
      });
      const torus = new THREE.Mesh(torusGeometry, torusMaterial);
      torus.position.set(0, 4, 0);
      scene.add(torus);
      objectsRef.current.push(torus);
      
      // Create octahedron
      const octaGeometry = new THREE.OctahedronGeometry(2);
      const octaMaterial = new THREE.MeshPhongMaterial({
        color: primaryColor.clone().lerp(secondaryColor, 0.5),
        emissive: primaryColor.clone().lerp(secondaryColor, 0.5).multiplyScalar(0.2),
        specular: 0x111111,
        shininess: 30,
        flatShading: true
      });
      const octahedron = new THREE.Mesh(octaGeometry, octaMaterial);
      octahedron.position.set(0, -4, 0);
      scene.add(octahedron);
      objectsRef.current.push(octahedron);
    };
    
    // Create initial objects
    createObjects();
    
    // Animation function
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      if (objectsRef.current.length > 0 && (isPlaying || alwaysShowViz)) {
        // Get audio data
        const frequencyData = getFrequencyData();
        
        // Get audio characteristics
        const { bass, mid, treble, volume } = getAudioCharacteristics();
        
        // Use real or synthetic data
        const b = frequencyData.length > 0 ? bass : Math.abs(Math.sin(Date.now() / 1000)) * 0.5;
        const m = frequencyData.length > 0 ? mid : Math.abs(Math.sin(Date.now() / 800)) * 0.5;
        const t = frequencyData.length > 0 ? treble : Math.abs(Math.sin(Date.now() / 600)) * 0.5;
        const v = frequencyData.length > 0 ? volume : Math.abs(Math.sin(Date.now() / 500)) * 0.8;
        
        // Apply transformations to shapes based on audio
        
        // Cube reacts to bass
        const cube = objectsRef.current[0];
        cube.scale.set(1 + b * 0.5, 1 + b * 0.5, 1 + b * 0.5);
        cube.rotation.x += 0.01 + b * 0.02;
        cube.rotation.y += 0.01 + b * 0.02;
        
        // Sphere reacts to mids
        const sphere = objectsRef.current[1];
        sphere.scale.set(1 + m * 0.3, 1 + m * 0.3, 1 + m * 0.3);
        // Create wave-like distortion by moving vertices
        if (sphere.geometry.isBufferGeometry) {
          const positions = sphere.geometry.attributes.position.array;
          const count = positions.length / 3;
          const time = Date.now() / 1000;
          
          for (let i = 0; i < count; i++) {
            const idx = i * 3;
            const x = positions[idx];
            const y = positions[idx + 1];
            const z = positions[idx + 2];
            
            // Calculate offset based on position and audio
            const offset = Math.sin(y * 2 + time) * m * 0.2;
            
            // Apply offset to original position
            positions[idx] = x + offset;
          }
          
          sphere.geometry.attributes.position.needsUpdate = true;
        }
        
        // Torus reacts to treble
        const torus = objectsRef.current[2];
        torus.rotation.x += 0.01 + t * 0.03;
        torus.rotation.y += 0.01 + t * 0.02;
        torus.rotation.z += 0.01 + t * 0.01;
        
        // Octahedron reacts to overall volume
        const octahedron = objectsRef.current[3];
        octahedron.scale.set(1 + v * 0.8, 1 + v * 0.8, 1 + v * 0.8);
        octahedron.rotation.x += 0.01 + v * 0.05;
        octahedron.rotation.z += 0.01 + v * 0.05;
        
        // Rotate the whole scene slightly based on volume
        scene.rotation.y += v * 0.003;
      }
      
      // Render scene
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
      
      // Remove and dispose all objects
      objectsRef.current.forEach(obj => {
        scene.remove(obj);
        obj.geometry.dispose();
        obj.material.dispose();
      });
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [width, height, isPlaying, getFrequencyData, getAudioCharacteristics, theme]);
  
  return <div ref={containerRef} className="three-d-geometry" style={{ width, height }} />;
}

export default ThreeDGeometry;
