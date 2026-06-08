import { Injectable } from '@nestjs/common';
import { IdOcrResultDto } from 'src/modules/auth/auth-dto';

interface OcrApiResponse {
    ok: boolean;
    message?: string;
    data?: IdOcrResultDto;
    errors?: unknown;
}

@Injectable()
export class OcrServiceClient {
    private readonly baseUrl = process.env.OCR_SERVICE_URL ?? 'http://localhost:8002';

    async extractIdFields(
        frontImage: Buffer,
        frontFilename: string,
        backImage: Buffer,
        backFilename: string,
    ): Promise<IdOcrResultDto> {
        const form = new FormData();
        form.append('front', new Blob([new Uint8Array(frontImage)]), frontFilename);
        form.append('back', new Blob([new Uint8Array(backImage)]), backFilename);

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
}
