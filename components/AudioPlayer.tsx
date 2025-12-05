import React, { useEffect, useRef, useState } from 'react';

const AudioPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Updated to a "Soul/R&B Christmas" track for a warm, modern vibe
  const AUDIO_SRC = 'https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3';

  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.volume = 0.3; // Soft background volume
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const playAudio = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.log("Autoplay blocked by browser, waiting for interaction...");
        // If autoplay is blocked, wait for the first interaction
        const resumePlay = () => {
          audio.play().then(() => {
             setIsPlaying(true);
             // Remove listeners once played
             window.removeEventListener('click', resumePlay);
             window.removeEventListener('touchstart', resumePlay);
             window.removeEventListener('keydown', resumePlay);
          }).catch(e => console.error("Play failed:", e));
        };

        window.addEventListener('click', resumePlay);
        window.addEventListener('touchstart', resumePlay);
        window.addEventListener('keydown', resumePlay);
      }
    };

    playAudio();

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const toggleMute = () => {
    if (audioRef.current) {
      const newMutedState = !isMuted;
      audioRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  // Only show controls if audio is successfully playing or ready to play
  if (!isPlaying && !audioRef.current) return null;

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in pointer-events-auto">
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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6 opacity-80">
                 {/* Equalizer / Sound Wave Icon */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
        )}
      </button>
    </div>
  );
};

export default AudioPlayer;