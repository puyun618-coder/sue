import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, DualPosition } from '../types';
import { generateTreePositions } from '../utils/math';

interface OrnamentsProps {
  treeState: TreeState;
  type: 'sphere' | 'box';
  count: number;
  color: string;
  metalness?: number;
  roughness?: number;
  scaleFactor?: number;
}

const Ornaments: React.FC<OrnamentsProps> = ({ 
  treeState, 
  type, 
  count, 
  color,
  metalness = 1.0,
  roughness = 0.1,
  scaleFactor = 1.0
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-calculate positions
  const data: DualPosition[] = useMemo(
    () => generateTreePositions(count, 11, 4), // Slightly smaller bounds than foliage to sit inside/on
    [count]
  );

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Linear interpolation factor for the animation
    // We store the current progress in userData to persist it across frames
    const currentProgress = meshRef.current.userData.progress ?? 0;
    const targetProgress = treeState === TreeState.TREE_SHAPE ? 1 : 0;
    
    // Smooth Lerp
    const newProgress = THREE.MathUtils.lerp(currentProgress, targetProgress, 2.5 * delta);
    meshRef.current.userData.progress = newProgress;

    // Ease function for the position mix
    const t = newProgress;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    data.forEach((item, i) => {
      const { treePosition, scatterPosition, rotation, scale } = item;

      // Interpolate Position
      dummy.position.set(
        THREE.MathUtils.lerp(scatterPosition[0], treePosition[0], ease),
        THREE.MathUtils.lerp(scatterPosition[1], treePosition[1], ease),
        THREE.MathUtils.lerp(scatterPosition[2], treePosition[2], ease)
      );

      // Add a slow "float" rotation when scattered
      const time = state.clock.getElapsedTime();
      if (t < 0.9) {
          dummy.rotation.set(
              rotation[0] + time * 0.1,
              rotation[1] + time * 0.1,
              rotation[2]
          );
      } else {
          // Snap to uprightish or fixed rotation on tree
           dummy.rotation.set(rotation[0], rotation[1], rotation[2]);
      }

      // Scale up slightly when in tree form
      const s = scale * scaleFactor * (0.8 + 0.2 * ease); 
      dummy.scale.set(s, s, s);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    return type === 'sphere' 
      ? new THREE.SphereGeometry(0.25, 32, 32)
      : new THREE.BoxGeometry(0.35, 0.35, 0.35);
  }, [type]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshStandardMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={0.2}
        metalness={metalness}
        roughness={roughness}
        envMapIntensity={1.5}
      />
    </instancedMesh>
  );
};

export default Ornaments;