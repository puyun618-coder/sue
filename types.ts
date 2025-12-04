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