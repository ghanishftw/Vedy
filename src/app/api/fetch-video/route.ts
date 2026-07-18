import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFilePromise = promisify(execFile);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing YouTube URL parameter" }, { status: 400 });
  }

  // Basic validation of YouTube URL
  const isYouTubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
  if (!isYouTubeUrl) {
    return NextResponse.json({ error: "Invalid YouTube URL format" }, { status: 400 });
  }

  try {
    const ytdlpPath = path.join(process.cwd(), "venv/bin/yt-dlp");
    
    // Execute yt-dlp to get video metadata in JSON format
    const { stdout } = await execFilePromise(ytdlpPath, ["-j", url]);
    const info = JSON.parse(stdout);

    // Extract basic metadata
    const title = info.title;
    const duration = info.duration; // in seconds
    const thumbnail = info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[info.thumbnails.length - 1].url : null);
    
    // Group and find formats
    const formats = info.formats || [];
    
    // 1. Find the best combined video+audio format (usually 360p, format 18)
    const combinedFormats = formats.filter(
      (f: any) => f.vcodec !== "none" && f.acodec !== "none" && f.ext === "mp4"
    );
    const bestCombined = combinedFormats.find((f: any) => f.height === 360) || combinedFormats[0];

    // 2. Find best audio-only format
    const audioFormats = formats.filter(
      (f: any) => f.vcodec === "none" && f.acodec !== "none"
    );
    // Sort by audio bitrate (descending)
    audioFormats.sort((a: any, b: any) => (b.abr || 0) - (a.abr || 0));
    const bestAudio = audioFormats[0];

    // 3. Find video-only formats for higher quality options (720p, 1080p)
    const videoOnlyFormats = formats.filter(
      (f: any) => f.vcodec !== "none" && f.acodec === "none" && f.ext === "mp4"
    );

    const f720p = videoOnlyFormats.find((f: any) => f.height === 720);
    const f1080p = videoOnlyFormats.find((f: any) => f.height === 1080);

    // Build the format options we will send to the frontend
    const options = [];

    // Add 360p combined option (no merge required)
    if (bestCombined) {
      options.push({
        quality: "360p",
        label: "360p (Fast Download)",
        ext: "mp4",
        videoUrl: bestCombined.url,
        audioUrl: null, // already contains audio
        needMerge: false,
      });
    }

    // Add 720p option (separate video and audio streams)
    if (f720p && bestAudio) {
      options.push({
        quality: "720p",
        label: "720p (HD)",
        ext: "mp4",
        videoUrl: f720p.url,
        audioUrl: bestAudio.url,
        needMerge: true,
      });
    } else if (bestCombined && bestCombined.height >= 720) {
      // If there was a combined 720p format, use it
      options.push({
        quality: "720p",
        label: "720p (HD)",
        ext: "mp4",
        videoUrl: bestCombined.url,
        audioUrl: null,
        needMerge: false,
      });
    }

    // Add 1080p option (separate video and audio streams)
    if (f1080p && bestAudio) {
      options.push({
        quality: "1080p",
        label: "1080p (Full HD)",
        ext: "mp4",
        videoUrl: f1080p.url,
        audioUrl: bestAudio.url,
        needMerge: true,
      });
    }

    // Add MP3 option (audio only)
    if (bestAudio) {
      options.push({
        quality: "Audio Only",
        label: `MP3 Audio (~${Math.round(bestAudio.abr || 128)}kbps)`,
        ext: "mp3",
        videoUrl: null,
        audioUrl: bestAudio.url,
        needMerge: false,
      });
    }

    return NextResponse.json({
      title,
      duration,
      thumbnail,
      options,
    });
  } catch (error: any) {
    console.error("Error fetching video details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch video details from YouTube" },
      { status: 500 }
    );
  }
}
