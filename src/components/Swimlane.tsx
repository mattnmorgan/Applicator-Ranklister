"use client";

import React, { useRef, useState, useCallback } from "react";
import { ButtonIcon, Tooltip, Icon } from "@applicator/sdk/components";
import { Rank } from "../types/Rank";
import { Item } from "../types/Item";

interface Props {
  laneId: string | null;
  rank: Rank | null;
  items: Item[];
  ranklistId: string;
  isLibrary: boolean;
  draggedItemId: string | null;
  onDragStart: (itemId: string) => void;
  onDrop: (targetLaneId: string | null, insertIndex: number) => void;
  onDragEnd: () => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (item: Item) => void;
  onAddItem: () => void;
  onEditRank?: () => void;
  onDeleteRank?: () => void;
  onRankDragStart?: () => void;
  onRankDragEnd?: () => void;
  isDraggingRank?: boolean;
  imageVersion: number;
}

const LABEL_WIDTH = 120;

export default function Swimlane({
  laneId,
  rank,
  items,
  ranklistId,
  isLibrary,
  draggedItemId,
  onDragStart,
  onDrop,
  onDragEnd,
  onEditItem,
  onDeleteItem,
  onAddItem,
  onEditRank,
  onDeleteRank,
  onRankDragStart,
  onRankDragEnd,
  isDraggingRank,
  imageVersion,
}: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const itemsRef = useRef<HTMLDivElement>(null);

  const bgColor = rank?.bgColor ?? "#1e293b";
  const fgColor = rank?.fgColor ?? "#94a3b8";
  const labelText = isLibrary ? "Library" : (rank?.name ?? "");
  const helpText = rank?.helpText;

  const computeDropIndex = useCallback(
    (clientX: number, clientY: number): number => {
      if (!itemsRef.current) return items.length;
      const children = Array.from(
        itemsRef.current.querySelectorAll("[data-item-card]")
      ) as HTMLElement[];
      if (children.length === 0) return 0;

      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const midY = rect.top + rect.height / 2;

        if (clientY < rect.top + rect.height) {
          if (clientY < midY || (clientY <= rect.bottom && clientX < midX)) {
            return i;
          }
        }
      }
      return items.length;
    },
    [items.length]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (isDraggingRank) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
      const idx = computeDropIndex(e.clientX, e.clientY);
      setDropIndex(idx);
    },
    [computeDropIndex, isDraggingRank]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDropIndex(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (isDraggingRank) return;
      e.preventDefault();
      setIsDragOver(false);
      const idx = computeDropIndex(e.clientX, e.clientY);
      setDropIndex(null);
      onDrop(laneId, idx);
    },
    [laneId, onDrop, computeDropIndex, isDraggingRank]
  );

  const handleItemClick = useCallback(
    (e: React.MouseEvent, itemId: string) => {
      e.stopPropagation();
      setSelectedItemId((prev) => (prev === itemId ? null : itemId));
    },
    []
  );

  const handleLaneClick = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  const handleLabelDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("rank-drag", "true");
      onRankDragStart?.();
    },
    [onRankDragStart]
  );

  const labelInner = (
    <div
      draggable={!isLibrary}
      onDragStart={handleLabelDragStart}
      onDragEnd={onRankDragEnd}
      style={{
        background: bgColor,
        color: fgColor,
        width: LABEL_WIDTH,
        minWidth: LABEL_WIDTH,
        flexShrink: 0,
        alignSelf: "stretch",
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 10px",
        cursor: isLibrary ? "default" : "grab",
        userSelect: "none",
      }}
    >
      {!isLibrary && (
        <span style={{ opacity: 0.45, flexShrink: 0 }}>
          <Icon name="drag" size={12} />
        </span>
      )}
      <span
        style={{
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.3,
          wordBreak: "break-word",
          overflowWrap: "break-word",
          flex: 1,
          textAlign: "center",
        }}
      >
        {labelText}
      </span>
    </div>
  );

  return (
    <div
      onClick={handleLaneClick}
      style={{
        display: "flex",
        border: `1px solid ${isDragOver ? "#3b82f6" : "#334155"}`,
        borderRadius: 8,
        overflow: "hidden",
        background: "#1e293b",
        minHeight: 72,
        transition: "border-color 0.1s",
        position: "relative",
      }}
    >
      {/* Rank label */}
      {helpText ? (
        <Tooltip text={helpText} placement="right">
          {labelInner}
        </Tooltip>
      ) : (
        labelInner
      )}

      {/* Items area */}
      <div
        ref={itemsRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          flex: 1,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "flex-start",
          gap: 0,
          padding: "6px 4px",
          minHeight: 60,
          position: "relative",
        }}
      >
        {items.map((item, idx) => {
          const isSelected = selectedItemId === item.id;
          const isDragging = draggedItemId === item.id;
          const showDropBefore = dropIndex === idx && isDragOver && draggedItemId !== item.id;

          return (
            <React.Fragment key={item.id}>
              {showDropBefore && <DropIndicator />}
              <div
                data-item-card
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  onDragStart(item.id);
                  setSelectedItemId(null);
                }}
                onDragEnd={onDragEnd}
                onClick={(e) => handleItemClick(e, item.id)}
                style={{
                  width: 96,
                  margin: 4,
                  borderRadius: 6,
                  border: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
                  background: "#0f172a",
                  cursor: "grab",
                  opacity: isDragging ? 0.4 : 1,
                  transition: "border-color 0.1s, opacity 0.1s",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {item.hasImage && (
                  <div style={{ overflow: "hidden", borderRadius: "4px 4px 0 0" }}>
                    <img
                      src={`/api/ranklister/images/${ranklistId}/${item.id}?v=${imageVersion}`}
                      alt={item.name}
                      style={{ width: "100%", height: 96, objectFit: "contain", display: "block", background: "#0f172a" }}
                      draggable={false}
                    />
                  </div>
                )}
                <div
                  style={{
                    padding: "4px 6px",
                    fontSize: 11,
                    color: "#f1f5f9",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    background: "#0f172a",
                  }}
                >
                  {item.name}
                </div>

                {isSelected && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginBottom: 4,
                      zIndex: 20,
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: 6,
                      padding: "4px 6px",
                      display: "flex",
                      gap: 4,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <ButtonIcon
                      name="edit"
                      label="Edit item"
                      size="sm"
                      onClick={() => { setSelectedItemId(null); onEditItem(item); }}
                    />
                    <ButtonIcon
                      name="trash"
                      label="Delete item"
                      size="sm"
                      subvariant="danger"
                      onClick={() => { setSelectedItemId(null); onDeleteItem(item); }}
                    />
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}

        {/* Drop indicator at end */}
        {isDragOver && dropIndex === items.length && <DropIndicator />}

        {/* Add item button */}
        <div
          onClick={(e) => { e.stopPropagation(); onAddItem(); }}
          style={{
            width: 96,
            height: 96 + 24,
            margin: 4,
            borderRadius: 6,
            border: "1px dashed #334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#475569",
            flexShrink: 0,
            transition: "border-color 0.1s, color 0.1s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#94a3b8";
            (e.currentTarget as HTMLDivElement).style.color = "#94a3b8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#334155";
            (e.currentTarget as HTMLDivElement).style.color = "#475569";
          }}
        >
          <Icon name="plus" size={20} />
        </div>
      </div>

      {/* Rank action buttons (top-right) */}
      {!isLibrary && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            display: "flex",
            gap: 2,
            opacity: 0.6,
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.opacity = "1")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLDivElement).style.opacity = "0.6")
          }
        >
          {onEditRank && (
            <ButtonIcon name="edit" label="Edit rank" size="sm" onClick={onEditRank} />
          )}
          {onDeleteRank && (
            <ButtonIcon
              name="trash"
              label="Delete rank"
              size="sm"
              subvariant="danger"
              onClick={onDeleteRank}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DropIndicator() {
  return (
    <div
      style={{
        width: 3,
        minHeight: 96 + 24 + 8,
        margin: "4px 0",
        borderRadius: 2,
        background: "#3b82f6",
        alignSelf: "stretch",
        flexShrink: 0,
      }}
    />
  );
}
