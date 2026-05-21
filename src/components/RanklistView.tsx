"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ButtonIcon, Button, Spinner, ConfirmModal } from "@applicator/sdk/components";
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

  // Drag state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);

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
      // Reload items since some moved to Library
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
        // Place in the selected lane
        if (addToLaneId !== null) {
          // Move to the target lane
          const laneItems = items.filter(
            (i) => i.rankId === addToLaneId
          );
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
        // Update name
        const patchRes = await fetch(`${baseUrl}/items/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!patchRes.ok) throw new Error();
        const patched: Item = await patchRes.json();

        // Replace image if a new file was provided
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

  // --- Drag and drop ---

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

      const draggedItem = items.find((i) => i.id === itemId);
      if (!draggedItem) return;

      // Build the ordered list of items in the target lane (excluding the dragged item)
      const targetLaneItems = items
        .filter((i) => i.rankId === targetLaneId && i.id !== itemId)
        .sort((a, b) => a.order - b.order);

      // Insert at the computed index
      const clamped = Math.max(0, Math.min(insertIndex, targetLaneItems.length));
      const newOrder = computeNewOrder(targetLaneItems, clamped);

      // Optimistic update
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
        // Revert optimistic update
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

  // --- Print ---

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

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
      className="ranklist-view"
      style={{
        padding: "20px 24px",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Print styles injected inline */}
      <style>{printStyles}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px 0",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            className="no-print"
          >
            ← Back
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "#f1f5f9",
              flex: 1,
              lineHeight: 1.3,
            }}
          >
            {ranklist.name}
          </h1>
          <div className="no-print" style={{ display: "flex", gap: 4 }}>
            <ButtonIcon
              name="edit"
              label="Edit ranklist"
              size="sm"
              onClick={() => setEditRanklistOpen(true)}
            />
            <ButtonIcon
              name="print"
              label="Print ranklist"
              size="sm"
              onClick={handlePrint}
            />
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
          <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 14 }}>
            {ranklist.description}
          </p>
        )}
      </div>

      {/* Swimlanes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {ranks.map((rank) => (
          <Swimlane
            key={rank.id}
            laneId={rank.id}
            rank={rank}
            items={rankItemsMap.get(rank.id) ?? []}
            ranklistId={ranklist.id}
            isLibrary={false}
            draggedItemId={draggedItemId}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onEditItem={(item) => { setEditingItem(item); }}
            onDeleteItem={(item) => setDeletingItem(item)}
            onAddItem={() => { setAddToLaneId(rank.id); setItemModalOpen(true); }}
            onEditRank={() => setEditingRank(rank)}
            onDeleteRank={() => setDeletingRank(rank)}
            imageVersion={imageVersion}
          />
        ))}

        {/* Library lane — always last */}
        <Swimlane
          laneId={null}
          rank={null}
          items={libraryItems}
          ranklistId={ranklist.id}
          isLibrary={true}
          draggedItemId={draggedItemId}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onEditItem={(item) => { setEditingItem(item); }}
          onDeleteItem={(item) => setDeletingItem(item)}
          onAddItem={() => { setAddToLaneId(null); setItemModalOpen(true); }}
          imageVersion={imageVersion}
        />
      </div>

      {/* Add Rank button */}
      <div className="no-print" style={{ marginTop: 16 }}>
        <Button variant="ghost" onClick={() => setNewRankOpen(true)}>
          + Add Rank
        </Button>
      </div>

      {/* Print glossary — only visible when printing */}
      <div className="print-only glossary">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>
          Rank Key
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ranks.map((rank) => (
            <div key={rank.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  background: rank.bgColor,
                  color: rank.fgColor,
                  padding: "4px 12px",
                  fontWeight: 700,
                  fontSize: 14,
                  borderRadius: 4,
                  flexShrink: 0,
                  minWidth: 60,
                  textAlign: "center",
                }}
              >
                {rank.name}
              </div>
              {rank.helpText && (
                <span style={{ fontSize: 13, color: "#334155", paddingTop: 4 }}>
                  {rank.helpText}
                </span>
              )}
            </div>
          ))}
        </div>
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

function computeNewOrder(sortedNeighbors: Item[], insertAt: number): number {
  if (sortedNeighbors.length === 0) return 1000;
  if (insertAt === 0) {
    return sortedNeighbors[0].order - 1000;
  }
  if (insertAt >= sortedNeighbors.length) {
    return sortedNeighbors[sortedNeighbors.length - 1].order + 1000;
  }
  const before = sortedNeighbors[insertAt - 1].order;
  const after = sortedNeighbors[insertAt].order;
  return (before + after) / 2;
}

const printStyles = `
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .ranklist-view {
    max-width: 100%;
    padding: 0;
    color: #0f172a;
  }
}
@media screen {
  .print-only { display: none; }
}
.glossary {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #334155;
}
`;
