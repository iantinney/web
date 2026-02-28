"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2 } from "lucide-react";

interface AddConceptFABProps {
  studyPlanId: string;
  unitGraphId: string;
  onConceptAdded: () => void;
}

export function AddConceptFAB({
  studyPlanId,
  unitGraphId,
  onConceptAdded,
}: AddConceptFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conceptName, setConceptName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!conceptName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/study-plans/${studyPlanId}/concepts/add-custom`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitGraphId,
            conceptName: conceptName.trim(),
          }),
        }
      );
      if (res.ok) {
        setConceptName("");
        setIsOpen(false);
        onConceptAdded();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 20,
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: 56,
              right: 0,
              width: 280,
              padding: 16,
              borderRadius: 16,
              background: "rgba(18, 18, 26, 0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow:
                "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.7)",
                marginBottom: 10,
                letterSpacing: "0.02em",
              }}
            >
              Add Custom Concept
            </div>
            <input
              ref={inputRef}
              type="text"
              value={conceptName}
              onChange={(e) => setConceptName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter concept name..."
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!conceptName.trim() || isSubmitting}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "9px 16px",
                borderRadius: 10,
                border: "none",
                background:
                  !conceptName.trim() || isSubmitting
                    ? "rgba(255, 255, 255, 0.06)"
                    : "linear-gradient(135deg, rgba(0, 210, 160, 0.7), rgba(0, 180, 220, 0.7))",
                color:
                  !conceptName.trim() || isSubmitting
                    ? "rgba(255, 255, 255, 0.3)"
                    : "rgba(255, 255, 255, 0.95)",
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  !conceptName.trim() || isSubmitting
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                letterSpacing: "0.02em",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Adding...
                </>
              ) : (
                "Add to Web"
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button — labeled pill */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.2 }}
        style={{
          height: 40,
          padding: "0 18px 0 14px",
          borderRadius: 20,
          border: "1px solid rgba(0, 210, 160, 0.2)",
          background: "rgba(18, 18, 26, 0.88)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow:
            "0 4px 20px rgba(0, 0, 0, 0.35), 0 0 16px rgba(0, 210, 160, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          cursor: "pointer",
          color: "rgba(0, 210, 160, 0.9)",
        }}
      >
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: "flex", alignItems: "center" }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </motion.span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          Add Concept
        </span>
      </motion.button>
    </div>
  );
}
