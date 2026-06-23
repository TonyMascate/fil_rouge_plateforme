// ─────────────────────────────────────────────────────────────────────────────
// Atlas chromatique — module PUR partagé entre l'API (classement à l'ingestion)
// et le web (rendu du nuancier). Aucune I/O, aucune dépendance Node : utilisable
// côté navigateur.
//
// Tout le travail se fait en OKLab / OKLCH (espaces perceptuellement uniformes)
// plutôt qu'en RGB, qui regroupe mal les couleurs vis-à-vis de la perception.
//
// L'atlas est une GRILLE FIXE de cellules :
//   - 12 teintes (tranches de 30° du cercle) × 4 niveaux de clarté = 48 cellules,
//   - + 5 cellules neutres (du noir au blanc).
// Fixe ⇒ déterministe, stable entre rechargements, cacheable. C'est le contrat
// qui distingue cette v2 du POC (k-means aléatoire recalculé à chaque requête).
// ─────────────────────────────────────────────────────────────────────────────

export interface Rgb { red: number; green: number; blue: number }
export interface Oklab { lightness: number; aAxis: number; bAxis: number }
export interface Oklch { lightness: number; chroma: number; hue: number }

// ─── Conversions sRGB ↔ OKLab ↔ OKLCH ───────────────────────────────────────

