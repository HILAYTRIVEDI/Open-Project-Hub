# 🤖 Blog to Shots — Agent Skill

This repository is designed to be used as a **Skill** by other AI Agents (like GPTs, LangChain, AutoGPT).

## 🔌 Capabilities

1.  **Read & Analyze**: Send a blog URL, get a structured video script with visual keywords.
2.  **Visual Intelligence**: Automatically finds the best stock footage (portrait mode) for every scene.
3.  **Video Rendering**: Generate actual 1080p MP4 files programmatically.

## 📡 API Endpoints

### 1. `POST /api/generate-script`
**Input**:
```json
{
  "url": "https://example.com/my-blog-post"
}
```

**Output**:
Returns a JSON object containing the full script, including:
- `hook`: Scroll-stopping opening line
- `scenes`: Array of scenes with `text`, `description` (context), `keywords`, and `backgroundUrl` (stock footage)
- `cta`: Call to Action

### 2. `POST /api/render`
**Input**:
```json
{
  "script": { ...full_script_object_from_step_1... }
}
```

**Output**:
- A binary stream of the rendered `.mp4` file.

## 🛠️ How to Connect

### Option A: Actions (GPTs / Custom Agents)
Point your agent to the **OpenAPI Spec**:
- URL: `https://your-deployment-url.com/openapi.yaml`

### Option B: LangChain / Python
```python
import requests

# 1. Generate Script
res = requests.post("http://localhost:3000/api/generate-script", json={
    "url": "https://blog.google/technology/ai/google-gemini-ai/"
})
script = res.json()["script"]

# 2. Render Video
video_res = requests.post("http://localhost:3000/api/render", json={
    "script": script
}, stream=True)

with open("output.mp4", "wb") as f:
    for chunk in video_res.iter_content(chunk_size=8192):
        f.write(chunk)
```

## ⚠️ Performance Note
Rendering video takes **30-60 seconds**.
- **Vercel Free Tier**: Has a 10s timeout, so `/api/render` may fail.
- **Recommended**: Run this on a VPS, Railway, or locally for full rendering capabilities.
