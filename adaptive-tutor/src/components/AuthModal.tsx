"use client";

import { useState } from "react";
import { setUserId, setCurrentUserDisplayName } from "@/lib/auth";
import { WebLogo } from "@/components/WebLogo";

interface AuthModalProps {
  onAuthComplete: () => void;
}

export function AuthModal({ onAuthComplete }: AuthModalProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create or verify user in database
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: username,
          displayName: username,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }

      // Save to localStorage
      setUserId(username);
      setCurrentUserDisplayName(username);

      // Notify parent to close modal
      onAuthComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "#060610" }}>
      <div
        className="rounded-2xl p-8 max-w-md w-full mx-4 space-y-6"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: "#0e1117",
              border: "1.5px solid rgba(0, 210, 160, 0.5)",
              boxShadow: "0 0 16px rgba(0, 210, 160, 0.25)",
            }}
          >
            <WebLogo size={40} style={{ filter: "none" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Welcome to Web
          </h1>
          <p
            className="text-sm text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Enter your name to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              disabled={loading}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border outline-none text-sm disabled:opacity-50"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {error && (
            <div
              className="px-4 py-2 rounded-lg text-sm"
              style={{
                borderColor: "#ef4444",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50 text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {loading ? "Setting up..." : "Let's go"}
          </button>
        </form>

        <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
          No password needed — just your name
        </p>
      </div>
    </div>
  );
}
