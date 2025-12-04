import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, DualPosition } from '../types';
import { generatePilePositions } from '../utils/math';

interface GiftData extends DualPosition {
  size: [number, number, number];
  boxColor: string;
  ribbonColor: string;
  id: number;
}

// Reusable geometries to save memory
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const ribbonGeoV = new THREE.BoxGeometry(1.02, 1, 0.15); // Width stretch
const ribbonGeoH = new THREE.BoxGeometry(0.15, 1, 1.02); // Depth stretch
const bowGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 16, Math.PI * 2);

interface GiftProps {
  treeState: TreeState;
  data: GiftData;
}

const Gift: React.FC<GiftProps> = ({ treeState, data }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create materials only once per component instance
  const materials = useMemo(() => {
    return {
      box: new THREE.MeshPhysicalMaterial({
        color: data.boxColor,
        emissive: data.boxColor, // Self-illuminated
        emissiveIntensity: 0.2,  // Initial value, will be animated
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 1.0,        // Glossy wrapping paper finish
        clearcoatRoughness: 0.1,
        reflectivity: 1.0,
      }),
      ribbon: new THREE.MeshStandardMaterial({
        color: data.ribbonColor,
        roughness: 0.4,       // Satin/Fabric feel
        metalness: 0.6,       // Slight metallic sheen
        emissive: data.ribbonColor,
        emissiveIntensity: 0.1, // Initial value
      })
    };
  }, [data.boxColor, data.ribbonColor]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // --- State Transition Logic ---
    const currentProgress = groupRef.current.userData.progress ?? 0;
    const targetProgress = treeState === TreeState.TREE_SHAPE ? 1 : 0;
    const newProgress = THREE.MathUtils.lerp(currentProgress, targetProgress, 2.0 * delta);
    groupRef.current.userData.progress = newProgress;

    // Custom Ease
    const ease = newProgress < 0.5 
      ? 2 * newProgress * newProgress 
      : -1 + (4 - 2 * newProgress) * newProgress;

    const { treePosition, scatterPosition, rotation, scale, id } = data;

    // Position Interpolation
    groupRef.current.position.set(
      THREE.MathUtils.lerp(scatterPosition[0], treePosition[0], ease),
      THREE.MathUtils.lerp(scatterPosition[1], treePosition[1], ease),
      THREE.MathUtils.lerp(scatterPosition[2], treePosition[2], ease)
    );

    // Rotation & Scale Animation
    const time = state.clock.getElapsedTime();
    if (newProgress < 0.8) {
      // Floating/Tumbling state
      groupRef.current.rotation.set(
        rotation[0] + time * 0.5,
        rotation[1] + time * 0.3,
        rotation[2] + time * 0.2
      );
    } else {
      // Settle on ground
      groupRef.current.rotation.set(
        THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 5),
        rotation[1], // Keep original Y rotation
        THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 5)
      );
    }

    groupRef.current.scale.setScalar(scale);

    // --- Pulsing Glow Animation ---
    // Similar to Star.tsx, creates a breathing/shimmering effect
    // We add a phase offset based on ID so they don't all blink in perfect unison
    const pulse = Math.sin(time * 2.5 + id * 0.2) * 0.5 + 0.5; // Range 0 to 1

    // Box Glow: Base 0.25 + Pulse up to 0.75
    materials.box.emissiveIntensity = 0.25 + pulse * 0.5;
    
    // Ribbon Glow: Base 0.15 + Pulse up to 0.45
    materials.ribbon.emissiveIntensity = 0.15 + pulse * 0.3;
  });

  const [w, h, d] = data.size;

  return (
    <group ref={groupRef} dispose={null}>
      {/* Main Box Body */}
      <mesh 
        geometry={boxGeometry} 
        material={materials.box} 
        scale={[w, h, d]} 
        castShadow 
        receiveShadow 
      />

      {/* Ribbon - Vertical Band (Wraps around X axis) */}
      <mesh 
        geometry={ribbonGeoV} 
        material={materials.ribbon} 
        scale={[w, h, d]} 
      />

      {/* Ribbon - Horizontal Band (Wraps around Z axis) */}
      <mesh 
        geometry={ribbonGeoH} 
        material={materials.ribbon} 
        scale={[w, h, d]}
      />

      {/* Bow on Top */}
      <group position={[0, h / 2, 0]} scale={[w, w, w]}> 
        <mesh 
            geometry={bowGeo} 
            material={materials.ribbon} 
            rotation={[0, Math.PI / 4, 0]} 
            position={[0, 0.08, 0]}
            scale={[1, 1, 0.5]}
        />
        <mesh 
            geometry={bowGeo} 
            material={materials.ribbon} 
            rotation={[0, -Math.PI / 4, 0]} 
            position={[0, 0.08, 0]}
            scale={[1, 1, 0.5]}
        />
      </group>
    </group>
  );
};

const Presents: React.FC<{ treeState: TreeState }> = ({ treeState }) => {
  const gifts = useMemo(() => {
    // Determine floor level based on average box height
    const floorY = -6; 
    const count = 80;
    
    // Generate raw positions
    const rawPositions = generatePilePositions(count, 6, floorY);

    // Color Palettes
    const boxColors = ['#8B0000', '#0F5940', '#F5F5DC', '#FFD700', '#1a1a1a']; // Red, Green, Cream, Gold, Black
    const ribbonColors = ['#FFD700', '#C0C0C0', '#8B0000']; // Gold, Silver, Red

    return rawPositions.map((pos, i) => {
      // Random Dimensions
      const w = 0.4 + Math.random() * 0.4;
      const h = 0.3 + Math.random() * 0.4;
      const d = 0.4 + Math.random() * 0.4;

      // Pick random colors ensuring contrast
      const boxColor = boxColors[Math.floor(Math.random() * boxColors.length)];
      let ribbonColor = ribbonColors[Math.floor(Math.random() * ribbonColors.length)];
      
      // Simple contrast check: if colors are too similar, default to Gold or Red
      if (boxColor === ribbonColor) ribbonColor = '#FFD700';
      if (boxColor === '#FFD700' && ribbonColor === '#FFD700') ribbonColor = '#8B0000';

      return {
        ...pos,
        id: i,
        size: [w, h, d] as [number, number, number],
        treePosition: [pos.treePosition[0], pos.treePosition[1] + h/2, pos.treePosition[2]] as [number, number, number], 
        boxColor,
        ribbonColor
      };
    });
  }, []);

  return (
    <group>
      {gifts.map((gift) => (
        <Gift key={gift.id} treeState={treeState} data={gift} />
      ))}
    </group>
  );
};

export default Presents;