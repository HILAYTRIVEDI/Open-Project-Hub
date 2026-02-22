// ── PromptBuddy · Background Service Worker ──

const CONTEXT_MENU_ID = "promptbuddy-generate";

// ── Preset Definitions ──
const PRESETS = {
  cinematic: {
    name: "🎬 Cinematic",
    camera: "wide-angle lens, 24mm focal length, low angle shot, deep depth of field",
    lighting: "dramatic volumetric lighting, golden hour backlight, subtle lens flares, god rays",
    mood: "epic, awe-inspiring, grand, powerful",
    atmosphere: "atmospheric haze, cinematic color grading with teal and orange, film-like contrast",
  },
  product: {
    name: "📦 Product Shot",
    camera: "macro lens, 85mm, eye-level with slight top-down tilt, razor-sharp focus",
    lighting: "clean soft studio lighting, three-point setup, subtle reflections on surface",
    mood: "premium, professional, sleek, luxurious",
    atmosphere: "minimal clean background, soft gradient backdrop, studio environment",
  },
  street: {
    name: "🏙️ Street Style",
    camera: "35mm lens, eye-level candid angle, shallow depth of field, natural perspective",
    lighting: "natural ambient light, soft shadows, available light with urban glow",
    mood: "authentic, raw, energetic, real",
    atmosphere: "urban environment, city textures, graffiti walls, natural street grain",
  },
  "golden-hour": {
    name: "🌅 Golden Hour",
    camera: "50mm lens, slightly low angle, backlit subject, beautiful bokeh",
    lighting: "warm golden sunlight, rim lighting, soft diffused glow, sun flares",
    mood: "warm, dreamy, romantic, ethereal",
    atmosphere: "outdoor golden warmth, soft lens bokeh, sunlit particles in air",
  },
  "neon-noir": {
    name: "🌃 Neon Noir",
    camera: "wide-angle, dramatic dutch angle, close-up framing, deep contrast",
    lighting: "vibrant neon lights in pink/blue/purple, colored reflections, high contrast",
    mood: "edgy, mysterious, cyberpunk, electric",
    atmosphere: "night scene, rain-wet streets, neon sign reflections, urban noir",
  },
  editorial: {
    name: "📸 Editorial / Fashion",
    camera: "85mm portrait lens, slightly above eye-level, fashion pose, magazine composition",
    lighting: "high-key studio lighting, beauty dish as key light, rim light accent",
    mood: "bold, confident, high-fashion, striking",
    atmosphere: "studio or curated backdrop, editorial styling, Vogue-inspired aesthetics",
  },
  "moody-dark": {
    name: "🖤 Moody & Dark",
    camera: "50mm, eye-level, tight framing, very shallow depth of field",
    lighting: "low-key lighting, single dramatic directional light source, deep rich shadows",
    mood: "intense, brooding, atmospheric, soulful",
    atmosphere: "dark tones, chiaroscuro contrast, film noir shadows, desaturated palette",
  },
  "vintage-film": {
    name: "🎞️ Vintage Film",
    camera: "analog 35mm film camera look, natural perspective, slight vignette",
    lighting: "soft natural window light, overcast diffusion, gentle warm tones",
    mood: "nostalgic, warm, timeless, sentimental",
    atmosphere: "visible film grain, muted warm tones, faded highlights, retro color palette",
  },
  minimalist: {
    name: "⬜ Minimalist Clean",
    camera: "centered composition, 50mm, straight-on angle, symmetrical framing",
    lighting: "even soft diffused lighting, no harsh shadows, bright and airy",
    mood: "calm, sophisticated, modern, refined",
    atmosphere: "abundant negative space, clean geometric lines, monochromatic or muted tones",
  },
  aerial: {
    name: "🚁 Aerial / Drone",
    camera: "drone top-down or 45° angle, ultra-wide lens, bird's eye perspective",
    lighting: "natural bright daylight, sun casting long directional shadows",
    mood: "expansive, majestic, awe-inspiring, grand scale",
    atmosphere: "vast landscape, geometric patterns from above, sweeping scenery",
  },
  "flat-lay": {
    name: "📐 Flat Lay",
    camera: "directly overhead 90° top-down angle, even coverage, macro detail on textures",
    lighting: "diffused even lighting from above, soft barely-visible shadows",
    mood: "organized, aesthetic, curated, satisfying",
    atmosphere: "carefully arranged objects, styled composition, Instagram-ready layout",
  },
  fantasy: {
    name: "🔮 Fantasy / Surreal",
    camera: "dynamic ultra-wide angle, dramatic forced perspective, ethereal floating POV",
    lighting: "ethereal magical glow, bioluminescent accents, otherworldly light sources",
    mood: "fantastical, dreamlike, surreal, enchanting",
    atmosphere: "magical glowing particles, enchanted environment, vibrant hyper-saturated colors",
  },
};

