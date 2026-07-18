"use client";

import React, { useRef, useState, useEffect } from "react";

interface TimelineSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (val: [number, number]) => void;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
}

export default function TimelineSlider({ min, max, value, onChange }: TimelineSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeHandle, setActiveHandle] = useState<"start" | "end" | null>(null);

  const startVal = value[0];
  const endVal = value[1];

  // Calculate percentage positions for style rules
  const startPercent = max > 0 ? (startVal / max) * 100 : 0;
  const endPercent = max > 0 ? (endVal / max) * 100 : 100;

  const handlePointerDown = (handle: "start" | "end", e: React.PointerEvent) => {
    e.preventDefault();
    setActiveHandle(handle);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !trackRef.current || max === 0) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const offset = clientX - rect.left;
    const percentage = Math.min(Math.max(offset / rect.width, 0), 1);
    const rawVal = percentage * (max - min) + min;
    const roundedVal = Math.round(rawVal * 10) / 10; // 0.1s precision

    if (activeHandle === "start") {
      // Ensure start handle doesn't cross end handle (minimum 0.5s interval)
      const newStart = Math.min(roundedVal, endVal - 0.5);
      onChange([Math.max(newStart, min), endVal]);
    } else {
      // Ensure end handle doesn't cross start handle
      const newEnd = Math.max(roundedVal, startVal + 0.5);
      onChange([startVal, Math.min(newEnd, max)]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setActiveHandle(null);
    }
  };

  return (
    <div className="w-full py-6 select-none">
      <div className="flex justify-between text-xs text-zinc-400 mb-2">
        <span>Start: <strong className="text-sky-400 font-semibold">{formatTime(startVal)}</strong></span>
        <span>Duration: <strong className="text-zinc-300 font-semibold">{formatTime(endVal - startVal)}</strong></span>
        <span>End: <strong className="text-sky-400 font-semibold">{formatTime(endVal)}</strong></span>
      </div>

      {/* Slider Track Container */}
      <div 
        ref={trackRef}
        className="relative h-3 bg-zinc-800/80 rounded-full cursor-pointer backdrop-blur-sm border border-zinc-700/50"
        onPointerDown={(e) => {
          // If clicking direct on track, jump closest handle
          if (!trackRef.current || max === 0) return;
          const rect = trackRef.current.getBoundingClientRect();
          const offset = e.clientX - rect.left;
          const percentage = Math.min(Math.max(offset / rect.width, 0), 1);
          const clickedVal = percentage * (max - min) + min;
          
          const distToStart = Math.abs(clickedVal - startVal);
          const distToEnd = Math.abs(clickedVal - endVal);

          if (distToStart < distToEnd) {
            const newStart = Math.min(clickedVal, endVal - 0.5);
            onChange([Math.max(Math.round(newStart * 10) / 10, min), endVal]);
          } else {
            const newEnd = Math.max(clickedVal, startVal + 0.5);
            onChange([startVal, Math.min(Math.round(newEnd * 10) / 10, max)]);
          }
        }}
      >
        {/* Active Highlight Range */}
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        />

        {/* Start Handle Knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-zinc-105 rounded-full border-2 border-sky-500 cursor-grab active:cursor-grabbing transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
          style={{ left: `${startPercent}%` }}
          onPointerDown={(e) => handlePointerDown("start", e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="w-1.5 h-3 border-l border-r border-sky-500/50 flex" />
          
          {/* Tooltip */}
          {activeHandle === "start" && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-sky-500 text-sky-300 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
              {formatTime(startVal)}
            </div>
          )}
        </div>

        {/* End Handle Knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-zinc-105 rounded-full border-2 border-sky-500 cursor-grab active:cursor-grabbing transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
          style={{ left: `${endPercent}%` }}
          onPointerDown={(e) => handlePointerDown("end", e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="w-1.5 h-3 border-l border-r border-sky-500/50 flex" />
          
          {/* Tooltip */}
          {activeHandle === "end" && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-sky-500 text-sky-300 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
              {formatTime(endVal)}
            </div>
          )}
        </div>
      </div>
      
      {/* Ticks/Grid */}
      <div className="flex justify-between text-[10px] text-zinc-500 mt-2 px-1">
        <span>0:00</span>
        <span>{formatTime(max / 4)}</span>
        <span>{formatTime(max / 2)}</span>
        <span>{formatTime((3 * max) / 4)}</span>
        <span>{formatTime(max)}</span>
      </div>
    </div>
  );
}
