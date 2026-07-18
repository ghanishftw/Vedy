"use client";

import React, { useState, useEffect, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
// Custom browser-safe helpers to bypass `@ffmpeg/util` dynamic node imports that crash Turbopack
async function fetchFile(file: any): Promise<Uint8Array> {
  if (file instanceof Blob) {
    return new Uint8Array(await file.arrayBuffer());
  }
  if (file instanceof ArrayBuffer) {
    return new Uint8Array(file);
  }
  if (typeof file === "string") {
    const response = await fetch(file);
    return new Uint8Array(await response.arrayBuffer());
  }
  return file;
}

async function toBlobURL(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}
import TimelineSlider, { formatTime } from "./TimelineSlider";
import ProgressBar from "./ProgressBar";
import { 
  Play, Pause, Sliders, Volume2, Video, 
  Download, RefreshCw, Layers, Scissors, Sun, AlertCircle 
} from "lucide-react";

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

interface EditorWorkspaceProps {
  videoData: VideoData;
  onReset: () => void;
}

// Fetch helper with progress reporting
const fetchWithProgress = async (
  url: string, 
  onProgress: (prog: number) => void
): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load asset from proxy: HTTP ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (total === 0) {
    return response.blob();
  }

  const reader = response.body!.getReader();
  let loaded = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress((loaded / total) * 100);
  }

  return new Blob(chunks as any);
};

