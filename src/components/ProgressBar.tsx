"use client";

import React from "react";

interface ProgressBarProps {
  progress: number;
  statusText: string;
  subStatusText?: string;
}

export default function ProgressBar({ progress, statusText, subStatusText }: ProgressBarProps) {
  // Ensure progress is bounded between 0 and 100
  const cleanProgress = Math.min(Math.max(Math.round(progress), 0), 100);

  return (
    <div className="w-full max-w-xl mx-auto bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl backdrop-blur-md shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <span className="text-zinc-200 text-sm font-medium">{statusText}</span>
        <span className="text-purple-400 text-sm font-bold">{cleanProgress}%</span>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/30">
        <div
          className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(139,92,246,0.5)]"
          style={{ width: `${cleanProgress}%` }}
        />
      </div>

      {subStatusText && (
        <div className="flex justify-between text-[11px] text-zinc-400 mt-2">
          <span>{subStatusText}</span>
          {cleanProgress > 0 && cleanProgress < 100 && (
            <span className="animate-pulse">Processing...</span>
          )}
        </div>
      )}
    </div>
  );
}
