import React, { useMemo, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { TreeState, DualPosition } from '../types';

interface PolaroidsProps {
  photos: string[];
  treeState: TreeState;
}

// Single Polaroid Frame Component
const PolaroidFrame: React.FC<{ 
    url: string; 
    positionData: DualPosition; 
    treeState: TreeState;
    index: number;
}> = ({ url, positionData, treeState, index }) => {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, url);
  const [hovered, setHovered] = useState(false);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Material setup
  const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#F5F5F0', // Slightly warm white paper
    roughness: 0.8,
    metalness: 0.1,
  }), []);

  // Calculate orientation for Tree State: Face outward from center
  const targetRotation = useMemo(() => {
    const d = new THREE.Object3D();
    d.position.set(...positionData.treePosition);
    d.lookAt(0, positionData.treePosition[1], 0); // Look at center pole
    d.rotateY(Math.PI); // Turn 180 to face out
    
    // Add random tilt for natural hanging look
    d.rotateZ((Math.random() - 0.5) * 0.2); 
    d.rotateX((Math.random() - 0.5) * 0.2);
    
    return d.rotation;
  }, [positionData.treePosition]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // --- State Interpolation ---
    const currentProgress = groupRef.current.userData.progress ?? 0;
    const targetProgress = treeState === TreeState.TREE_SHAPE ? 1 : 0;
    const progress = THREE.MathUtils.lerp(currentProgress, targetProgress, delta * 2);
    groupRef.current.userData.progress = progress;

    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    // --- Position ---
    groupRef.current.position.set(
      THREE.MathUtils.lerp(positionData.scatterPosition[0], positionData.treePosition[0], ease),
      THREE.MathUtils.lerp(positionData.scatterPosition[1], positionData.treePosition[1], ease),
      THREE.MathUtils.lerp(positionData.scatterPosition[2], positionData.treePosition[2], ease)
    );

    // --- Rotation & Orientation ---
    if (progress > 0.8) {
        // Locked to Tree
        // Smoothly rotate to target orientation (hanging on tree)
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.x, delta * 4);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.y, delta * 4);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotation.z, delta * 4);

        // Wind effect (subtle sway)
        const time = state.clock.getElapsedTime();
        const wind = Math.sin(time * 1.5 + index) * 0.05;
        groupRef.current.rotation.z += wind;
    } else {
        // Chaos / Scattered
        // Look at the camera so the photo is visible
        dummy.position.copy(groupRef.current.position);
        dummy.lookAt(state.camera.position);
        
        // Smoothly rotate to face camera
        groupRef.current.quaternion.slerp(dummy.quaternion, delta * 4);
    }

    // --- Scale ---
    // Chaos (progress 0) -> Scale 2.5 (Big for visibility)
    // Tree (progress 1) -> Scale 1.0 (Normal size)
    const stateScale = THREE.MathUtils.lerp(2.5, 1.0, ease);
    const finalScale = hovered ? stateScale * 1.1 : stateScale;
    
    groupRef.current.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), delta * 5);
  });

  return (
    <group 
        ref={groupRef} 
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => setHovered(false)}
    >
      {/* Frame Body */}
      <RoundedBox args={[1.2, 1.4, 0.05]} radius={0.02} smoothness={4}>
         <primitive object={frameMaterial} attach="material" />
      </RoundedBox>

      {/* Photo Plane */}
      <mesh position={[0, 0.1, 0.03]}>
         <planeGeometry args={[1.0, 1.0]} />
         <meshStandardMaterial 
            map={texture} 
            emissiveMap={texture} 
            emissive="white" 
            emissiveIntensity={hovered ? 0.4 : 0.15} // Light up when hovered
            roughness={0.4}
         />
      </mesh>
    </group>
  );
};

const Polaroids: React.FC<PolaroidsProps> = ({ photos, treeState }) => {
  // Pre-calculate 20 slots for potential photos
  const slots = useMemo(() => {
    const arr: DualPosition[] = [];
    const count = 20;
    const height = 11; 
    const maxRadius = 4;

    for (let i = 0; i < count; i++) {
        // Spiral distribution on the surface of the cone
        const yRel = (i / count); // 0 to 1 top to bottom
        const y = 5 - (yRel * 10); // Spread from y=5 down to y=-5
        
        const r = maxRadius * (1 - (y + 5.5) / height) + 0.5; // Surface radius + offset
        const angle = i * 2.4; // Golden angle approx for non-overlapping
        
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        // Scatter pos
        const sr = 18;
        const u = Math.random();
        const v = Math.random();
        const thetaS = 2 * Math.PI * u;
        const phiS = Math.acos(2 * v - 1);
        const rS = Math.cbrt(Math.random()) * sr;

        arr.push({
            treePosition: [x, y, z],
            scatterPosition: [
                rS * Math.sin(phiS) * Math.cos(thetaS),
                rS * Math.sin(phiS) * Math.sin(thetaS),
                rS * Math.cos(phiS)
            ],
            rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
            scale: 1.0
        });
    }
    return arr;
  }, []);

  return (
    <group>
      {photos.map((url, i) => (
        <PolaroidFrame 
            key={url} // URL as key ensures reload if changed
            url={url} 
            index={i}
            treeState={treeState} 
            positionData={slots[i % slots.length]} 
        />
      ))}
    </group>
  );
};

export default Polaroids;