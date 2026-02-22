// ── PromptBuddy · Popup Script ──

// ═══════════════════════════════════════
// TAB 1: Prompt Generator (existing)
// ═══════════════════════════════════════

const keyInput = document.getElementById("api-key");
const saveBtn = document.getElementById("save-btn");
const toast = document.getElementById("toast");
const toggleVis = document.getElementById("toggle-vis");
const presetSelect = document.getElementById("preset-select");
const presetHint = document.getElementById("preset-hint");

// Preset details for the hint box
const PRESET_HINTS = {
  cinematic: {
    camera: "Wide-angle 24mm, low angle, deep DOF",
    lighting: "Volumetric golden hour backlight, god rays",
    mood: "Epic, awe-inspiring, powerful",
    atmosphere: "Hazy, teal & orange color grading",
  },
  product: {
    camera: "85mm macro, eye-level, razor-sharp",
    lighting: "Soft studio 3-point, subtle reflections",
    mood: "Premium, professional, luxurious",
    atmosphere: "Clean minimal backdrop, studio feel",
  },
  street: {
    camera: "35mm, eye-level candid, shallow DOF",
    lighting: "Natural ambient, soft urban glow",
    mood: "Authentic, raw, energetic",
    atmosphere: "Urban textures, city grain",
  },
  "golden-hour": {
    camera: "50mm, low angle, backlit, bokeh",
    lighting: "Warm golden sun, rim light, flares",
    mood: "Warm, dreamy, romantic",
    atmosphere: "Outdoor warmth, sunlit particles",
  },
  "neon-noir": {
    camera: "Wide-angle, dutch angle, deep contrast",
    lighting: "Neon pink/blue/purple, high contrast",
    mood: "Edgy, mysterious, cyberpunk",
    atmosphere: "Rain-wet streets, neon reflections",
  },
  editorial: {
    camera: "85mm portrait, above eye-level, fashion",
    lighting: "High-key beauty dish, rim accent",
    mood: "Bold, confident, high-fashion",
    atmosphere: "Curated backdrop, Vogue-inspired",
  },
  "moody-dark": {
    camera: "50mm, tight framing, very shallow DOF",
    lighting: "Low-key single source, deep shadows",
    mood: "Intense, brooding, soulful",
    atmosphere: "Chiaroscuro, film noir, desaturated",
  },
  "vintage-film": {
    camera: "Analog 35mm look, slight vignette",
    lighting: "Soft window light, warm diffusion",
    mood: "Nostalgic, warm, timeless",
    atmosphere: "Film grain, muted tones, retro palette",
  },
  minimalist: {
    camera: "Centered 50mm, straight-on, symmetrical",
    lighting: "Even soft diffused, bright & airy",
    mood: "Calm, sophisticated, refined",
    atmosphere: "Negative space, clean lines, muted",
  },
  aerial: {
    camera: "Drone top-down / 45°, ultra-wide",
    lighting: "Bright daylight, long shadows",
    mood: "Expansive, majestic, grand scale",
    atmosphere: "Vast landscape, geometric patterns",
  },
  "flat-lay": {
    camera: "90° overhead, even coverage, macro",
    lighting: "Diffused even from above, soft shadows",
    mood: "Organized, aesthetic, curated",
    atmosphere: "Styled arrangement, Instagram-ready",
  },
  fantasy: {
    camera: "Ultra-wide, forced perspective, floating POV",
    lighting: "Magical glow, bioluminescent accents",
    mood: "Fantastical, dreamlike, enchanting",
    atmosphere: "Glowing particles, hyper-saturated",
  },
};

// Load existing settings on open
chrome.storage.local.get(["geminiApiKey", "selectedPreset"], (data) => {
  if (data.geminiApiKey) {
    keyInput.value = data.geminiApiKey;
  }
  if (data.selectedPreset) {
    presetSelect.value = data.selectedPreset;
  }
  updatePresetHint();
});

// Save settings
saveBtn.addEventListener("click", () => {
  const key = keyInput.value.trim();

  if (!key) {
    showToast("Please enter a valid API key.", "error");
    return;
  }

  const preset = presetSelect.value;

  chrome.storage.local.set(
    { geminiApiKey: key, selectedPreset: preset },
    () => {
      showToast("Settings saved successfully! 🎉", "success");
    }
  );
});

