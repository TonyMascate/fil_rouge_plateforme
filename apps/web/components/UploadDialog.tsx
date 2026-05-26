"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import UppyCore from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ALLOWED_IMAGE_TYPES,
  type CompleteMultipartDto,
  type CreateMultipartResponseDto,
  type QuotaResponseDto,
  type SignPartResponseDto,
  type UploadRegisteredResponseDto,
} from "@repo/shared";

import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const FORMAT_LABEL = "JPG · PNG · HEIC · WebP";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function bytesToMb(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: quota } = useQuery<QuotaResponseDto>({
    queryKey: ["photos", "quota"],
    queryFn: async () => (await api.get("/photos/quota")).data,
    enabled: open,
  });

  const reset = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((selectedFile) => URL.revokeObjectURL(selectedFile.previewUrl));
      return [];
    });
    setIsUploading(false);
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const allowed = new Set<string>(ALLOWED_IMAGE_TYPES);
    const accepted: SelectedFile[] = [];
    const errors: string[] = [];

    Array.from(incoming).forEach((file) => {
      if (!allowed.has(file.type)) {
        errors.push(`${file.name} : format non supporté`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} : trop volumineux (max 50 MB)`);
        return;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
      });
    });

    if (errors.length) toast.error(errors.join("\n"));
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((selectedFile) => selectedFile.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((selectedFile) => selectedFile.id !== id);
    });
  };

  const onDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  };

  const selectedBytes = files.reduce(
    (sum, selectedFile) => sum + selectedFile.file.size,
    0,
  );
  const usedBytes = quota?.usedBytes ?? 0;
  const maxBytes = quota?.maxBytes ?? 500 * 1024 * 1024;
  const projectedBytes = usedBytes + selectedBytes;
  const exceedsQuota = projectedBytes > maxBytes;
  const projectedPct = Math.min(100, (projectedBytes / maxBytes) * 100);

  const handleUpload = async () => {
    if (!files.length || exceedsQuota) return;
    setIsUploading(true);

    const uppy = new UppyCore({
      autoProceed: false,
      restrictions: {
        allowedFileTypes: [...ALLOWED_IMAGE_TYPES],
        maxFileSize: MAX_FILE_SIZE,
      },
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
          parts: parts.map((part) => ({
            PartNumber: part.PartNumber!,
            ETag: part.ETag!,
          })),
          originalName: file?.name ?? "unknown",
        };
        await api.post<UploadRegisteredResponseDto>(
          "/photos/uploads/multipart/complete",
          body,
        );
        return {};
      },
      async abortMultipartUpload(_file, { uploadId, key }) {
        await api.post("/photos/uploads/multipart/abort", { uploadId, key });
      },
    });

    uppy.on("upload-progress", (file, progress) => {
      const localId = (file?.meta as { localId?: string } | undefined)?.localId;
      if (!localId || !progress.bytesTotal) return;
      const pct = Math.round(
        (progress.bytesUploaded / progress.bytesTotal) * 100,
      );
      setFiles((prev) =>
        prev.map((selectedFile) =>
          selectedFile.id === localId
            ? { ...selectedFile, progress: pct }
            : selectedFile,
        ),
      );
    });

    files.forEach((selectedFile) => {
      uppy.addFile({
        name: selectedFile.file.name,
        type: selectedFile.file.type,
        data: selectedFile.file,
        meta: { localId: selectedFile.id },
      });
    });

    try {
      const result = await uppy.upload();
      if (result?.failed?.length) {
        toast.error(`${result.failed.length} fichier(s) ont échoué`);
      } else {
        toast.success(
          files.length === 1
            ? "Photo importée"
            : `${files.length} photos importées`,
        );
        queryClient.invalidateQueries({ queryKey: ["photos"] });
        reset();
        onOpenChange(false);
      }
    } catch {
      toast.error("L'upload a échoué");
    } finally {
      setIsUploading(false);
      uppy.destroy();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isUploading) return;
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importer des photos</DialogTitle>
        </DialogHeader>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          disabled={isUploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:bg-muted/50",
            isUploading && "cursor-not-allowed opacity-50",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="size-5" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium">Glissez vos photos ici</p>
            <p className="text-xs text-muted-foreground">
              ou cliquez pour parcourir
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
            {FORMAT_LABEL}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {files.length > 0 && (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {files.map((selectedFile) => (
              <div
                key={selectedFile.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 pr-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedFile.previewUrl}
                  alt=""
                  className="size-10 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {selectedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(selectedFile.file.size)}
                  </p>
                  {isUploading && (
                    <Progress
                      value={selectedFile.progress}
                      className="mt-1.5 h-1"
                    />
                  )}
                </div>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeFile(selectedFile.id)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {quota && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Stockage</span>
              <span className="text-muted-foreground">
                {selectedBytes > 0 ? (
                  <>
                    {bytesToMb(usedBytes)} MB →{" "}
                    <span
                      className={cn(
                        "font-medium",
                        exceedsQuota ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {bytesToMb(projectedBytes)} MB
                    </span>{" "}
                    / {bytesToMb(maxBytes)} MB
                  </>
                ) : (
                  <>
                    {bytesToMb(usedBytes)} MB / {bytesToMb(maxBytes)} MB
                  </>
                )}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  exceedsQuota ? "bg-destructive" : "bg-primary",
                )}
                style={{ width: `${projectedPct}%` }}
              />
            </div>
            {exceedsQuota && (
              <p className="text-xs text-destructive">
                Quota dépassé — supprimez des fichiers ou augmentez votre stockage.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!files.length || exceedsQuota || isUploading}
            className="bg-foreground text-background hover:bg-foreground/85"
          >
            {isUploading ? "Importation..." : `Importer (${files.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
