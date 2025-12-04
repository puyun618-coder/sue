import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';

const Star: React.FC<{ treeState: TreeState }> = ({ treeState }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Directions for a 12-pointed star (Icosahedron vertices)
  // This creates a stellated appearance (Star of Bethlehem / Moravian Star style)
  const pointers = useMemo(() => {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];
    return v.map(p => new THREE.Vector3(...p).normalize());
  }, []);

  // Shared material for all spikes to enable unified pulsing
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFD700'), // 24K Gold
    emissive: new THREE.Color('#FFAA00'), // Warm orange-gold glow
    metalness: 1.0,
    roughness: 0.1, // Very polished
    envMapIntensity: 2.0,
  }), []);

  // Pre-calculate positions
  // Tree is height 12 centered at 0, so top is +6. We place star slightly above.
  const treePos = new THREE.Vector3(0, 6.25, 0); 
  
  const scatterPos = useMemo(() => {
    const r = 20; // Start further out than ornaments
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // --- State Transition Logic ---
    const targetProgress = treeState === TreeState.TREE_SHAPE ? 1 : 0;
    const currentProgress = groupRef.current.userData.progress ?? 0;
    
    // Smooth transition
    const progress = THREE.MathUtils.lerp(currentProgress, targetProgress, delta * 1.5);
    groupRef.current.userData.progress = progress;
    
    // Custom Ease for organic feel
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    // Position Interpolation
    groupRef.current.position.lerpVectors(scatterPos, treePos, ease);

    // Rotation & Scale Logic
    const time = state.clock.getElapsedTime();
    
    if (progress < 0.9) {
        // Floating Chaos state
        groupRef.current.rotation.x += delta * 0.5;
        groupRef.current.rotation.z += delta * 0.3;
        // Smaller when scattered
        const s = THREE.MathUtils.lerp(0.5, 1.4, ease);
        groupRef.current.scale.setScalar(s);
    } else {
        // Formed State (Top of Tree)
        // Stabilize orientation to be upright
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 3);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 3);
        
        // Continuous slow spin on Y axis
        groupRef.current.rotation.y += delta * 0.5; 
        
        // Slight hover/bobbing
        groupRef.current.position.y = treePos.y + Math.sin(time * 2) * 0.1;
        
        groupRef.current.scale.setScalar(1.4);
    }

    // --- Pulsing Glow Effect ---
    // Sine wave pulse 0.5 to 1.5 intensity variation
    const pulse = Math.sin(time * 2.5) * 0.5 + 0.5; 
    material.emissiveIntensity = 1.0 + pulse * 3.0; // High intensity for Bloom
  });

  return (
    <group ref={groupRef}>
      {/* Internal light source to illuminate tree top */}
      <pointLight distance={8} intensity={15} color="#FFD700" decay={2} />
      
      {/* The 12 Spikes forming the Star */}
      {pointers.map((dir, i) => {
        // Rotate cone to point in the vertex direction
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        return (
          <mesh key={i} quaternion={quaternion} material={material}>
             {/* 4 radial segments = Square Pyramid Spike (Sharp/Geometric look) */}
             <coneGeometry args={[0.18, 1.2, 4]} /> 
          </mesh>
        );
      })}
    </group>
  );
};

export default Star;