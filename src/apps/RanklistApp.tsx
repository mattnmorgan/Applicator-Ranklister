"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { UiContext } from "@applicator/sdk/context";
import { ToastStack } from "@applicator/sdk/components";
import type { ToastItem } from "@applicator/sdk/components";
import { Ranklist } from "../types/Ranklist";
import RanklistHome from "../components/RanklistHome";
import RanklistView from "../components/RanklistView";

interface Props {
  context?: UiContext;
}

export default function RanklistApp({ context: _context }: Props) {
  const [ranklists, setRanklists] = useState<Ranklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRanklist, setOpenRanklist] = useState<Ranklist | null>(null);
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

  const handleCreated = useCallback((ranklist: Ranklist) => {
    setRanklists((prev) =>
      [ranklist, ...prev].sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      )
    );
    setOpenRanklist(ranklist);
  }, []);

  const handleDeleted = useCallback(
    (id: string) => {
      setRanklists((prev) => prev.filter((r) => r.id !== id));
      if (openRanklist?.id === id) setOpenRanklist(null);
    },
    [openRanklist]
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
    setOpenRanklist(updated);
  }, []);

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
      {openRanklist ? (
        <RanklistView
          ranklist={openRanklist}
          onBack={() => setOpenRanklist(null)}
          onRanklistUpdated={handleRanklistUpdated}
          onRanklistDeleted={() => { setOpenRanklist(null); handleDeleted(openRanklist.id); }}
          addToast={addToast}
        />
      ) : (
        <RanklistHome
          ranklists={ranklists}
          loading={loading}
          onSelect={setOpenRanklist}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
          addToast={addToast}
        />
      )}

      <ToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
}
