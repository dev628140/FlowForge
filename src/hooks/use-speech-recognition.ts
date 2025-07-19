
'use client';

import { useState, useEffect, useRef } from 'react';

export const useSpeechRecognition = (onResult: (text: string) => void, onEnd: () => void = () => {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onEndRef = useRef(onEnd);

  // Keep onEnd callback ref up to date
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsAvailable(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        // Call the onEnd callback when recognition stops
        onEndRef.current();
      };

      recognitionRef.current = recognition;
    } else {
        setIsAvailable(false);
    }
  }, [onResult]);
  
  const startListening = () => {
    if (!isListening) {
        recognitionRef.current?.start();
        setIsListening(true);
    }
  }

  const stopListening = () => {
    if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
    }
  }

  return { isListening, isAvailable, startListening, stopListening };
};
