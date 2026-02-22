import * as cheerio from "cheerio";

/**
 * Fetches and extracts clean text content from a blog URL.
 */
export async function scrapeBlog(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove non-content elements
  $(
    "script, style, nav, footer, header, aside, .sidebar, .comments, .ad, .advertisement, iframe, form, .social-share, .related-posts"
  ).remove();

  // Try to find the main article content
  const selectors = [
    "article",
    '[role="main"]',
    ".post-content",
    ".article-content",
    ".entry-content",
    ".blog-post",
    ".post-body",
    "main",
    ".content",
  ];

  let text = "";

  for (const selector of selectors) {
    const el = $(selector);
    if (el.length > 0) {
      text = el
        .find("p, h1, h2, h3, h4, h5, h6, li, blockquote")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 20)
        .join("\n\n");

      if (text.length > 200) break;
    }
  }

  // Fallback: grab all paragraphs
  if (text.length < 200) {
    text = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 20)
      .join("\n\n");
  }

  if (text.length < 100) {
    throw new Error("Could not extract sufficient content from this URL.");
  }

  // Truncate to ~4000 chars to stay within prompt limits
  return text.slice(0, 4000);
}
