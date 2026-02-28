/**
 * RAG Module: Live Wikipedia/Wikibooks Retrieval
 * Fetches educational source material from MediaWiki API
 * Zero dependencies. No API keys. No vector DB.
 */

import { SourceChunk } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WikiSearchResult {
  key: string; // page key for fetching (e.g. "Gradient_descent")
  title: string; // display title
  description: string;
  excerpt: string; // snippet with search highlights
  source: "wikipedia" | "wikibooks";
}

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

const ENDPOINTS = {
  wikipedia: "https://en.wikipedia.org/w/rest.php/v1/search/page",
  wikibooks: "https://en.wikibooks.org/w/rest.php/v1/search/page",
};

const BASE_URLS = {
  wikipedia: "https://en.wikipedia.org",
  wikibooks: "https://en.wikibooks.org",
};

// ---------------------------------------------------------------------------
// Public Functions
// ---------------------------------------------------------------------------

/**
 * Search Wikipedia and Wikibooks for pages matching a concept name
 * Includes exponential backoff for rate limiting (HTTP 429)
 */
export async function searchWikipedia(
  query: string,
  limit: number = 3,
  sources: ("wikipedia" | "wikibooks")[] = ["wikipedia", "wikibooks"]
): Promise<WikiSearchResult[]> {
  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        const url = `${ENDPOINTS[source]}?q=${encodeURIComponent(query)}&limit=${limit}`;
        let attempts = 0;
        let lastError = null;

        while (attempts < 3) {
          try {
            const res = await fetch(url, {
              headers: { "Api-User-Agent": "AdaptiveLearningTutor/1.0 (hackathon)" },
              signal: AbortSignal.timeout(5000), // 5 second timeout
            });

            // Handle rate limiting with exponential backoff
            if (res.status === 429) {
              attempts++;
              if (attempts < 3) {
                const waitMs = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
                console.warn(`[Wikipedia rate limited for "${query}", waiting ${waitMs}ms before retry]`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
                continue;
              }
              console.warn(`[Wikipedia rate limited for "${query}", max retries exceeded]`);
              return [];
            }

            if (!res.ok) {
              console.warn(`[Wikipedia search returned ${res.status} for "${query}"]`);
              return [];
            }

            const data = await res.json();
            return (data.pages || []).map((p: any) => ({
              key: p.key,
              title: p.title,
              description: p.description || "",
              excerpt: p.excerpt || "",
              source,
            }));
          } catch (err) {
            lastError = err;
            attempts++;
            if (attempts < 3) {
              const waitMs = Math.pow(2, attempts) * 500;
              await new Promise(resolve => setTimeout(resolve, waitMs));
              continue;
            }
          }
        }

        console.warn(`[Wikipedia search failed for "${query}" after 3 attempts:`, lastError);
        return [];
      } catch (err) {
        console.warn(`[Wikipedia search error for "${query}":`, err);
        return [];
      }
    })
  );
  return results.flat();
}

/**
 * Fetch and chunk a Wikipedia/Wikibooks page into SourceChunk objects
 * Includes exponential backoff for rate limiting (HTTP 429)
 */
