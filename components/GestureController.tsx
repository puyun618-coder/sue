import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { TreeState, HandPosition } from '../types';

interface GestureControllerProps {
  setTreeState: (state: TreeState) => void;
  setHandPosition: (pos: HandPosition) => void;
}

const GestureController: React.FC<GestureControllerProps> = ({ setTreeState, setHandPosition }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [gestureOutput, setGestureOutput] = useState<string>('');
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const rafId = useRef<number | null>(null);
  const lastVideoTime = useRef<number>(-1);

  // Initialize MediaPipe
  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      // Prevent double-initialization
      if (recognizerRef.current) {
        if (isMounted) setIsLoaded(true);
        return;
      }

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );

        if (!isMounted) return;

        // Use default delegate settings to allow the library to select the most stable backend (GPU/CPU)
        // automatically. This prevents explicit fallback warnings in the console.
        recognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        
        if (isMounted) setIsLoaded(true);
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
    };
  }, []);

  const predictWebcam = () => {
    const video = videoRef.current;
    const recognizer = recognizerRef.current;
    
    if (!video || !recognizer) return;

    // Check if video has enough data
    if (video.readyState >= 2) {
        if (video.currentTime !== lastVideoTime.current) {
            lastVideoTime.current = video.currentTime;
            
            try {
                const startTimeMs = performance.now();
                const results = recognizer.recognizeForVideo(video, startTimeMs);

                // 1. Handle Gestures (State Switching)
                if (results.gestures.length > 0) {
                    const category = results.gestures[0][0].categoryName;
                    const score = results.gestures[0][0].score;

                    if (score > 0.5) {
                        setGestureOutput(category);
                        if (category === 'Closed_Fist') {
                            setTreeState(TreeState.TREE_SHAPE);
                        } else if (category === 'Open_Palm') {
                            setTreeState(TreeState.SCATTERED);
                        }
                    }
                } else {
                    setGestureOutput('');
                }

                // 2. Handle Hand Position (Camera Perspective)
                if (results.landmarks && results.landmarks.length > 0) {
                    const wrist = results.landmarks[0][0]; 
                    const x = (wrist.x - 0.5) * 2; 
                    const y = -(wrist.y - 0.5) * 2; 

                    setHandPosition({ x, y, isActive: true });
                } else {
                    setHandPosition({ x: 0, y: 0, isActive: false });
                }
            } catch (e) {
                // Ignore transient recognition errors
            }
        }
    }

    rafId.current = requestAnimationFrame(predictWebcam);
  };

  // Start Webcam & Prediction Loop
  useEffect(() => {
    if (!isLoaded || !videoRef.current) return;

    let active = true;

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        
        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    startWebcam();
    
    // Safety check: ensure loop runs even if onLoadedData fired early
    const checkReady = setInterval(() => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
            if (!rafId.current) predictWebcam();
            clearInterval(checkReady);
        }
    }, 500);

    return () => {
      active = false;
      clearInterval(checkReady);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         if (stream.getTracks) {
             stream.getTracks().forEach(track => track.stop());
         }
         videoRef.current.srcObject = null;
      }
    };
  }, [isLoaded]);

  const handleVideoLoad = () => {
      if(videoRef.current) {
          videoRef.current.play().catch(e => console.error("Video play failed", e));
          predictWebcam();
      }
  };

  return (
    <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50 flex flex-col items-center pointer-events-none">
      <div className="relative group">
        
        {/* Decorative Top Bow */}
        <div className="absolute -top-3 md:-top-5 left-1/2 transform -translate-x-1/2 z-20 w-12 md:w-20 text-[#FFD700] drop-shadow-md filter brightness-110">
           <svg viewBox="0 0 100 60" fill="currentColor">
              <path d="M50 30 C 65 10, 95 10, 95 30 C 95 50, 65 50, 50 35 C 35 50, 5 50, 5 30 C 5 10, 35 10, 50 30" />
              <path d="M50 35 L 35 55 L 45 55 L 50 45 L 55 55 L 65 55 Z" />
           </svg>
        </div>

        {/* Video Container Frame */}
        <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-full border-[3px] md:border-[5px] border-[#FFD700] ring-[4px] md:ring-[6px] ring-[#043927] overflow-hidden shadow-[0_0_20px_rgba(255,215,0,0.3)] md:shadow-[0_0_40px_rgba(255,215,0,0.5)] bg-black">
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedData={handleVideoLoad}
            className="w-full h-full object-cover transform -scale-x-100 opacity-90" 
          />
          
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#001005] text-[#FFD700] text-[10px] md:text-xs font-serif italic text-center leading-tight p-2">
              Loading...
            </div>
          )}
          
          {/* Inner Vignette */}
          <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
        </div>

        {/* Decorative Bottom Holly */}
        <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 z-20 w-8 md:w-12 text-[#d4af37]">
            <svg viewBox="0 0 100 100" fill="currentColor">
               <circle cx="50" cy="50" r="10" fill="#8B0000" />
               <circle cx="65" cy="45" r="8" fill="#8B0000" />
               <circle cx="55" cy="65" r="8" fill="#8B0000" />
               <path d="M20 50 Q 10 20 40 40 Q 50 50 20 50" fill="#0F5940" />
               <path d="M80 50 Q 90 80 60 60 Q 50 50 80 50" fill="#0F5940" />
            </svg>
        </div>
      </div>

      {/* Status Label */}
      <div className={`
        mt-2 md:mt-4 px-3 py-1 md:px-6 md:py-1.5 rounded-full border border-[#FFD700]/50 bg-[#043927]/80 backdrop-blur-md
        text-[#FFD700] text-[10px] md:text-xs font-serif tracking-[0.1em] md:tracking-[0.2em] uppercase shadow-lg
        transition-all duration-300 whitespace-nowrap
        ${gestureOutput ? 'opacity-100 translate-y-0' : 'opacity-80 translate-y-0'}
      `}>
        {gestureOutput === 'Closed_Fist' && 'Formed'}
        {gestureOutput === 'Open_Palm' && 'Chaos'}
        {!gestureOutput && 'Active'}
      </div>
    </div>
  );
};

export default GestureController;