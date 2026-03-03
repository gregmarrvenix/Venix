"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

interface VoiceInputProps {
  onResult: (text: string) => void;
}

export function VoiceInput({ onResult }: VoiceInputProps) {
  const { isListening, transcript, startListening, stopListening, isSupported } =
    useSpeechRecognition();
  const prevTranscriptRef = useRef("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      setIsProcessing(true);
      apiFetch<{ text: string }>("/api/ai/cleanup", {
        method: "POST",
        body: JSON.stringify({ text: transcript }),
      })
        .then((res) => onResult(res.text))
        .catch(() => onResult(transcript))
        .finally(() => setIsProcessing(false));
    }
  }, [transcript, onResult]);

  if (!isSupported) {
    return (
      <div className="relative group">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled
          className="opacity-50"
        >
          <MicIcon />
        </Button>
        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
          Voice input not supported in this browser
        </span>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="relative flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" disabled className="text-indigo-400">
          <SpinnerIcon />
        </Button>
        <span className="text-xs text-indigo-400 animate-pulse">AI processing...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {isListening && (
        <span className="absolute inset-0 rounded-lg bg-red-500/30 animate-ping" />
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={isListening ? stopListening : startListening}
        className={
          isListening
            ? "relative bg-red-500 text-white hover:bg-red-400"
            : "text-slate-400 hover:text-slate-200"
        }
      >
        {isListening ? <MicOnIcon /> : <MicIcon />}
      </Button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicOnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} className="h-5 w-5">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" strokeWidth={2} />
      <line x1="12" x2="12" y1="19" y2="22" strokeWidth={2} />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
