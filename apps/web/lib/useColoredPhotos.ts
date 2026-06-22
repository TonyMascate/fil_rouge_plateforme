"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ColorAtlasCellDto, ColorCellPhotosResponseDto } from "@repo/shared";
import api from "./axios";

const CELL_PAGE_SIZE = 30;

/**
 * Atlas couleur de l'utilisateur : grille fixe de cellules + nombre de photos.
 * `albumId` (optionnel) restreint l'atlas aux photos d'un album.
 */
export function useColorAtlas(albumId: string | null) {
  return useQuery({
    queryKey: ["colors", "atlas", albumId],
    queryFn: async () => {
      const response = await api.get<ColorAtlasCellDto[]>("/photos/colors", {
        params: albumId ? { albumId } : undefined,
      });
      return response.data;
    },
  });
}

/**
 * Photos d'une cellule d'atlas, en scroll infini. Désactivé tant qu'aucune cellule.
 * `albumId` (optionnel) restreint aux photos d'un album.
 */
export function useColorCellPhotos(cellId: string | null, albumId: string | null) {
  return useInfiniteQuery({
    queryKey: ["colors", "cell", cellId, albumId],
    enabled: cellId !== null,
    queryFn: async ({ pageParam }) => {
      const response = await api.get<ColorCellPhotosResponseDto>(`/photos/colors/${cellId}`, {
        params: { page: pageParam, limit: CELL_PAGE_SIZE, ...(albumId ? { albumId } : {}) },
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}
