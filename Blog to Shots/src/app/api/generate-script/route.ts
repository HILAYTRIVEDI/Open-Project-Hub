import { NextRequest, NextResponse } from "next/server";
import { scrapeBlog } from "@/lib/scraper";
import { generateVideoScript } from "@/lib/generate-script";
import { fetchStockBackgrounds } from "@/lib/stock-media";
import type { GenerateResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "A valid blog URL is required." } as GenerateResponse,
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format." } as GenerateResponse,
        { status: 400 }
      );
    }

    // Step 1: Scrape the blog
    const articleText = await scrapeBlog(url);

    // Step 2: Generate script using Gemini
    const script = await generateVideoScript(articleText);

    // Step 3: Fetch stock backgrounds from Pexels
    const backgrounds = await fetchStockBackgrounds(script);

    // Merge background URLs into the script
    if (backgrounds.hookBg) {
      script.hookBackgroundUrl = backgrounds.hookBg;
    }
    if (backgrounds.ctaBg) {
      script.ctaBackgroundUrl = backgrounds.ctaBg;
    }
    script.scenes = script.scenes.map((scene, i) => ({
      ...scene,
      backgroundUrl: backgrounds.sceneBgs[i] ?? undefined,
    }));

    return NextResponse.json({
      success: true,
      script,
    } as GenerateResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[generate-script API]", message);
    return NextResponse.json(
      { success: false, error: message } as GenerateResponse,
      { status: 500 }
    );
  }
}
