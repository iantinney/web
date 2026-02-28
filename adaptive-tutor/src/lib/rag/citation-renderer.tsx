/**
 * Citation rendering utilities for RAG integration
 * Converts [N] notation in text to clickable citation badges
 */

import { ReactNode } from "react";

export interface Citation {
  index: number;
  pageTitle: string;
  pageUrl: string;
}

/**
 * Parse text for [N] citation patterns and render as clickable badges
 * Example: "According to Wikipedia [1], gradient descent [1] is..."
 * becomes: "According to Wikipedia <badge>1</badge>, gradient descent <badge>1</badge> is..."
 */
export function renderWithCitations(
  text: string,
  citations?: Citation[]
): ReactNode[] {
  if (!citations || citations.length === 0) {
    return [text];
  }

  // Split on [N] patterns
  const parts = text.split(/\[(\d+)\]/g);

  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // This is a citation index (from the split pattern)
      const index = parseInt(part);
      const citation = citations.find((c) => c.index === index);

      if (!citation) {
        return `[${part}]`;
      }

      return (
        <a
          key={`citation-${index}-${i}`}
          href={citation.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`Source: ${citation.pageTitle}\nClick to view Wikipedia article`}
          className="inline-flex items-center justify-center min-w-5 h-5
            text-xs rounded-full bg-blue-500 text-white
            hover:bg-blue-600 hover:shadow-md hover:scale-110
            cursor-pointer align-super mx-0.5 ml-1
            no-underline font-bold transition-all duration-200
            border border-blue-600 hover:border-blue-700"
          style={{ fontSize: "11px" }}
        >
          {index}
        </a>
      );
    }

    return part;
  });
}

/**
 * Extract citations from question.sources field
 * Used to pass citations to rendering function
 */
export function extractCitations(sources?: Array<{ index: number; pageTitle: string; pageUrl: string }>): Citation[] {
  if (!sources || sources.length === 0) {
    return [];
  }
  return sources.map((s) => ({
    index: s.index,
    pageTitle: s.pageTitle,
    pageUrl: s.pageUrl,
  }));
}
