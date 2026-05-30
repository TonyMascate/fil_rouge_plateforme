"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryPhoto } from "./useGalleryPhotos";

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;

export function usePhotoSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    longPressStart.current = null;
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const removeFromSelection = useCallback((ids: string[]) => {
    setSelected((cur) => {
      const next = new Set(cur);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  function handlePointerDown(event: React.PointerEvent, photoId: string) {
    if (event.pointerType !== "touch") return;
    clearLongPress();
    longPressStart.current = { x: event.clientX, y: event.clientY };
    longPressTimer.current = setTimeout(() => {
      setSelected((cur) => { const next = new Set(cur); next.add(photoId); return next; });
      suppressNextClick.current = true;
      if ("vibrate" in navigator) navigator.vibrate(15);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (event.pointerType !== "touch") return;
    if (longPressStart.current && longPressTimer.current) {
      const dx = event.clientX - longPressStart.current.x;
      const dy = event.clientY - longPressStart.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) clearLongPress();
    }
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (event.pointerType !== "touch") return;
    clearLongPress();
  }

  function handleCellClick(photo: GalleryPhoto, onOpen: (photo: GalleryPhoto) => void) {
    if (suppressNextClick.current) { suppressNextClick.current = false; return; }
    if (selectionMode) toggleSelect(photo.id);
    else onOpen(photo);
  }

  return {
    selected,
    selectionMode,
    toggleSelect,
    clearSelection,
    removeFromSelection,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleCellClick,
  };
}