function srgbChannelToLinear(channel0to255: number): number {
  const normalized = channel0to255 / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function linearChannelToSrgb(linear: number): number {
  const clamped = Math.min(1, Math.max(0, linear));
  const srgb = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(srgb * 255);
}

export function rgbToOklab({ red, green, blue }: Rgb): Oklab {
  const linearRed = srgbChannelToLinear(red);
  const linearGreen = srgbChannelToLinear(green);
  const linearBlue = srgbChannelToLinear(blue);

  const longCone = 0.4122214708 * linearRed + 0.5363325363 * linearGreen + 0.0514459929 * linearBlue;
  const mediumCone = 0.2119034982 * linearRed + 0.6806995451 * linearGreen + 0.1073969566 * linearBlue;
  const shortCone = 0.0883024619 * linearRed + 0.2817188376 * linearGreen + 0.6299787005 * linearBlue;

  const longRoot = Math.cbrt(longCone);
  const mediumRoot = Math.cbrt(mediumCone);
  const shortRoot = Math.cbrt(shortCone);

  return {
    lightness: 0.2104542553 * longRoot + 0.793617785 * mediumRoot - 0.0040720468 * shortRoot,
    aAxis: 1.9779984951 * longRoot - 2.428592205 * mediumRoot + 0.4505937099 * shortRoot,
    bAxis: 0.0259040371 * longRoot + 0.7827717662 * mediumRoot - 0.808675766 * shortRoot,
  };
}

export function oklabToRgb({ lightness, aAxis, bAxis }: Oklab): Rgb {
  const longRoot = lightness + 0.3963377774 * aAxis + 0.2158037573 * bAxis;
  const mediumRoot = lightness - 0.1055613458 * aAxis - 0.0638541728 * bAxis;
  const shortRoot = lightness - 0.0894841775 * aAxis - 1.291485548 * bAxis;

  const longCone = longRoot ** 3;
  const mediumCone = mediumRoot ** 3;
  const shortCone = shortRoot ** 3;

  return {
    red: linearChannelToSrgb(4.0767416621 * longCone - 3.3077115913 * mediumCone + 0.2309699292 * shortCone),
    green: linearChannelToSrgb(-1.2684380046 * longCone + 2.6097574011 * mediumCone - 0.3413193965 * shortCone),
    blue: linearChannelToSrgb(-0.0041960863 * longCone - 0.7034186147 * mediumCone + 1.707614701 * shortCone),
  };
}

export function oklabToOklch({ lightness, aAxis, bAxis }: Oklab): Oklch {
  const chroma = Math.hypot(aAxis, bAxis);
  let hue = (Math.atan2(bAxis, aAxis) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  return { lightness, chroma, hue };
}

export function oklchToOklab({ lightness, chroma, hue }: Oklch): Oklab {
  const hueRadians = (hue * Math.PI) / 180;
  return { lightness, aAxis: chroma * Math.cos(hueRadians), bAxis: chroma * Math.sin(hueRadians) };
}

// ─── Conversions hex ────────────────────────────────────────────────────────

export function rgbToHex({ red, green, blue }: Rgb): string {
  const toByte = (value: number) => Math.round(value).toString(16).padStart(2, '0');
  return `#${toByte(red)}${toByte(green)}${toByte(blue)}`;
}

export function hexToRgb(hex: string): Rgb {
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  };
}

export function oklchToHex(color: Oklch): string {
  return rgbToHex(oklabToRgb(oklchToOklab(color)));
}

export function hexToOklch(hex: string): Oklch {
  return oklabToOklch(rgbToOklab(hexToRgb(hex)));
}

// ─── Définition de l'atlas ──────────────────────────────────────────────────

export const HUE_BAND_COUNT = 12;
const HUE_BAND_WIDTH = 360 / HUE_BAND_COUNT; // 30°

// En dessous de ce chroma, une couleur n'a pas de teinte exploitable → neutre.
export const NEUTRAL_MAX_CHROMA = 0.045;

// Noms approximatifs des 12 teintes (centres à 15°, 45°, … en OKLCH).
const HUE_NAMES = [
  'rouge', 'orange', 'ambre', 'jaune', 'vert', 'émeraude',
  'cyan', 'azur', 'bleu', 'indigo', 'magenta', 'rose',
];

interface LightnessBand { name: string; min: number; max: number; center: number; chroma: number }

// 4 niveaux de clarté pour les cellules chromatiques. `chroma` = chroma
// d'illustration de la pastille (les tons pâles sont volontairement moins saturés).
const CHROMATIC_LIGHTNESS_BANDS: LightnessBand[] = [
  { name: 'sombre', min: 0, max: 0.45, center: 0.36, chroma: 0.11 },
  { name: 'moyen', min: 0.45, max: 0.62, center: 0.54, chroma: 0.15 },
  { name: 'clair', min: 0.62, max: 0.78, center: 0.7, chroma: 0.13 },
  { name: 'pâle', min: 0.78, max: 1.01, center: 0.87, chroma: 0.07 },
];

// 5 niveaux de gris du noir au blanc.
const NEUTRAL_LIGHTNESS_BANDS: Array<{ name: string; min: number; max: number; center: number }> = [
  { name: 'noir', min: 0, max: 0.22, center: 0.12 },
  { name: 'gris foncé', min: 0.22, max: 0.45, center: 0.34 },
  { name: 'gris', min: 0.45, max: 0.65, center: 0.55 },
  { name: 'gris clair', min: 0.65, max: 0.85, center: 0.74 },
  { name: 'blanc', min: 0.85, max: 1.01, center: 0.93 },
];

export type AtlasCellKind = 'chromatic' | 'neutral';

export interface AtlasCell {
  cellId: string;
  kind: AtlasCellKind;
  /** Index de teinte 0–11 (chromatic uniquement, null pour les neutres). */
  hueIndex: number | null;
  /** Index de clarté (0–3 pour chromatic, 0–4 pour neutral). */
  lightIndex: number;
  /** Couleur d'illustration de la cellule. */
  hex: string;
  /** Libellé lisible, ex. « bleu clair » ou « gris ». */
  label: string;
}

function chromaticCellId(hueIndex: number, lightIndex: number): string {
  return `c-${hueIndex}-${lightIndex}`;
}

function neutralCellId(lightIndex: number): string {
  return `n-${lightIndex}`;
}

function findBandIndex<T extends { min: number; max: number }>(bands: T[], lightness: number): number {
  const index = bands.findIndex((band) => lightness >= band.min && lightness < band.max);
  // Garde-fou : une clarté de 1.0 pile tombe dans la dernière tranche.
  return index === -1 ? bands.length - 1 : index;
}

/**
 * Classe une couleur OKLCH dans une cellule de l'atlas (déterministe).
 */
export function classifyToCell(color: Oklch): string {
  if (color.chroma < NEUTRAL_MAX_CHROMA) {
    return neutralCellId(findBandIndex(NEUTRAL_LIGHTNESS_BANDS, color.lightness));
  }
  const hueIndex = Math.floor((((color.hue % 360) + 360) % 360) / HUE_BAND_WIDTH) % HUE_BAND_COUNT;
  const lightIndex = findBandIndex(CHROMATIC_LIGHTNESS_BANDS, color.lightness);
  return chromaticCellId(hueIndex, lightIndex);
}

export function classifyHexToCell(hex: string): string {
  return classifyToCell(hexToOklch(hex));
}

/**
 * Construit l'atlas complet ordonné (teinte-major puis neutres). Stable : la même
 * cellule occupe toujours la même position, ce qui rend la carte mémorisable.
 */
export function getAtlasCells(): AtlasCell[] {
  const cells: AtlasCell[] = [];

  for (let hueIndex = 0; hueIndex < HUE_BAND_COUNT; hueIndex++) {
    const hueCenter = hueIndex * HUE_BAND_WIDTH + HUE_BAND_WIDTH / 2;
    for (const [lightIndex, band] of CHROMATIC_LIGHTNESS_BANDS.entries()) {
      cells.push({
        cellId: chromaticCellId(hueIndex, lightIndex),
        kind: 'chromatic',
        hueIndex,
        lightIndex,
        hex: oklchToHex({ lightness: band.center, chroma: band.chroma, hue: hueCenter }),
        label: `${HUE_NAMES[hueIndex]} ${band.name}`,
      });
    }
  }

  for (const [lightIndex, band] of NEUTRAL_LIGHTNESS_BANDS.entries()) {
    cells.push({
      cellId: neutralCellId(lightIndex),
      kind: 'neutral',
      hueIndex: null,
      lightIndex,
      hex: oklchToHex({ lightness: band.center, chroma: 0, hue: 0 }),
      label: band.name,
    });
  }

  return cells;
}

const ATLAS_BY_ID: Map<string, AtlasCell> = new Map(getAtlasCells().map((cell) => [cell.cellId, cell]));

export function isValidCellId(cellId: string): boolean {
  return ATLAS_BY_ID.has(cellId);
}

export function getAtlasCell(cellId: string): AtlasCell | undefined {
  return ATLAS_BY_ID.get(cellId);
}
