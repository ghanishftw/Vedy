"use client";

import React, { useState } from "react";
import VideoInput from "@/components/VideoInput";
import EditorWorkspace from "@/components/EditorWorkspace";
import { Scissors, Zap, Download, Sparkles, ShieldCheck } from "lucide-react";

interface Option {
  quality: string;
  label: string;
  ext: string;
  videoUrl: string | null;
  audioUrl: string | null;
  needMerge: boolean;
}

interface VideoData {
  title: string;
  duration: number;
  thumbnail: string | null;
  options: Option[];
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);

  const handleFetchVideo = async (url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/fetch-video?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch video details");
      }

      setVideoData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong fetching the video. Please check the URL and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setVideoData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col selection:bg-sky-950/45 selection:text-sky-200 overflow-x-hidden relative">
      
      {/* Header */}
      <header className="relative w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20 border-b border-zinc-900">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleReset}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-sky-500 to-sky-600 flex items-center justify-center border border-sky-400/25">
            <Scissors className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
            Vedy
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex-1 flex flex-col items-center justify-center py-16 z-10">
        {!videoData ? (
          /* Landing Page / Search View */
          <div className="w-full flex flex-col items-center">
            
            {/* Hero Section */}
            <div className="text-center max-w-2xl mx-auto px-6 mb-12">
              <div className="inline-flex items-center gap-1.5 bg-sky-950/20 border border-sky-900/30 px-3 py-1 rounded-full text-[11px] font-medium text-sky-300 mb-6">
                <Sparkles className="h-3 w-3 text-sky-400" />
                <span>Next-Gen Trimmer</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-[1.15] text-zinc-100 text-wrap: balance">
                Clip & Download YouTube Videos{" "}
                <span className="bg-gradient-to-r from-sky-400 to-sky-500 bg-clip-text text-transparent">
                  Instantly
                </span>
              </h1>
              <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
                A simple, client-side tool to trim and download high-quality YouTube clips. Fully private, browser-powered compilation.
              </p>
            </div>

            {/* Paste Input Container */}
            <VideoInput
              onFetch={handleFetchVideo}
              isLoading={isLoading}
              error={error}
            />

            {/* Features Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-6 mt-28">
              
              {/* Feature 1 */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-xl transition-all duration-300 hover:border-sky-900/50 group">
                <div className="h-9 w-9 bg-sky-950/40 text-sky-400 border border-sky-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">Frictionless Download</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  No account setup, ads, or capthas. Just paste any public link and process it in milliseconds.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-xl transition-all duration-300 hover:border-sky-900/50 group">
                <div className="h-9 w-9 bg-sky-950/40 text-sky-400 border border-sky-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Scissors className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">Exact Trim Timeline</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Set frame-exact start and end markers using our dual-handle seek bar. Review the snip in a looping live player.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-xl transition-all duration-300 hover:border-sky-900/50 group">
                <div className="h-9 w-9 bg-sky-950/40 text-sky-450 border border-sky-900/30 rounded-lg flex items-center justify-center mb-4">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">Private & Client-Side</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  FFmpeg.wasm compiles on your device. Video trimming and volume boosts happen privately in your browser.
                </p>
              </div>

            </div>

          </div>
        ) : (
          /* Editor Workspace View */
          <div className="w-full animate-fade-in">
            <EditorWorkspace
              videoData={videoData}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
    </div>
  );
}
