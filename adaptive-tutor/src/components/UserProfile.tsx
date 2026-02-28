"use client";

import { useState, useEffect } from "react";
import { clearUserId, getUserId } from "@/lib/auth";
import { LogOut, User, Plus, X, ChevronDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { LearnerProfile } from "@/lib/types";

export function UserProfile() {
  const [showMenu, setShowMenu] = useState(false);
  const [displayName, setDisplayName] = useState("Learner");
  const [isHydrated, setIsHydrated] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<"background" | "goals" | "interests" | null>(null);
  const [newTagInput, setNewTagInput] = useState("");

  const learnerProfile = useAppStore((state) => state.learnerProfile);
  const setLearnerProfile = useAppStore((state) => state.setLearnerProfile);

  // Load display name after hydration to avoid mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const name = localStorage.getItem("currentUserDisplayName") || "Learner";
        setDisplayName(name);
      } catch (e) {
        setDisplayName("Learner");
      }
    }
    setIsHydrated(true);
  }, []);

  function handleLogout() {
    clearUserId();
    setShowMenu(false);
    // Reload page to trigger auth modal
    window.location.reload();
  }

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
    await saveProfile(updated);
  };

  const handleDeleteTag = async (category: "background" | "goals" | "interests", index: number) => {
    const updated: LearnerProfile = {
      ...safeProfile,
      [category]: (safeProfile[category] ?? []).filter((_, i) => i !== index),
    };

    setLearnerProfile(updated);
    await saveProfile(updated);
  };

  const saveProfile = async (profile: LearnerProfile) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ learnerProfile: profile }),
      });

      if (!res.ok) {
        console.error("Failed to save profile");
        setLearnerProfile(safeProfile);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setLearnerProfile(safeProfile);
    } finally {
      setIsSaving(false);
    }
  };

  const hasProfileData = safeProfile.background.length > 0 || safeProfile.goals.length > 0 || safeProfile.interests.length > 0;

  // Don't render interactive elements until hydrated
  if (!isHydrated) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-primary)",
        }}
      >
        <User size={18} />
        <span className="text-base font-medium max-w-[150px] truncate">Learner</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-primary)",
        }}
        title={`Logged in as ${displayName}`}
      >
        <User size={18} />
        <span className="text-base font-medium max-w-[150px] truncate">{displayName}</span>
      </button>

      {showMenu && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl border shadow-lg z-40 w-80 max-h-96 overflow-y-auto"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          {/* User section */}
          <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              LOGGED IN AS
            </p>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {displayName}
            </p>
          </div>

          {/* Profile section */}
          <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                📚 LEARNING PROFILE
                {hasProfileData && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: "var(--success)",
                      color: "#fff",
                    }}
                  >
                    Active
                  </span>
                )}
              </p>
              <button
                onClick={() => setShowProfileForm(!showProfileForm)}
                className="text-xs p-1 rounded hover:opacity-75 transition-opacity"
                style={{ color: "var(--text-secondary)" }}
              >
                {showProfileForm ? "Cancel" : "Edit"}
              </button>
            </div>

            {!showProfileForm ? (
              <div className="space-y-2">
                {hasProfileData ? (
                  <>
                    {safeProfile.background.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1 text-blue-600">Background</p>
                        <div className="flex flex-wrap gap-1">
                          {safeProfile.background.map((tag, i) => (
                            <span
                              key={i}
                              className="inline-block text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                                color: "#3b82f6",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {safeProfile.goals.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1 text-green-600">Goals</p>
                        <div className="flex flex-wrap gap-1">
                          {safeProfile.goals.map((tag, i) => (
                            <span
                              key={i}
                              className="inline-block text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "rgba(34, 197, 94, 0.1)",
                                color: "#22c55e",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {safeProfile.interests.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>Interests</p>
                        <div className="flex flex-wrap gap-1">
                          {safeProfile.interests.map((tag, i) => (
                            <span
                              key={i}
                              className="inline-block text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "var(--accent-soft)",
                                color: "var(--accent)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Profile captures from chat. Click Edit to add manually.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Background edit */}
                <div>
                  <p className="text-xs font-semibold mb-1">Background</p>
                  <div className="space-y-1.5">
                    {safeProfile.background.map((tag, i) => (
                      <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
                        <span>{tag}</span>
                        <button onClick={() => handleDeleteTag("background", i)} disabled={isSaving} className="hover:opacity-75">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {editingCategory === "background" ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Add..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleAddTag("background");
                              setEditingCategory(null);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-xs border rounded"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--bg-tertiary)",
                            color: "var(--text-primary)",
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            handleAddTag("background");
                            setEditingCategory(null);
                          }}
                          disabled={isSaving}
                          className="px-2 py-1 text-xs rounded"
                          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
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
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Goals edit */}
                <div>
                  <p className="text-xs font-semibold mb-1">Goals</p>
                  <div className="space-y-1.5">
                    {safeProfile.goals.map((tag, i) => (
                      <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
                        <span>{tag}</span>
                        <button onClick={() => handleDeleteTag("goals", i)} disabled={isSaving} className="hover:opacity-75">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {editingCategory === "goals" ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Add..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleAddTag("goals");
                              setEditingCategory(null);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-xs border rounded"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--bg-tertiary)",
                            color: "var(--text-primary)",
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            handleAddTag("goals");
                            setEditingCategory(null);
                          }}
                          disabled={isSaving}
                          className="px-2 py-1 text-xs rounded"
                          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
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
                        className="text-xs text-green-600 hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Interests edit */}
                <div>
                  <p className="text-xs font-semibold mb-1">Interests</p>
                  <div className="space-y-1.5">
                    {safeProfile.interests.map((tag, i) => (
                      <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded" style={{ backgroundColor: "var(--accent-soft)" }}>
                        <span>{tag}</span>
                        <button onClick={() => handleDeleteTag("interests", i)} disabled={isSaving} className="hover:opacity-75">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {editingCategory === "interests" ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Add..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleAddTag("interests");
                              setEditingCategory(null);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-xs border rounded"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--bg-tertiary)",
                            color: "var(--text-primary)",
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            handleAddTag("interests");
                            setEditingCategory(null);
                          }}
                          disabled={isSaving}
                          className="px-2 py-1 text-xs rounded"
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
                        className="text-xs hover:underline flex items-center gap-1"
                        style={{ color: "var(--accent)" }}
                      >
                        <Plus size={12} /> Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 hover:opacity-75 transition-opacity text-sm text-red-600"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
