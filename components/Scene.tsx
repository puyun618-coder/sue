import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { TreeState, HandPosition } from '../types';
import Foliage from './Foliage';
import Ornaments from './Ornaments';
import Star from './Star';
import Presents from './Presents';
import Polaroids from './Polaroids';
import Snow from './Snow';

interface SceneProps {
  treeState: TreeState;
  handPosition: HandPosition;
  photos: string[];
}

// Custom Aurora Shader Component
const AuroraBackground = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh scale={[100, 100, 100]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        uniforms={{
          uTime: { value: 0 },
          uColor1: { value: new THREE.Color('#00ff9d') }, // Neon Aurora Green
          uColor2: { value: new THREE.Color('#001005') }, // Deep Dark Green/Black
          uColor3: { value: new THREE.Color('#004030') }, // Mid Teal
        }}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vNormal;
          void main() {
            vUv = uv;
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          varying vec2 vUv;
          
          // Simplex Noise (approximated for GLSL 2)
          vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

          float snoise(vec2 v){
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          void main() {
             vec2 uv = vUv;
             float t = uTime * 0.2;
             
             // Create "Curtains" using high frequency noise on X, stretched on Y
             
             // Distort the X coordinate based on Y to create the waving motion
             float xDistort = uv.x * 20.0 + sin(uv.y * 5.0 + t) * 2.0 + snoise(vec2(uv.x, t * 0.5)) * 2.0;
             
             // Primary curtain shape
             float curtain = sin(xDistort);
             
             // Sharpen the curtain lines
             curtain = smoothstep(0.2, 0.9, curtain);
             
             // Add a second layer for complexity
             float curtain2 = sin(uv.x * 35.0 - t * 1.5 + cos(uv.y * 10.0));
             curtain2 = smoothstep(0.3, 0.8, curtain2);
             
             // Combine
             float intensity = (curtain * 0.7 + curtain2 * 0.3);
             
             // Fade out at top and bottom to create that "hanging in void" look
             // Peak intensity around uv.y = 0.5 (horizon)
             float verticalFade = smoothstep(0.0, 0.4, uv.y) * smoothstep(1.0, 0.6, uv.y);
             
             intensity *= verticalFade;

             // Color grading
             vec3 baseColor = uColor2; // Deep black/green
             vec3 midColor = uColor3;  // Teal
             vec3 brightColor = uColor1; // Neon Green
             
             vec3 finalColor = mix(baseColor, midColor, intensity * 0.5);
             finalColor = mix(finalColor, brightColor, pow(intensity, 3.0));
             
             gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
      />
    </mesh>
  );
};

// CameraRig component to adjust view based on hand position
const CameraRig: React.FC<{ handPosition: HandPosition; children: React.ReactNode }> = ({ handPosition, children }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
        // Smoothly interpolate current rotation to target rotation derived from hand position
        const targetRotY = handPosition.isActive ? -handPosition.x * 0.5 : 0; 
        const targetRotX = handPosition.isActive ? handPosition.y * 0.3 : 0;

        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 2);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 2);
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

// Responsive Wrapper to handle sizing logic inside Canvas context
const ResponsiveTreeWrapper: React.FC<{ treeState: TreeState; handPosition: HandPosition; photos: string[] }> = ({ treeState, handPosition, photos }) => {
    const { viewport, size } = useThree();
    const isMobile = size.width < 768;

    // Approximate bounds of the tree group
    const treeHeight = 15; // Foliage height ~12 + Star + Base
    
    // Calculate scale to fill ~85% of viewport height
    let desiredScale = (viewport.height * 0.85) / treeHeight;
    
    // Position logic
    // Mobile: Center vertically (0)
    // Desktop: Shift down slightly (-2) to make it look grander/grounded
    const positionY = isMobile ? 0 : -2;

    return (
        <CameraRig handPosition={handPosition}>
            <group position={[0, positionY, 0]} scale={[desiredScale, desiredScale, desiredScale]}>
                <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2} floatingRange={[-0.2, 0.2]}>
                    <Foliage treeState={treeState} />
                    <Star treeState={treeState} />

                    <Ornaments 
                        treeState={treeState} 
                        type="sphere" 
                        count={300} 
                        color="#FFD700" 
                        scaleFactor={1.2}
                    />
                    <Ornaments 
                        treeState={treeState} 
                        type="box" 
                        count={150} 
                        color="#8B0000" 
                        metalness={0.8}
                        roughness={0.2}
                    />
                    <Ornaments 
                        treeState={treeState} 
                        type="sphere" 
                        count={500} 
                        color="#ffffff" 
                        scaleFactor={0.3}
                        metalness={0.5}
                        roughness={0.1}
                    />
                    
                    {/* User Photos as Polaroids */}
                    <Polaroids photos={photos} treeState={treeState} />
                </Float>

                <Presents treeState={treeState} />

                <ContactShadows 
                    resolution={1024} 
                    scale={50} 
                    blur={3} 
                    opacity={0.4} 
                    far={10} 
                    color="#001005" 
                />
            </group>
        </CameraRig>
    );
};


const Scene: React.FC<SceneProps> = ({ treeState, handPosition, photos }) => {
  return (
    <div className="w-full h-full relative bg-[#001005]">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: false, stencil: false, alpha: false }}
        camera={{ position: [0, 0, 20], fov: 45, near: 0.1, far: 200 }}
      >
        {/* Fog acts as the atmospheric depth, tinted green to match aurora */}
        <fog attach="fog" args={['#001a10', 15, 60]} />
        
        <Suspense fallback={null}>
            <AuroraBackground />
            
            {/* Atmospheric Snow - Global */}
            <Snow />

            <Environment preset="city" environmentIntensity={0.5} />
            <ambientLight intensity={0.4} color="#002010" />
            
            <spotLight 
                position={[10, 15, 10]} 
                angle={0.25} 
                penumbra={1} 
                intensity={12} 
                color="#fff5cc" 
                castShadow 
            />
             <pointLight position={[-15, 5, -15]} intensity={5} color="#00ff9d" distance={50} />

            <ResponsiveTreeWrapper treeState={treeState} handPosition={handPosition} photos={photos} />

            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

            <EffectComposer disableNormalPass>
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
                <Bloom 
                    luminanceThreshold={0.8} 
                    mipmapBlur 
                    intensity={1.2} 
                    radius={0.5} 
                />
                <Vignette eskil={false} offset={0.1} darkness={0.8} />
            </EffectComposer>
        </Suspense>

        <OrbitControls 
            enablePan={false} 
            maxPolarAngle={Math.PI / 1.6} 
            minDistance={5} 
            maxDistance={50}
            autoRotate={treeState === TreeState.TREE_SHAPE && !handPosition.isActive} 
            autoRotateSpeed={0.5}
            target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
};

export default Scene;
