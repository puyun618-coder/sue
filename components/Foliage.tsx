import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';
import { generateAttributeBuffers } from '../utils/math';

interface FoliageProps {
  treeState: TreeState;
}

const FoliageVertexShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;

  attribute vec3 aScatterPosition;
  attribute float aSize;

  varying vec3 vColor;

  // Cubic Bezier ease-in-out approximation
  float easeInOut(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    vColor = color;
    
    float easedProgress = easeInOut(uProgress);
    
    vec3 mixedPosition = mix(aScatterPosition, position, easedProgress);
    
    // Add breathing effect
    float breathe = sin(uTime * 1.5 + position.y) * 0.05 * easedProgress;
    mixedPosition.x += mixedPosition.x * breathe;
    mixedPosition.z += mixedPosition.z * breathe;

    vec4 mvPosition = modelViewMatrix * vec4(mixedPosition, 1.0);
    
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    // Adjusted multiplier for high density and larger base size
    gl_PointSize = aSize * uPixelRatio * 60.0; 
    gl_PointSize *= (1.0 / -mvPosition.z);
  }
`;

const FoliageFragmentShader = `
  varying vec3 vColor;

  void main() {
    // Soft Radial Gradient for Bloom
    // Distance from center (0.0 to 0.5)
    float d = distance(gl_PointCoord, vec2(0.5));
    
    // Discard corners to make it round
    if (d > 0.5) discard;

    // Soft falloff calculation
    // Normalized distance 0.0 to 1.0
    float normalizedDist = d * 2.0; 
    
    // Smooth quadratic falloff (softer than cubic) for better glow integration
    float alpha = pow(1.0 - normalizedDist, 2.0);
    
    // Boost alpha slightly at core for brightness
    alpha = 0.2 + 0.8 * alpha;
    
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const Foliage: React.FC<FoliageProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  // Massive particle count for high fidelity
  const count = 100000;
  const height = 12;
  const maxRadius = 4.5;

  const { treePositions, scatterPositions, colors, sizes } = useMemo(
    () => generateAttributeBuffers(count, height, maxRadius),
    []
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    }),
    []
  );

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Smooth interpolation for state transition
      const target = treeState === TreeState.TREE_SHAPE ? 1 : 0;
      material.uniforms.uProgress.value = THREE.MathUtils.lerp(
        material.uniforms.uProgress.value,
        target,
        0.03 // Smooth ease
      );
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // This maps to 'position' in shader (Target: Tree)
          count={treePositions.length / 3}
          array={treePositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPosition"
          count={scatterPositions.length / 3}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        vertexShader={FoliageVertexShader}
        fragmentShader={FoliageFragmentShader}
        uniforms={uniforms}
        transparent={true}
      />
    </points>
  );
};

export default Foliage;