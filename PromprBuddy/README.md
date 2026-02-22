# PromptBuddy 🎨✨  

**PromptBuddy** is a powerful Chrome Extension that supercharges your creative workflow with AI. It seamlessly integrates **Google's Gemini 2.5 Flash** models to turn any image into a professional AI art prompt and allows you to virtually try on clothes from any online store.

## 🔥 Features  

### 1. 🖼️ Instant Image-to-Prompt Generator Right-click any image on the web to instantly generate a high-fidelity, commercially viable prompt for Midjourney, DALL-E 3, or Stable Diffusion. - **Forensic Detail**: Analyzes every pixel to describe products, lighting, and textures. 
- **Video Prompts**: Generates a JSON-structured script for AI video generators (Runway/Pika) with scene breakdowns.
- **Style Presets**: Choose from Cinematic, Product Shot, Cyberpunk, Street Style, and more.

### 2. 👗 AI Virtual Try-On (VTO) See yourself wearing any product from any online store without leaving the page. 
- **Upload Your Photo**: Save your personal photo once.
- **Pick Any Product**: Click "Select Product" and click on any t-shirt, dress, or jacket on a webpage (Amazon, Shopify, etc.). - **AI Magic**: Gemini 2.5 Flash Image intelligently swaps the clothing while preserving your identity, pose, and background.
- **Persistent State**: Your photos are saved locally so you don't have to re-upload every time.

---  
## 🚀 Installation  
1. **Clone or Download** this repository to a folder on your computer.    ```bash    git clone https://github.com/yourusername/PromptBuddy.git    ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Toggle **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `PromptBuddy` folder you just downloaded.
6. The ✨ icon should appear in your toolbar!

---  
## 🛠️ Setup & Usage  
### Step 1: API Configuration 
1. Click the **PromptBuddy extension icon**.
2. Go to the **Prompts** tab.
3. Paste your [Google Gemini API Key](https://aistudio.google.com/app/apikey).
4. Click **Save Settings**.

### Step 2: Generating Prompts 
1. Find an inspiring image on any website.
2. **Right-click** the image.
3. Select **✨ Generate Image Prompt** from the context menu.
4. Wait for the overlay to appear with your detailed **Image Prompt** and **Video Script**.
5. Copy and paste directly into Midjourney/Runway/Nano Banana.

### Step 3: Using Virtual Try-On 
1. Open the extension popup and switch to the **Virtual Try-On** tab. 
2. **Upload** a clear photo of yourself (full body or upper body recommended).
3. Navigate to a product page (e.g., a clothing store).
4. Click **"Click to Pick a Product Image"** in the popup.
5. Click on the product image on the webpage.
6. Open the popup again and click **"Generate Try-On"**.
7. In ~15-30 seconds, see the result!

---  
## 🔧 Technical Details  
- **Manifest V3**: Built on the latest Chrome Extension architecture.
- **AI Models**:
  - - **Text/Prompting**: `gemini-2.5-flash` (Optimized for speed and reasoning).
  - - **Image Generation**: `gemini-2.5-flash-image` (Fine-tuned for image editing/inpainting).
  - - **Architecture**:
  - - **Service Worker (`background.js`)**: Handles secure API calls, CORS bypassing for images, and keeps the extension alive during long generations.
  - - **Content Script (`content.js`)**: Handles UI overlays, image selection, and page interaction.
  - - **Popup (`popup.js`)**: Manages settings, VTO state, and user interface.
  - - **Performance**: Uses `keepAlive` mechanisms to prevent Service Worker timeout during complex AI tasks.

---
## 🐛 Troubleshooting  
- **Extension Hangs on "Analyzing..."**:
- Check your internet connection.
- Verify your API key in the extension settings.
- If the prompt is huge, it might take up to 60s.
- **Virtual Try-On returns the wrong person**:
- - Ensure your uploaded photo is clear.
- - The AI tries to preserve the identity of the "Person" image.
- **"Failed to fetch image"**:
- - Some websites block image fetching. The extension uses a background relay to bypass most CORS restrictions, but extreme cases might still fail.

## 📄 License MIT License. Feel free to modify and use for your own projects!
