import { Injectable } from '@nestjs/common';
import { toImageBlob } from 'src/shared/utils/image-mime';

export interface FrVerifyImagesResult {
  match: boolean;
  similarity: number;
  threshold: number;
  idDetScore: number;
  selfieDetScore: number;
  selfieEmbedding: number[];
}

export interface FrEmbedResult {
  embedding: number[];
  detScore: number;
}

interface FrEmbedApiResponse {
  ok: boolean;
  message?: string;
  data?: {
    embedding: number[];
    det_score: number;
    embedding_dim: number;
  };
  errors?: unknown;
}

interface FrApiResponse {
  ok: boolean;
  message?: string;
  data?: {
    match: boolean;
    similarity: number;
    threshold: number;
    id_det_score: number;
    selfie_det_score: number;
    selfie_embedding: number[];
  };
  errors?: unknown;
}

@Injectable()
export class FrServiceClient {
  private readonly baseUrl =
    process.env.FR_SERVICE_URL ?? 'http://localhost:8001';

  async verifyImages(
    idImage: Buffer,
    idFilename: string,
    idMimetype: string | undefined,
    selfie: Buffer,
    selfieFilename: string,
    selfieMimetype: string | undefined,
  ): Promise<FrVerifyImagesResult> {
    const form = new FormData();
    form.append(
      'id_image',
      toImageBlob(idImage, idMimetype, idFilename),
      idFilename,
    );
    form.append(
      'selfie',
      toImageBlob(selfie, selfieMimetype, selfieFilename),
      selfieFilename,
    );

    const response = await fetch(`${this.baseUrl}/api/v1/verify-images`, {
      method: 'POST',
      body: form,
    });

    const payload = (await response.json()) as FrApiResponse;
    if (!response.ok || !payload.ok || !payload.data) {
      const detail = payload.message?.trim();
      if (detail) {
        throw new Error(detail);
      }
      throw new Error('Face verification service failed');
    }

    return {
      match: payload.data.match,
      similarity: payload.data.similarity,
      threshold: payload.data.threshold,
      idDetScore: payload.data.id_det_score,
      selfieDetScore: payload.data.selfie_det_score,
      selfieEmbedding: payload.data.selfie_embedding,
    };
  }

  /** Extracts a face embedding from a single image — used when there is no ID photo to match against. */
  async embedImage(
    image: Buffer,
    filename: string,
    mimetype: string | undefined,
  ): Promise<FrEmbedResult> {
    const form = new FormData();
    form.append('image', toImageBlob(image, mimetype, filename), filename);

    const response = await fetch(`${this.baseUrl}/api/v1/embed`, {
      method: 'POST',
      body: form,
    });

    const payload = (await response.json()) as FrEmbedApiResponse;
    if (!response.ok || !payload.ok || !payload.data) {
      const detail = payload.message?.trim();
      if (detail) {
        throw new Error(detail);
      }
      throw new Error('Face embedding service failed');
    }

    return {
      embedding: payload.data.embedding,
      detScore: payload.data.det_score,
    };
  }
}