// Auto-save preset when changed
presetSelect.addEventListener("change", () => {
  const preset = presetSelect.value;
  chrome.storage.local.set({ selectedPreset: preset });
  updatePresetHint();
});

// Toggle visibility
toggleVis.addEventListener("click", () => {
  const isPassword = keyInput.type === "password";
  keyInput.type = isPassword ? "text" : "password";
  toggleVis.textContent = isPassword ? "🙈" : "👁️";
});

// Update the preset hint box
function updatePresetHint() {
  const key = presetSelect.value;
  const hint = PRESET_HINTS[key];
  if (hint) {
    presetHint.innerHTML = `
      <div class="hint-row"><span class="hint-label">📷</span> ${hint.camera}</div>
      <div class="hint-row"><span class="hint-label">💡</span> ${hint.lighting}</div>
      <div class="hint-row"><span class="hint-label">🎭</span> ${hint.mood}</div>
      <div class="hint-row"><span class="hint-label">🌫️</span> ${hint.atmosphere}</div>
    `;
    presetHint.classList.add("visible");
  } else {
    presetHint.classList.remove("visible");
  }
}

// Toast helper
function showToast(message, type) {
  toast.textContent = message;
  toast.className = "toast " + type;
  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

// ═══════════════════════════════════════
// MAIN TAB SWITCHING
// ═══════════════════════════════════════

const mainTabs = document.querySelectorAll(".main-tab");
mainTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    console.log("[PB:POP] Tab clicked:", tab.dataset.target);
    mainTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".main-tab-content").forEach((c) => {
      c.classList.remove("active");
    });
    document.getElementById(tab.dataset.target)?.classList.add("active");
  });
});

// ═══════════════════════════════════════
// TAB 2: Virtual Try-On
// ═══════════════════════════════════════

const vtoPersonInput = document.getElementById("vto-person-input");
const vtoUploadArea = document.getElementById("vto-upload-area");
const vtoSelectProductBtn = document.getElementById("vto-select-product-btn");
const vtoGenerateBtn = document.getElementById("vto-generate-btn");
const vtoPreviewRow = document.getElementById("vto-preview-row");
const vtoPersonPreview = document.getElementById("vto-person-preview");
const vtoProductPreview = document.getElementById("vto-product-preview");
const vtoStatusArea = document.getElementById("vto-status-area");
const vtoToast = document.getElementById("vto-toast");
const vtoResetBtn = document.getElementById("vto-reset-btn");

// State
let personImageBase64 = null;
let personImageMime = null;
let productImageBase64 = null;
let productImageMime = null;

// Validate reset button exists to avoid errors
if (vtoResetBtn) {
  vtoResetBtn.addEventListener("click", () => {
    if (confirm("Reset everything in Virtual Try-On? This will clear your photos.")) {
      resetVTOState();
    }
  });
}

function resetVTOState() {
  console.log("[PB:POP] Resetting VTO state...");
  
  // Clear Person
  clearPersonImage(); // Handles UI + storage removal for person
  
  // Clear Product
  productImageBase64 = null;
  productImageMime = null;
  
  // Clear Result
  vtoStatusArea.innerHTML = "";
  
  // Clear Storage for Product & Result
  chrome.storage.local.remove([
    "vtoProductImage", "vtoProductMime",
    "vtoResultImage", "vtoResultMime"
  ], () => {
    console.log("[PB:POP] Storage cleared");
  });

  // Update UI
  updateVtoPreview();
  updateGenerateBtn();
  showVtoToast("Virtual Try-On reset!", "success");
}

// Helper to clear person image
function clearPersonImage() {
  personImageBase64 = null;
  personImageMime = null;
  vtoUploadArea.classList.remove("has-image");
  vtoUploadArea.innerHTML = `
    <span class="upload-icon">📸</span>
    <div class="upload-text">
      <strong>Click to upload</strong> or drag & drop<br/>
      JPG, PNG, WebP — Max 10MB
    </div>
    <input type="file" id="vto-person-input" accept="image/jpeg,image/png,image/webp" />
  `;
  document.getElementById("vto-person-input").addEventListener("change", handlePersonUpload);
  
  chrome.storage.local.remove(["vtoPersonImage", "vtoPersonMime"]);
  vtoSelectProductBtn.disabled = true;
  updateVtoPreview();
  updateGenerateBtn();
}

