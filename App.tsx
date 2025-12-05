import React, { useState, useCallback } from 'react';
import Scene from './components/Scene';
import Overlay from './components/Overlay';
import GestureController from './components/GestureController';
import AudioPlayer from './components/AudioPlayer';
import { TreeState, HandPosition } from './types';

function App() {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.TREE_SHAPE);
  const [handPosition, setHandPosition] = useState<HandPosition>({ x: 0, y: 0, isActive: false });
  const [photos, setPhotos] = useState<string[]>([]);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const handleUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPhotos: string[] = [];
    const maxPhotos = 20;
    const maxSize = 5 * 1024 * 1024; // 5MB

    (Array.from(files) as File[]).forEach((file) => {
      if (newPhotos.length + photos.length >= maxPhotos) return;
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large (max 5MB).`);
        return;
      }
      if (!file.type.startsWith('image/')) return;

      const url = URL.createObjectURL(file);
      newPhotos.push(url);
    });

    setPhotos((prev) => [...prev, ...newPhotos].slice(0, maxPhotos));
  }, [photos]);

  const handleMusicUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
        alert('Please upload an audio file.');
        return;
    }

    const url = URL.createObjectURL(file);
    setAudioSrc(url);
  }, []);

  return (
    <div className="w-full h-screen bg-black relative">
      <Scene treeState={treeState} handPosition={handPosition} photos={photos} />
      <Overlay treeState={treeState} setTreeState={setTreeState} onUpload={handleUpload} photoCount={photos.length} />
      <GestureController setTreeState={setTreeState} setHandPosition={setHandPosition} />
      <AudioPlayer audioSrc={audioSrc} onMusicUpload={handleMusicUpload} />
    </div>
  );
}

export default App;