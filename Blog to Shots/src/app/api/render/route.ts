import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";
import { Readable } from "stream";

// Force Node.js runtime for filesystem access
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes timeout for Pro/Enterprise

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { script } = body;

    if (!script) {
      return NextResponse.json(
        { success: false, error: "Missing script data." },
        { status: 400 }
      );
    }

    // 1. Locate the Remotion entry point
    const entryPoint = path.join(process.cwd(), "src", "remotion", "index.ts");
    
    console.log("[Render] Bundling...");
    
    // 2. Bundle the composition
    const bundleLocation = await bundle({
      entryPoint,
      // If deployed, you might need to adjust this, but locally it works
      webpackOverride: (config) => config,
    });

    console.log("[Render] Selecting composition...");

    // 3. Select the composition "BlogToShorts"
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "BlogToShorts",
      inputProps: { script },
    });

    // 4. Create a temp file for output
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "remotion-"));
    const finalOutput = path.join(tmpDir, "out.mp4");

    console.log("[Render] Rendering video...");

    // 5. Render the video
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: finalOutput,
      inputProps: { script },
    });

    // 6. Read the file buffer
    const fileBuffer = await fs.promises.readFile(finalOutput);

    // cleanup
    await fs.promises.rm(tmpDir, { recursive: true, force: true });

    // 7. Return the file as a stream
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="blog-to-shorts-${Date.now()}.mp4"`,
      },
    });

  } catch (error: unknown) {
    console.error("[Render API]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Render failed" },
      { status: 500 }
    );
  }
}