// Reusable handler for person upload
function handlePersonUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  console.log("[PB:POP] Person photo selected:", file.name, file.type, file.size, "bytes");

  if (file.size > 10 * 1024 * 1024) {
    showVtoToast("File is too large. Max 10MB.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    personImageBase64 = dataUrl.split(",")[1];
    personImageMime = file.type || "image/png";
    console.log("[PB:POP] Person photo loaded. Base64 size:", personImageBase64.length, "mime:", personImageMime);

    // Save to storage for persistence across popup open/close
    chrome.storage.local.set({
      vtoPersonImage: personImageBase64,
      vtoPersonMime: personImageMime,
    });
    console.log("[PB:POP] Person photo saved to storage");

    // Update upload area UI
    vtoUploadArea.classList.add("has-image");
    vtoUploadArea.innerHTML = `
      <img class="vto-preview-img" src="${dataUrl}" alt="Your photo" />
      <button class="remove-image-btn" id="remove-person-btn" title="Remove photo">×</button>
      <input type="file" id="vto-person-input" accept="image/jpeg,image/png,image/webp" />
    `;
    // Re-bind listeners
    document.getElementById("vto-person-input").addEventListener("change", handlePersonUpload);
    document.getElementById("remove-person-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      clearPersonImage();
    });

    vtoSelectProductBtn.disabled = false;
    updateVtoPreview();
    updateGenerateBtn();
  };
  reader.readAsDataURL(file);
}

// Bind initial person upload handler
vtoPersonInput.addEventListener("change", handlePersonUpload);

// ── Select Product from Page ──
vtoSelectProductBtn.addEventListener("click", async () => {
  console.log("[PB:POP] Select Product button clicked");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    showVtoToast("No active tab found.", "error");
    return;
  }
  console.log("[PB:POP] Active tab:", tab.id, tab.url?.substring(0, 60));

  // Inject content script if needed
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "PING" });
    console.log("[PB:POP] Content script already injected");
  } catch {
    console.log("[PB:POP] Injecting content script...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["styles.css"],
    });
    await new Promise((r) => setTimeout(r, 300));
    console.log("[PB:POP] Content script injected");
  }

  // Start product selection mode
  console.log("[PB:POP] Sending START_PRODUCT_SELECTION...");
  await chrome.tabs.sendMessage(tab.id, { action: "START_PRODUCT_SELECTION" });

  // Close popup so user can interact with the page
  console.log("[PB:POP] Closing popup for selection");
  window.close();
});

// ── Listen for product selection result ──
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "PRODUCT_SELECTED") {
    productImageBase64 = msg.imageBase64;
    productImageMime = msg.imageMime || "image/png";
    chrome.storage.local.set({
      vtoProductImage: productImageBase64,
      vtoProductMime: productImageMime,
    });
  }
});

// ── On popup open, restore saved state ──
console.log("[PB:POP] Popup opened, restoring state from storage...");
chrome.storage.local.get(
  ["vtoProductImage", "vtoProductMime", "vtoPersonImage", "vtoPersonMime"],
  (data) => {
    console.log("[PB:POP] Storage state: person=", !!data.vtoPersonImage, "| product=", !!data.vtoProductImage);
    
    // Restore Product
    if (data.vtoProductImage) {
      productImageBase64 = data.vtoProductImage;
      productImageMime = data.vtoProductMime || "image/png";
      console.log("[PB:POP] Product image restored. Size:", productImageBase64.length);
    }

    // Restore Person
    if (data.vtoPersonImage) {
      personImageBase64 = data.vtoPersonImage;
      personImageMime = data.vtoPersonMime || "image/png";
      console.log("[PB:POP] Person image restored. Size:", personImageBase64.length);

      const dataUrl = `data:${personImageMime};base64,${personImageBase64}`;
      vtoUploadArea.classList.add("has-image");
      vtoUploadArea.innerHTML = `
        <img class="vto-preview-img" src="${dataUrl}" alt="Your photo" />
        <button class="remove-image-btn" id="remove-person-btn" title="Remove photo">×</button>
        <input type="file" id="vto-person-input" accept="image/jpeg,image/png,image/webp" />
      `;
      // Re-bind listeners
      document.getElementById("vto-person-input").addEventListener("change", handlePersonUpload);
      document.getElementById("remove-person-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        clearPersonImage();
      });
      vtoSelectProductBtn.disabled = false;
    }

    updateVtoPreview();
    updateGenerateBtn();
    console.log("[PB:POP] State restore complete. Generate enabled:", !(!(personImageBase64 && productImageBase64)));
  }
);

