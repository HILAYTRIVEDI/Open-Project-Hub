# 🚀 Blog to Shots — AI Video Generator

**Transform any blog post into a viral, scroll-stopping short video in seconds.**

This engine uses **Google Gemini 2.0 Flash** to analyze text and generate scripts, **Pexels API** to find context-aware stock footage, and **Remotion** to render professional vertical videos programmatically.

![Project Preview](https://github.com/HILAYTRIVEDI/blog-to-shots/assets/PLACEHOLDER_IMAGE)

## ✨ Features

- **🔗 Blog Scraping**: Automatically extracts main content from any URL using Cheerio.
- **🧠 AI Script Generation**: Uses Gemini 2.0 to write engaging hooks, 9-scene scripts, and strong CTAs.
- **🎥 Visual Intelligence**: Extracts keywords per scene and fetches matching portrait stock footage from Pexels.
- **🎬 Cinematic Video Engine**:
  - **Ken Burns Effect**: Smooth zoom and pan for static images.
  - **Kinetic Typography**: Word-by-word text reveal animations.
  - **Premium Effects**: Particles, floating geometric shapes, and glassmorphism UI.
  - **Auto-Fallbacks**: Elegant gradients if no stock footage is found.
- **⚡ Next.js 16 & Turbopack**: Blazing fast development and build performance.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Video Engine**: [Remotion](https://www.remotion.dev/)
- **AI Model**: [Google Gemini API](https://ai.google.dev/)
- **Stock Media**: [Pexels API](https://www.pexels.com/api/)
- **Scraper**: [Cheerio](https://cheerio.js.org/)
- **Styling**: Tailwind CSS + Custom CSS Variables

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/HILAYTRIVEDI/blog-to-shots.git
cd blog-to-shots
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root directory:
```env
# Get text-to-video capabilities
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Get stock footage backgrounds
# Get free key at https://www.pexels.com/api/
PEXELS_API_KEY=your_pexels_api_key_here
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or port 3001 if 3000 is taken) to see the app.

## 🌍 Deployment (Vercel)

This project is optimized for deployment on Vercel.

1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your `blog-to-shots` repository.
4. In the **Environment Variables** section, add:
   - `GEMINI_API_KEY`
   - `PEXELS_API_KEY`
5. Click **Deploy**.

> **Note on Remotion Rendering**: The current deployment supports **previews**. To render actual `.mp4` files in the cloud, you would need to set up [Remotion Lambda](https://www.remotion.dev/docs/lambda) or an API route with a heavy server process, as serverless functions have timeouts for long rendering tasks.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
