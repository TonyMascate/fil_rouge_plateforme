"use client";

import { useState } from "react";
import UppyCore, { type Uppy } from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { UppyContextProvider, Dropzone, FilesList } from "@uppy/react";
import type {
  CompleteMultipartDto,
  CreateMultipartResponseDto,
  SignPartResponseDto,
  UploadRegisteredResponseDto,
} from "@repo/shared";

import api from "@/lib/axios";

interface Props {
  onUploadComplete?: (photoId: string) => void;
}

export function PhotoUploader({ onUploadComplete }: Props) {
  const [uppy] = useState<Uppy>(() =>
    new UppyCore({
      restrictions: {
        maxNumberOfFiles: 10,
        allowedFileTypes: ["image/*"],
        maxFileSize: 50 * 1024 * 1024,
      },
      autoProceed: true,
    }).use(AwsS3, {
      limit: 4,
      shouldUseMultipart: true,

      async createMultipartUpload(file) {
        const { data } = await api.post<CreateMultipartResponseDto>(
          "/photos/uploads/multipart",
          {
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            fileSize: file.size,
          },
        );
        return data;
      },

      async signPart(_file, { uploadId, key, partNumber }) {
        const { data } = await api.post<SignPartResponseDto>(
          "/photos/uploads/multipart/sign-part",
          { uploadId, key, partNumber },
        );
        return { url: data.url };
      },

      async listParts(_file, { uploadId, key }) {
        const { data } = await api.post<
          Array<{ PartNumber: number; ETag: string; Size: number }>
        >("/photos/uploads/multipart/list-parts", { uploadId, key });
        return data;
      },

      async completeMultipartUpload(file, { uploadId, key, parts }) {
        const body: CompleteMultipartDto = {
          uploadId,
          key,
          parts: parts.map((p) => ({
            PartNumber: p.PartNumber!,
            ETag: p.ETag!,
          })),
          originalName: file?.name ?? "unknown",
        };
        const { data } = await api.post<UploadRegisteredResponseDto>(
          "/photos/uploads/multipart/complete",
          body,
        );
        onUploadComplete?.(data.photoId);
        return {};
      },

      async abortMultipartUpload(_file, { uploadId, key }) {
        await api.post("/photos/uploads/multipart/abort", { uploadId, key });
      },
    }),
  );

  return (
    <UppyContextProvider uppy={uppy}>
      <div className="space-y-4">
        <Dropzone />
        <FilesList />
      </div>
    </UppyContextProvider>
  );
}
