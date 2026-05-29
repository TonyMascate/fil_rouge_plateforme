import type { GalleryPhoto } from "@/lib/useGalleryPhotos";

export const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export interface MonthGroup {
  key: string; // "YYYY-MM"
  label: string; // "Avril 2025"
  year: string;
  monthLabel: string; // "Avril"
  photos: GalleryPhoto[];
}

export interface YearGroup {
  year: string;
  count: number;
  months: { key: string; label: string }[];
}

// Les photos arrivent déjà triées par l'API (createdAt asc/desc) : on garde l'ordre,
// on découpe simplement en groupes mensuels successifs.
export function groupByMonth(photos: GalleryPhoto[]): MonthGroup[] {
  const groups: MonthGroup[] = [];

  for (const photo of photos) {
    const date = new Date(photo.createdAt);
    const year = String(date.getFullYear());
    const monthIndex = date.getMonth();
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const monthLabel = MONTHS_FR[monthIndex];

    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = { key, label: `${monthLabel} ${year}`, year, monthLabel, photos: [] };
      groups.push(group);
    }
    group.photos.push(photo);
  }

  return groups;
}

// Agrège les groupes mensuels par année pour l'accordéon de la sidebar.
export function groupByYear(monthGroups: MonthGroup[]): YearGroup[] {
  const years: YearGroup[] = [];

  for (const monthGroup of monthGroups) {
    let year = years.find((candidate) => candidate.year === monthGroup.year);
    if (!year) {
      year = { year: monthGroup.year, count: 0, months: [] };
      years.push(year);
    }
    year.count += monthGroup.photos.length;
    year.months.push({ key: monthGroup.key, label: monthGroup.monthLabel });
  }

  return years;
}
