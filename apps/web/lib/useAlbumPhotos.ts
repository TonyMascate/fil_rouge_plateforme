"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import api from "./axios";
import type { PhotoListPage, SortOrder } from "./useGalleryPhotos";

const PAGE_SIZE = 30;

export function useAlbumPhotos(albumId: string, order: SortOrder) {
  return useInfiniteQuery({
    queryKey: ["album-photos", albumId, { order }],
    queryFn: async ({ pageParam }) => {
      const response = await api.get<PhotoListPage>(`/albums/${albumId}/photos`, {
        params: { page: pageParam, limit: PAGE_SIZE, order },
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: !!albumId,
  });
}
