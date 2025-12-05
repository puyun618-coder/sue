import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- Shared Shader Logic ---
const CommonVertexShader = `
  uniform float uTime;
  uniform float uHeight;
  uniform float uSpeed;
  uniform float uWindX;
  uniform float uWindZ;

  attribute float aSize;
  attribute float aSpeedOffset;
  attribute vec3 aRandomness;
  // For snowflakes only
  attribute float aSpinSpeed; 
  attribute float aPhase;

  varying float vAlpha;
  varying float vAngle; // For rotation

  void main() {
    vec3 pos = position;
    
    // Fall animation: (InitialY - (Time * Speed)) modulo Height
    // We add uHeight/2.0 to center the wrapping around 0
    float fallSpeed = uSpeed + aSpeedOffset;
    float fallDistance = uTime * fallSpeed;
    
    // Wrap Y
    pos.y = mod(position.y - fallDistance + uHeight / 2.0, uHeight) - uHeight / 2.0;

    // Wind / Turbulence Calculation
    float t = uTime;
    
    // Main Wind Direction
    pos.x += uWindX * t * 0.5; // Constant drift
    pos.z += uWindZ * t * 0.5;

    // Local Turbulence (Sine waves based on position and randomness)
    float turbulenceX = sin(t * 1.5 + aRandomness.x) * 0.8 + sin(t * 0.5 + pos.y * 0.5) * 0.5;
    float turbulenceZ = cos(t * 1.2 + aRandomness.z) * 0.8;
    
    pos.x += turbulenceX;
    pos.z += turbulenceZ;

    // Wrap X and Z to keep snow in the volume (Simple wrapping for infinite field effect)
    // Assuming volume radius ~30, we soft wrap or just let it drift (camera is centered)
    // For a blizzard, let's strictly wrap X/Z to keep density high around camera
    float range = 40.0;
    pos.x = mod(pos.x + range/2.0, range) - range/2.0;
    pos.z = mod(pos.z + range/2.0, range) - range/2.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    gl_PointSize = aSize * (50.0 / -mvPosition.z);
    
    // Pass rotation to fragment
    vAngle = aPhase + uTime * aSpinSpeed;

    // Fade out at top and bottom limits
    float normalizedY = (pos.y + uHeight/2.0) / uHeight; 
    vAlpha = smoothstep(0.0, 0.1, normalizedY) * (1.0 - smoothstep(0.85, 1.0, normalizedY));
  }
`;

// Simple circular glow for background dust
const DustFragmentShader = `
  varying float vAlpha;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    if(d > 0.5) discard;
    float strength = pow(1.0 - (d * 2.0), 2.0);
    gl_FragColor = vec4(1.0, 1.0, 1.0, strength * vAlpha * 0.6);
  }
`;

// Procedural 6-pointed Snowflake Shader
const FlakeFragmentShader = `
  varying float vAlpha;
  varying float vAngle;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    
    // Rotate UV
    float s = sin(vAngle);
    float c = cos(vAngle);
    mat2 rot = mat2(c, -s, s, c);
    uv = rot * uv;

    // Convert to Polar
    float r = length(uv) * 2.0; // 0 to 1
    float a = atan(uv.y, uv.x);

    // Hexagonal / 6-Point Star Shape Function
    // cos(a * 6) gives 6 petals
    float f = abs(cos(a * 3.0)); 
    // Sharpen the star
    float star = smoothstep(0.3, 0.6, f);
    
    // Combine radial distance limit with star shape
    // "Snowflake" look: Core + Spikes
    float core = 1.0 - smoothstep(0.0, 0.3, r);
    float spikes = (1.0 - smoothstep(0.2, 1.0, r)) * star;
    
    float shape = max(core, spikes);

    if (shape < 0.1) discard;

    gl_FragColor = vec4(1.0, 1.0, 1.0, shape * vAlpha * 0.9);
  }
`;

// --- Particle Generator Helper ---
const createParticles = (count: number, height: number, radius: number, sizeRange: [number, number]) => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const spd = new Float32Array(count);
    const rnd = new Float32Array(count * 3);
    const spin = new Float32Array(count);
    const phase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * radius * 2;
      pos[i3 + 1] = (Math.random() - 0.5) * height;
      pos[i3 + 2] = (Math.random() - 0.5) * radius * 2;

      sz[i] = Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0];
      spd[i] = Math.random() * 2.0; // Speed variance
      
      rnd[i3] = Math.random() * 10.0;
      rnd[i3 + 1] = Math.random() * 10.0;
      rnd[i3 + 2] = Math.random() * 10.0;

      spin[i] = (Math.random() - 0.5) * 2.0; // Spin speed
      phase[i] = Math.random() * Math.PI * 2; // Initial rotation
    }
    return { pos, sz, spd, rnd, spin, phase };
};

const SnowDust: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // High count for "Heavy Snow" density background
  const count = 15000;
  const height = 60;
  const radius = 40;

  const { pos, sz, spd, rnd, spin, phase } = useMemo(() => 
    createParticles(count, height, radius, [0.1, 0.3]), 
  []);

  useFrame((state) => {
    if (pointsRef.current) {
      const material = pointsRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sz} itemSize={1} />
        <bufferAttribute attach="attributes-aSpeedOffset" count={count} array={spd} itemSize={1} />
        <bufferAttribute attach="attributes-aRandomness" count={count} array={rnd} itemSize={3} />
        <bufferAttribute attach="attributes-aSpinSpeed" count={count} array={spin} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={count} array={phase} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={CommonVertexShader}
        fragmentShader={DustFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uHeight: { value: height },
          uSpeed: { value: 3.0 },
          uWindX: { value: 0.5 },
          uWindZ: { value: 0.2 },
        }}
      />
    </points>
  );
};

const SnowFlakes: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Larger, clearer flakes
  const count = 2000;
  const height = 50;
  const radius = 35;

  const { pos, sz, spd, rnd, spin, phase } = useMemo(() => 
    createParticles(count, height, radius, [0.6, 1.2]), 
  []);

  useFrame((state) => {
    if (pointsRef.current) {
      const material = pointsRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sz} itemSize={1} />
        <bufferAttribute attach="attributes-aSpeedOffset" count={count} array={spd} itemSize={1} />
        <bufferAttribute attach="attributes-aRandomness" count={count} array={rnd} itemSize={3} />
        <bufferAttribute attach="attributes-aSpinSpeed" count={count} array={spin} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={count} array={phase} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={CommonVertexShader}
        fragmentShader={FlakeFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uHeight: { value: height },
          uSpeed: { value: 5.0 }, // Faster falling for big heavy flakes
          uWindX: { value: 0.8 },
          uWindZ: { value: 0.4 },
        }}
      />
    </points>
  );
};

const Snow: React.FC = () => {
  return (
    <group>
      <SnowDust />
      <SnowFlakes />
    </group>
  );
};

export default Snow;