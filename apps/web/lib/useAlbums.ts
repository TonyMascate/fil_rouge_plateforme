"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./axios";

export interface AlbumMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Album {
  id: string;
  name: string;
  photoCount: number;
  covers: string[];
  isOwner: boolean;
  ownerId: string;
  members: AlbumMember[];
  createdAt: string;
  updatedAt: string;
}

export function useAlbums() {
  return useQuery<Album[]>({
    queryKey: ["albums"],
    queryFn: async () => (await api.get<Album[]>("/albums")).data,
    staleTime: 30 * 1000,
  });
}

/** Endpoint dédié GET /albums/:id — ne dépend pas du chargement de la liste complète */
export function useAlbum(id: string) {
  return useQuery<Album>({
    queryKey: ["albums", id],
    queryFn: async () => (await api.get<Album>(`/albums/${id}`)).data,
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

/** IDs des photos déjà présentes dans l'album — utilisé pour filtrer PickPhotosModal */
export function useAlbumPhotoIds(albumId: string) {
  return useQuery<string[]>({
    queryKey: ["album-photo-ids", albumId],
    queryFn: async () => (await api.get<string[]>(`/albums/${albumId}/photo-ids`)).data,
    staleTime: 30 * 1000,
    enabled: !!albumId,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Album>("/albums", { name }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useRenameAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Album>(`/albums/${id}`, { name }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/albums/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useAddPhotosToAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, photoIds }: { albumId: string; photoIds: string[] }) =>
      api.post(`/albums/${albumId}/photos`, { photoIds }),
    onSuccess: (_data, { albumId }) => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["album-photos", albumId] });
      queryClient.invalidateQueries({ queryKey: ["album-photo-ids", albumId] });
    },
  });
}

export function useRemovePhotoFromAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, photoId }: { albumId: string; photoId: string }) =>
      api.delete(`/albums/${albumId}/photos/${photoId}`),
    onSuccess: (_data, { albumId }) => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["album-photos", albumId] });
      queryClient.invalidateQueries({ queryKey: ["album-photo-ids", albumId] });
    },
  });
}

export function useAddAlbumMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, email }: { albumId: string; email: string }) =>
      api.post<AlbumMember>(`/albums/${albumId}/members`, { email }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useRemoveAlbumMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, memberId }: { albumId: string; memberId: string }) =>
      api.delete(`/albums/${albumId}/members/${memberId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["albums"] }),
  });
}
