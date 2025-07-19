
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpeechSynthesis = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    const currentAudio = audioRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handleEnd = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);

    currentAudio.addEventListener('play', handlePlay);
    currentAudio.addEventListener('ended', handleEnd);
    currentAudio.addEventListener('pause', handlePause);

    return () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.removeEventListener('play', handlePlay);
            currentAudio.removeEventListener('ended', handleEnd);
            currentAudio.removeEventListener('pause', handlePause);
        }
    };
  }, []);

  const play = useCallback((audioDataUri: string) => {
    if (audioRef.current && audioDataUri) {
      audioRef.current.src = audioDataUri;
      audioRef.current.play().catch(e => {
          console.error("Audio playback failed:", e)
          setIsPlaying(false);
      });
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return { play, stop, isPlaying };
};
