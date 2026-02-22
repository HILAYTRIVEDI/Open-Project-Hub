"use client";

import React, { useMemo } from "react";
import { Player } from "@remotion/player";
import { BlogToShortsVideo } from "@/remotion/BlogToShortsVideo";
import type { VideoScript } from "@/lib/types";

interface VideoPreviewProps {
  script: VideoScript;
}

export default function VideoPreview({ script }: VideoPreviewProps) {
  const FPS = 30;

  const totalDuration = useMemo(() => {
    return 5 * FPS + script.scenes.length * 4 * FPS + 5 * FPS;
  }, [script, FPS]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 360,
        aspectRatio: "9/16",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.15)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Player
        component={BlogToShortsVideo}
        inputProps={{ script }}
        durationInFrames={totalDuration}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={FPS}
        style={{ width: "100%", height: "100%" }}
        controls
        autoPlay
        loop
      />
    </div>
  );
}
