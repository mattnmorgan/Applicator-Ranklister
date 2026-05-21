"use client";

import React, { useState, useCallback } from "react";
import { ButtonIcon, Tooltip } from "@applicator/sdk/components";
import type { ToastItem } from "@applicator/sdk/components";
import { Ranklist } from "../types/Ranklist";
import RanklistModal from "./RanklistModal";

interface Props {
  ranklists: Ranklist[];
  loading: boolean;
  onSelect: (ranklist: Ranklist) => void;
  onCreated: (ranklist: Ranklist) => void;
  onDeleted: (id: string) => void;
  addToast: (toast: ToastItem) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function RanklistHome({
  ranklists,
  loading,
  onSelect,
  onCreated,
  onDeleted,
  addToast,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/ranklister/ranklists/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        onDeleted(id);
        addToast({ message: "Ranklist deleted", type: "success" });
      } catch {
        addToast({ message: "Failed to delete ranklist", type: "error" });
      }
    },
    [onDeleted, addToast]
  );

  return (
    <div style={{ padding: "24px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#f1f5f9", flex: 1 }}>
          Ranklists
        </h1>
        <Tooltip text="New Ranklist" placement="left">
          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 6,
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#f1f5f9",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            +
          </button>
        </Tooltip>
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", padding: "32px 0", textAlign: "center" }}>Loading…</div>
      ) : ranklists.length === 0 ? (
        <div style={{ color: "#94a3b8", padding: "32px 0", textAlign: "center" }}>
          No ranklists yet. Click + to create one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ranklists.map((rl) => (
            <div
              key={rl.id}
              onClick={() => onSelect(rl)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 14px",
                borderRadius: 8,
                background: "#1e293b",
                border: "1px solid #334155",
                cursor: "pointer",
                gap: 12,
                transition: "border-color 0.1s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor = "#475569")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor = "#334155")
              }
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 500,
                    color: "#f1f5f9",
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {rl.name}
                </div>
                {rl.description && (
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 12,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {rl.description}
                  </div>
                )}
              </div>
              <div style={{ color: "#64748b", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
                {formatDate(rl.updatedAt || rl.createdAt)}
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <ButtonIcon
                  name="trash"
                  label="Delete ranklist"
                  subvariant="danger"
                  size="sm"
                  onClick={() => handleDelete(rl.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <RanklistModal
          onClose={() => setModalOpen(false)}
          onSave={async (name, description) => {
            try {
              const res = await fetch("/api/ranklister/ranklists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
              });
              if (!res.ok) throw new Error();
              const created: Ranklist = await res.json();
              onCreated(created);
              setModalOpen(false);
              addToast({ message: "Ranklist created", type: "success" });
            } catch {
              addToast({ message: "Failed to create ranklist", type: "error" });
            }
          }}
        />
      )}
    </div>
  );
}
