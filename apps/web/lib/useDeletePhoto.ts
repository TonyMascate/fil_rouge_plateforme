"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./axios";

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/photos/${id}`),
    onSuccess: () => {
      // Une photo supprimée disparaît partout : galerie, listes d'albums, contenu de chaque album.
      // On ne connaît pas les albumIds concernés depuis le client → invalidation large par préfixe.
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["album-photos"] });
      queryClient.invalidateQueries({ queryKey: ["album-photo-ids"] });
    },
  });
}
