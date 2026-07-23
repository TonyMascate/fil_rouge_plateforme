import { classifyHexToCell, getAtlasCell, isValidCellId } from '@repo/shared';
import { extractPalette, cellsFromPalette } from './color';

describe('color (API)', () => {
  describe("classification en cellules d'atlas (via @repo/shared)", () => {
    it('range les neutres dans des cellules « n-* »', () => {
      expect(classifyHexToCell('#000000')).toMatch(/^n-/);
      expect(classifyHexToCell('#808080')).toMatch(/^n-/);
      expect(classifyHexToCell('#ffffff')).toMatch(/^n-/);
    });

    it('place noir et blanc dans des cellules neutres différentes', () => {
      expect(classifyHexToCell('#000000')).not.toBe(classifyHexToCell('#ffffff'));
    });

    it('range les couleurs vives dans des cellules chromatiques « c-* »', () => {
      for (const hex of ['#ff0000', '#1a5fd0', '#1faf3d', '#e8c531']) {
        expect(classifyHexToCell(hex)).toMatch(/^c-/);
      }
    });

    it('met deux teintes opposées dans des cellules différentes', () => {
      expect(classifyHexToCell('#ff0000')).not.toBe(classifyHexToCell('#1a5fd0'));
    });

    it("produit toujours un cellId connu de l'atlas", () => {
      for (const hex of ['#000000', '#ffffff', '#ff0000', '#1a5fd0', '#6b4423', '#f3c0d0']) {
        expect(isValidCellId(classifyHexToCell(hex))).toBe(true);
        expect(getAtlasCell(classifyHexToCell(hex))).toBeDefined();
      }
    });

    it('est déterministe', () => {
      expect(classifyHexToCell('#3fa65a')).toBe(classifyHexToCell('#3fa65a'));
    });
  });

  describe('extractPalette', () => {
    function buildBuffer(pixels: Array<[number, number, number]>): Buffer {
      return Buffer.from(pixels.flat());
    }

    it('renvoie un tableau vide pour un buffer vide', () => {
      expect(extractPalette(Buffer.alloc(0))).toEqual([]);
    });

    it('renvoie une seule couleur pour une image unie', () => {
      const buffer = buildBuffer(Array.from({ length: 100 }, () => [255, 0, 0] as [number, number, number]));
      const palette = extractPalette(buffer);
      expect(palette).toHaveLength(1);
      expect(palette[0].cellId).toMatch(/^c-/);
      expect(palette[0].weight).toBeCloseTo(1, 5);
    });

    it('sépare deux couleurs dominantes et les trie par poids', () => {
      const bluePixels = Array.from({ length: 70 }, () => [26, 95, 224] as [number, number, number]);
      const greenPixels = Array.from({ length: 30 }, () => [31, 175, 61] as [number, number, number]);
      const palette = extractPalette(buildBuffer([...bluePixels, ...greenPixels]));

      expect(palette.length).toBeGreaterThanOrEqual(2);
      // La couleur majoritaire (70 %) doit arriver en tête.
      expect(palette[0].weight).toBeGreaterThan(palette[1].weight);
      // Les deux couleurs tombent dans des cellules distinctes.
      expect(new Set(palette.map((entry) => entry.cellId)).size).toBeGreaterThanOrEqual(2);
    });

    it('est déterministe : même entrée ⇒ même sortie', () => {
      const pixels: Array<[number, number, number]> = [
        ...Array.from({ length: 40 }, () => [200, 30, 30] as [number, number, number]),
        ...Array.from({ length: 35 }, () => [30, 60, 200] as [number, number, number]),
        ...Array.from({ length: 25 }, () => [240, 240, 240] as [number, number, number]),
      ];
      expect(extractPalette(buildBuffer(pixels))).toEqual(extractPalette(buildBuffer(pixels)));
    });

    it('ignore les couleurs sous le seuil de poids minimal', () => {
      const pixels: Array<[number, number, number]> = [
        ...Array.from({ length: 98 }, () => [255, 0, 0] as [number, number, number]),
        ...Array.from({ length: 2 }, () => [0, 0, 255] as [number, number, number]),
      ];
      const palette = extractPalette(buildBuffer(pixels));
      expect(palette.every((entry) => entry.weight >= 0.06)).toBe(true);
    });
  });

  describe('cellsFromPalette', () => {
    it('dédublonne les cellules', () => {
      const cells = cellsFromPalette([
        { hex: '#111', cellId: 'c-8-1', weight: 0.5 },
        { hex: '#222', cellId: 'c-8-1', weight: 0.3 },
        { hex: '#333', cellId: 'n-0', weight: 0.2 },
      ]);
      expect(cells.sort()).toEqual(['c-8-1', 'n-0']);
    });

    it('renvoie un tableau vide pour une palette vide', () => {
      expect(cellsFromPalette([])).toEqual([]);
    });
  });
});
