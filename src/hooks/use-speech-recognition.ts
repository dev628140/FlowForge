
'use client';

import { useState, useEffect, useRef } from 'react';

interface SpeechRecognitionOptions {
  onResult: (text: string) => void;
  onEnd?: () => void;
}

export const useSpeechRecognition = ({ onResult, onEnd = () => {} }: SpeechRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onEndRef = useRef(onEnd);
  const onResultRef = useRef(onResult);

  // Keep callback refs up to date
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsAvailable(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Important for turn-based interaction
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onResultRef.current(transcript);
        setIsListening(false); // Stop listening after a result is finalized
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if(event.error !== 'no-speech') {
          // Handle real errors, but ignore "no-speech" which happens on silence
        }
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        // Call the onEnd callback when recognition fully stops
        onEndRef.current();
      };

      recognitionRef.current = recognition;
    } else {
        setIsAvailable(false);
    }

    // Cleanup
    return () => {
      recognitionRef.current?.stop();
    }
  }, []);
  
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch(e) {
            console.error("Could not start speech recognition", e);
            setIsListening(false);
        }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
        try {
            recognitionRef.current.stop();
            setIsListening(false);
        } catch(e) {
            console.error("Could not stop speech recognition", e);
            setIsListening(false);
        }
    }
  }

  return { isListening, isAvailable, startListening, stopListening };
};
