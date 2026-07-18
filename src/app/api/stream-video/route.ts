import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing URL parameter", { status: 400 });
  }

  // Get range header from the client request (browser video tags use this for buffering)
  const range = request.headers.get("range");

  const headers: HeadersInit = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  if (range) {
    headers["Range"] = range;
  }

  try {
    const res = await fetch(url, { headers });
    
    // Copy the response headers
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", res.headers.get("Content-Type") || "video/mp4");
    
    if (res.headers.get("Content-Length")) {
      responseHeaders.set("Content-Length", res.headers.get("Content-Length")!);
    }
    if (res.headers.get("Content-Range")) {
      responseHeaders.set("Content-Range", res.headers.get("Content-Range")!);
    }
    if (res.headers.get("Accept-Ranges")) {
      responseHeaders.set("Accept-Ranges", res.headers.get("Accept-Ranges")!);
    }
    
    // Add CORS headers so the client browser can fetch it as a Blob/ArrayBuffer
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

    // Return the response stream directly
    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error("Proxy error streaming video:", err);
    return new Response(`Failed to stream video: ${err.message || err}`, { status: 500 });
  }
}

// Support OPTIONS pre-flight requests from client
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
