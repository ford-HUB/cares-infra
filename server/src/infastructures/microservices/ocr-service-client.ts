import { Injectable } from '@nestjs/common';
import { IdOcrResultDto } from 'src/modules/auth/dto/auth-mobile-dto';
import type { ResidencyOcrResultDto } from 'src/modules/profile/dto/profile-mobile-dto';
import { toImageBlob } from 'src/shared/utils/image-mime';

interface OcrApiResponse<T = IdOcrResultDto> {
  ok: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

/** The OCR service answered but could not do the job (bad scan, no address). */
export class OcrUnreadableError extends Error {}

@Injectable()
export class OcrServiceClient {
  private readonly baseUrl =
    process.env.OCR_SERVICE_URL ?? 'http://localhost:8002';

  async extractIdFields(
    frontImage: Buffer,
    frontFilename: string,
    backImage: Buffer,
    backFilename: string,
  ): Promise<IdOcrResultDto> {
    const form = new FormData();
    form.append(
      'front',
      toImageBlob(frontImage, undefined, frontFilename),
      frontFilename,
    );
    form.append(
      'back',
      toImageBlob(backImage, undefined, backFilename),
      backFilename,
    );

    const response = await fetch(`${this.baseUrl}/api/v1/extract`, {
      method: 'POST',
      body: form,
    });

    const payload = (await response.json()) as OcrApiResponse;
    if (!response.ok || !payload.ok || !payload.data) {
      throw new Error(payload.message ?? 'OCR service failed');
    }

    return payload.data;
  }

  /**
   * Reads the residential address off a barangay certificate or similar
   * proof of residency — a photo or a PDF. A 422 from the service means the
   * file was readable but carried no address, which the caller surfaces to
   * the person as-is.
   */
  async extractResidencyAddress(
    document: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<ResidencyOcrResultDto> {
    const form = new FormData();
    form.append(
      'document',
      new Blob([new Uint8Array(document)], { type: mimetype }),
      filename,
    );

    const response = await fetch(`${this.baseUrl}/api/v1/extract-residency`, {
      method: 'POST',
      body: form,
    });

    const payload =
      (await response.json()) as OcrApiResponse<ResidencyOcrResultDto>;
    if (response.status === 422 || response.status === 400) {
      throw new OcrUnreadableError(
        payload.message ?? 'Could not read the document',
      );
    }
    if (!response.ok || !payload.ok || !payload.data) {
      throw new Error(payload.message ?? 'OCR service failed');
    }

    return payload.data;
  }
}
