import React from 'react';

export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE'
}

export interface DualPosition {
  treePosition: [number, number, number];
  scatterPosition: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export interface TreeConfig {
  height: number;
  radius: number;
  particleCount: number;
  ornamentCount: number;
}

export interface HandPosition {
  x: number; // Normalized -1 to 1
  y: number; // Normalized -1 to 1
  isActive: boolean;
}

// Fix for JSX.IntrinsicElements errors where R3F types are not automatically picked up
// We define the interface for Three.js elements and augment both global JSX and React.JSX
interface ThreeElements {
  mesh: any;
  group: any;
  points: any;
  instancedMesh: any;
  primitive: any;
  ambientLight: any;
  pointLight: any;
  spotLight: any;
  fog: any;
  bufferGeometry: any;
  bufferAttribute: any;
  sphereGeometry: any;
  coneGeometry: any;
  planeGeometry: any;
  shaderMaterial: any;
  meshStandardMaterial: any;
  meshPhysicalMaterial: any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// Ensure compatibility with React 18+ and 'react/jsx-runtime'
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
