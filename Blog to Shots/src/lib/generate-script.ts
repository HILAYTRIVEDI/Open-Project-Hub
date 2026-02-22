import { GoogleGenerativeAI } from "@google/generative-ai";
import { VideoScriptSchema, type VideoScript } from "./types";

const SYSTEM_PROMPT = `You are a high-performance content transformation engine.

Your purpose is to convert long-form written content into short-form high-retention vertical video scripts optimized for social distribution.

You must:
1. Extract the most emotionally engaging insight.
2. Write punchy lines under 12 words each.
3. Structure content for 45–60 second vertical videos.
4. Prioritize clarity over complexity.
5. Avoid fluff, filler, and abstract language.
6. Maintain logical progression.
7. End with a strong call to action.
8. Output structured JSON only.
9. Ensure scene timing is natural.
10. Optimize for retention and scroll-stopping hooks.
11. For each scene, provide 2 visual search keywords that describe the best stock photo background for that scene. Keywords should be concrete, visual nouns (e.g. "technology laptop", "sunrise mountain", "robot hand"). Avoid abstract words.
12. For each scene, provide a "description" field: a 1-sentence explanation of WHY this point matters or provides context. This is for the human/agent reading the script.

Output format must always be valid JSON.`;

const MASTER_PROMPT = `Transform the following blog content into a 60-second vertical video script.

Requirements:
- Start with a strong 5-second hook.
- Break content into 6–10 scenes.
- Each scene must be under 12 words.
- Each line must be emotionally direct.
- Avoid corporate tone.
- Avoid repetition.
- Focus on clarity.
- Add one persuasive CTA at the end.
- For the hook, each scene, and the CTA, provide 2 visual keywords that describe the ideal stock photo background. Keywords should be concrete visual nouns, NOT abstract concepts.
- For each scene, include a "description" (1 short sentence) explaining the context.

Return output in this exact JSON format (no markdown, no code fences, ONLY raw JSON):
{
  "title": "A short catchy title",
  "hook": "A scroll-stopping hook under 12 words",
  "hookKeywords": ["keyword1", "keyword2"],
  "scenes": [
    {"id": 1, "text": "Scene text under 12 words", "description": "Why this matters", "keywords": ["keyword1", "keyword2"]},
    {"id": 2, "text": "Scene text under 12 words", "description": "Context here", "keywords": ["keyword1", "keyword2"]}
  ],
  "cta": "A compelling call to action",
  "ctaKeywords": ["keyword1", "keyword2"]
}

Blog Content:
{{ARTICLE_TEXT}}`;

export async function generateVideoScript(articleText: string): Promise<VideoScript> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = MASTER_PROMPT.replace("{{ARTICLE_TEXT}}", articleText);

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Clean the response - remove possible markdown fences
  let cleaned = responseText.trim();
  // Strip any markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: try to extract JSON object from the response
    const jsonMatch = cleaned.match(/(\{[\s\S]*\})/)?.[1];
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch);
      } catch {
        throw new Error(
          `Gemini returned invalid JSON. Raw response:\n${responseText.slice(0, 500)}`
        );
      }
    } else {
      throw new Error(
        `Gemini returned invalid JSON. Raw response:\n${responseText.slice(0, 500)}`
      );
    }
  }

  // Validate with Zod
  const validated = VideoScriptSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Script validation failed: ${validated.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  // Check word count per scene
  for (const scene of validated.data.scenes) {
    const wordCount = scene.text.split(/\s+/).length;
    if (wordCount > 14) {
      throw new Error(
        `Scene ${scene.id} exceeds 12 words (${wordCount}). Regeneration needed.`
      );
    }
  }

  return validated.data;
}