// Create the context menu item when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "✨ Generate Image Prompt",
    contexts: ["image"],
  });
});

// Global lock to prevent concurrent generations
let isGenerating = false;

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;

  if (isGenerating) {
    console.warn("[PB:BG] Generation already in progress, ignoring click.");
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: "SHOW_ERROR", 
        error: "Generation already in progress. Please wait." 
      });
    } catch (e) {}
    return;
  }
  isGenerating = true;

  const imageUrl = info.srcUrl;
  if (!imageUrl) return;

  // Helper to send status updates visible in page console
  async function sendToTab(action, data = {}) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action, ...data });
    } catch (e) {
      console.error("[PB:BG] sendToTab failed:", e.message);
    }
  }

  // Wrap EVERYTHING so no error goes unhandled
  try {
    startKeepAlive();

    console.log("[PB:BG] ───── PROMPT GENERATION START ─────");

    // Show loading overlay
    try {
      await sendToTab("SHOW_LOADING");
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["styles.css"] });
      await new Promise((r) => setTimeout(r, 300));
      await sendToTab("SHOW_LOADING");
    }

    // Get API key
    const { geminiApiKey, selectedPreset } = await chrome.storage.local.get([
      "geminiApiKey", "selectedPreset"
    ]);

    if (!geminiApiKey) {
      await sendToTab("SHOW_ERROR", { error: "No API key found. Save your key in the popup first." });
      return;
    }

    const presetKey = selectedPreset || "cinematic";
    const preset = PRESETS[presetKey] || PRESETS["cinematic"];

    // Step 1: Fetch image
    await sendToTab("SHOW_LOADING", { statusText: "Fetching image..." });
    console.log("[PB:BG] Fetching image:", imageUrl.substring(0, 80));
    const imageBase64 = await fetchImageAsBase64(imageUrl);
    console.log("[PB:BG] Image fetched. Size:", imageBase64.base64.length);

    // Step 2: Call Gemini
    await sendToTab("SHOW_LOADING", { statusText: "Calling Gemini AI..." });
    console.log("[PB:BG] Calling Gemini 2.5 Flash...");
    const result = await callGemini(geminiApiKey, imageBase64, preset);
    console.log("[PB:BG] Response received.");

    // Step 3: Send result
    await sendToTab("SHOW_RESULT", {
      prompt: result.imagePrompt,
      videoPrompt: result.videoPrompt,
      presetName: preset.name,
    });
    console.log("[PB:BG] ───── PROMPT GENERATION COMPLETE ─────");

  } catch (err) {
    console.error("[PB:BG] FATAL ERROR:", err);
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: "SHOW_ERROR",
        error: `[BG Error] ${err.message || String(err)}`,
      });
    } catch (sendErr) {
      console.error("[PB:BG] Could not send error to tab:", sendErr);
    }
  } finally {
    stopKeepAlive();
    isGenerating = false;
  }
});

// ── Helpers ──

