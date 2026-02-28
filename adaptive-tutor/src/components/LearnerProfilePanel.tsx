"use client";

import { useState } from "react";
import { X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getUserId } from "@/lib/auth";
import type { LearnerProfile } from "@/lib/types";

export function LearnerProfilePanel() {
  const learnerProfile = useAppStore((state) => state.learnerProfile);
  const setLearnerProfile = useAppStore((state) => state.setLearnerProfile);

  const [isExpanded, setIsExpanded] = useState(false);
  const [editingCategory, setEditingCategory] = useState<"background" | "goals" | "interests" | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Defensive check: ensure profile has all required arrays
  const safeProfile: LearnerProfile = {
    background: Array.isArray(learnerProfile?.background) ? learnerProfile.background : [],
    goals: Array.isArray(learnerProfile?.goals) ? learnerProfile.goals : [],
    interests: Array.isArray(learnerProfile?.interests) ? learnerProfile.interests : [],
  };

  const handleAddTag = async (category: "background" | "goals" | "interests") => {
    if (!newTagInput.trim()) return;

    const updated: LearnerProfile = {
      ...safeProfile,
      [category]: [...(safeProfile[category] ?? []), newTagInput.trim()],
    };

    setLearnerProfile(updated);
    setNewTagInput("");
    await saveBoth(updated);
  };

  const handleDeleteTag = async (category: "background" | "goals" | "interests", index: number) => {
    const updated: LearnerProfile = {
      ...safeProfile,
      [category]: (safeProfile[category] ?? []).filter((_, i) => i !== index),
    };

    setLearnerProfile(updated);
    await saveBoth(updated);
  };

  const saveBoth = async (profile: LearnerProfile) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ learnerProfile: profile }),
      });

      if (!res.ok) {
        console.error("Failed to save profile");
        // Revert local state on error
        setLearnerProfile(safeProfile);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      // Revert local state on error
      setLearnerProfile(safeProfile);
    } finally {
      setIsSaving(false);
    }
  };

  const isEmpty =
    (safeProfile.background?.length ?? 0) === 0 &&
    (safeProfile.goals?.length ?? 0) === 0 &&
    (safeProfile.interests?.length ?? 0) === 0;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">📚 Your Learning Profile</span>
          {!isEmpty && <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">Captured</span>}
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isExpanded && (
        <div className="px-4 py-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
          {isEmpty && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your profile will be captured after you create a study plan through the chat.
            </p>
          )}

          {/* Background */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              🎓 Background
              <span className="text-xs font-normal text-gray-500">Education & Experience</span>
            </h3>
            <div className="space-y-2">
              {(safeProfile.background ?? []).map((tag, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleDeleteTag("background", idx)}
                    disabled={isSaving}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-1 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {editingCategory === "background" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., Software Developer"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddTag("background");
                        setEditingCategory(null);
                      }
                    }}
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      handleAddTag("background");
                      setEditingCategory(null);
                    }}
                    disabled={isSaving}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingCategory("background");
                    setNewTagInput("");
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
          </div>

          {/* Goals */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              🎯 Goals
              <span className="text-xs font-normal text-gray-500">Learning Objectives</span>
            </h3>
            <div className="space-y-2">
              {(safeProfile.goals ?? []).map((tag, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleDeleteTag("goals", idx)}
                    disabled={isSaving}
                    className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-1 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {editingCategory === "goals" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., Learn Next.js"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddTag("goals");
                        setEditingCategory(null);
                      }
                    }}
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      handleAddTag("goals");
                      setEditingCategory(null);
                    }}
                    disabled={isSaving}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingCategory("goals");
                    setNewTagInput("");
                  }}
                  className="text-sm text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
          </div>

          {/* Interests */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              ⚡ Interests
              <span className="text-xs font-normal text-gray-500">Topics & Domains</span>
            </h3>
            <div className="space-y-2">
              {(safeProfile.interests ?? []).map((tag, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                  style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  {tag}
                  <button
                    onClick={() => handleDeleteTag("interests", idx)}
                    disabled={isSaving}
                    className="rounded-full p-1 transition hover:opacity-70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {editingCategory === "interests" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., Web development"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddTag("interests");
                        setEditingCategory(null);
                      }
                    }}
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      handleAddTag("interests");
                      setEditingCategory(null);
                    }}
                    disabled={isSaving}
                    className="px-3 py-1 text-sm rounded transition hover:opacity-90"
                    style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingCategory("interests");
                    setNewTagInput("");
                  }}
                  className="text-sm hover:underline flex items-center gap-1"
                  style={{ color: "var(--accent)" }}
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
