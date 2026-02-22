// ── PromptBuddy · Content Script ──
// Renders a beautiful floating modal on the active tab.
// Also handles product image selection for Virtual Try-On.

(() => {
  // Avoid double-injection
  if (window.__promptBuddyInjected) return;
  window.__promptBuddyInjected = true;

  let overlay = null;
  let selectionMode = false;
  let selectionOverlay = null;

  // ── Listener ──
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("[PB:CS] Message received:", msg.action);
    switch (msg.action) {
      case "PING":
        sendResponse({ ok: true });
        break;
      case "SHOW_LOADING":
        console.log("[PB:CS] Showing loading overlay.", msg.statusText || "");
        showOverlay("loading");
        break;
      case "SHOW_RESULT":
        console.log("[PB:CS] Showing result. Prompt length:", msg.prompt?.length, "| Video:", !!msg.videoPrompt);
        showOverlay("result", msg);
        break;
      case "SHOW_ERROR":
        console.error("[PB:CS] Showing error:", msg.error);
        showOverlay("error", msg.error);
        break;
      case "START_PRODUCT_SELECTION":
        console.log("[PB:CS] Starting product selection mode");
        startProductSelection();
        break;
    }
    return true; // keep channel open for async
  });

  // ══════════════════════════════════════
  // PRODUCT SELECTION MODE
  // ══════════════════════════════════════

  function startProductSelection() {
    if (selectionMode) {
      console.log("[PB:CS] Already in selection mode, skipping");
      return;
    }
    selectionMode = true;
    console.log("[PB:CS] ───── PRODUCT SELECTION MODE ON ─────");

    // Create selection overlay banner
    selectionOverlay = document.createElement("div");
    selectionOverlay.id = "pb-selection-overlay";
    selectionOverlay.innerHTML = `
      <div id="pb-selection-banner">
        <span class="pb-sel-icon">🖱️</span>
        <span class="pb-sel-text">Click on a <strong>product image</strong> to select it</span>
        <button id="pb-sel-cancel">✕ Cancel</button>
      </div>
    `;
    document.body.appendChild(selectionOverlay);

    requestAnimationFrame(() => {
      if (selectionOverlay) selectionOverlay.classList.add("pb-sel-visible");
    });

    // Cancel button
    selectionOverlay
      .querySelector("#pb-sel-cancel")
      .addEventListener("click", cancelSelection);

    // Add hover/click handlers to all images
    document.addEventListener("mouseover", handleSelectionHover, true);
    document.addEventListener("mouseout", handleSelectionUnhover, true);
    document.addEventListener("click", handleSelectionClick, true);

    // Change cursor
    document.body.style.cursor = "crosshair";
  }

  function cancelSelection() {
    selectionMode = false;
    document.body.style.cursor = "";
    document.removeEventListener("mouseover", handleSelectionHover, true);
    document.removeEventListener("mouseout", handleSelectionUnhover, true);
    document.removeEventListener("click", handleSelectionClick, true);

    // Remove highlight from any element
    document.querySelectorAll(".pb-sel-highlight").forEach((el) => {
      el.classList.remove("pb-sel-highlight");
    });

    if (selectionOverlay) {
      selectionOverlay.classList.remove("pb-sel-visible");
      setTimeout(() => {
        selectionOverlay?.remove();
        selectionOverlay = null;
      }, 300);
    }
  }

  function handleSelectionHover(e) {
    if (!selectionMode) return;
    const img = e.target.closest("img");
    if (img && img.src) {
      img.classList.add("pb-sel-highlight");
    }
  }

  function handleSelectionUnhover(e) {
    if (!selectionMode) return;
    const img = e.target.closest("img");
    if (img) {
      img.classList.remove("pb-sel-highlight");
    }
  }

  async function handleSelectionClick(e) {
    if (!selectionMode) return;
    
    // Prevent navigation (e.g. if image is inside a link)
    e.preventDefault();
    e.stopPropagation();

    const img = e.target.closest("img");
    if (!img || !img.src) return;

    console.log("[PB:CS] Product image selected:", img.src);
    
    // Delegate fetching/saving to background script to bypass CORS
    try {
      const response = await chrome.runtime.sendMessage({
        action: "SAVE_PRODUCT_IMAGE",
        url: img.src
      });

      if (response && response.success) {
        console.log("[PB:CS] Background saved product image successfully");
        showSelectionConfirmation(img.src);
      } else {
        console.error("[PB:CS] Background failed to save image:", response?.error);
        alert("Failed to save product image. Please try another image.");
      }
    } catch (err) {
      console.error("[PB:CS] Error communicating with background:", err);
      // Fallback: try local fetch if background fails (e.g. data URI)
      if (img.src.startsWith('data:')) {
         const parts = img.src.split(',');
         const mime = parts[0].match(/:(.*?);/)[1];
         const b64 = parts[1];
         chrome.storage.local.set({ vtoProductImage: b64, vtoProductMime: mime });
         showSelectionConfirmation(img.src);
      } else {
         alert("Error saving image. See console for details.");
      }
    }

    cancelSelection();
  }

  function showSelectionConfirmation(imgSrc) {
    const confirmEl = document.createElement("div");
    confirmEl.id = "pb-sel-confirm";
    confirmEl.innerHTML = `
      <div class="pb-sel-confirm-inner">
        <span>✅</span>
        <span>Product selected! Open PromptBuddy to continue.</span>
      </div>
    `;
    document.body.appendChild(confirmEl);
    requestAnimationFrame(() => confirmEl.classList.add("pb-sel-visible"));

    setTimeout(() => {
      confirmEl.classList.remove("pb-sel-visible");
      setTimeout(() => confirmEl.remove(), 300);
    }, 3000);
  }

  // ══════════════════════════════════════
  // PROMPT RESULT OVERLAY (existing)
  // ══════════════════════════════════════

  function showOverlay(state, data = "") {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }

    overlay = document.createElement("div");
    overlay.id = "pb-overlay";
    overlay.innerHTML = `
      <div id="pb-modal">
        <div id="pb-header">
          <div id="pb-logo">
            <span id="pb-logo-icon">✨</span>
            <span id="pb-logo-text">PromptBuddy</span>
          </div>
          <button id="pb-close" title="Close">&times;</button>
        </div>
        <div id="pb-body">
          ${renderBody(state, data)}
        </div>
        ${state === "result" ? renderFooter() : ""}
      </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      if (overlay) overlay.classList.add("pb-visible");
    });

    overlay.querySelector("#pb-close").addEventListener("click", removeOverlay);

    if (state === "result") {
      const tabs = overlay.querySelectorAll(".pb-tab");
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.forEach((t) => t.classList.remove("pb-tab-active"));
          tab.classList.add("pb-tab-active");

          const target = tab.dataset.tab;
          overlay.querySelectorAll(".pb-tab-content").forEach((c) => {
            c.classList.remove("pb-tab-content-active");
          });
          overlay
            .querySelector(`#pb-tab-${target}`)
            ?.classList.add("pb-tab-content-active");

          const copyBtn = overlay.querySelector("#pb-copy");
          if (copyBtn) copyBtn.dataset.target = target;
        });
      });

      const copyBtn = overlay.querySelector("#pb-copy");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          const target = copyBtn.dataset.target || "image";
          let text = "";
          if (target === "image") {
            text =
              overlay.querySelector("#pb-image-prompt-text")?.innerText || "";
          } else {
            text =
              overlay.querySelector("#pb-video-prompt-json")?.innerText || "";
          }
          navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = "✅ Copied!";
            setTimeout(() => {
              copyBtn.textContent = "📋 Copy to Clipboard";
            }, 2000);
          });
        });
      }
    }
  }

  function renderBody(state, data) {
    if (state === "loading") {
      return `
        <div id="pb-loading">
          <div class="pb-spinner"></div>
          <p>Analyzing image & crafting your prompts…</p>
        </div>
      `;
    }

    if (state === "error") {
      return `
        <div id="pb-error">
          <span class="pb-error-icon">⚠️</span>
          <p>${escapeHtml(data)}</p>
        </div>
      `;
    }

    const presetName = data.presetName || "Custom";
    const imagePrompt = data.prompt || "";
    const videoPrompt = data.videoPrompt || null;

    let videoJson = "";
    if (videoPrompt) {
      try {
        videoJson =
          typeof videoPrompt === "string"
            ? JSON.stringify(JSON.parse(videoPrompt), null, 2)
            : JSON.stringify(videoPrompt, null, 2);
      } catch {
        videoJson = typeof videoPrompt === "string" ? videoPrompt : JSON.stringify(videoPrompt, null, 2);
      }
    }

    return `
      <div id="pb-preset-badge">${escapeHtml(presetName)}</div>
      <div class="pb-tabs">
        <button class="pb-tab pb-tab-active" data-tab="image">🖼️ Image Prompt</button>
        <button class="pb-tab" data-tab="video">🎬 Video Prompt</button>
      </div>
      <div id="pb-tab-image" class="pb-tab-content pb-tab-content-active">
        <div id="pb-image-prompt-text" class="pb-prompt-text">${escapeHtml(imagePrompt)}</div>
      </div>
      <div id="pb-tab-video" class="pb-tab-content">
        ${
          videoJson
            ? `<pre id="pb-video-prompt-json" class="pb-json-block">${escapeHtml(videoJson)}</pre>`
            : `<p class="pb-no-data">No video prompt generated.</p>`
        }
      </div>
    `;
  }

  function renderFooter() {
    return `
      <div id="pb-footer">
        <button id="pb-copy" data-target="image">📋 Copy to Clipboard</button>
      </div>
    `;
  }

  function removeOverlay() {
    if (overlay) {
      const el = overlay;
      overlay = null;
      el.classList.remove("pb-visible");
      setTimeout(() => {
        el.remove();
      }, 250);
    }
  }

  // ── Utilities ──
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