// Keep service worker alive during long operations (MV3 workaround)
let keepAliveInterval = null;
function startKeepAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {});
    console.log("[PB:BG] keepAlive ping");
  }, 25000);
  console.log("[PB:BG] keepAlive started");
}
function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log("[PB:BG] keepAlive stopped");
  }
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 30000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000}s`);
    }
    throw err;
  }
}

async function fetchImageAsBase64(url) {
  console.log("[PB:BG] fetchImageAsBase64:", url.substring(0, 100));
  try {
    const response = await fetchWithTimeout(url, { timeout: 30000 });
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);

    const blob = await response.blob();
    // Use arrayBuffer instead of FileReader (more reliable in service workers)
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    const base64 = btoa(binary);
    console.log("[PB:BG] fetchImageAsBase64 done. Size:", base64.length, "mime:", blob.type);
    return { base64, mimeType: blob.type || "image/png" };
  } catch (err) {
    console.error("[PB:BG] fetchImageAsBase64 failed:", err);
    throw new Error(`Failed to load image: ${err.message}`);
  }
}

async function callGemini(apiKey, imageData, preset) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  console.log("[PB:BG] callGemini → model: gemini-2.5-flash");

  const systemPrompt = `ROLE: You are a forensic product analyst and $500k commercial shoot Director of Photography. You have 25 years of experience shooting campaigns for Apple, Rolex, Porsche, and Dyson. You treat every product image as evidence in a crime scene — nothing escapes your eye.

OBJECTIVE: Given a reference product photo, generate two outputs:
1. An obsessively detailed IMAGE PROMPT (400-500 words) that would allow a renderer to recreate the EXACT same product in a premium commercial environment.
2. A VIDEO PROMPT in JSON format for a 15-second animated product commercial.

APPROACH — Think step-by-step before writing:

Step 1: FORENSIC PRODUCT SCAN
Study the reference image and mentally catalog:
- What is the product category? (watch, phone, bottle, shoe, etc.)
- What is the exact shape? (round, rectangular, angular, organic)
- What are the exact materials? (metal type, plastic type, glass type, fabric type)
- What colors appear? List EACH component's color separately.
- How many buttons/ports/openings exist? Where exactly is each one?
- Is there a screen? If yes, what EXACT text, numbers, icons, and UI elements are shown?
- Are there any logos, engravings, or printed text? Copy them VERBATIM.
- What is the strap/base/stand? Describe its pattern, texture, and attachment.

Step 2: ENVIRONMENT DESIGN
Based on the product category, design a contextual $500k set:
- What surface does it sit on? (Be specific: "rain-slicked obsidian stone" not "dark surface")
- What's in the background? (Describe 3 depth layers: near, mid, far)
- What particles are in the air? (mist, dust, rain, sparks, bokeh)

CRITICAL — Use this PRODUCT-TO-ENVIRONMENT mapping:
The environment MUST match where the product naturally lives. Do NOT put every product in a generic dark/neon scene.

