"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ButtonIcon, Spinner, ConfirmModal } from "@applicator/sdk/components";
import type { ToastItem } from "@applicator/sdk/components";
import { Ranklist } from "../types/Ranklist";
import { Rank } from "../types/Rank";
import { Item } from "../types/Item";
import Swimlane from "./Swimlane";
import RanklistModal from "./RanklistModal";
import RankModal from "./RankModal";
import ItemModal from "./ItemModal";

interface Props {
  ranklist: Ranklist;
  onBack: () => void;
  onRanklistUpdated: (updated: Ranklist) => void;
  onRanklistDeleted: () => void;
  addToast: (toast: ToastItem) => void;
}

export default function RanklistView({
  ranklist,
  onBack,
  onRanklistUpdated,
  onRanklistDeleted,
  addToast,
}: Props) {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageVersion, setImageVersion] = useState(0);

  // Modal state
  const [editRanklistOpen, setEditRanklistOpen] = useState(false);
  const [newRankOpen, setNewRankOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [deletingRank, setDeletingRank] = useState<Rank | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [addToLaneId, setAddToLaneId] = useState<string | null>(null);
  const [deleteRanklistOpen, setDeleteRanklistOpen] = useState(false);

  // Item selection (shared across all lanes so only one item can be selected at a time)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Item drag state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);

  // Rank drag state
  const [draggingRankId, setDraggingRankId] = useState<string | null>(null);
  const draggingRankIdRef = useRef<string | null>(null);
  const [rankDropIndex, setRankDropIndex] = useState<number | null>(null);
  const ranksContainerRef = useRef<HTMLDivElement>(null);

  const baseUrl = `/api/ranklister/ranklists/${ranklist.id}`;

  const loadData = useCallback(async () => {
    try {
      const [ranksRes, itemsRes] = await Promise.all([
        fetch(`${baseUrl}/ranks`),
        fetch(`${baseUrl}/items`),
      ]);
      const [ranksData, itemsData] = await Promise.all([
        ranksRes.json(),
        itemsRes.json(),
      ]);
      setRanks(ranksData.ranks ?? []);
      setItems(itemsData.items ?? []);
    } catch {
      addToast({ message: "Failed to load ranklist data", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [baseUrl, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Ranklist edit/delete ---

  const handleUpdateRanklist = useCallback(
    async (name: string, description: string) => {
      try {
        const res = await fetch(baseUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });
        if (!res.ok) throw new Error();
        const updated: Ranklist = await res.json();
        onRanklistUpdated(updated);
        setEditRanklistOpen(false);
        addToast({ message: "Ranklist updated", type: "success" });
      } catch {
        addToast({ message: "Failed to update ranklist", type: "error" });
      }
    },
    [baseUrl, onRanklistUpdated, addToast]
  );

  const handleDeleteRanklist = useCallback(async () => {
    try {
      const res = await fetch(baseUrl, { method: "DELETE" });
      if (!res.ok) throw new Error();
      addToast({ message: "Ranklist deleted", type: "success" });
      onRanklistDeleted();
    } catch {
      addToast({ message: "Failed to delete ranklist", type: "error" });
    }
  }, [baseUrl, onRanklistDeleted, addToast]);

  // --- Ranks ---

  const handleCreateRank = useCallback(
    async (data: { name: string; bgColor: string; fgColor: string; helpText: string }) => {
      try {
        const res = await fetch(`${baseUrl}/ranks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
        const rank: Rank = await res.json();
        setRanks((prev) => [...prev, rank].sort((a, b) => a.order - b.order));
        setNewRankOpen(false);
        addToast({ message: "Rank added", type: "success" });
      } catch {
        addToast({ message: "Failed to create rank", type: "error" });
      }
    },
    [baseUrl, addToast]
  );

  const handleUpdateRank = useCallback(
    async (data: { name: string; bgColor: string; fgColor: string; helpText: string }) => {
      if (!editingRank) return;
      try {
        const res = await fetch(`${baseUrl}/ranks/${editingRank.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
        const updated: Rank = await res.json();
        setRanks((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)).sort((a, b) => a.order - b.order)
        );
        setEditingRank(null);
        addToast({ message: "Rank updated", type: "success" });
      } catch {
        addToast({ message: "Failed to update rank", type: "error" });
      }
    },
    [baseUrl, editingRank, addToast]
  );

  const handleDeleteRank = useCallback(async () => {
    if (!deletingRank) return;
    try {
      const res = await fetch(`${baseUrl}/ranks/${deletingRank.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRanks((prev) => prev.filter((r) => r.id !== deletingRank.id));
      const itemsRes = await fetch(`${baseUrl}/items`);
      const itemsData = await itemsRes.json();
      setItems(itemsData.items ?? []);
      setDeletingRank(null);
      addToast({ message: "Rank deleted — items moved to Library", type: "success" });
    } catch {
      addToast({ message: "Failed to delete rank", type: "error" });
    }
  }, [baseUrl, deletingRank, addToast]);

  // --- Items ---

  const handleCreateItem = useCallback(
    async (name: string, file: Blob | null) => {
      if (!file) return;
      try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("image", file, "image.jpg");
        const res = await fetch(`${baseUrl}/items`, { method: "POST", body: formData });
        if (!res.ok) throw new Error();
        const item: Item = await res.json();
        if (addToLaneId !== null) {
          const laneItems = items.filter((i) => i.rankId === addToLaneId);
          const maxOrder = laneItems.reduce((m, i) => Math.max(m, i.order), 0);
          const patchRes = await fetch(`${baseUrl}/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rankId: addToLaneId, order: maxOrder + 1 }),
          });
          if (patchRes.ok) {
            const patched: Item = await patchRes.json();
            setItems((prev) => [...prev, patched]);
          } else {
            setItems((prev) => [...prev, item]);
          }
        } else {
          setItems((prev) => [...prev, item]);
        }
        setItemModalOpen(false);
        setImageVersion((v) => v + 1);
        addToast({ message: "Item added", type: "success" });
      } catch {
        addToast({ message: "Failed to add item", type: "error" });
      }
    },
    [baseUrl, items, addToLaneId, addToast]
  );

  const handleEditItem = useCallback(
    async (name: string, file: Blob | null) => {
      if (!editingItem) return;
      try {
        const patchRes = await fetch(`${baseUrl}/items/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!patchRes.ok) throw new Error();
        const patched: Item = await patchRes.json();

        if (file) {
          const formData = new FormData();
          formData.append("image", file, "image.jpg");
          const imgRes = await fetch(`${baseUrl}/items/${editingItem.id}/image`, {
            method: "POST",
            body: formData,
          });
          if (imgRes.ok) {
            const withImg: Item = await imgRes.json();
            setItems((prev) => prev.map((i) => (i.id === editingItem.id ? withImg : i)));
            setImageVersion((v) => v + 1);
          } else {
            setItems((prev) => prev.map((i) => (i.id === editingItem.id ? patched : i)));
          }
        } else {
          setItems((prev) => prev.map((i) => (i.id === editingItem.id ? patched : i)));
        }

        setEditingItem(null);
        addToast({ message: "Item updated", type: "success" });
      } catch {
        addToast({ message: "Failed to update item", type: "error" });
      }
    },
    [baseUrl, editingItem, addToast]
  );

  const handleDeleteItem = useCallback(async () => {
    if (!deletingItem) return;
    try {
      const res = await fetch(`${baseUrl}/items/${deletingItem.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
      setDeletingItem(null);
      addToast({ message: "Item deleted", type: "success" });
    } catch {
      addToast({ message: "Failed to delete item", type: "error" });
    }
  }, [baseUrl, deletingItem, addToast]);

  // --- Item drag and drop ---

  const handleDragStart = useCallback((itemId: string) => {
    setDraggedItemId(itemId);
    draggedItemIdRef.current = itemId;
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    draggedItemIdRef.current = null;
  }, []);

  const handleDrop = useCallback(
    async (targetLaneId: string | null, insertIndex: number) => {
      const itemId = draggedItemIdRef.current;
      if (!itemId) return;

      // Clear drag state before the optimistic update so the item renders at
      // full opacity in its new lane. Without this, the source element gets
      // unmounted by the optimistic update before dragend fires, which prevents
      // the onDragEnd handler from running and leaves draggedItemId stale.
      setDraggedItemId(null);
      draggedItemIdRef.current = null;

      const draggedItem = items.find((i) => i.id === itemId);
      if (!draggedItem) return;

      const targetLaneItems = items
        .filter((i) => i.rankId === targetLaneId && i.id !== itemId)
        .sort((a, b) => a.order - b.order);

      // computeDropIndex counts DOM children including the dragged item when it
      // is in the same lane. targetLaneItems excludes it. Subtract 1 when the
      // dragged item sits before the drop position in that lane's sorted order.
      let adjustedIndex = insertIndex;
      if (draggedItem.rankId === targetLaneId) {
        const laneSorted = items
          .filter((i) => i.rankId === targetLaneId)
          .sort((a, b) => a.order - b.order);
        const draggedDomIdx = laneSorted.findIndex((i) => i.id === itemId);
        if (draggedDomIdx !== -1 && draggedDomIdx < insertIndex) {
          adjustedIndex = insertIndex - 1;
        }
      }

      const clamped = Math.max(0, Math.min(adjustedIndex, targetLaneItems.length));
      const newOrder = computeNewOrder(targetLaneItems, clamped);

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, rankId: targetLaneId, order: newOrder } : i
        )
      );

      try {
        const res = await fetch(`${baseUrl}/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rankId: targetLaneId, order: newOrder }),
        });
        if (!res.ok) throw new Error();
        const updated: Item = await res.json();
        setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      } catch {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, rankId: draggedItem.rankId, order: draggedItem.order }
              : i
          )
        );
        addToast({ message: "Failed to move item", type: "error" });
      }
    },
    [items, baseUrl, addToast]
  );

  // --- Rank drag and drop ---

  const handleRankDragStart = useCallback((rankId: string) => {
    setDraggingRankId(rankId);
    draggingRankIdRef.current = rankId;
  }, []);

  const handleRankDragEnd = useCallback(() => {
    setDraggingRankId(null);
    draggingRankIdRef.current = null;
    setRankDropIndex(null);
  }, []);

  const computeRankDropIndex = useCallback(
    (clientY: number): number => {
      if (!ranksContainerRef.current) return ranks.length;
      const rows = Array.from(
        ranksContainerRef.current.querySelectorAll("[data-rank-row]")
      ) as HTMLElement[];
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return i;
      }
      return rows.length;
    },
    [ranks.length]
  );

  const handleRankContainerDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!draggingRankIdRef.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setRankDropIndex(computeRankDropIndex(e.clientY));
    },
    [computeRankDropIndex]
  );

  const handleRankContainerDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setRankDropIndex(null);
    }
  }, []);

  const handleRankContainerDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const rankId = draggingRankIdRef.current;
      if (!rankId) return;

      const idx = computeRankDropIndex(e.clientY);
      setDraggingRankId(null);
      draggingRankIdRef.current = null;
      setRankDropIndex(null);

      const draggedRank = ranks.find((r) => r.id === rankId);
      if (!draggedRank) return;

      const draggingIdx = ranks.findIndex((r) => r.id === rankId);
      // Adjust index to account for the dragged rank being removed from otherRanks
      const adjustedIdx = idx > draggingIdx ? idx - 1 : idx;
      // No-op if dropped in same position
      if (adjustedIdx === draggingIdx) return;

      const otherRanks = ranks.filter((r) => r.id !== rankId);
      const clamped = Math.max(0, Math.min(adjustedIdx, otherRanks.length));
      const newOrder = computeNewOrder(otherRanks, clamped);

      // Optimistic update
      setRanks((prev) =>
        prev
          .map((r) => (r.id === rankId ? { ...r, order: newOrder } : r))
          .sort((a, b) => a.order - b.order)
      );

      try {
        const res = await fetch(`${baseUrl}/ranks/${rankId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newOrder }),
        });
        if (!res.ok) throw new Error();
        const updated: Rank = await res.json();
        setRanks((prev) =>
          prev.map((r) => (r.id === rankId ? updated : r)).sort((a, b) => a.order - b.order)
        );
      } catch {
        setRanks((prev) =>
          prev
            .map((r) => (r.id === rankId ? draggedRank : r))
            .sort((a, b) => a.order - b.order)
        );
        addToast({ message: "Failed to reorder ranks", type: "error" });
      }
    },
    [ranks, baseUrl, computeRankDropIndex, addToast]
  );

  // --- Print ---

  const handlePrint = useCallback(() => {
    const pw = window.open("", "_blank", "width=960,height=700");
    if (!pw) return;

    const origin = window.location.origin;
    const rankLabelWidth = 120;

    const rankRowsHtml = ranks
      .map((rank) => {
        const rankItems = items
          .filter((i) => i.rankId === rank.id)
          .sort((a, b) => a.order - b.order);
        const itemsHtml = rankItems
          .map(
            (item) => `
          <div style="display:inline-block;width:80px;margin:4px;vertical-align:top;text-align:center;">
            ${item.hasImage ? `<img src="${origin}/api/ranklister/images/${ranklist.id}/${item.id}" style="width:80px;height:80px;object-fit:contain;border-radius:4px;display:block;" />` : ""}
            <div style="font-size:10px;color:#1e293b;margin-top:2px;word-break:break-word;">${esc(item.name)}</div>
          </div>`
          )
          .join("");
        return `
        <div style="display:flex;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;margin-bottom:6px;min-height:56px;">
          <div style="width:${rankLabelWidth}px;min-width:${rankLabelWidth}px;background:${rank.bgColor};color:${rank.fgColor};display:flex;align-items:center;justify-content:center;padding:8px;font-weight:700;font-size:13px;text-align:center;word-break:break-word;align-self:stretch;">
            ${esc(rank.name)}
          </div>
          <div style="flex:1;padding:4px;display:flex;flex-wrap:wrap;align-content:flex-start;">${itemsHtml}</div>
        </div>`;
      })
      .join("");

    const libraryItems = items.filter((i) => !i.rankId).sort((a, b) => a.order - b.order);
    const libraryHtml =
      libraryItems.length > 0
        ? `
      <div style="display:flex;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;margin-bottom:6px;min-height:56px;">
        <div style="width:${rankLabelWidth}px;min-width:${rankLabelWidth}px;background:#e2e8f0;color:#475569;display:flex;align-items:center;justify-content:center;padding:8px;font-weight:700;font-size:13px;text-align:center;align-self:stretch;">
          Library
        </div>
        <div style="flex:1;padding:4px;display:flex;flex-wrap:wrap;align-content:flex-start;">
          ${libraryItems
            .map(
              (item) => `
            <div style="display:inline-block;width:80px;margin:4px;vertical-align:top;text-align:center;">
              ${item.hasImage ? `<img src="${origin}/api/ranklister/images/${ranklist.id}/${item.id}" style="width:80px;height:80px;object-fit:contain;border-radius:4px;display:block;" />` : ""}
              <div style="font-size:10px;color:#1e293b;margin-top:2px;word-break:break-word;">${esc(item.name)}</div>
            </div>`
            )
            .join("")}
        </div>
      </div>`
        : "";

    const glossaryItems = ranks.filter((r) => r.helpText);
    const glossaryHtml =
      glossaryItems.length > 0
        ? `
      <div style="margin-top:24px;border-top:1px solid #cbd5e1;padding-top:16px;">
        <h2 style="font-size:14px;font-weight:700;margin:0 0 12px;color:#0f172a;">Rank Key</h2>
        ${glossaryItems
          .map(
            (r) => `
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px;">
            <div style="background:${r.bgColor};color:${r.fgColor};padding:3px 10px;border-radius:4px;font-weight:700;font-size:12px;flex-shrink:0;min-width:${rankLabelWidth}px;text-align:center;word-break:break-word;">
              ${esc(r.name)}
            </div>
            <span style="font-size:12px;color:#334155;padding-top:2px;">${esc(r.helpText ?? "")}</span>
          </div>`
          )
          .join("")}
      </div>`
        : "";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(ranklist.name)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:20px;color:#0f172a;background:#fff;}
    img{display:block;}
    @media print{@page{margin:1cm;}}
  </style>
</head>
<body>
  <h1 style="font-size:18px;font-weight:600;margin-bottom:2px;">${esc(ranklist.name)}</h1>
  ${ranklist.description ? `<p style="font-size:12px;color:#475569;margin-bottom:14px;">${esc(ranklist.description)}</p>` : `<div style="margin-bottom:14px;"></div>`}
  ${rankRowsHtml}
  ${libraryHtml}
  ${glossaryHtml}
  <script>window.addEventListener('load',function(){window.print();});</script>
</body>
</html>`;

    pw.document.write(html);
    pw.document.close();
  }, [ranks, items, ranklist]);

  // Build lane item lists
  const libraryItems = items
    .filter((i) => i.rankId === null)
    .sort((a, b) => a.order - b.order);

  const rankItemsMap = new Map<string, Item[]>();
  for (const rank of ranks) {
    rankItemsMap.set(
      rank.id,
      items.filter((i) => i.rankId === rank.id).sort((a, b) => a.order - b.order)
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px 24px",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 20 }}>
        <div style={{ paddingTop: 2, flexShrink: 0 }}>
          <ButtonIcon name="chevron-left" label="Back" placement="right" onClick={onBack} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 500,
                color: "#f1f5f9",
                flex: 1,
                lineHeight: 1.3,
              }}
            >
              {ranklist.name}
            </h1>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <ButtonIcon name="plus" label="Add rank" size="sm" onClick={() => setNewRankOpen(true)} />
              <ButtonIcon name="edit" label="Edit ranklist" size="sm" onClick={() => setEditRanklistOpen(true)} />
              <ButtonIcon name="print" label="Print ranklist" size="sm" onClick={handlePrint} />
              <ButtonIcon
                name="trash"
                label="Delete ranklist"
                size="sm"
                subvariant="danger"
                onClick={() => setDeleteRanklistOpen(true)}
              />
            </div>
          </div>
          {ranklist.description && (
            <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 13 }}>
              {ranklist.description}
            </p>
          )}
        </div>
      </div>

      {/* Swimlanes */}
      <div
        ref={ranksContainerRef}
        onDragOver={handleRankContainerDragOver}
        onDragLeave={handleRankContainerDragLeave}
        onDrop={handleRankContainerDrop}
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
      >
        {ranks.map((rank, idx) => (
          <React.Fragment key={rank.id}>
            {rankDropIndex === idx && draggingRankId && draggingRankId !== rank.id && (
              <RankDropIndicator />
            )}
            <div
              data-rank-row
              style={{ opacity: draggingRankId === rank.id ? 0.4 : 1, transition: "opacity 0.1s" }}
            >
              <Swimlane
                laneId={rank.id}
                rank={rank}
                items={rankItemsMap.get(rank.id) ?? []}
                ranklistId={ranklist.id}
                isLibrary={false}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
                draggedItemId={draggedItemId}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onEditItem={(item) => { setEditingItem(item); }}
                onDeleteItem={(item) => setDeletingItem(item)}
                onAddItem={() => { setAddToLaneId(rank.id); setItemModalOpen(true); }}
                onEditRank={() => setEditingRank(rank)}
                onDeleteRank={() => setDeletingRank(rank)}
                onRankDragStart={() => handleRankDragStart(rank.id)}
                onRankDragEnd={handleRankDragEnd}
                isDraggingRank={!!draggingRankId}
                imageVersion={imageVersion}
              />
            </div>
          </React.Fragment>
        ))}

        {/* Drop indicator after last rank row */}
        {rankDropIndex === ranks.length && draggingRankId && (
          <RankDropIndicator />
        )}

        {/* Library lane — always last */}
        <Swimlane
          laneId={null}
          rank={null}
          items={libraryItems}
          ranklistId={ranklist.id}
          isLibrary={true}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          draggedItemId={draggedItemId}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onEditItem={(item) => { setEditingItem(item); }}
          onDeleteItem={(item) => setDeletingItem(item)}
          onAddItem={() => { setAddToLaneId(null); setItemModalOpen(true); }}
          isDraggingRank={!!draggingRankId}
          imageVersion={imageVersion}
        />
      </div>

      {/* Modals */}
      {editRanklistOpen && (
        <RanklistModal
          existing={ranklist}
          onClose={() => setEditRanklistOpen(false)}
          onSave={handleUpdateRanklist}
        />
      )}

      {newRankOpen && (
        <RankModal
          onClose={() => setNewRankOpen(false)}
          onSave={handleCreateRank}
        />
      )}

      {editingRank && (
        <RankModal
          existing={editingRank}
          onClose={() => setEditingRank(null)}
          onSave={handleUpdateRank}
        />
      )}

      {(itemModalOpen || editingItem) && (
        <ItemModal
          ranklistId={ranklist.id}
          existing={editingItem ?? undefined}
          onClose={() => {
            setItemModalOpen(false);
            setEditingItem(null);
            setAddToLaneId(null);
          }}
          onSave={editingItem ? handleEditItem : handleCreateItem}
        />
      )}

      {deletingRank && (
        <ConfirmModal
          title="Delete Rank"
          message={`Delete rank "${deletingRank.name}"? All items in this rank will be moved to the Library.`}
          confirmText="Delete"
          danger
          onCancel={() => setDeletingRank(null)}
          onConfirm={handleDeleteRank}
        />
      )}

      {deletingItem && (
        <ConfirmModal
          title="Delete Item"
          message={`Delete "${deletingItem.name}"? This cannot be undone.`}
          confirmText="Delete"
          danger
          onCancel={() => setDeletingItem(null)}
          onConfirm={handleDeleteItem}
        />
      )}

      {deleteRanklistOpen && (
        <ConfirmModal
          title="Delete Ranklist"
          message={`Delete "${ranklist.name}"? All ranks and items will be permanently removed.`}
          confirmText="Delete"
          danger
          onCancel={() => setDeleteRanklistOpen(false)}
          onConfirm={handleDeleteRanklist}
        />
      )}
    </div>
  );
}

function computeNewOrder(sortedNeighbors: { order: number }[], insertAt: number): number {
  if (sortedNeighbors.length === 0) return 1000;
  if (insertAt === 0) return sortedNeighbors[0].order - 1000;
  if (insertAt >= sortedNeighbors.length) return sortedNeighbors[sortedNeighbors.length - 1].order + 1000;
  return (sortedNeighbors[insertAt - 1].order + sortedNeighbors[insertAt].order) / 2;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function RankDropIndicator() {
  return (
    <div
      style={{
        height: 3,
        borderRadius: 2,
        background: "#3b82f6",
        flexShrink: 0,
      }}
    />
  );
}