// ── Update preview cards ──
function updateVtoPreview() {
  if (!personImageBase64 && !productImageBase64) {
    vtoPreviewRow.style.display = "none";
    return;
  }

  vtoPreviewRow.style.display = "grid";

  if (personImageBase64) {
    vtoPersonPreview.src = `data:${personImageMime};base64,${personImageBase64}`;
  }
  if (productImageBase64) {
    vtoProductPreview.src = `data:${productImageMime};base64,${productImageBase64}`;
  }
}

function updateGenerateBtn() {
  vtoGenerateBtn.disabled = !(personImageBase64 && productImageBase64);
}

// ── Generate Try-On ──
vtoGenerateBtn.addEventListener("click", async () => {
  console.log("[PB:POP] ───── GENERATE TRY-ON CLICKED ─────");
  console.log("[PB:POP] Person image:", !!personImageBase64, personImageBase64?.length || 0, "chars");
  console.log("[PB:POP] Product image:", !!productImageBase64, productImageBase64?.length || 0, "chars");

  if (!personImageBase64 || !productImageBase64) {
    console.warn("[PB:POP] Missing images, aborting");
    return;
  }

  // Check API key
  const { geminiApiKey } = await chrome.storage.local.get(["geminiApiKey"]);
  if (!geminiApiKey) {
    console.error("[PB:POP] No API key!");
    showVtoToast("Please save your Gemini API key in the Prompts tab first.", "error");
    return;
  }
  console.log("[PB:POP] API key present:", !!geminiApiKey);

  // Show loading
  vtoGenerateBtn.disabled = true;
  vtoStatusArea.innerHTML = `
    <div class="vto-loading">
      <div class="vto-spinner"></div>
      <p>Generating your try-on image… This may take 15-30 seconds.</p>
    </div>
  `;

  try {
    // Clear previous result
    await chrome.storage.local.remove(["vtoResultImage", "vtoResultMime"]);
    console.log("[PB:POP] Cleared previous result. Sending GENERATE_TRY_ON to background...");

    // Send to background for generation (images are read from storage there)
    const response = await chrome.runtime.sendMessage({
      action: "GENERATE_TRY_ON",
    });
    console.log("[PB:POP] Background responded:", JSON.stringify(response).substring(0, 200));

    if (response.error) {
      throw new Error(response.error);
    }

    // Read the generated image from storage (avoids message size limits)
    console.log("[PB:POP] Reading result from storage...");
    const { vtoResultImage, vtoResultMime } = await chrome.storage.local.get([
      "vtoResultImage",
      "vtoResultMime",
    ]);
    console.log("[PB:POP] Result from storage: image=", !!vtoResultImage, "size=", vtoResultImage?.length || 0, "mime=", vtoResultMime);

    if (!vtoResultImage) {
      throw new Error("No image was returned. Check the extension console for details.");
    }

    // Display result image
    console.log("[PB:POP] ───── TRY-ON COMPLETE ✔️ ─────");
    vtoStatusArea.innerHTML = `
      <div class="vto-result">
        <div class="result-label">✨ Generated Try-On</div>
        <img src="data:${vtoResultMime || "image/png"};base64,${vtoResultImage}" alt="Try-On Result" />
      </div>
    `;
  } catch (err) {
    console.error("[PB:POP] ───── TRY-ON FAILED ❌ ─────");
    console.error("[PB:POP] Error:", err.message);
    vtoStatusArea.innerHTML = "";
    showVtoToast(err.message || "Generation failed. Please try again.", "error");
  } finally {
    updateGenerateBtn();
  }
});

// VTO Toast helper
function showVtoToast(message, type) {
  vtoToast.textContent = message;
  vtoToast.className = "toast " + type;
  setTimeout(() => {
    vtoToast.className = "toast";
  }, 4000);
}