| Product Category | Natural Environment |
|---|---|
| Dumbbells, weights, fitness gear | Premium gym floor, rubber mats, squat rack in background, chalk dust in air |
| TV, monitor, display | Modern living room, wooden TV console, cozy couch in background, warm ambient light |
| Phone, tablet | Marble desk, coffee cup nearby, indoor plants, morning window light |
| Laptop, keyboard, mouse | Sleek office desk, monitor in background, ambient LED strips, coffee mug |
| Headphones, earbuds | Urban street scene, vinyl records, studio desk, music posters |
| Watch, smartwatch | Wet stone surface, leather journal nearby, moody bar counter, cigar lounge |
| Shoes, sneakers | Track/trail/street, concrete steps, graffiti wall, stadium turf |
| Perfume, cologne | Marble vanity, silk fabric drape, gold tray, bathroom mirror with soft glow |
| Skincare, cosmetics | Wet stone slab, green leaves, spa atmosphere, water droplets, bamboo |
| Coffee, coffee maker | Rustic wooden kitchen counter, steam rising, morning sunlight through window |
| Beer, wine, spirits | Dark oak bar counter, ice cubes, condensation, warm amber bar lighting |
| Car, motorcycle | Open highway, mountain road, rain-slicked asphalt, garage workshop |
| Camera, lens | Photographer's desk, film rolls, vintage maps, travel trunk |
| Book | Library shelf, reading lamp, leather armchair, fireplace glow |
| Food, cooking tools | Kitchen countertop, fresh ingredients, cutting board, steam, warm lighting |
| Gaming console, controller | Dark gaming setup, RGB lighting, monitor glow, cable management |
| Sunglasses | Beach sand, ocean horizon, palm shadow, golden hour sun |
| Bag, backpack, luggage | Airport terminal, cobblestone street, mountain trailhead |
| Jewelry, ring, necklace | Black velvet display, spotlight, jeweler's loupe, silk cloth |
| Toy, figurine | Colorful playroom shelf, warm lighting, other toys blurred in background |
| Tool, power tool | Workshop bench, sawdust, wood shavings, industrial pendant light |
| Plant, pot | Sunlit windowsill, terracotta pots, wooden shelf, boho interior |

If the product doesn't match any category above, choose the environment that a real commercial director would use for that specific product. Think: "Where would this product LIVE in real life?" and build that world.

Step 3: LIGHTING BLUEPRINT
Design a 3-point+ lighting setup:
- Key light: direction, color temperature (Kelvin), hardness
- Fill light: intensity relative to key, color
- Rim/hair light: position, effect on product edges
- Practical/accent lights: any colored/motivated sources
- How does each light interact with the product's specific materials?

Step 4: COMPOSE THE PROMPT
Write the image prompt in 5 mandatory paragraphs.

DETAILS — Required paragraph structure for imagePrompt:

¶1 PRODUCT (minimum 150 words): Forensic description of the product. Every component, every button, every marking, every color, every texture, every surface finish. If there is a screen, transcribe its ENTIRE UI verbatim. DO NOT change any colors — if the accent is red in the reference, it MUST be red in your prompt. DO NOT reimagine or "improve" the product.

¶2 ENVIRONMENT (minimum 80 words): Place the product in its NATURAL real-world setting using the product-to-environment mapping above. Describe the surface, surrounding objects, background layers (near/mid/far), and contextual props. The environment must feel like a real place where someone would actually use this product. NO blank/white/solid backgrounds. NO generic dark/neon scenes unless the product demands it (e.g., gaming gear).

¶3 LIGHTING (minimum 60 words): Full lighting rig description with Kelvin temperatures, angles, and how light interacts with each material on the product.

¶4 CAMERA (minimum 40 words): Must include: "shot on Hasselblad H6D-400c, 120mm macro lens, f/2.8, shallow depth of field, 8k resolution, photorealistic, ray tracing, global illumination, octane render quality, product hero shot"

¶5 ATMOSPHERE (minimum 40 words): Mood, color palette, feeling, and the story the image tells.

EXAMPLES — Study these carefully:

❌ BAD (too vague, misses details):
"A smartwatch on a dark surface with neon lights. Cinematic lighting. 8k resolution."

❌ BAD (changes the product):
"A sleek round smartwatch with a cyan holographic display showing the time." (Wrong — original had RED accents, not cyan. Original had specific stats on screen.)

