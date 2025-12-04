import React, { useRef } from 'react';
import { TreeState } from '../types';

interface OverlayProps {
  treeState: TreeState;
  setTreeState: (state: TreeState) => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  photoCount: number;
}

const Overlay: React.FC<OverlayProps> = ({ treeState, setTreeState, onUpload, photoCount }) => {
  const isTree = treeState === TreeState.TREE_SHAPE;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between z-10">
      {/* Header */}
      <header className="flex flex-col items-start justify-start animate-fade-in-down p-6 md:p-8">
        <h1 
          className="text-5xl md:text-8xl text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] text-left"
          style={{ fontFamily: "'Great Vibes', cursive" }}
        >
          Sue's wishes
        </h1>
      </header>

      {/* Controls */}
      <footer className="w-full flex justify-between items-end pointer-events-auto p-4 md:p-8 pb-8 md:pb-12">
        
        {/* Upload Button (Left) */}
        <div>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onUpload} 
                className="hidden" 
                multiple 
                accept="image/png, image/jpeg, image/webp"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className={`
                    group px-4 py-3 md:px-6 md:py-3 bg-black/40 backdrop-blur-md border border-[#FFD700]/30 
                    hover:border-[#FFD700] hover:bg-[#FFD700]/10 transition-all duration-300 rounded-lg
                    flex items-center gap-2 md:gap-3 text-[#FFD700] font-serif tracking-widest text-xs md:text-sm uppercase
                `}
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <span className="hidden md:inline">Upload Memories</span>
                <span className="md:hidden">Upload</span>
                <span className="ml-1 md:ml-2 text-[10px] md:text-xs opacity-60">({photoCount}/20)</span>
            </button>
        </div>

        {/* State Toggle (Right) */}
        <button
          onClick={() => setTreeState(isTree ? TreeState.SCATTERED : TreeState.TREE_SHAPE)}
          className={`
            group relative px-5 py-3 md:px-8 md:py-4 bg-black/40 backdrop-blur-md border border-[#FFD700]/30 
            hover:border-[#FFD700] transition-all duration-500 ease-out overflow-hidden rounded-full
          `}
        >
          <div className={`absolute inset-0 w-full h-full bg-[#FFD700]/10 transition-transform duration-500 ${isTree ? 'scale-x-100' : 'scale-x-0'} origin-left`} />
          
          <span className="relative z-10 font-serif text-[#FFD700] tracking-widest uppercase text-xs md:text-lg flex items-center gap-2 md:gap-3">
             {isTree ? 'Deconstruct' : 'Assemble'}
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-700 ${isTree ? 'rotate-180' : 'rotate-0'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
             </svg>
          </span>
        </button>
      </footer>
    </div>
  );
};

export default Overlay;