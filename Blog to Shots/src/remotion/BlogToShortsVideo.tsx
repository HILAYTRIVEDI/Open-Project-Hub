import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Img,
} from "remotion";
import type { VideoScript } from "@/lib/types";

/* ═══════════════════════════════════════════
   REUSABLE ADVANCED ELEMENTS
   ═══════════════════════════════════════════ */

/** Ken Burns background image — slow cinematic zoom + pan on a still photo */
const KenBurnsBackground: React.FC<{
  src: string;
  direction?: "in" | "out";
  panX?: number;
  panY?: number;
}> = ({ src, direction = "in", panX = 0, panY = -3 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = frame / durationInFrames;

  const scale =
    direction === "in"
      ? interpolate(progress, [0, 1], [1.0, 1.2])
      : interpolate(progress, [0, 1], [1.2, 1.0]);

  const translateX = interpolate(progress, [0, 1], [0, panX]);
  const translateY = interpolate(progress, [0, 1], [0, panY]);

  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Dark cinematic overlay on top of background images */
const CinematicOverlay: React.FC<{
  opacity?: number;
  gradient?: "center" | "bottom" | "full";
  tintColor?: string;
}> = ({ opacity = 0.6, gradient = "center", tintColor = "0,0,0" }) => {
  const gradients: Record<string, string> = {
    center: `radial-gradient(ellipse at center, rgba(${tintColor},${opacity * 0.5}) 0%, rgba(${tintColor},${opacity}) 70%)`,
    bottom: `linear-gradient(180deg, rgba(${tintColor},${opacity * 0.3}) 0%, rgba(${tintColor},${opacity * 0.6}) 40%, rgba(${tintColor},${opacity}) 100%)`,
    full: `linear-gradient(180deg, rgba(${tintColor},${opacity}) 0%, rgba(${tintColor},${opacity * 0.8}) 50%, rgba(${tintColor},${opacity}) 100%)`,
  };

  return (
    <AbsoluteFill
      style={{ background: gradients[gradient], pointerEvents: "none" }}
    />
  );
};

/** Floating particles that drift upward with slight horizontal sway */
const Particles: React.FC<{ count?: number; color?: string; seed?: number }> = ({
  count = 20,
  color = "rgba(255,255,255,0.15)",
  seed = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const r = ((seed + i) * 7919 + 104729) % 100000;
      return {
        x: r % 1080,
        y: (r * 3) % 1920,
        size: 2 + (r % 4),
        speed: 0.2 + ((r * 7) % 100) / 150,
        drift: ((r * 13) % 200 - 100) / 100,
        opacity: 0.1 + ((r * 17) % 40) / 100,
        delay: (r % 300) / 100,
      };
    });
  }, [count, seed]);

  return (
    <>
      {particles.map((p, i) => {
        const y = (p.y - time * p.speed * 100) % 2100;
        const adjustedY = y < -100 ? y + 2200 : y;
        const x = p.x + Math.sin(time * 1.5 + p.delay) * 25 * p.drift;
        const fadeIn = interpolate(frame, [0, 15], [0, 1], {
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: adjustedY,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: color,
              opacity: p.opacity * fadeIn,
              filter: p.size > 4 ? "blur(1px)" : undefined,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

/** Animated geometric ring with orbiting dot */
const FloatingRing: React.FC<{
  x: number;
  y: number;
  size: number;
  accent: string;
  speed?: number;
}> = ({ x, y, size, accent, speed = 30 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const fadeIn = interpolate(frame, [5, 25], [0, 0.5], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: x,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1.5px solid ${accent}20`,
        transform: `rotate(${time * speed}deg)`,
        opacity: fadeIn,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -5,
          left: "50%",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: `${accent}80`,
          transform: "translateX(-50%)",
          boxShadow: `0 0 14px ${accent}50`,
        }}
      />
    </div>
  );
};

/** Word-by-word kinetic text reveal with spring physics */
const KineticText: React.FC<{
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  staggerDelay?: number;
  startFrame?: number;
  shadow?: boolean;
}> = ({
  text,
  fontSize = 52,
  fontWeight = 800,
  color = "white",
  staggerDelay = 3,
  startFrame = 5,
  shadow = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${fontSize * 0.25}px`,
        maxWidth: 900,
      }}
    >
      {words.map((word, i) => {
        const wordStart = startFrame + i * staggerDelay;

        const opacity = interpolate(frame, [wordStart, wordStart + 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const translateY = interpolate(
          frame,
          [wordStart, wordStart + 10],
          [30, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }
        );

        const scale = spring({
          frame: Math.max(0, frame - wordStart),
          fps,
          config: { damping: 12, stiffness: 120 },
        });

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${translateY}px) scale(${scale})`,
              fontSize,
              fontWeight,
              color,
              lineHeight: 1.3,
              fontFamily: "'Inter', sans-serif",
              textShadow: shadow
                ? "0 2px 20px rgba(0,0,0,0.8), 0 4px 40px rgba(0,0,0,0.4)"
                : "none",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

/** Animated SVG progress ring */
const ProgressRing: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
}> = ({ progress, size = 50, strokeWidth = 3, color = "#a78bfa", label }) => {
  const frame = useCurrentFrame();
  const circumference = (size - strokeWidth) * Math.PI;
  const animatedProgress = interpolate(frame, [0, 20], [0, progress], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const offset = circumference * (1 - animatedProgress);
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, opacity }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      <span
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.5)",
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: 1,
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}
      >
        {label}
      </span>
    </div>
  );
};

/** Equalizer bars */
const EqualizerBars: React.FC<{ accent: string; count?: number }> = ({
  accent,
  count = 5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const fadeIn = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 180,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 6,
        alignItems: "flex-end",
        opacity: fadeIn * 0.5,
      }}
    >
      {Array.from({ length: count }, (_, i) => {
        const height = 12 + 18 * Math.abs(Math.sin(time * 3 + i * 1.2));
        return (
          <div
            key={i}
            style={{
              width: 4,
              height,
              borderRadius: 2,
              background: `${accent}70`,
            }}
          />
        );
      })}
    </div>
  );
};

/** Wipe transition */
const WipeTransition: React.FC<{
  color?: string;
  direction?: "left" | "right";
}> = ({ color = "#a78bfa", direction = "right" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const wipeIn = interpolate(frame, [0, 8], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const wipeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [0, 100],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );

  if (frame > 10 && frame < durationInFrames - 10) return null;

  const x =
    frame <= 10
      ? direction === "right"
        ? wipeIn - 100
        : 100 - wipeIn
      : direction === "right"
        ? wipeOut
        : -wipeOut;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: `${x}%`,
        width: "100%",
        height: "100%",
        background: `linear-gradient(${direction === "right" ? "90deg" : "270deg"}, ${color}00, ${color}30, ${color}00)`,
        zIndex: 10,
        pointerEvents: "none",
      }}
    />
  );
};

/* ═══════════════════════════════════════════
   FALLBACK GRADIENT BACKGROUNDS
   ═══════════════════════════════════════════ */

const FallbackGradient: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const gradients = [
    "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    "linear-gradient(160deg, #141e30 0%, #243b55 100%)",
    "linear-gradient(160deg, #1d1d3b 0%, #2a1b3d 50%, #44318d 100%)",
    "linear-gradient(160deg, #0d1117 0%, #161b22 50%, #21262d 100%)",
  ];

  return (
    <AbsoluteFill
      style={{
        background: gradients[index % gradients.length],
        transform: `translate(${Math.sin(time * 0.5) * 10}px, ${Math.cos(time * 0.7) * 8}px) scale(1.05)`,
      }}
    />
  );
};

/* ═══════════════════════════════════════════
   SCENE COMPONENTS
   ═══════════════════════════════════════════ */

const HookScene: React.FC<{
  text: string;
  backgroundUrl?: string;
}> = ({ text, backgroundUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelSlide = interpolate(frame, [0, 20], [-40, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* Background: Stock photo or gradient fallback */}
      {backgroundUrl ? (
        <>
          <KenBurnsBackground src={backgroundUrl} direction="in" panY={-2} />
          <CinematicOverlay opacity={0.55} gradient="center" />
        </>
      ) : (
        <>
          <FallbackGradient index={0} />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 500,
              height: 500,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
              transform: "translate(-50%, -50%)",
              filter: "blur(40px)",
            }}
          />
        </>
      )}

      {/* Particles — lighter over images */}
      <Particles
        count={backgroundUrl ? 15 : 30}
        color={backgroundUrl ? "rgba(255,255,255,0.12)" : "rgba(167,139,250,0.25)"}
        seed={42}
      />

      {/* Floating ring */}
      <FloatingRing x={850} y={120} size={140} accent="#a78bfa" />

      {/* Content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          zIndex: 2,
        }}
      >
        {/* HOOK label */}
        <div
          style={{
            opacity: labelOpacity,
            transform: `translateX(${labelSlide}px)`,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 20px",
              borderRadius: 999,
              background: "rgba(167,139,250,0.15)",
              border: "1px solid rgba(167,139,250,0.3)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#a78bfa",
                boxShadow: "0 0 10px #a78bfa80",
              }}
            />
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 4,
                textTransform: "uppercase" as const,
                color: "#a78bfa",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              HOOK
            </span>
          </div>
        </div>

        <KineticText
          text={text}
          fontSize={62}
          fontWeight={900}
          staggerDelay={4}
          startFrame={10}
          shadow={true}
        />
      </AbsoluteFill>

      <EqualizerBars accent="#a78bfa" count={7} />
      <WipeTransition color="#a78bfa" />
    </AbsoluteFill>
  );
};

const ContentScene: React.FC<{
  text: string;
  description?: string;
  sceneIndex: number;
  totalScenes: number;
  backgroundUrl?: string;
}> = ({ text, description, sceneIndex, totalScenes, backgroundUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accentColors = ["#60a5fa", "#a78bfa", "#34d399", "#f472b6", "#fbbf24"];
  const accent = accentColors[sceneIndex % accentColors.length];
  const progress = (sceneIndex + 1) / totalScenes;

  const numScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 100 },
  });
  const numOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Ken Burns direction alternates per scene
  const kenBurnsDir = sceneIndex % 2 === 0 ? "in" : "out";
  const panX = sceneIndex % 3 === 0 ? 2 : sceneIndex % 3 === 1 ? -2 : 0;
  const panY = sceneIndex % 2 === 0 ? -3 : 2;

  // Bottom bar animation
  const barWidth = interpolate(frame, [10, 40], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill>
      {/* Background */}
      {backgroundUrl ? (
        <>
          <KenBurnsBackground
            src={backgroundUrl}
            direction={kenBurnsDir as "in" | "out"}
            panX={panX}
            panY={panY}
          />
          <CinematicOverlay opacity={0.55} gradient="center" tintColor="10,10,30" />
        </>
      ) : (
        <FallbackGradient index={sceneIndex} />
      )}

      {/* Particles */}
      <Particles
        count={backgroundUrl ? 10 : 20}
        color={backgroundUrl ? "rgba(255,255,255,0.08)" : `${accent}20`}
        seed={sceneIndex * 100}
      />

      {/* Ring decoration */}
      <FloatingRing
        x={900 - sceneIndex * 30}
        y={130 + sceneIndex * 15}
        size={100 + sceneIndex * 8}
        accent={accent}
        speed={25}
      />

      {/* Large watermark number */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${numScale})`,
          opacity: numOpacity * (backgroundUrl ? 0.03 : 0.04),
          fontSize: 550,
          fontWeight: 900,
          color: "white",
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        {sceneIndex + 1}
      </div>

      {/* Content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          zIndex: 2,
        }}
      >
        {/* Top bar: scene badge + progress ring */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: numOpacity,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `${accent}25`,
                border: `1.5px solid ${accent}50`,
                backdropFilter: "blur(8px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 18,
                fontWeight: 800,
                color: accent,
                fontFamily: "'Inter', sans-serif",
                transform: `scale(${numScale})`,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              {sceneIndex + 1}
            </div>
            <span
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.4)",
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              }}
            >
              of {totalScenes}
            </span>
          </div>

          <ProgressRing
            progress={progress}
            color={accent}
            label={`${Math.round(progress * 100)}%`}
          />
        </div>

        {/* Kinetic text */}
        <KineticText
          text={text}
          fontSize={54}
          fontWeight={800}
          staggerDelay={3}
          startFrame={8}
          shadow={true}
        />

        {/* Description */}
        {description && (
          <div
            style={{
              marginTop: 30,
              maxWidth: 800,
              textAlign: "center",
              opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(frame, [20, 35], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })}px)`,
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "rgba(255,255,255,0.85)",
                fontFamily: "'Inter', sans-serif",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                lineHeight: 1.4,
              }}
            >
              {description}
            </span>
          </div>
        )}
      </AbsoluteFill>

      {/* Bottom accent bar */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: "50%",
          transform: "translateX(-50%)",
          width: barWidth,
          height: 3,
          borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 60,
          right: 60,
          height: 2,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${accent}80, ${accent})`,
            borderRadius: 1,
            boxShadow: `0 0 8px ${accent}40`,
          }}
        />
      </div>

      <WipeTransition
        color={accent}
        direction={sceneIndex % 2 === 0 ? "right" : "left"}
      />
    </AbsoluteFill>
  );
};

const CTAScene: React.FC<{
  text: string;
  backgroundUrl?: string;
}> = ({ text, backgroundUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const arrowBounce = Math.sin(time * 5) * 8;
  const glowSize = interpolate(frame, [15, 40], [0, 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ringScale = interpolate(frame, [0, 50], [0.5, 1.5], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ringOpacity = interpolate(frame, [0, 20, 50], [0, 0.3, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* Background */}
      {backgroundUrl ? (
        <>
          <KenBurnsBackground src={backgroundUrl} direction="out" panX={-1} panY={1} />
          <CinematicOverlay opacity={0.6} gradient="center" tintColor="20,5,40" />
        </>
      ) : (
        <AbsoluteFill
          style={{
            background: `
              radial-gradient(ellipse at 50% 50%, rgba(168,85,247,${0.15 + 0.05 * Math.sin(time * 4)}) 0%, transparent 60%),
              linear-gradient(160deg, #1a0533 0%, #2d1b69 50%, #0f0c29 100%)
            `,
          }}
        />
      )}

      {/* Particles */}
      <Particles
        count={backgroundUrl ? 15 : 40}
        color={backgroundUrl ? "rgba(255,255,255,0.1)" : "rgba(192,132,252,0.2)"}
        seed={999}
      />

      {/* Expanding rings */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: "2px solid rgba(168,85,247,0.25)",
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          opacity: ringOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 250,
          height: 250,
          borderRadius: "50%",
          border: "1.5px solid rgba(168,85,247,0.15)",
          transform: `translate(-50%, -50%) scale(${ringScale * 0.8})`,
          opacity: ringOpacity * 0.7,
        }}
      />

      <FloatingRing x={100} y={300} size={120} accent="#c084fc" speed={-20} />

      {/* Content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          zIndex: 2,
        }}
      >
        <div style={{ marginBottom: 40, textAlign: "center" as const }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 24px",
              borderRadius: 999,
              background: "rgba(192,132,252,0.12)",
              border: "1px solid rgba(192,132,252,0.35)",
              backdropFilter: "blur(8px)",
              boxShadow: `0 0 ${glowSize}px rgba(192,132,252,0.2)`,
            }}
          >
            <span
              style={{
                fontSize: 20,
                transform: `translateY(${arrowBounce}px)`,
                display: "inline-block",
              }}
            >
              👇
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#c084fc",
                letterSpacing: 4,
                textTransform: "uppercase" as const,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              TAKE ACTION
            </span>
          </div>
        </div>

        <KineticText
          text={text}
          fontSize={56}
          fontWeight={900}
          staggerDelay={4}
          startFrame={12}
          shadow={true}
        />
      </AbsoluteFill>

      <EqualizerBars accent="#c084fc" count={9} />
      <WipeTransition color="#c084fc" direction="left" />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════
   MAIN COMPOSITION
   ═══════════════════════════════════════════ */

export const BlogToShortsVideo: React.FC<{ script: VideoScript }> = ({
  script,
}) => {
  const FPS = 30;
  const HOOK_DURATION = 5 * FPS;
  const CTA_DURATION = 5 * FPS;
  const SCENE_DURATION = 4 * FPS;

  const totalScenes = script.scenes.length;
  const totalContentFrames = totalScenes * SCENE_DURATION;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Hook */}
      <Sequence from={0} durationInFrames={HOOK_DURATION}>
        <HookScene
          text={script.hook}
          backgroundUrl={script.hookBackgroundUrl}
        />
      </Sequence>

      {/* Content Scenes */}
      {script.scenes.map((scene, index) => {
        const from = HOOK_DURATION + index * SCENE_DURATION;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={SCENE_DURATION}>
            <ContentScene
              text={scene.text}
              description={scene.description}
              sceneIndex={index}
              totalScenes={totalScenes}
              backgroundUrl={scene.backgroundUrl}
            />
          </Sequence>
        );
      })}

      {/* CTA */}
      <Sequence
        from={HOOK_DURATION + totalContentFrames}
        durationInFrames={CTA_DURATION}
      >
        <CTAScene text={script.cta} backgroundUrl={script.ctaBackgroundUrl} />
      </Sequence>
    </AbsoluteFill>
  );
};

export default BlogToShortsVideo;
