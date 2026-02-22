import { z } from "zod";

export const SceneSchema = z.object({
  id: z.number(),
  text: z.string(),
  description: z.string().optional(), // Short context/explanation for the scene
  keywords: z.array(z.string()).optional(),
  backgroundUrl: z.string().optional(),
});

export const VideoScriptSchema = z.object({
  title: z.string(),
  hook: z.string(),
  hookKeywords: z.array(z.string()).optional(),
  hookBackgroundUrl: z.string().optional(),
  scenes: z.array(SceneSchema).min(4).max(12),
  cta: z.string(),
  ctaKeywords: z.array(z.string()).optional(),
  ctaBackgroundUrl: z.string().optional(),
});

export type Scene = z.infer<typeof SceneSchema>;
export type VideoScript = z.infer<typeof VideoScriptSchema>;

export interface GenerateRequest {
  url: string;
}

export interface GenerateResponse {
  success: boolean;
  script?: VideoScript;
  error?: string;
}
