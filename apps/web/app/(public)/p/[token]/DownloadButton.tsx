"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadButton({ url, filename }: Readonly<{ url: string; filename: string }>) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback (ex : CORS) : ouvrir l'image, l'utilisateur peut l'enregistrer.
      window.open(url, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button onClick={handleDownload} disabled={downloading} className="w-full shrink-0 gap-2 rounded-full sm:w-auto">
      <Download className="size-4" />
      {downloading ? "Téléchargement…" : "Télécharger"}
    </Button>
  );
}
