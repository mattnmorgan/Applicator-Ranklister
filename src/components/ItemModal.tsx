"use client";

import React, { useState, useRef } from "react";
import { Modal, Button, Icon } from "@applicator/sdk/components";
import { img } from "@applicator/sdk/utilities";
import { Item } from "../types/Item";

interface Props {
  ranklistId: string;
  existing?: Item;
  onClose: () => void;
  onSave: (name: string, file: Blob | null) => Promise<void>;
}

export default function ItemModal({ ranklistId, existing, onClose, onSave }: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [file, setFile] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(
    existing?.hasImage
      ? `/api/ranklister/images/${ranklistId}/${existing.id}`
      : null
  );
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    setFileName(f.name);
    // Show preview immediately from original
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
    // Resize client-side to 96×96 JPEG
    img.resizeImage(f, 96, 96).then(setFile).catch(() => setFile(f));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (!existing && !file) return;
    setSaving(true);
    try {
      await onSave(name.trim(), file);
    } finally {
      setSaving(false);
    }
  };

  const canSave = name.trim() && (existing ? true : !!file);

  return (
    <Modal
      header={
        <div style={{ padding: "14px 16px", fontWeight: 600, fontSize: 15, color: "#f1f5f9" }}>
          {existing ? "Edit Item" : "New Item"}
        </div>
      }
      footer={
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSave || saving}>
            {existing ? "Save" : "Add Item"}
          </Button>
        </div>
      }
      closeable
      onClose={onClose}
      maxWidth={420}
    >
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Item name"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>{existing ? "Replace Image" : "Image *"}</label>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            style={{
              border: `2px dashed ${dragOver ? "#3b82f6" : "#334155"}`,
              borderRadius: 8,
              padding: 16,
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "rgba(59,130,246,0.05)" : "#0f172a",
              transition: "border-color 0.15s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="preview"
                style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 6 }}
              />
            ) : (
              <>
                <span style={{ color: "#94a3b8" }}>
                  <Icon name="image" size={32} />
                </span>
                <span style={{ color: "#64748b", fontSize: 12 }}>
                  Click or drag an image here
                </span>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {fileName && (
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
              {fileName}
            </div>
          )}
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
