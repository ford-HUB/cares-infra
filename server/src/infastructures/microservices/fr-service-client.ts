import { Injectable } from '@nestjs/common';

export interface FrVerifyImagesResult {
    match: boolean;
    similarity: number;
    threshold: number;
    idDetScore: number;
    selfieDetScore: number;
    selfieEmbedding: number[];
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
    private readonly baseUrl = process.env.FR_SERVICE_URL ?? 'http://localhost:8001';

    async verifyImages(
        idImage: Buffer,
        idFilename: string,
        selfie: Buffer,
        selfieFilename: string,
    ): Promise<FrVerifyImagesResult> {
        const form = new FormData();
        form.append('id_image', new Blob([new Uint8Array(idImage)]), idFilename);
        form.append('selfie', new Blob([new Uint8Array(selfie)]), selfieFilename);

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
}
