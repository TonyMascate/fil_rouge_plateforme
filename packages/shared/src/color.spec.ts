import { describe, expect, it } from 'vitest';

import {
  type Oklch,
  HUE_BAND_COUNT,
  NEUTRAL_MAX_CHROMA,
  classifyHexToCell,
  classifyToCell,
  getAtlasCell,
  getAtlasCells,
  hexToOklch,
  hexToRgb,
  isValidCellId,
  oklabToOklch,
  oklabToRgb,
  oklchToHex,
  oklchToOklab,
  rgbToHex,
  rgbToOklab,
} from './color';

// Les conversions ne sont jamais exactes au bit près (arrondis flottants) : on
// compare avec une tolérance plutôt qu'à l'égalité stricte.
const CHANNEL_TOLERANCE = 1; // ±1 sur 255 après un aller-retour complet

describe('conversions sRGB ↔ OKLab', () => {
  it('mappe le blanc sur une clarté ≈ 1 et une chromaticité ≈ 0', () => {
    const oklab = rgbToOklab({ red: 255, green: 255, blue: 255 });
    expect(oklab.lightness).toBeCloseTo(1, 2);
    expect(oklab.aAxis).toBeCloseTo(0, 2);
    expect(oklab.bAxis).toBeCloseTo(0, 2);
  });

  it('mappe le noir sur une clarté ≈ 0', () => {
    const oklab = rgbToOklab({ red: 0, green: 0, blue: 0 });
    expect(oklab.lightness).toBeCloseTo(0, 5);
  });

  it('exerce les deux branches de la courbe de gamma (canaux sombres et clairs)', () => {
    // red=5 passe par la branche linéaire (≤ 0.04045), green=200 par la puissance.
    const oklab = rgbToOklab({ red: 5, green: 200, blue: 100 });
    const back = oklabToRgb(oklab);
    expect(back.red).toBeGreaterThanOrEqual(0);
    expect(back.green).toBeCloseTo(200, -1);
  });

  it('fait un aller-retour RGB → OKLab → RGB fidèle', () => {
    for (const rgb of [
      { red: 255, green: 0, blue: 0 },
      { red: 0, green: 128, blue: 64 },
      { red: 12, green: 34, blue: 56 },
      { red: 240, green: 240, blue: 240 },
    ]) {
      const back = oklabToRgb(rgbToOklab(rgb));
      expect(Math.abs(back.red - rgb.red)).toBeLessThanOrEqual(CHANNEL_TOLERANCE);
      expect(Math.abs(back.green - rgb.green)).toBeLessThanOrEqual(CHANNEL_TOLERANCE);
      expect(Math.abs(back.blue - rgb.blue)).toBeLessThanOrEqual(CHANNEL_TOLERANCE);
    }
  });

  it('borne (clamp) les couleurs hors gamut au lieu de déborder', () => {
    // Chroma volontairement énorme → linéaire hors [0,1] → doit être borné à 0/255.
    const rgb = oklabToRgb(oklchToOklab({ lightness: 0.54, chroma: 0.5, hue: 0 }));
    for (const channel of [rgb.red, rgb.green, rgb.blue]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});

describe('conversions OKLab ↔ OKLCH', () => {
  it('gère un angle de teinte négatif en le ramenant dans [0, 360)', () => {
    // Le bleu a un bAxis négatif → atan2 renvoie un angle négatif → +360 appliqué.
    const oklch = hexToOklch('#0000ff');
    expect(oklch.hue).toBeGreaterThanOrEqual(0);
    expect(oklch.hue).toBeLessThan(360);
    expect(oklch.hue).toBeGreaterThan(180); // le bleu est côté ~264°
  });

  it('fait un aller-retour OKLab → OKLCH → OKLab fidèle', () => {
    const oklab = rgbToOklab({ red: 30, green: 144, blue: 255 });
    const back = oklchToOklab(oklabToOklch(oklab));
    expect(back.lightness).toBeCloseTo(oklab.lightness, 6);
    expect(back.aAxis).toBeCloseTo(oklab.aAxis, 6);
    expect(back.bAxis).toBeCloseTo(oklab.bAxis, 6);
  });
});

describe('conversions hexadécimales', () => {
  it('convertit RGB → hex avec un padding sur deux chiffres', () => {
    expect(rgbToHex({ red: 255, green: 0, blue: 0 })).toBe('#ff0000');
    expect(rgbToHex({ red: 0, green: 8, blue: 16 })).toBe('#000810');
  });

  it('convertit hex → RGB', () => {
    expect(hexToRgb('#ff0000')).toEqual({ red: 255, green: 0, blue: 0 });
    expect(hexToRgb('#000810')).toEqual({ red: 0, green: 8, blue: 16 });
  });

  it('fait un aller-retour hex → OKLCH → hex proche de l’original', () => {
    for (const hex of ['#ff0000', '#00ff00', '#1e90ff', '#7f7f7f']) {
      const roundTrip = oklchToHex(hexToOklch(hex));
      const original = hexToRgb(hex);
      const back = hexToRgb(roundTrip);
      expect(Math.abs(back.red - original.red)).toBeLessThanOrEqual(CHANNEL_TOLERANCE);
      expect(Math.abs(back.green - original.green)).toBeLessThanOrEqual(CHANNEL_TOLERANCE);
      expect(Math.abs(back.blue - original.blue)).toBeLessThanOrEqual(CHANNEL_TOLERANCE);
    }
  });
});

describe('classification dans une cellule de l’atlas', () => {
  it('classe une couleur peu saturée comme neutre', () => {
    const gray: Oklch = { lightness: 0.55, chroma: NEUTRAL_MAX_CHROMA / 2, hue: 123 };
    expect(classifyToCell(gray)).toMatch(/^n-\d$/);
  });

  it('classe une couleur saturée comme chromatique', () => {
    const cellId = classifyHexToCell('#ff0000');
    expect(cellId).toMatch(/^c-\d+-\d$/);
    // Le rouge pur tombe dans la première bande de teinte (0 = « rouge »).
    expect(cellId.startsWith('c-0-')).toBe(true);
  });

  it('normalise les teintes hors bornes (négatives et > 360)', () => {
    const negative: Oklch = { lightness: 0.5, chroma: 0.15, hue: -30 };
    const wrapped: Oklch = { lightness: 0.5, chroma: 0.15, hue: 330 };
    expect(classifyToCell(negative)).toBe(classifyToCell(wrapped));
  });

  it('rabat une clarté hors barème sur la dernière bande (garde-fou)', () => {
    // lightness = 2 ne tombe dans aucune bande → findBandIndex renvoie la dernière.
    expect(classifyToCell({ lightness: 2, chroma: 0.2, hue: 100 })).toMatch(/^c-\d+-3$/);
    expect(classifyToCell({ lightness: 2, chroma: 0, hue: 0 })).toBe('n-4');
  });

  it('est déterministe (même entrée → même cellule)', () => {
    const color: Oklch = { lightness: 0.6, chroma: 0.18, hue: 210 };
    expect(classifyToCell(color)).toBe(classifyToCell(color));
  });
});

describe('atlas', () => {
  const cells = getAtlasCells();

  it('contient 48 cellules chromatiques + 5 neutres = 53', () => {
    expect(cells).toHaveLength(HUE_BAND_COUNT * 4 + 5);
    expect(cells.filter((cell) => cell.kind === 'chromatic')).toHaveLength(48);
    expect(cells.filter((cell) => cell.kind === 'neutral')).toHaveLength(5);
  });

  it('produit des identifiants uniques et des hex valides', () => {
    const ids = new Set(cells.map((cell) => cell.cellId));
    expect(ids.size).toBe(cells.length);
    for (const cell of cells) {
      expect(cell.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(cell.label.length).toBeGreaterThan(0);
    }
  });

  it('renseigne hueIndex pour les chromatiques et null pour les neutres', () => {
    for (const cell of cells) {
      if (cell.kind === 'chromatic') {
        expect(cell.hueIndex).toBeGreaterThanOrEqual(0);
        expect(cell.hueIndex).toBeLessThan(HUE_BAND_COUNT);
      } else {
        expect(cell.hueIndex).toBeNull();
      }
    }
  });

  it('valide les identifiants existants et rejette les inconnus', () => {
    expect(isValidCellId('c-0-0')).toBe(true);
    expect(isValidCellId('n-0')).toBe(true);
    expect(isValidCellId('c-99-9')).toBe(false);
    expect(isValidCellId('n’importe quoi')).toBe(false);
  });

  it('retourne la cellule demandée ou undefined', () => {
    const cell = getAtlasCell('n-0');
    expect(cell?.kind).toBe('neutral');
    expect(cell?.label).toBe('noir');
    expect(getAtlasCell('inexistant')).toBeUndefined();
  });

  it('classe l’hex d’illustration de chaque cellule chromatique dans sa propre bande de teinte', () => {
    for (const cell of cells) {
      if (cell.kind === 'chromatic') {
        expect(classifyHexToCell(cell.hex).startsWith(`c-${cell.hueIndex}-`)).toBe(true);
      }
    }
  });
});
