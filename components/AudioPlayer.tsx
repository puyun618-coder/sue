import React, { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  gestureActive: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ gestureActive }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // We use a reliable remote URL for the demo so it works immediately.
    // Ideally, you would place 'christmas_carol.mp3' in your public/ folder.
    const src = 'https://assets.mixkit.co/music/preview/mixkit-christmas-magic-296.mp3'; 
    // const src = '/christmas_carol.mp3'; // Uncomment this to use your local file
    
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    const attemptPlay = () => {
      if (!hasInteracted && audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
          })
          .catch((e) => {
            // Autoplay was prevented, waiting for further interaction
            console.log("Audio play waiting for interaction:", e);
          });
      }
    };

    // Trigger play on gesture activation
    if (gestureActive && !hasInteracted) {
      attemptPlay();
    }

    // Trigger play on any click/touch
    const handleInteraction = () => attemptPlay();

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [gestureActive, hasInteracted]);

  const toggleMute = () => {
    if (audioRef.current) {
      const newMutedState = !isMuted;
      audioRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  // Only show the control once playback has attempted to start
  if (!hasInteracted && !isPlaying) return null;

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <button
        onClick={toggleMute}
        className="
          flex items-center justify-center w-10 h-10 md:w-12 md:h-12 
          bg-black/30 backdrop-blur-md border border-[#FFD700]/30 rounded-full 
          text-[#FFD700] hover:bg-[#FFD700]/20 hover:border-[#FFD700]/60 transition-all duration-300
          shadow-[0_0_15px_rgba(255,215,0,0.1)]
        "
        aria-label={isMuted ? "Unmute background music" : "Mute background music"}
      >
        {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
        )}
      </button>
    </div>
  );
};

export default AudioPlayer;