export async function fetchAndChunkPage(
  pageKey: string,
  source: "wikipedia" | "wikibooks",
  conceptId: string,
  studyPlanId: string
): Promise<Omit<SourceChunk, "id">[]> {
  try {
    const base = BASE_URLS[source];
    const url = `${base}/w/rest.php/v1/page/${encodeURIComponent(pageKey)}/html`;
    let attempts = 0;
    let lastError = null;

    while (attempts < 3) {
      try {
        const res = await fetch(url, {
          headers: { "Api-User-Agent": "AdaptiveLearningTutor/1.0 (hackathon)" },
          signal: AbortSignal.timeout(5000),
        });

        // Handle rate limiting with exponential backoff
        if (res.status === 429) {
          attempts++;
          if (attempts < 3) {
            const waitMs = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
            console.warn(`[Wikipedia rate limited for "${pageKey}", waiting ${waitMs}ms before retry]`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }
          console.warn(`[Wikipedia fetch rate limited for "${pageKey}", max retries exceeded]`);
          return [];
        }

        if (!res.ok) {
          console.warn(`[Wikipedia fetch returned ${res.status} for "${pageKey}"]`);
          return [];
        }

        const html = await res.text();

        // Extract page title from URL or use pageKey
        const pageTitle = pageKey.replace(/_/g, " ");
        const pageUrl = `${base}/wiki/${pageKey}`;

        return chunkHtml(html, pageTitle, pageUrl, source, conceptId, studyPlanId);
      } catch (err) {
        lastError = err;
        attempts++;
        if (attempts < 3) {
          const waitMs = Math.pow(2, attempts) * 500;
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
      }
    }

    console.warn(`[Wikipedia fetch failed for "${pageKey}" after 3 attempts:`, lastError);
    return [];
  } catch (err) {
    console.warn(`[Wikipedia fetch error for "${pageKey}":`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Internal Helper: HTML Chunking
// ---------------------------------------------------------------------------

/**
 * Parse HTML and split into sections-based chunks
 * Simple regex-based approach (no complex DOM parsing needed)
 */
function chunkHtml(
  html: string,
  pageTitle: string,
  pageUrl: string,
  source: "wikipedia" | "wikibooks",
  conceptId: string,
  studyPlanId: string
): Omit<SourceChunk, "id">[] {
  // Strip HTML tags
  let text = html;

  // Remove script/style tags
  text = text.replace(/<script[^>]*>.*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>.*?<\/style>/gi, "");

  // Extract headings and paragraphs
  const headingPattern = /<h[2-3][^>]*>(.*?)<\/h[2-3]>/gi;
  const paragraphPattern = /<p[^>]*>(.*?)<\/p>/gi;

  const sections: Array<{ heading: string; content: string }> = [];
  let currentHeading = "Introduction";
  let currentContent = "";

  // Find all h2/h3 and p tags
  const allMatches: Array<{ type: string; content: string; index: number }> = [];

  let match;
  while ((match = headingPattern.exec(html)) !== null) {
    const cleaned = stripHtmlTags(match[1]).trim();
    if (cleaned) {
      allMatches.push({ type: "heading", content: cleaned, index: match.index });
    }
  }

  while ((match = paragraphPattern.exec(html)) !== null) {
    const cleaned = stripHtmlTags(match[1]).trim();
    if (cleaned) {
      allMatches.push({ type: "paragraph", content: cleaned, index: match.index });
    }
  }

  // Sort by position in HTML
  allMatches.sort((a, b) => a.index - b.index);

  // Process matches in order
  for (const item of allMatches) {
    if (item.type === "heading") {
      // Save current section if it has content
      if (currentContent.trim().length > 50) {
        sections.push({ heading: currentHeading, content: currentContent.trim() });
      }
      currentHeading = item.content;
      currentContent = "";
    } else {
      currentContent += (currentContent ? " " : "") + item.content;
    }
  }

  // Save last section
  if (currentContent.trim().length > 50) {
    sections.push({ heading: currentHeading, content: currentContent.trim() });
  }

  // Filter boilerplate sections
  const boilerplate = ["references", "see also", "external links", "notes", "further reading", "citations", "sources"];
  const filtered = sections.filter((s) => !boilerplate.some((b) => s.heading.toLowerCase().includes(b)));

  // Convert sections to chunks, respecting word limits
  const chunks: Omit<SourceChunk, "id">[] = [];
  const now = new Date().toISOString();

  for (const section of filtered) {
    if (chunks.length >= 6) break; // Cap at 6 chunks per page

    // Split long sections into smaller chunks (~200 words each)
    const words = section.content.split(/\s+/);
    let currentChunk = "";

    for (let i = 0; i < words.length; i++) {
      const chunk = currentChunk + (currentChunk ? " " : "") + words[i];
      if (chunk.split(/\s+/).length > 250) {
        if (currentChunk.split(/\s+/).length > 50) {
          chunks.push({
            conceptId,
            studyPlanId,
            source,
            pageTitle,
            pageUrl,
            sectionHeading: section.heading,
            content: currentChunk,
            createdAt: now,
          });
        }
        currentChunk = words[i];
        if (chunks.length >= 6) break;
      } else {
        currentChunk = chunk;
      }
    }

    // Save remaining chunk
    if (currentChunk.split(/\s+/).length > 50 && chunks.length < 6) {
      chunks.push({
        conceptId,
        studyPlanId,
        source,
        pageTitle,
        pageUrl,
        sectionHeading: section.heading,
        content: currentChunk,
        createdAt: now,
      });
    }
  }

  return chunks;
}

/**
 * Strip HTML tags from a string
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace nbsp
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}
