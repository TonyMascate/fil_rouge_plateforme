'use client';
import { useState, useMemo } from 'react';
import { useColoredPhotos, ColorGroup, ColoredPhoto } from '../lib/useColoredPhotos';

interface SubShade {
  hex: string;
  photos: ColoredPhoto[];
}

function getSubShades(photos: ColoredPhoto[]): SubShade[] {
  const map = new Map<string, ColoredPhoto[]>();
  for (const p of photos) {
    const hex = p.dominantColor ?? '#808080';
    const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) / 32) * 32);
    const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) / 32) * 32);
    const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) / 32) * 32);
    const key = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([hex, photos]) => ({ hex, photos }));
}

export default function ChromaticExplorer() {
  const { groups, loading, error } = useColoredPhotos();
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedShade, setSelectedShade] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.family === selectedFamily) ?? null,
    [groups, selectedFamily],
  );

  const subShades = useMemo(
    () => (selectedGroup ? getSubShades(selectedGroup.photos) : []),
    [selectedGroup],
  );

  const shadePhotos = useMemo(
    () => subShades.find((s) => s.hex === selectedShade)?.photos ?? [],
    [subShades, selectedShade],
  );

  const handleFamilyClick = (family: string) => {
    setSelectedFamily(family);
    setSelectedShade(null);
  };

  const handleBack = () => {
    if (selectedShade) setSelectedShade(null);
    else setSelectedFamily(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-400">{error}</div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 gap-4">
        <p className="text-lg">Aucune photo disponible.</p>
        <p className="text-sm">Uploadez des photos pour commencer l&apos;exploration.</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white overflow-hidden">
      <div className="absolute top-6 left-6 flex items-center gap-6">
        {selectedFamily && (
          <button
            onClick={handleBack}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Retour
          </button>
        )}
        <h1 className="text-xl font-light tracking-widest uppercase text-gray-300">
          Exploration Chromatique
        </h1>
        {selectedFamily && (
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{ backgroundColor: selectedFamily + '33', color: selectedFamily }}
          >
            {selectedFamily}
          </span>
        )}
      </div>

      {!selectedFamily && <ColorFamilyCloud groups={groups} onSelect={handleFamilyClick} />}

      {selectedFamily && !selectedShade && selectedGroup && (
        <SubShadeCloud
          representativeColor={selectedGroup.representativeColor}
          subShades={subShades}
          onSelect={setSelectedShade}
        />
      )}

      {selectedShade && <PhotoGrid photos={shadePhotos} />}
    </div>
  );
}

function ColorFamilyCloud({
  groups,
  onSelect,
}: {
  groups: ColorGroup[];
  onSelect: (f: string) => void;
}) {
  const SIZE = 600;
  const CENTER = SIZE / 2;
  const RADIUS = 210;

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      {groups.map((group, i) => {
        const angle = (i / groups.length) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * RADIUS + CENTER;
        const y = Math.sin(angle) * RADIUS + CENTER;
        const size = Math.max(72, Math.min(120, 56 + group.count * 2));

        return (
          <button
            key={group.family}
            onClick={() => onSelect(group.family)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer"
            style={{
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: group.representativeColor,
              boxShadow: `0 0 28px ${group.representativeColor}55, 0 0 8px ${group.representativeColor}33`,
            }}
          >
            <span className="text-white/80 text-sm font-medium drop-shadow">{group.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function SubShadeCloud({
  representativeColor,
  subShades,
  onSelect,
}: {
  representativeColor: string;
  subShades: SubShade[];
  onSelect: (shade: string) => void;
}) {
  const SIZE = 600;
  const CENTER = SIZE / 2;
  const RADIUS = 200;

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      {/* Nœud central */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center"
        style={{
          left: CENTER,
          top: CENTER,
          width: 96,
          height: 96,
          backgroundColor: representativeColor,
          boxShadow: `0 0 48px ${representativeColor}77`,
        }}
      />

      {subShades.map((shade, i) => {
        const angle = (i / subShades.length) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * RADIUS + CENTER;
        const y = Math.sin(angle) * RADIUS + CENTER;
        const size = Math.max(56, Math.min(96, 44 + shade.photos.length * 4));

        return (
          <button
            key={shade.hex}
            onClick={() => onSelect(shade.hex)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer"
            style={{
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: shade.hex,
              boxShadow: `0 0 20px ${shade.hex}55`,
            }}
          >
            <span className="text-white/80 text-xs drop-shadow">{shade.photos.length}</span>
          </button>
        );
      })}
    </div>
  );
}

function PhotoGrid({ photos }: { photos: ColoredPhoto[] }) {
  return (
    <div className="w-full max-w-5xl px-8 pt-20 pb-8">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {photos.map((p) => (
          <div
            key={p.id}
            className="aspect-square rounded-lg overflow-hidden bg-gray-800 relative group"
          >
            {p.url ? (
              <img
                src={p.url}
                alt={p.originalName}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: p.dominantColor ?? '#808080' }} />
            )}
            {p.dominantColor && (
              <div
                className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: p.dominantColor }}
                title={p.dominantColor}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
