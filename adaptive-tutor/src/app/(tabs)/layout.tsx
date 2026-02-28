"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, BookOpen, GitBranch, Sun, Moon } from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserProfile } from "@/components/UserProfile";
import { WebLogo } from "@/components/WebLogo";
import { useAppStore } from "@/lib/store";

const tabs = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/graph", label: "Web", icon: GitBranch },
] as const;

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const updateChatContextMode = useAppStore((s) => s.updateChatContextMode);
  const webTabNotificationCount = useAppStore((s) => s.webTabNotificationCount);
  const clearWebNotification = useAppStore((s) => s.clearWebNotification);

  const activeTabIndex = useMemo(
    () => Math.max(0, tabs.findIndex((t) => t.href === pathname)),
    [pathname]
  );

  // Measure tab node positions so edges attach to node borders, not centers
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [edges, setEdges] = useState<{ x1: number; x2: number }[]>([]);
  const [tabCenters, setTabCenters] = useState<number[]>([]);

  const measureEdges = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const navRect = nav.getBoundingClientRect();
    const newEdges: { x1: number; x2: number }[] = [];
    const centers: number[] = [];
    for (let i = 0; i < tabRefs.current.length; i++) {
      const el = tabRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      centers.push(((rect.left + rect.width / 2 - navRect.left) / navRect.width) * 100);
      if (i < tabRefs.current.length - 1) {
        const right = tabRefs.current[i + 1];
        if (!right) continue;
        const rightRect = right.getBoundingClientRect();
        newEdges.push({
          x1: ((rect.right - navRect.left) / navRect.width) * 100,
          x2: ((rightRect.left - navRect.left) / navRect.width) * 100,
        });
      }
    }
    setEdges(newEdges);
    setTabCenters(centers);
  }, []);

  // Rush pulse animation on tab switch
  const prevTabRef = useRef(activeTabIndex);
  const [rush, setRush] = useState<{ key: number; fromX: number; dx: number } | null>(null);

  useEffect(() => {
    if (prevTabRef.current !== activeTabIndex && tabCenters.length > 0) {
      const fromX = tabCenters[prevTabRef.current] ?? 0;
      const toX = tabCenters[activeTabIndex] ?? 0;
      const navWidth = navRef.current?.offsetWidth ?? 0;
      if (fromX !== toX && navWidth > 0) {
        const dx = ((toX - fromX) / 100) * navWidth;
        setRush({ key: Date.now(), fromX, dx });
        const timer = setTimeout(() => setRush(null), 2500);
        prevTabRef.current = activeTabIndex;
        return () => clearTimeout(timer);
      }
    }
    prevTabRef.current = activeTabIndex;
  }, [activeTabIndex, tabCenters]);

  useEffect(() => {
    measureEdges();
    window.addEventListener("resize", measureEdges);
    return () => window.removeEventListener("resize", measureEdges);
  }, [measureEdges]);

  useEffect(() => {
    const modeMap: Record<string, "practicing" | "exploring" | "planning" | "idle"> = {
      "/learn": "practicing",
      "/graph": "exploring",
      "/chat": "planning",
    };
    updateChatContextMode(modeMap[pathname] ?? "idle");
    if (pathname === "/graph") clearWebNotification();
  }, [pathname, updateChatContextMode, clearWebNotification]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute(
      "data-theme",
      next ? "dark" : "light"
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: "#0e1117",
              border: "1.5px solid rgba(0, 210, 160, 0.5)",
              boxShadow: "0 0 12px rgba(0, 210, 160, 0.2), 0 0 4px rgba(0, 210, 160, 0.1)",
            }}
          >
            <WebLogo size={28} style={{ filter: "none" }} />
          </div>
          <span
            className="font-semibold text-lg"
            style={{
              color: "#00d2a0",
              letterSpacing: "0.08em",
              textShadow: "0 0 12px rgba(0, 210, 160, 0.4)",
            }}
          >
            Web
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <UserProfile />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Bottom tab bar — nodes connected by edges */}
      <nav
        ref={navRef}
        className="relative flex items-center justify-around py-2 border-t"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        {/* SVG edges between tab nodes + pulse dots */}
        {edges.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            {edges.map((edge, i) => (
              <g key={i}>
                <line
                  x1={`${edge.x1}%`} y1="50%"
                  x2={`${edge.x2}%`} y2="50%"
                  stroke="rgba(0, 210, 160, 0.2)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>
        )}

        {/* Rush pulse dots on tab switch */}
        <AnimatePresence>
          {rush && Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={`${rush.key}-${i}`}
              initial={{ x: 0, opacity: 0, scale: 0.5 }}
              animate={{
                x: rush.dx,
                opacity: [0, 0.9, 0.85, 0],
                scale: [0.5, 1.2, 1, 0.5],
              }}
              transition={{ duration: 1, delay: i * 0.09, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: "50%",
                left: `${rush.fromX}%`,
                width: 6,
                height: 6,
                marginTop: -3,
                marginLeft: -3,
                borderRadius: "50%",
                backgroundColor: "#00d2a0",
                boxShadow: "0 0 8px rgba(0, 210, 160, 0.9)",
                pointerEvents: "none",
                zIndex: 5,
              }}
            />
          ))}
        </AnimatePresence>

        {/* Tab nodes */}
        {tabs.map((tab, i) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          const showBadge = tab.href === "/graph" && webTabNotificationCount > 0 && !isActive;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={(el) => { tabRefs.current[i] = el; }}
              className="relative z-10 flex flex-col items-center gap-0.5 px-7 py-1.5 rounded-xl border"
              style={{
                color: isActive ? "#00d2a0" : "var(--text-muted)",
                backgroundColor: isActive ? "rgba(0, 210, 160, 0.08)" : "var(--bg-secondary)",
                borderColor: isActive ? "rgba(0, 210, 160, 0.4)" : "var(--border)",
                boxShadow: isActive
                  ? "0 0 10px rgba(0, 210, 160, 0.15), 0 0 4px rgba(0, 210, 160, 0.1)"
                  : "none",
                transition: "all 0.3s ease",
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              <span
                className="text-[10px] font-medium"
                style={{ letterSpacing: "0.03em" }}
              >
                {tab.label}
              </span>

              {/* Notification badge */}
              <AnimatePresence>
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      padding: "0 5px",
                      borderRadius: 9,
                      background: "linear-gradient(135deg, #00d2a0, #00b4dc)",
                      color: "#0e1117",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 8px rgba(0, 210, 160, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)",
                      lineHeight: 1,
                    }}
                  >
                    {webTabNotificationCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
