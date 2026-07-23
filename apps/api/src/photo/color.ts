import { type Oklab, classifyToCell, oklabToOklch, oklabToRgb, rgbToHex, rgbToOklab } from '@repo/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Extraction de palette — fonctions PURES côté API (dépendent de Buffer, donc
// non partageables avec le navigateur). Toute la science des couleurs (OKLCH,
// atlas, classement) vit dans `@repo/shared/color` ; ici on se contente de lire
// les pixels et de faire tourner un k-means déterministe.
// ─────────────────────────────────────────────────────────────────────────────

export interface PaletteEntry {
  hex: string;
  /** Cellule de l'atlas dans laquelle tombe cette couleur. */
  cellId: string;
  /** Part de l'image occupée par cette couleur, entre 0 et 1. */
  weight: number;
}

const PALETTE_SIZE = 5;
const MIN_ENTRY_WEIGHT = 0.06; // on ignore les couleurs anecdotiques (< 6 %)
const KMEANS_MAX_ITERATIONS = 20;

function squaredOklabDistance(first: Oklab, second: Oklab): number {
  return (
    (first.lightness - second.lightness) ** 2 + (first.aAxis - second.aAxis) ** 2 + (first.bAxis - second.bAxis) ** 2
  );
}

function readPixelsFromRawBuffer(rawRgbBuffer: Buffer): Oklab[] {
  const pixels: Oklab[] = [];
  for (let byteIndex = 0; byteIndex + 2 < rawRgbBuffer.length; byteIndex += 3) {
    pixels.push(
      rgbToOklab({
        red: rawRgbBuffer[byteIndex],
        green: rawRgbBuffer[byteIndex + 1],
        blue: rawRgbBuffer[byteIndex + 2],
      }),
    );
  }
  return pixels;
}

// Initialisation type k-means++ mais DÉTERMINISTE : 1er centroïde = le pixel le
// plus « central », puis on choisit à chaque fois le pixel le plus éloigné des
// centroïdes déjà retenus (farthest-first). Aucune part d'aléatoire ⇒ même buffer
// d'entrée produit toujours la même palette (indispensable pour le cache).
function pickInitialCentroids(pixels: Oklab[], clusterCount: number): Oklab[] {
  const meanPixel: Oklab = {
    lightness: pixels.reduce((sum, pixel) => sum + pixel.lightness, 0) / pixels.length,
    aAxis: pixels.reduce((sum, pixel) => sum + pixel.aAxis, 0) / pixels.length,
    bAxis: pixels.reduce((sum, pixel) => sum + pixel.bAxis, 0) / pixels.length,
  };

  const firstIndex = pixels.reduce(
    (closest, pixel, index) =>
      squaredOklabDistance(pixel, meanPixel) < squaredOklabDistance(pixels[closest], meanPixel) ? index : closest,
    0,
  );

  const centroids: Oklab[] = [pixels[firstIndex]];
  while (centroids.length < clusterCount) {
    let farthestIndex = 0;
    let farthestDistance = -1;
    for (let index = 0; index < pixels.length; index++) {
      const distanceToNearest = Math.min(...centroids.map((centroid) => squaredOklabDistance(pixels[index], centroid)));
      if (distanceToNearest > farthestDistance) {
        farthestDistance = distanceToNearest;
        farthestIndex = index;
      }
    }
    centroids.push(pixels[farthestIndex]);
  }
  return centroids;
}

function nearestCentroidIndex(pixel: Oklab, centroids: Oklab[]): number {
  return centroids.reduce(
    (nearest, centroid, index) =>
      squaredOklabDistance(pixel, centroid) < squaredOklabDistance(pixel, centroids[nearest]) ? index : nearest,
    0,
  );
}

/**
 * Extrait une palette pondérée (jusqu'à 5 couleurs) d'un buffer RGB brut.
 * Chaque couleur est rattachée à sa cellule d'atlas. Triée par poids décroissant ;
 * tableau vide si aucun pixel.
 */
export function extractPalette(rawRgbBuffer: Buffer): PaletteEntry[] {
  const pixels = readPixelsFromRawBuffer(rawRgbBuffer);
  if (pixels.length === 0) return [];

  const clusterCount = Math.min(PALETTE_SIZE, pixels.length);
  let centroids = pickInitialCentroids(pixels, clusterCount);
  let assignments = pixels.map((pixel) => nearestCentroidIndex(pixel, centroids));

  for (let iteration = 0; iteration < KMEANS_MAX_ITERATIONS; iteration++) {
    const sums = Array.from({ length: clusterCount }, () => ({ lightness: 0, aAxis: 0, bAxis: 0, count: 0 }));
    for (let pixelIndex = 0; pixelIndex < pixels.length; pixelIndex++) {
      const bucket = sums[assignments[pixelIndex]];
      bucket.lightness += pixels[pixelIndex].lightness;
      bucket.aAxis += pixels[pixelIndex].aAxis;
      bucket.bAxis += pixels[pixelIndex].bAxis;
      bucket.count += 1;
    }
    centroids = centroids.map((centroid, index) =>
      sums[index].count === 0
        ? centroid
        : {
            lightness: sums[index].lightness / sums[index].count,
            aAxis: sums[index].aAxis / sums[index].count,
            bAxis: sums[index].bAxis / sums[index].count,
          },
    );

    const newAssignments = pixels.map((pixel) => nearestCentroidIndex(pixel, centroids));
    if (newAssignments.every((value, index) => value === assignments[index])) break;
    assignments = newAssignments;
  }

  const memberCounts = new Array<number>(clusterCount).fill(0);
  for (const assignment of assignments) memberCounts[assignment] += 1;

  return centroids
    .map((centroid) => ({ centroid, oklch: oklabToOklch(centroid) }))
    .map(({ centroid, oklch }, index) => ({
      hex: rgbToHex(oklabToRgb(centroid)),
      cellId: classifyToCell(oklch),
      weight: memberCounts[index] / pixels.length,
    }))
    .filter((entry) => entry.weight >= MIN_ENTRY_WEIGHT)
    .sort((first, second) => second.weight - first.weight);
}

/**
 * Liste dédupliquée des cellules d'atlas couvertes par une palette — alimente la
 * colonne indexée `color_cells` (une photo peut appartenir à plusieurs cellules).
 */
export function cellsFromPalette(palette: PaletteEntry[]): string[] {
  return Array.from(new Set(palette.map((entry) => entry.cellId)));
}
