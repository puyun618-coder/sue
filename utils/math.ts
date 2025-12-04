import * as THREE from 'three';
import { DualPosition } from '../types';

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const generateTreePositions = (count: number, height: number, maxRadius: number): DualPosition[] => {
  const positions: DualPosition[] = [];

  for (let i = 0; i < count; i++) {
    // Tree Shape (Cone/Spiral distribution)
    const y = Math.pow(Math.random(), 1.5) * height; // Bias towards bottom
    const radiusAtY = maxRadius * (1 - y / height);
    const theta = Math.random() * Math.PI * 2 * 15; // Spiral
    const r = Math.sqrt(Math.random()) * radiusAtY; // Uniform circle distribution

    const treeX = r * Math.cos(theta);
    const treeZ = r * Math.sin(theta);
    // Center tree vertically roughly
    const treeY = y - height / 2;

    // Scatter Shape (Sphere/Cloud)
    const scatterRadius = 15;
    const u = Math.random();
    const v = Math.random();
    const thetaS = 2 * Math.PI * u;
    const phiS = Math.acos(2 * v - 1);
    const rS = Math.cbrt(Math.random()) * scatterRadius; // Cube root for uniform sphere volume

    const scatterX = rS * Math.sin(phiS) * Math.cos(thetaS);
    const scatterY = rS * Math.sin(phiS) * Math.sin(thetaS);
    const scatterZ = rS * Math.cos(phiS);

    positions.push({
      treePosition: [treeX, treeY, treeZ],
      scatterPosition: [scatterX, scatterY, scatterZ],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
      scale: randomRange(0.5, 1.5)
    });
  }

  return positions;
};

// New function for Gifts/Presents at the base
export const generatePilePositions = (count: number, radius: number, floorY: number): DualPosition[] => {
  const positions: DualPosition[] = [];

  for (let i = 0; i < count; i++) {
    // Pile Shape (Disk/Mound on floor)
    const angle = Math.random() * Math.PI * 2;
    // Distribute mostly within radius, but allow some to spill out
    const r = Math.sqrt(Math.random()) * radius; 
    
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    
    // Pile height decreases as we get further from center to make a mound
    const pileHeight = Math.max(0, (1 - r/radius) * 2.5); 
    const y = floorY + Math.random() * pileHeight; 

    // Scatter Shape
    const scatterRadius = 18;
    const u = Math.random();
    const v = Math.random();
    const thetaS = 2 * Math.PI * u;
    const phiS = Math.acos(2 * v - 1);
    const rS = Math.cbrt(Math.random()) * scatterRadius;

    positions.push({
      treePosition: [x, y, z],
      scatterPosition: [
        rS * Math.sin(phiS) * Math.cos(thetaS),
        rS * Math.sin(phiS) * Math.sin(thetaS),
        rS * Math.cos(phiS)
      ],
      rotation: [0, Math.random() * Math.PI * 2, 0], // Mostly upright on floor
      scale: randomRange(0.8, 1.2)
    });
  }
  return positions;
};

// Shader Helper for Particles
export const generateAttributeBuffers = (count: number, height: number, maxRadius: number) => {
  const treePositions = new Float32Array(count * 3);
  const scatterPositions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const color1 = new THREE.Color('#043927'); // Deep Emerald
  const color2 = new THREE.Color('#0F5940'); // Lighter Emerald
  const colorGold = new THREE.Color('#FFD700'); // Gold accents

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    // TREE Logic
    const yNormal = Math.pow(Math.random(), 1.2); // Distribution curve
    const y = yNormal * height;
    const rAtY = maxRadius * (1 - y / height);
    
    // Add some noise to radius for "fluffy" branches
    const branchNoise = (Math.random() - 0.5) * 0.5;
    const radius = Math.random() * rAtY + branchNoise;
    
    const angle = Math.random() * Math.PI * 2;
    
    treePositions[i3] = Math.cos(angle) * radius;
    treePositions[i3 + 1] = y - height / 2;
    treePositions[i3 + 2] = Math.sin(angle) * radius;

    // SCATTER Logic
    const sr = 25; // Increased spread radius for 100k particles to avoid clumps
    scatterPositions[i3] = (Math.random() - 0.5) * sr;
    scatterPositions[i3 + 1] = (Math.random() - 0.5) * sr;
    scatterPositions[i3 + 2] = (Math.random() - 0.5) * sr;

    // COLOR Logic
    const isGoldTip = Math.random() > 0.92; // Slightly more gold tips
    const c = isGoldTip ? colorGold : (Math.random() > 0.5 ? color1 : color2);
    
    colors[i3] = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;

    // SIZE Logic (0.1 - 0.8 range)
    if (isGoldTip) {
      // Gold tips are generally larger (0.4 - 0.8) for sparkle
      sizes[i] = randomRange(0.4, 0.8);
    } else {
      // Foliage is varied (0.1 - 0.5) to create depth
      sizes[i] = randomRange(0.1, 0.5);
    }
  }

  return { treePositions, scatterPositions, colors, sizes };
};