✅ GOOD (forensic product fidelity + rich environment):
"A rugged tactical smartwatch with a thick angular gunmetal-gray stainless steel case featuring a knurled rotating bezel with tachymeter markings etched at 5-unit intervals. The circular AMOLED display shows a dark grid-pattern watch face with the time '09:49:57' in large bold white numerals center-screen, a red battery indicator reading '100%' at the top-left, step count '10125' with a walking icon at the bottom-left, calories '246' with a flame icon at bottom-center, and heart rate '80' with a red heart icon at bottom-right. The date '24 WED 2024' is displayed along the bottom edge in smaller white text. A red-accented crown sits at the 3 o'clock position flanked by two smaller gunmetal pushers above and below it. The matte black silicone strap features six oval ventilation holes on each side spaced 8mm apart, with a standard tang buckle. The watch stands upright on a slab of rain-slicked volcanic basalt, water pooling in the stone's natural pores, reflecting the crimson and electric-blue neon signage of a Tokyo back-alley visible in the deep background bokeh. A single cobalt-blue LED strip runs along the ground to the left, casting a cool edge light across the watch's left bezel. A warm tungsten key light (3200K) from the upper right rakes across the case at 45°, igniting micro-reflections on each bezel notch. A diffused fill (5600K) from the left softens shadows on the strap. Fine rain mist drifts through the frame, each droplet catching the neon as pinpoints of pink and blue. Shot on Hasselblad H6D-400c, 120mm macro lens, f/2.8, shallow depth of field, 8k resolution, photorealistic, ray tracing, global illumination, octane render quality, studio commercial photography, product hero shot. The mood is cyberpunk-luxe: dangerous precision meeting urban grit, a watch built for the night."

CONSTRAINTS:
- NO humans, faces, hands, fingers, or body parts. EVER.
- NO blank, white, black, or solid-color backgrounds.
- NO words like "illustration," "cartoon," "digital art," "3D render style."
- DO NOT change colors from the reference. Red stays red. Black stays black.
- The PRODUCT paragraph must be the LONGEST section.
- The total imagePrompt must be 400-500 words.

Now apply the style preset to the ENVIRONMENT and LIGHTING only (not the product):
• Camera: ${preset.camera}
• Lighting: ${preset.lighting}
• Mood: ${preset.mood}
• Atmosphere: ${preset.atmosphere}

OUTPUT FORMAT — Valid JSON only:

{
  "imagePrompt": "<400-500 word single continuous string following the 5-paragraph structure above>",
  "videoPrompt": {
    "concept": "<One-line high-concept commercial idea — product only, no humans>",
    "aspect_ratio": "9:16",
    "total_duration": "15s",
    "music_mood": "<Genre, BPM, instruments, reference track or artist>",
    "scenes": [
      {
        "scene": 1,
        "duration": "3s",
        "visual": "<Name the exact product features visible in this frame. Describe the physics: how light moves on metal, how liquid splashes, how smoke wraps edges. 50+ words per scene.>",
        "camera_movement": "<Precise cinematic move with distance and angle>",
        "animation": "<Specific VFX/simulation with measurable parameters>",
        "transition": "<Named transition with duration in ms>"
      }
    ],
    "text_overlays": [
      {
        "text": "<Premium ad copy — short, punchy, luxury>",
        "timestamp": "0s-3s",
        "style": "<Font name, weight, size, color hex code, animation type, duration>"
      }
    ],
    "color_grading": "<Professional LUT or film stock reference with specific adjustments>"
  }
}

