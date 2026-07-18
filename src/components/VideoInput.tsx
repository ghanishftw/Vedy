"use client";

import React, { useState } from "react";
import { ArrowRight, Link, AlertCircle } from "lucide-react";

// Custom inline Youtube SVG component (resolves missing icon in registry package)
const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface VideoInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function VideoInput({ onFetch, isLoading, error }: VideoInputProps) {
  const [url, setUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setLocalError("Please paste a YouTube video link");
      return;
    }

    const isYouTubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(trimmedUrl);
    if (!isYouTubeUrl) {
      setLocalError("Please enter a valid YouTube URL (e.g. youtube.com/watch?v=...)");
      return;
    }

    onFetch(trimmedUrl);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex flex-col sm:flex-row items-center gap-3 p-2.5 rounded-2xl transition-all duration-300 premium-input">
          <div className="relative flex-1 w-full flex items-center pl-3">
            <Link className="h-5 w-5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Paste YouTube video link here..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (localError) setLocalError(null);
              }}
              disabled={isLoading}
              className="w-full bg-transparent border-0 text-white placeholder-zinc-500 focus:outline-none focus:ring-0 text-base py-3 pl-3 pr-2 disabled:text-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto relative flex items-center justify-center gap-2 font-medium px-6 py-3.5 rounded-xl transition duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 premium-button cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <Youtube className="h-5 w-5" />
                <span>Fetch Video</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error feedback */}
      {(error || localError) && (
        <div className="flex items-center gap-3 mt-4 text-rose-400 px-5 py-3 rounded-xl animate-fade-in text-sm max-w-max mx-auto premium-error">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span className="font-mono text-xs tracking-tight">{error || localError}</span>
        </div>
      )}
    </div>
  );
}