export default function EditorWorkspace({ videoData, onReset }: EditorWorkspaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Trimming State
  const [trimRange, setTrimRange] = useState<[number, number]>([0, videoData.duration]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Video Filters State
  const [brightness, setBrightness] = useState(0.0); // -0.5 to 0.5, default 0
  const [contrast, setContrast] = useState(1.0);     // 0.5 to 1.5, default 1
  const [saturation, setSaturation] = useState(1.0); // 0.0 to 2.0, default 1
  const [volume, setVolume] = useState(1.0);         // 0.0 to 2.0, default 1 (volume boost)

  // Export Quality Option State
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);

  // Preview Load State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // FFmpeg & Download Progress State
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [exportSubStatus, setExportSubStatus] = useState("");

  const selectedOption = videoData.options[selectedOptionIdx];

  // 1. Download preview video on mount
  useEffect(() => {
    // Look for combined 360p format for fast preview, fallback to any valid video URL
    const previewOption = videoData.options.find(o => o.quality === "360p") || videoData.options.find(o => o.videoUrl !== null);
    
    if (!previewOption || !previewOption.videoUrl) {
      setPreviewError("No streamable format found for preview.");
      return;
    }

    let active = true;
    setPreviewLoading(true);
    setPreviewProgress(0);

    const streamUrl = `/api/stream-video?url=${encodeURIComponent(previewOption.videoUrl)}`;
    
    fetchWithProgress(streamUrl, (p) => {
      if (active) setPreviewProgress(p);
    })
      .then((blob) => {
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setPreviewLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setPreviewError("Failed to download video stream for preview.");
        setPreviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [videoData]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 2. Playback loops within trim range
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime < trimRange[0]) {
        video.currentTime = trimRange[0];
      }
      if (video.currentTime >= trimRange[1]) {
        video.currentTime = trimRange[0];
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [trimRange]);

  // Handle trim slider changes (seek to start immediately)
  const handleTrimChange = (val: [number, number]) => {
    setTrimRange(val);
    const video = videoRef.current;
    if (video) {
      // If start position changed, seek to it
      if (Math.abs(video.currentTime - val[0]) > 0.5) {
        video.currentTime = val[0];
      }
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Reset adjustments
  const resetFilters = () => {
    setBrightness(0.0);
    setContrast(1.0);
    setSaturation(1.0);
    setVolume(1.0);
  };

  // 3. FFmpeg export process
  const handleExport = async () => {
    if (exporting) return;
    
    setExporting(true);
    setExportProgress(0);
    setExportStatus("Loading FFmpeg editor engine...");
    setExportSubStatus("This may take a few seconds on first export");

    let ffmpeg: FFmpeg | null = null;
    try {
      // Instantiate FFmpeg
      ffmpeg = new FFmpeg();
      
      ffmpeg.on("log", ({ message }) => {
        console.log("FFmpeg core log:", message);
      });
      
      ffmpeg.on("progress", ({ progress }) => {
        // FFmpeg progress is 0 to 1. Map to 0-100%
        setExportProgress(Math.round(progress * 100));
      });

      const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      const start = trimRange[0];
      const end = trimRange[1];
      const duration = end - start;

      let videoFile = "input_video.mp4";
      let audioFile = "input_audio.mp4";

      // Download source streams
      if (selectedOption.videoUrl) {
        setExportStatus("Exporting video track...");
        setExportProgress(0);
        const videoStreamUrl = `/api/stream-video?url=${encodeURIComponent(selectedOption.videoUrl)}`;
        const videoBlob = await fetchWithProgress(videoStreamUrl, (p) => {
          setExportProgress(Math.round(p));
        });
        await ffmpeg.writeFile(videoFile, await fetchFile(videoBlob));
      }

      if (selectedOption.audioUrl) {
        setExportStatus("Exporting audio track...");
        setExportProgress(0);
        const audioStreamUrl = `/api/stream-video?url=${encodeURIComponent(selectedOption.audioUrl)}`;
        const audioBlob = await fetchWithProgress(audioStreamUrl, (p) => {
          setExportProgress(Math.round(p));
        });
        await ffmpeg.writeFile(audioFile, await fetchFile(audioBlob));
      }

      // Check if filter adjustments were made
      const hasVideoFilters = brightness !== 0.0 || contrast !== 1.0 || saturation !== 1.0;
      const hasAudioFilters = volume !== 1.0;

      setExportStatus("Processing and trimming video...");
      setExportProgress(0);
      setExportSubStatus("Trimming and applying filters in browser");

      const args: string[] = [];

      if (selectedOption.needMerge) {
        // Scenario 1: Needs merge (separate video and audio streams)
        // Trim inputs and merge
        args.push("-ss", start.toString(), "-to", end.toString(), "-i", videoFile);
        args.push("-ss", start.toString(), "-to", end.toString(), "-i", audioFile);

        // Apply filters if needed
        if (hasVideoFilters || hasAudioFilters) {
          if (hasVideoFilters) {
            // FFmpeg eq filter values: contrast (1.0 default), brightness (0.0 default), saturation (1.0 default)
            args.push("-vf", `eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturation}`);
          }
          if (hasAudioFilters) {
            args.push("-af", `volume=${volume}`);
          }
          // Since we apply filters, we must re-encode
          args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-c:a", "aac", "-b:a", "128k");
        } else {
          // Just copy streams without re-encoding (very fast!)
          args.push("-c:v", "copy", "-c:a", "aac");
        }
        
        args.push("output.mp4");
        await ffmpeg.exec(args);
      } else if (selectedOption.ext === "mp3") {
        // Scenario 2: Audio Only (MP3 export)
        args.push("-ss", start.toString(), "-to", end.toString(), "-i", audioFile);
        if (hasAudioFilters) {
          args.push("-af", `volume=${volume}`);
        }
        args.push("-vn", "-c:a", "libmp3lame", "-q:a", "2", "output.mp3");
        await ffmpeg.exec(args);
      } else {
        // Scenario 3: Single combined video file (e.g. 360p)
        args.push("-ss", start.toString(), "-to", end.toString(), "-i", videoFile);
        
        if (hasVideoFilters || hasAudioFilters) {
          if (hasVideoFilters) {
            args.push("-vf", `eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturation}`);
          }
          if (hasAudioFilters) {
            args.push("-af", `volume=${volume}`);
          }
          args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-c:a", "aac", "-b:a", "128k");
        } else {
          args.push("-c", "copy");
        }
        
        args.push(`output.${selectedOption.ext}`);
        await ffmpeg.exec(args);
      }

      setExportStatus("Finalizing output file...");
      setExportProgress(100);

      // Read output file
      const outFilename = selectedOption.ext === "mp3" ? "output.mp3" : `output.${selectedOption.ext}`;
      const data = await ffmpeg.readFile(outFilename);
      const outputBlob = new Blob([data as any], { type: selectedOption.ext === "mp3" ? "audio/mp3" : "video/mp4" });

      // Trigger automatic local download
      const downloadUrl = URL.createObjectURL(outputBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      
      // Clean filename
      const cleanTitle = videoData.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
      a.download = `${cleanTitle}_snip.${selectedOption.ext}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(downloadUrl);
      setExportStatus("Export completed successfully!");
      setExportSubStatus("Your file has been downloaded");
      
      // Clean up files in virtual system
      try {
        await ffmpeg.deleteFile(videoFile);
        await ffmpeg.deleteFile(audioFile);
        await ffmpeg.deleteFile(outFilename);
      } catch (e) {}

      setTimeout(() => {
        setExporting(false);
      }, 3000);

    } catch (err: any) {
      console.error("FFmpeg processing error:", err);
      setExportStatus("Error: Export failed");
      setExportSubStatus(err.message || "An error occurred during video compilation.");
      setTimeout(() => {
        setExporting(false);
      }, 5000);
    } finally {
      if (ffmpeg) {
        try {
          await ffmpeg.terminate();
        } catch (e) {}
      }
    }
  };

  // Preview styling filters for WYSIWYG real-time experience
  const previewFilterStyle = {
    filter: `brightness(${1 + brightness}) contrast(${contrast}) saturate(${saturation})`,
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Back button and metadata header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-zinc-900/60 pb-6">
        <div>
          <button
            onClick={onReset}
            disabled={exporting}
            className="text-[11px] text-zinc-400 hover:text-white transition flex items-center gap-1.5 mb-2 bg-zinc-900/30 border border-zinc-800/50 px-2.5 py-1 rounded-md cursor-pointer"
          >
            ← Back to Link Input
          </button>
          <h2 className="text-lg font-bold text-white line-clamp-1">{videoData.title}</h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Original Duration: {formatTime(videoData.duration)}
          </p>
        </div>
      </div>

      {/* Main Grid: Video Player + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Video Preview and Timeline Trimmer */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-video w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900/80 shadow-2xl flex items-center justify-center">
            {previewLoading && (
              <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 z-10">
                <RefreshCw className="h-8 w-8 text-purple-500 animate-spin mb-3" />
                <span className="text-zinc-300 text-sm font-medium">Downloading video from YouTube...</span>
                <span className="text-zinc-500 text-xs mt-1">Buffering local stream: {Math.round(previewProgress)}%</span>
                <div className="w-48 h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${previewProgress}%` }} />
                </div>
              </div>
            )}

            {previewError && (
              <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 z-10 text-center">
                <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
                <span className="text-zinc-300 text-sm font-medium">{previewError}</span>
                <button 
                  onClick={onReset}
                  className="mt-4 text-xs bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg"
                >
                  Go Back
                </button>
              </div>
            )}

            {previewUrl && (
              <video
                ref={videoRef}
                src={previewUrl}
                style={previewFilterStyle}
                className="w-full h-full object-contain"
                onClick={togglePlay}
                playsInline
              />
            )}

            {/* Play/Pause overlay toggle */}
            {previewUrl && !isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 bg-black/35 flex items-center justify-center hover:bg-black/25 transition group cursor-pointer"
              >
                <div className="h-16 w-16 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-xl group-hover:scale-110 transition duration-300">
                  <Play className="h-8 w-8 text-white fill-white ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* Timeline and Trimming Handles */}
          <div className="bg-zinc-950/40 border border-zinc-900/80 p-5 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <Scissors className="h-4.5 w-4.5 text-purple-400" />
              <h3 className="text-xs font-semibold text-zinc-200">Trimmer Options</h3>
            </div>
            
            <TimelineSlider
              min={0}
              max={videoData.duration}
              value={trimRange}
              onChange={handleTrimChange}
            />

            <div className="flex items-center justify-center gap-4 mt-2 border-t border-zinc-900/60 pt-4">
              <button
                onClick={togglePlay}
                disabled={previewLoading || !previewUrl}
                className="flex items-center justify-center gap-2 bg-zinc-900/50 border border-zinc-800/60 hover:bg-zinc-800/80 text-white text-xs font-medium px-5 py-2.5 rounded-xl transition duration-150 active:scale-95 cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    <span>Preview Loop</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Editing Adjustments & Export Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Section: Adjustments (Sliders) */}
          <div className="bg-zinc-950/40 border border-zinc-900/80 p-5 rounded-2xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-5 border-b border-zinc-900/60 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-cyan-400" />
                <h3 className="text-xs font-semibold text-zinc-200 font-medium">Fine-Tuning</h3>
              </div>
              <button
                onClick={resetFilters}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
              >
                Reset Adjustments
              </button>
            </div>

            {/* Slider: Brightness */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                <span className="flex items-center gap-1"><Sun className="h-3.5 w-3.5" /> Brightness</span>
                <span className="text-zinc-300 font-semibold">{brightness > 0 ? `+${Math.round(brightness * 100)}` : Math.round(brightness * 100)}%</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.02"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-1 appearance-none"
              />
            </div>

            {/* Slider: Contrast */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                <span>Contrast</span>
                <span className="text-zinc-300 font-semibold">{Math.round(contrast * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.02"
                value={contrast}
                onChange={(e) => setContrast(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-1 appearance-none"
              />
            </div>

            {/* Slider: Saturation */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                <span>Color Saturation</span>
                <span className="text-zinc-300 font-semibold">{Math.round(saturation * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.04"
                value={saturation}
                onChange={(e) => setSaturation(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-1 appearance-none"
              />
            </div>

            {/* Slider: Volume */}
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                <span className="flex items-center gap-1"><Volume2 className="h-3.5 w-3.5" /> Audio Volume</span>
                <span className="text-zinc-300 font-semibold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-sky-500 bg-zinc-800 rounded-lg cursor-pointer h-1 appearance-none"
              />
            </div>
          </div>

          {/* Section: Format & Quality */}
          <div className="bg-zinc-950/40 border border-zinc-900/80 p-5 rounded-2xl backdrop-blur-md flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-900/60 pb-3">
                <Layers className="h-4.5 w-4.5 text-sky-400" />
                <h3 className="text-xs font-semibold text-zinc-200 font-medium">Export Quality & Format</h3>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-2.5">
                {videoData.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOptionIdx(idx)}
                    disabled={exporting}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition text-left cursor-pointer ${
                      selectedOptionIdx === idx
                        ? "bg-sky-950/20 border-sky-500/35 text-white"
                        : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${selectedOptionIdx === idx ? "bg-sky-900/40 text-sky-300" : "bg-zinc-900 text-zinc-500"}`}>
                        {option.ext === "mp3" ? <Volume2 className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{option.label}</div>
                        <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
                          {option.ext.toUpperCase()} File {option.needMerge ? "• High Quality Merge" : ""}
                        </div>
                      </div>
                    </div>
                    {selectedOptionIdx === idx && (
                      <div className="h-2 w-2 rounded-full bg-sky-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Export & Download Button */}
            <div className="mt-8">
              {exporting ? (
                <ProgressBar
                  progress={exportProgress}
                  statusText={exportStatus}
                  subStatusText={exportSubStatus}
                />
              ) : (
                <button
                  onClick={handleExport}
                  disabled={previewLoading || !previewUrl}
                  className="w-full relative flex items-center justify-center gap-2 text-white font-medium py-4 px-6 rounded-xl transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed group active:scale-95 text-base cursor-pointer premium-button"
                >
                  <Download className="h-5.5 w-5.5" />
                  <span>Export & Download Snip</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
