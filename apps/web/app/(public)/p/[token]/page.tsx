import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PublicPhoto {
  url: string;
  originalName: string;
  createdAt: string;
}

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

export default async function SharedPhotoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/share/${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!response.ok) notFound();

  const photo: PublicPhoto = await response.json();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-10">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-center bg-muted/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.originalName}
            className="max-h-[70vh] w-auto rounded-lg object-contain"
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{photo.originalName}</p>
            <p className="text-xs text-muted-foreground">{formatDate(photo.createdAt)}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">Partagé via PhotoApp</span>
        </div>
      </div>
    </main>
  );
}
