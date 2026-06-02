import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PassThrough } from 'stream';
import sharp from 'sharp';
import { PhotoStatus } from '@repo/shared';

import { AwsService } from '@app/aws/aws.service';
import { PhotoRepository } from './repositories/photo.repository';
import { OptimizeJobData } from './photo.service';

// ─── Extraction couleur dominante ────────────────────────────────────────────
// Histogramme de teinte sur 12 buckets (30° chacun).
// On trouve le bucket le plus peuplé parmi les pixels colorés (S > 0.15,
// hors quasi-noir/blanc), puis on fait la moyenne RGB de ce bucket.
// → évite de mélanger des teintes opposées (ex: orange + bleu ≠ crème).

interface RgbPixel { red: number; green: number; blue: number }

function extractDominantColor(rawPixelBuffer: Buffer): string {
  const NUMBER_OF_HUE_SLICES = 12; // cercle chromatique divisé en 12 tranches de 30°
  const pixelsByHueSlice: RgbPixel[][] = Array.from({ length: NUMBER_OF_HUE_SLICES }, () => []);
  const grayscalePixels: RgbPixel[] = [];

  for (let byteIndex = 0; byteIndex < rawPixelBuffer.length; byteIndex += 3) {
    const red   = rawPixelBuffer[byteIndex];
    const green = rawPixelBuffer[byteIndex + 1];
    const blue  = rawPixelBuffer[byteIndex + 2];

    // Conversion en valeurs 0–1 pour le calcul HSL
    const redNorm   = red   / 255;
    const greenNorm = green / 255;
    const blueNorm  = blue  / 255;

    const brightest = Math.max(redNorm, greenNorm, blueNorm);
    const darkest   = Math.min(redNorm, greenNorm, blueNorm);
    const lightness = (brightest + darkest) / 2;

    // Ignorer les pixels quasi-noirs et quasi-blancs (pas de teinte utile)
    if (lightness < 0.08 || lightness > 0.92) continue;

    const colorRange  = brightest - darkest; // = 0 si pixel gris pur
    const saturation  = colorRange === 0
      ? 0
      : lightness > 0.5
        ? colorRange / (2 - brightest - darkest)
        : colorRange / (brightest + darkest);

    // Ignorer les pixels trop peu colorés (gris, beige neutre…)
    if (saturation < 0.15) {
      grayscalePixels.push({ red, green, blue });
      continue;
    }

    // Calcul de la teinte (position sur le cercle chromatique, entre 0 et 1)
    const hue =
      brightest === redNorm
        ? ((greenNorm - blueNorm) / colorRange + (greenNorm < blueNorm ? 6 : 0)) / 6
        : brightest === greenNorm
          ? ((blueNorm - redNorm) / colorRange + 2) / 6
          : ((redNorm - greenNorm) / colorRange + 4) / 6;

    const sliceIndex = Math.floor(hue * NUMBER_OF_HUE_SLICES) % NUMBER_OF_HUE_SLICES;
    pixelsByHueSlice[sliceIndex].push({ red, green, blue });
  }

  // Tranche la plus peuplée = teinte dominante de l'image
  const dominantSliceIndex = pixelsByHueSlice.reduce(
    (winnerIndex, slice, currentIndex) =>
      slice.length > pixelsByHueSlice[winnerIndex].length ? currentIndex : winnerIndex,
    0,
  );

  // Fallback si image en niveaux de gris, puis fallback total sur tous les pixels
  const pixelsToAverage =
    pixelsByHueSlice[dominantSliceIndex].length > 0
      ? pixelsByHueSlice[dominantSliceIndex]
      : grayscalePixels.length > 0
        ? grayscalePixels
        : Array.from({ length: rawPixelBuffer.length / 3 }, (_, pixelIndex) => ({
            red:   rawPixelBuffer[pixelIndex * 3],
            green: rawPixelBuffer[pixelIndex * 3 + 1],
            blue:  rawPixelBuffer[pixelIndex * 3 + 2],
          }));

  // Moyenne RGB des pixels de la tranche dominante → hex final
  const avgRed   = Math.round(pixelsToAverage.reduce((sum, p) => sum + p.red,   0) / pixelsToAverage.length);
  const avgGreen = Math.round(pixelsToAverage.reduce((sum, p) => sum + p.green, 0) / pixelsToAverage.length);
  const avgBlue  = Math.round(pixelsToAverage.reduce((sum, p) => sum + p.blue,  0) / pixelsToAverage.length);

  return `#${avgRed.toString(16).padStart(2, '0')}${avgGreen.toString(16).padStart(2, '0')}${avgBlue.toString(16).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────

@Processor('image-queue')
export class PhotoProcessor extends WorkerHost {
  private readonly logger = new Logger(PhotoProcessor.name);

  constructor(
    private readonly aws: AwsService,
    private readonly photoRepo: PhotoRepository,
  ) {
    super();
  }

  async process(job: Job<OptimizeJobData>): Promise<void> {
    const { photoId, rawKey } = job.data;
    this.logger.log(`Processing job ${job.id} for photo ${photoId}`);

    await this.photoRepo.update(photoId, { status: PhotoStatus.PROCESSING });

    const optimizedKey = rawKey.replace('raw/', 'optimized/').replace(/\.[^/.]+$/, '.webp');

    const inputStream = await this.aws.downloadStream(rawKey);

    const base = sharp();

    const colorFork = base.clone()
      .resize(50, 50, { fit: 'cover' })
      .removeAlpha()
      .raw();

    const uploadTransform = base.clone()
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 });

    const passThrough = new PassThrough();
    const uploadPromise = this.aws.uploadStream(optimizedKey, passThrough, 'image/webp');

    inputStream.pipe(base);
    uploadTransform.pipe(passThrough);

    let dominantColor: string | null = null;
    const [colorBuf] = await Promise.all([
      colorFork.toBuffer().catch(() => null),
      uploadPromise,
    ]);

    if (colorBuf && colorBuf.length >= 3) {
      dominantColor = extractDominantColor(colorBuf);
    }

    await this.aws.deleteObject(rawKey);

    const optimizedHead = await this.aws.headObject(optimizedKey).catch(() => null);

    await this.photoRepo.update(photoId, {
      status: PhotoStatus.COMPLETED,
      s3Key: optimizedKey,
      fileSizeBytes: optimizedHead?.ContentLength ?? null,
      dominantColor,
    });

    this.logger.log(`Photo ${photoId} optimized → ${optimizedKey}`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<OptimizeJobData>, error: Error) {
    this.logger.error(
      { photoId: job.data.photoId, jobId: job.id, err: error },
      `Job failed for photo ${job.data.photoId}`,
    );
    await this.photoRepo.update(job.data.photoId, { status: PhotoStatus.FAILED });
    await this.aws
      .deleteObject(job.data.rawKey)
      .catch((e) => this.logger.error({ key: job.data.rawKey, err: e }, 'Failed to delete raw object after job failure'));
  }
}
