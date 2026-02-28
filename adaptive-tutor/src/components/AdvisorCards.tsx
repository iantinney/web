"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import type { AdvisorCard } from "@/lib/store";

// Text labels per recommendation type
const TYPE_LABELS: Record<AdvisorCard["type"], string> = {
  review: "Review",
  continue: "Continue",
  remediate: "Fix Gap",
  extend: "Extend",
  bridge: "Bridge",
  new_domain: "New Topic",
};

// Subtle accent colors per type — consistent with project's CSS variable pattern
const TYPE_COLORS: Record<AdvisorCard["type"], string> = {
  review: "rgba(250, 204, 21, 0.15)",    // amber — spaced repetition
  continue: "rgba(34, 197, 94, 0.12)",   // green — forward progress
  remediate: "rgba(239, 68, 68, 0.12)",  // red — fix a gap
  extend: "rgba(20, 184, 166, 0.12)",     // teal — extend
  bridge: "rgba(6, 182, 212, 0.12)",     // cyan — bridge
  new_domain: "rgba(14, 165, 233, 0.12)", // sky — new domain
};

interface AdvisorCardsProps {
  cards: AdvisorCard[];
}

export function AdvisorCards({ cards }: AdvisorCardsProps) {
  const router = useRouter();
  const setTargetConceptId = useAppStore((s) => s.setTargetConceptId);

  function handlePractice(card: AdvisorCard) {
    if (card.conceptId) {
      setTargetConceptId(card.conceptId);
    }
    router.push("/learn");
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      {cards.map((card, idx) => (
        <div
          key={`${card.type}-${idx}`}
          className="rounded-xl border p-3 flex flex-col gap-2"
          style={{
            backgroundColor:
              TYPE_COLORS[card.type] ?? "rgba(255,255,255,0.05)",
            borderColor: "var(--border, rgba(255,255,255,0.1))",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "var(--text-secondary)",
              }}
            >
              {TYPE_LABELS[card.type] ?? card.type}
            </span>
            <span
              className="font-semibold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              {card.title}
            </span>
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {card.pitch}
          </p>
          {card.conceptId && (
            <button
              onClick={() => handlePractice(card)}
              className="self-start text-sm font-medium px-4 py-2.5 rounded-xl transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent)",
                border: "1px solid var(--accent-glow)",
              }}
            >
              Practice this
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
