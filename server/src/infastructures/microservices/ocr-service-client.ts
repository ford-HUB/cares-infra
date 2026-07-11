import { Injectable } from '@nestjs/common';
import { IdOcrResultDto } from 'src/modules/auth/dto/auth-mobile-dto';
import { toImageBlob } from 'src/common/utils/image-mime';

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
        form.append('front', toImageBlob(frontImage, undefined, frontFilename), frontFilename);
        form.append('back', toImageBlob(backImage, undefined, backFilename), backFilename);

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
