"use client";

import React, { useState } from "react";
import { Modal, Button } from "@applicator/sdk/components";
import { Rank } from "../types/Rank";

interface Props {
  existing?: Rank;
  onClose: () => void;
  onSave: (data: { name: string; bgColor: string; fgColor: string; helpText: string }) => Promise<void>;
}

const PRESET_BG_COLORS = [
  "#7f1d1d", "#78350f", "#14532d", "#1e3a5f", "#3b0764", "#4a044e",
  "#1e293b", "#0f172a", "#134e4a", "#713f12",
];

export default function RankModal({ existing, onClose, onSave }: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [bgColor, setBgColor] = useState(existing?.bgColor ?? "#1e3a5f");
  const [fgColor, setFgColor] = useState(existing?.fgColor ?? "#ffffff");
  const [helpText, setHelpText] = useState(existing?.helpText ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), bgColor, fgColor, helpText: helpText.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      header={
        <div style={{ padding: "14px 16px", fontWeight: 600, fontSize: 15, color: "#f1f5f9" }}>
          {existing ? "Edit Rank" : "New Rank"}
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
          <label style={labelStyle}>Name *</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="S"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Lane Background Color</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {PRESET_BG_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setBgColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: c,
                  border: bgColor === c ? "2px solid #f1f5f9" : "2px solid transparent",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              />
            ))}
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              style={{ width: 32, height: 28, borderRadius: 4, border: "1px solid #334155", cursor: "pointer", padding: 0, background: "none" }}
            />
            <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{bgColor}</span>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Lane Text Color</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {["#ffffff", "#f1f5f9", "#0f172a", "#1e293b", "#fbbf24", "#f87171"].map((c) => (
              <button
                key={c}
                onClick={() => setFgColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: c,
                  border: fgColor === c ? "2px solid #3b82f6" : "2px solid #334155",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              />
            ))}
            <input
              type="color"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              style={{ width: 32, height: 28, borderRadius: 4, border: "1px solid #334155", cursor: "pointer", padding: 0, background: "none" }}
            />
            <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{fgColor}</span>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Preview</label>
          <div
            style={{
              background: bgColor,
              color: fgColor,
              borderRadius: 6,
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: 16,
              display: "inline-block",
              minWidth: 60,
              textAlign: "center",
            }}
          >
            {name || "Rank"}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Help Text (tooltip)</label>
          <textarea
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            placeholder="Describe what this rank means…"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </div>
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#94a3b8",
  fontSize: 12,
  marginBottom: 6,
};

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
