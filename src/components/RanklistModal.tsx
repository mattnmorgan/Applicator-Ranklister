"use client";

import React, { useState } from "react";
import { Modal, Button } from "@applicator/sdk/components";
import { Ranklist } from "../types/Ranklist";

interface Props {
  existing?: Ranklist;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
}

export default function RanklistModal({ existing, onClose, onSave }: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), description.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      header={
        <div style={{ padding: "14px 16px", fontWeight: 600, fontSize: 15, color: "#f1f5f9" }}>
          {existing ? "Edit Ranklist" : "New Ranklist"}
        </div>
      }
      footer={
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!name.trim() || saving}>
            {existing ? "Save" : "Create"}
          </Button>
        </div>
      }
      closeable
      onClose={onClose}
      maxWidth={460}
    >
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
            Name *
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="My Ranklist"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description…"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
          />
        </div>
      </div>
    </Modal>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 6,
  color: "#f1f5f9",
  fontSize: 14,
  padding: "8px 10px",
  outline: "none",
  boxSizing: "border-box",
};
