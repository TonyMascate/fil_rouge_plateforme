"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import api from "./axios";

export type SortOrder = "desc" | "asc";

export interface GalleryPhoto {
  id: string;
  url: string;
  originalName: string;
  createdAt: string;
  shareToken: string | null;
}

export interface PhotoListPage {
  items: GalleryPhoto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 30;

export function useGalleryPhotos(order: SortOrder) {
  return useInfiniteQuery({
    queryKey: ["photos", "list", { order }],
    queryFn: async ({ pageParam }) => {
      const response = await api.get<PhotoListPage>("/photos", {
        params: { page: pageParam, limit: PAGE_SIZE, order },
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}
