"use client";

import React, { useState } from "react";
import VideoPreview from "@/components/VideoPreview";
import type { VideoScript, GenerateResponse } from "@/lib/types";



type Stage = "idle" | "scraping" | "generating" | "done" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [downloading, setDownloading] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setScript(null);
    setStage("scraping");

    try {
      // A small visual delay so user can see the scraping stage
      await new Promise((r) => setTimeout(r, 800));
      setStage("generating");

      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data: GenerateResponse = await response.json();

      if (!data.success || !data.script) {
        throw new Error(data.error || "Failed to generate script");
      }

      setScript(data.script);
      setStage("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!script) return;
    setDownloading(true);
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      
      if (!response.ok) throw new Error("Rendering failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blog-to-shorts-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="app-container">
      {/* ── Background Effects ── */}
      <div className="bg-gradient" />
      <div className="bg-grid" />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <h1>Blog to Shots</h1>
        </div>
        <p className="tagline">
          Transform any blog post into scroll-stopping short videos
        </p>
      </header>

      {/* ── Input Section ── */}
      <section className="input-section">
        <form onSubmit={handleGenerate} className="input-form">
          <div className="input-wrapper">
            <svg
              className="input-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <input
              type="url"
              placeholder="Paste your blog URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={stage === "scraping" || stage === "generating"}
              className="url-input"
              id="blog-url-input"
            />
          </div>
          <button
            type="submit"
            disabled={
              !url.trim() || stage === "scraping" || stage === "generating"
            }
            className="generate-btn"
            id="generate-btn"
          >
            {stage === "scraping" || stage === "generating" ? (
              <span className="btn-loading">
                <span className="spinner" />
                {stage === "scraping" ? "Scanning..." : "Writing Script..."}
              </span>
            ) : (
              <>
                <span>Generate Video</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </>
            )}
          </button>
        </form>
      </section>

      {/* ── Error ── */}
      {error && (
        <div className="error-banner" id="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={() => { setError(null); setStage("idle"); }} className="error-dismiss">
            Try Again
          </button>
        </div>
      )}

      {/* ── Pipeline Progress ── */}
      {(stage === "scraping" || stage === "generating") && (
        <div className="pipeline-progress">
          <div className="pipeline-steps">
            <div className={`pipeline-step ${stage === "scraping" ? "active" : "done"}`}>
              <div className="step-dot" />
              <span>Scraping Blog</span>
            </div>
            <div className="pipeline-line" />
            <div className={`pipeline-step ${stage === "generating" ? "active" : ""}`}>
              <div className="step-dot" />
              <span>AI Script Generation</span>
            </div>
            <div className="pipeline-line" />
            <div className="pipeline-step">
              <div className="step-dot" />
              <span>Ready to Preview</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {script && stage === "done" && (
        <section className="results-section">
          {/* Script Card */}
          <div className="script-card">
            <div className="card-header">
              <h2>📝 Generated Script</h2>
              <span className="scene-count">{script.scenes.length} scenes</span>
            </div>

            <div className="script-content">
              <div className="script-block hook-block">
                <span className="block-label">HOOK</span>
                <p>{script.hook}</p>
              </div>

              <div className="scenes-list">
                {script.scenes.map((scene) => (
                  <div key={scene.id} className="scene-item">
                    <span className="scene-number">{scene.id}</span>
                    <div className="scene-text-wrapper">
                      <p className="scene-main-text">{scene.text}</p>
                      {scene.description && (
                        <p className="scene-description">
                          {scene.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="script-block cta-block">
                <span className="block-label">CTA</span>
                <p>{script.cta}</p>
              </div>
            </div>
          </div>

          {/* Video Preview */}
          <div className="preview-card">
            <div className="card-header">
              <div className="preview-header-left">
                <span className="preview-emoji">🎬</span>
                <h2>Video Preview</h2>
              </div>
            </div>
            <div className="preview-container">
              <VideoPreview script={script} />
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="app-footer">
        <p>
          Powered by <strong>Gemini AI</strong> + <strong>Remotion</strong>
        </p>
      </footer>
    </main>
  );
}
