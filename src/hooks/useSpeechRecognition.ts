"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
    };
    length: number;
  };
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);

  function createRecognition() {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new (SpeechRecognition as new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: ((event: SpeechRecognitionEvent) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    })();
    recognition.lang = "en-AU";
    recognition.continuous = false;
    recognition.interimResults = false;
    return recognition;
  }

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      !!(
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
      );
    setIsSupported(supported);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    setTranscript("");
    setIsListening(true);
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { isListening, transcript, startListening, stopListening, isSupported };
}
