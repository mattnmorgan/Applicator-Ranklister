"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { UiContext } from "@applicator/sdk/context";
import { ToastStack } from "@applicator/sdk/components";
import type { ToastItem } from "@applicator/sdk/components";
import { Ranklist } from "../types/Ranklist";
import RanklistHome from "../components/RanklistHome";
import RanklistView from "../components/RanklistView";

interface Props {
  path?: string[];
  appId?: string;
  navigate?: (url: string) => void;
  context?: UiContext;
}

const APP_BASE = "/app/ranklister:main";

export default function RanklistApp({ path, navigate: navProp, context: _context }: Props) {
  const [ranklists, setRanklists] = useState<Ranklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: ToastItem) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const removeToast = useCallback((index: number) => {
    setToasts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const loadRanklists = useCallback(async () => {
    try {
      const res = await fetch("/api/ranklister/ranklists");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const sorted = (data.ranklists ?? []).sort(
        (a: Ranklist, b: Ranklist) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );
      setRanklists(sorted);
    } catch {
      addToast({ message: "Failed to load ranklists", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRanklists();
  }, [loadRanklists]);

  const openRanklistId = path?.[0] === "ranklists" ? (path[1] ?? null) : null;
  const openRanklist = openRanklistId
    ? (ranklists.find((r) => r.id === openRanklistId) ?? null)
    : null;

  const navigateHome = useCallback(() => {
    navProp?.(APP_BASE);
  }, [navProp]);

  const navigateToRanklist = useCallback(
    (id: string) => {
      navProp?.(`${APP_BASE}/ranklists/${id}`);
    },
    [navProp]
  );

  const handleCreated = useCallback(
    (ranklist: Ranklist) => {
      setRanklists((prev) =>
        [ranklist, ...prev].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        )
      );
      navigateToRanklist(ranklist.id);
    },
    [navigateToRanklist]
  );

  const handleDeleted = useCallback(
    (id: string) => {
      setRanklists((prev) => prev.filter((r) => r.id !== id));
      if (openRanklistId === id) navigateHome();
    },
    [openRanklistId, navigateHome]
  );

  const handleRanklistUpdated = useCallback((updated: Ranklist) => {
    setRanklists((prev) =>
      prev
        .map((r) => (r.id === updated.id ? updated : r))
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        )
    );
  }, []);

  // True when the URL targets a ranklist (found or still loading)
  const showingRanklist = openRanklistId && (loading || openRanklist);

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        background: "#0f172a",
        color: "#f1f5f9",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 14,
      }}
    >
      {showingRanklist ? (
        openRanklist ? (
          <RanklistView
            ranklist={openRanklist}
            onBack={navigateHome}
            onRanklistUpdated={handleRanklistUpdated}
            onRanklistDeleted={() => handleDeleted(openRanklist.id)}
            addToast={addToast}
          />
        ) : (
          <div style={{ padding: 32, color: "#94a3b8" }}>Loading…</div>
        )
      ) : (
        <RanklistHome
          ranklists={ranklists}
          loading={loading}
          onSelect={(ranklist) => navigateToRanklist(ranklist.id)}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
          addToast={addToast}
        />
      )}

      <ToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
}
