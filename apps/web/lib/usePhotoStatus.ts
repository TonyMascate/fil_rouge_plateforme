import { useQuery } from "@tanstack/react-query";
import { PhotoStatus, type PhotoStatusResponseDto } from "@repo/shared";

import api from "./axios";

export function usePhotoStatus(photoId: string | null) {
  return useQuery({
    queryKey: ["photo-status", photoId],
    enabled: !!photoId,
    queryFn: async () => {
      const { data } = await api.get<PhotoStatusResponseDto>(
        `/photos/${photoId}/status`,
      );
      return data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === PhotoStatus.COMPLETED || status === PhotoStatus.FAILED
        ? false
        : 2000;
    },
  });
}
