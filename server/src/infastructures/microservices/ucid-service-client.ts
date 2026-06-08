import { Injectable } from '@nestjs/common';

export interface UcidValidationResult {
    isValid: boolean;
    frontValid: boolean;
    backValid: boolean;
    frontConfidence: number;
    backConfidence: number;
    threshold: number;
    message?: string;
}

interface UcidApiResponse {
    ok: boolean;
    message?: string;
    data?: {
        isValid: boolean;
        frontValid: boolean;
        backValid: boolean;
        frontConfidence: number;
        backConfidence: number;
        threshold: number;
    };
    errors?: {
        front?: { valid: boolean; confidence: number; label: string };
        back?: { valid: boolean; confidence: number; label: string };
    };
}

@Injectable()
export class UcidServiceClient {
    private readonly baseUrl = process.env.UCID_SERVICE_URL ?? 'http://localhost:8003';

    async validateId(
        frontImage: Buffer,
        frontFilename: string,
        backImage: Buffer,
        backFilename: string,
    ): Promise<UcidValidationResult> {
        const form = new FormData();
        form.append('front', new Blob([new Uint8Array(frontImage)]), frontFilename);
        form.append('back', new Blob([new Uint8Array(backImage)]), backFilename);

        const response = await fetch(`${this.baseUrl}/api/v1/validate`, {
            method: 'POST',
            body: form,
        });

        const payload = (await response.json()) as UcidApiResponse;

        if (response.status === 503) {
            throw new Error(
                payload.message ?? 'UCID validation service is not ready. Train models first.',
            );
        }

        if (!response.ok || !payload.ok) {
            return {
                isValid: false,
                frontValid: payload.errors?.front?.valid ?? false,
                backValid: payload.errors?.back?.valid ?? false,
                frontConfidence: payload.errors?.front?.confidence ?? 0,
                backConfidence: payload.errors?.back?.confidence ?? 0,
                threshold: payload.data?.threshold ?? 0.85,
                message: payload.message ?? 'Uploaded images are not valid UCLM ID cards',
            };
        }

        if (!payload.data) {
            throw new Error('UCID validation service returned an empty response');
        }

        return {
            isValid: payload.data.isValid,
            frontValid: payload.data.frontValid,
            backValid: payload.data.backValid,
            frontConfidence: payload.data.frontConfidence,
            backConfidence: payload.data.backConfidence,
            threshold: payload.data.threshold,
            message: payload.message,
        };
    }
}
