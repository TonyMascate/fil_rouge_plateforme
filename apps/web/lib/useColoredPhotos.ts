'use client';
import { useEffect, useState } from 'react';
import api from './axios';

export interface ColoredPhoto {
  id: string;
  url: string | null;
  originalName: string;
  dominantColor: string | null;
}

export interface ColorGroup {
  family: string;
  representativeColor: string;
  count: number;
  photos: ColoredPhoto[];
}

export function useColoredPhotos() {
  const [groups, setGroups] = useState<ColorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ColorGroup[]>('/photos/colors')
      .then((res) => setGroups(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { groups, loading, error };
}