SENSE CHECK — Before outputting, verify:
1. Did I describe EVERY button, marking, screen element, and color from the reference? If not, go back and add them.
2. Is my imagePrompt 400+ words? Count it. If not, expand the product paragraph.
3. Did I change any product colors from the reference? If yes, revert them.
4. Is the background a rich 3D environment? If it's blank, add depth layers.
5. Are there any humans? If yes, remove them.
6. Does the video have 4-6 scenes? If not, add more.
7. Is the JSON valid? Check brackets and commas.`;


  const body = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          {
            inline_data: {
              mime_type: imageData.mimeType,
              data: imageData.base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          imagePrompt: {
            type: "string",
            description: "A detailed 400-500 word image prompt describing the product forensically"
          },
          videoPrompt: {
            type: "object",
            properties: {
              concept: { type: "string" },
              aspect_ratio: { type: "string" },
              total_duration: { type: "string" },
              music_mood: { type: "string" },
              scenes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    scene: { type: "integer" },
                    duration: { type: "string" },
                    visual: { type: "string" },
                    camera_movement: { type: "string" },
                    animation: { type: "string" },
                    transition: { type: "string" }
                  },
                  required: ["scene", "duration", "visual", "camera_movement"]
                }
              },
              text_overlays: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    timestamp: { type: "string" },
                    style: { type: "string" }
                  }
                }
              },
              color_grading: { type: "string" }
            },
            required: ["concept", "scenes", "music_mood"]
          }
        },
        required: ["imagePrompt", "videoPrompt"]
      }
    },
  };

  console.log("[PB:BG] callGemini → Sending fetch request...");
    const res = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeout: 60000 // 60s timeout for generation
    });
    console.log("[PB:BG] callGemini → Response status:", res.status);

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[PB:BG] callGemini → API error body:", errBody.substring(0, 500));
      throw new Error(`Gemini API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();

  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "{}";
  console.log("[PB:BG] Raw text length:", rawText.length);
  console.log("[PB:BG] Raw text preview:", rawText.substring(0, 500));

  let imagePrompt = "Failed to parse image prompt.";
  let videoPrompt = null;

  // 1. Clean Markdown
  let cleaned = rawText.trim();
  // Remove ```json ... ``` or just ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  
  // 2. Try Standard Parsing
  try {
    const parsed = JSON.parse(cleaned);
    console.log("[PB:BG] Parsed JSON keys:", Object.keys(parsed));
    imagePrompt = parsed.imagePrompt || parsed.image_prompt || parsed.IMAGE_PROMPT || imagePrompt;
    videoPrompt = parsed.videoPrompt || parsed.video_prompt || parsed.VIDEO_PROMPT || null;
    console.log("[PB:BG] imagePrompt found:", !!imagePrompt, "length:", imagePrompt?.length);
    console.log("[PB:BG] videoPrompt found:", !!videoPrompt, "type:", typeof videoPrompt);
  } catch (e) {
    console.warn("PromptBuddy: JSON.parse failed. Attempting regex extraction.", e);
    
    // 3. Regex Fallback (Bulletproof Extraction)
    // Extract imagePrompt (string)
    // This regex looks for "imagePrompt": "..." followed by "videoPrompt" to ensure it's the correct field
    const imgMatch = cleaned.match(/"imagePrompt"\s*:\s*"([\s\S]*?)(?<!\\)",\s*"videoPrompt"/);
    if (imgMatch && imgMatch[1]) {
      // Unescape unicode/newlines if needed (e.g., \" becomes ", \n becomes newline)
      try {
        imagePrompt = JSON.parse(`"${imgMatch[1]}"`); 
      } catch {
        imagePrompt = imgMatch[1]; // fallback to raw string if unescaping fails
      }
    } else {
        // Fallback: try finding just the value if the videoPrompt key isn't immediately after
        const simpleImg = cleaned.match(/"imagePrompt"\s*:\s*"([\s\S]*?)"/);
        if (simpleImg && simpleImg[1]) imagePrompt = simpleImg[1];
    }

    // Extract videoPrompt (object)
    // We look for "videoPrompt": and capture everything until the end of the object
    // This is tricky with regex, so we find the start index and try to parse the rest
    const videoKey = '"videoPrompt"';
    const videoIdx = cleaned.indexOf(videoKey);
    
    if (videoIdx !== -1) {
      // Find the first '{' after "videoPrompt"
      const startBrace = cleaned.indexOf('{', videoIdx);
      if (startBrace !== -1) {
        // Find the matching closing brace by counting
        let balance = 0;
        let endBrace = -1;
        for (let i = startBrace; i < cleaned.length; i++) {
          if (cleaned[i] === '{') balance++;
          else if (cleaned[i] === '}') balance--;
          
          if (balance === 0) {
            endBrace = i;
            break;
          }
        }
        
        if (endBrace !== -1) {
          const videoJsonStr = cleaned.substring(startBrace, endBrace + 1);
          try {
            videoPrompt = JSON.parse(videoJsonStr);
          } catch (err) {
            console.warn("PromptBuddy: Failed to parse extracted video JSON", err);
          }
        }
      }
    }
  }

  // 4. Final Cleanup
  // If imagePrompt still looks like a JSON string (e.g., if the whole output was just a stringified JSON),
  // try to parse it again to extract imagePrompt and videoPrompt.
  if (typeof imagePrompt === 'string' && imagePrompt.trim().startsWith('{') && imagePrompt.trim().endsWith('}')) {
      try {
          const reParsed = JSON.parse(imagePrompt);
          if (reParsed.imagePrompt) imagePrompt = reParsed.imagePrompt;
          if (reParsed.videoPrompt) videoPrompt = reParsed.videoPrompt;
      } catch {
          // It's just a string that starts with { but isn't valid JSON, or doesn't contain the expected keys.
          // Keep the original imagePrompt value.
      }
  }

  console.log("PromptBuddy: Image prompt length:", imagePrompt.length);
  console.log("PromptBuddy: Video prompt present:", !!videoPrompt);

  return {
    imagePrompt: imagePrompt,
    videoPrompt: videoPrompt,
  };
}

