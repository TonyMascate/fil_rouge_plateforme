"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoStatus } from "@repo/shared";

import { PhotoUploader } from "@/components/PhotoUploader";
import { usePhotoStatus } from "@/lib/usePhotoStatus";

export default function UploadPage() {
  const [photoId, setPhotoId] = useState<string | null>(null);
  const { data: status } = usePhotoStatus(photoId);

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Upload une photo</h1>

      <PhotoUploader onUploadComplete={setPhotoId} />

      {status?.status === PhotoStatus.PENDING && <p>En attente...</p>}
      {status?.status === PhotoStatus.PROCESSING && <p>Optimisation en cours...</p>}
      {status?.status === PhotoStatus.COMPLETED && status.url && (
        <Image
          src={status.url}
          alt="Photo uploadée"
          width={800}
          height={600}
          className="rounded-lg"
        />
      )}
      {status?.status === PhotoStatus.FAILED && (
        <p className="text-red-500">L&apos;optimisation a échoué.</p>
      )}
    </div>
  );
}
