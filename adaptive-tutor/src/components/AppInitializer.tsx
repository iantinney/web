"use client";

import { useEffect, useState, useCallback } from "react";
import { isAuthenticated } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { AuthModal } from "./AuthModal";
import { IntroAnimation } from "./IntroAnimation";

/**
 * Client component rendered in the root layout.
 * Handles authentication and loads study plans on mount.
 * Shows AuthModal if user is not authenticated.
 */
export function AppInitializer() {
  const [showIntro, setShowIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Check if intro should play (before anything else)
  useEffect(() => {
    if (!localStorage.getItem("intro-seen")) {
      setShowIntro(true);
    }
    setIntroChecked(true);
  }, []);

  const handleIntroComplete = useCallback(() => {
    localStorage.setItem("intro-seen", "1");
    setShowIntro(false);
  }, []);

  const studyPlans = useAppStore((state) => state.studyPlans);
  const activeStudyPlanId = useAppStore((state) => state.activeStudyPlanId);
  const loadStudyPlans = useAppStore((state) => state.loadStudyPlans);
  const setActiveStudyPlan = useAppStore((state) => state.setActiveStudyPlan);
  const setUnitGraphs = useAppStore((state) => state.setUnitGraphs);
  const loadUnitGraphData = useAppStore((state) => state.loadUnitGraphData);
  const setLearnerProfile = useAppStore((state) => state.setLearnerProfile);

  // Step 1: Check authentication after intro completes
  useEffect(() => {
    if (!introChecked || showIntro) return;

    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }

    setIsReady(true);
  }, [introChecked, showIntro]);

  // Step 2: Load learner profile after auth is ready
  useEffect(() => {
    if (!isReady) return;

    async function loadProfile() {
      try {
        const { getUserId } = await import("@/lib/auth");
        const userId = getUserId();

        const res = await fetch("/api/users", {
          headers: { "x-user-id": userId },
        });
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        const profile = data.user?.learnerProfile ?? { background: [], goals: [], interests: [] };

        // Ensure profile has all required arrays
        const validProfile = {
          background: Array.isArray(profile?.background) ? profile.background : [],
          goals: Array.isArray(profile?.goals) ? profile.goals : [],
          interests: Array.isArray(profile?.interests) ? profile.interests : [],
        };

        setLearnerProfile(validProfile);
      } catch (error) {
        console.error("Failed to load learner profile:", error);
        // Set default profile on error
        setLearnerProfile({ background: [], goals: [], interests: [] });
      }
    }

    loadProfile();
  }, [isReady, setLearnerProfile]);

  // Step 3: Load study plans after auth is ready
  useEffect(() => {
    if (!isReady) return;

    async function initialize() {
      // Load all study plans (which sets activeStudyPlanId if not set)
      await loadStudyPlans();
    }

    initialize();
  }, [isReady, loadStudyPlans]);

  // Step 3: Load ALL graphs for this user
  useEffect(() => {
    if (!isReady) return;

    async function loadAllGraphs() {
      try {
        const { getUserId } = await import("@/lib/auth");
        const userId = getUserId();

        const res = await fetch("/api/unit-graphs", {
          headers: { "x-user-id": userId },
        });
        if (!res.ok) throw new Error("Failed to fetch unit graphs");
        const data = await res.json();
        const unitGraphs = data.unitGraphs ?? [];

        setUnitGraphs(unitGraphs);

        // Load first graph's data for page refresh persistence
        if (unitGraphs.length > 0) {
          await loadUnitGraphData(unitGraphs[0].id);
        }
      } catch (error) {
        console.error("Failed to load unit graphs:", error);
      }
    }

    loadAllGraphs();
  }, [isReady, setUnitGraphs, loadUnitGraphData]);

  if (showIntro) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  if (showAuthModal) {
    return (
      <AuthModal
        onAuthComplete={() => {
          setShowAuthModal(false);
          setIsReady(true);
        }}
      />
    );
  }

  return null;
}