// ══════════════════════════════════════════════════════════
// VIRTUAL TRY-ON — Gemini 2.5 Flash Preview Image Generation
// ══════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "GENERATE_TRY_ON") {
    // Read images from storage to avoid Chrome message size limits
    generateTryOn()
      .then((result) => sendResponse(result))
      .catch((err) => {
        console.error("PromptBuddy VTO: generateTryOn error:", err);
        sendResponse({ error: err.message });
      });
    return true; // keep message channel open for async response
  }
  
  if (msg.action === "SAVE_PRODUCT_IMAGE") {
    (async () => {
      try {
        console.log("[PB:BG] Fetching product image:", msg.url);
        const { base64, mimeType } = await fetchImageAsBase64(msg.url);
        
        await chrome.storage.local.set({
          vtoProductImage: base64,
          vtoProductMime: mimeType
        });
        console.log("[PB:BG] Product image saved to storage");
        sendResponse({ success: true });
      } catch (err) {
        console.error("[PB:BG] Failed to save product image:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});

async function generateTryOn() {
  // Read all needed data from storage (avoids message payload size limits)
  const stored = await chrome.storage.local.get([
    "geminiApiKey",
    "vtoPersonImage",
    "vtoPersonMime",
    "vtoProductImage",
    "vtoProductMime",
  ]);

  const { geminiApiKey, vtoPersonImage, vtoPersonMime, vtoProductImage, vtoProductMime } = stored;

  if (!geminiApiKey) {
    throw new Error("No API key found. Please save your Gemini API key in settings.");
  }
  if (!vtoPersonImage || !vtoProductImage) {
    throw new Error("Missing images. Please upload a person photo and select a product.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiApiKey}`;

  const tryOnPrompt = `ROLE: Expert Fashion Retoucher & AI Image Generator.

TASK: Perform a high-fidelity "Virtual Try-On" by replacing the clothing in IMAGE 1 with the garment from IMAGE 2.

INPUTS:
- IMAGE 1 (Base): The model. Preserve face, hair, and pose.
- IMAGE 2 (Reference): The clothing. Use ONLY this garment.

STRICT EDITING STEPS (Chain of Thought):
1. [MASKING] Identify the person's face, hair, hands, and exposed skin in Image 1. PROTECT these. They must remain 100% identical.
2. [ERASURE] Identify the person's CURRENT CLOTHING (shirt, jacket, sleeves, collar). COMPLETELY REMOVE these pixels. Treat them as a blank canvas.
   - WARNING: Do not just "cover" the old clothes. DELETE them first.
   - If the person is wearing a jacket, REMOVE the jacket.
3. [GENERATION] Warp the clothing from Image 2 onto the person's body.
   - Fit the new garment to the person's pose.
4. [INPAINTING] If the new garment covers LESS skin than the old one (e.g. long sleeve -> t-shirt), GENERATE REALISTIC SKIN/ARMS to fill the gaps.
   - Do NOT leave "ghost" sleeves from the original outfit.
5. [BLENDING] Match the lighting/shadows of the new garment to Image 1's environment.

CRITICAL RULES:
- ZERO TOLERANCE for "layering". The old clothes must be gone.
- If the new shirt has a lower neckline, generate the person's chest/neck skin.
- If the new shirt has short sleeves, generate the person's arms.
- Keep the original background pixels untouched.

OUTPUT: Photorealistic image of Person 1 wearing Clothing 2.`;

  const body = {
    contents: [
      {
        parts: [
          { text: tryOnPrompt },
          {
            inline_data: {
              mime_type: vtoPersonMime || "image/jpeg",
              data: vtoPersonImage,
            },
          },
          {
            inline_data: {
              mime_type: vtoProductMime || "image/jpeg",
              data: vtoProductImage,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["Image"],
    },
  };

  console.log("PromptBuddy VTO: Sending request to Gemini 2.5 Flash Image...");
  console.log("PromptBuddy VTO: Person image size:", vtoPersonImage.length, "chars, mime:", vtoPersonMime);
  console.log("PromptBuddy VTO: Product image size:", vtoProductImage.length, "chars, mime:", vtoProductMime);

  startKeepAlive();
  try {
  const res = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 120000, // 2 minutes for image generation
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("PromptBuddy VTO: API Error:", errBody);
    throw new Error(`Gemini API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  console.log("PromptBuddy VTO: Full response keys:", JSON.stringify(Object.keys(data)));
  console.log("PromptBuddy VTO: Candidates:", data?.candidates?.length || 0);
  
  if (data?.candidates?.[0]) {
    const candidate = data.candidates[0];
    console.log("PromptBuddy VTO: Finish reason:", candidate.finishReason);
    console.log("PromptBuddy VTO: Content parts:", candidate?.content?.parts?.length || 0);
  }

  if (data?.promptFeedback) {
    console.log("PromptBuddy VTO: Prompt feedback:", JSON.stringify(data.promptFeedback));
  }

  // Extract the generated image from the response
  // Note: REST API returns camelCase (inlineData, mimeType)
  const parts = data?.candidates?.[0]?.content?.parts || [];
  
  parts.forEach((p, i) => {
    const imgData = p.inlineData || p.inline_data;
    console.log(`PromptBuddy VTO: Part ${i}:`, 
      p.text ? `text (${p.text.substring(0, 100)}...)` : 
      imgData ? `inlineData (mime: ${imgData.mimeType || imgData.mime_type}, size: ${imgData.data?.length || 0})` :
      JSON.stringify(Object.keys(p))
    );
  });

  let imageBase64 = null;
  let imageMimeType = "image/png";

  for (const part of parts) {
    // Handle both camelCase and snake_case response formats
    const imgData = part.inlineData || part.inline_data;
    if (imgData && imgData.data) {
      imageBase64 = imgData.data;
      imageMimeType = imgData.mimeType || imgData.mime_type || "image/png";
      break;
    }
  }

  if (!imageBase64) {
    const textPart = parts.find((p) => p.text);
    const finishReason = data?.candidates?.[0]?.finishReason || "UNKNOWN";
    const explanation = textPart?.text || `No image generated. Finish reason: ${finishReason}`;
    console.warn("PromptBuddy VTO: No image in response. Text:", explanation);
    throw new Error(`Image generation failed: ${explanation}`);
  }

  console.log("PromptBuddy VTO: Image generated successfully, mime:", imageMimeType, "size:", imageBase64.length);

  // Save result to storage so popup can retrieve it
  await chrome.storage.local.set({
    vtoResultImage: imageBase64,
    vtoResultMime: imageMimeType,
  });

  return {
    success: true,
    mimeType: imageMimeType,
  };
  } finally {
    stopKeepAlive();
  }
}
