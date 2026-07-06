import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

type ZodValidationIssue = {
  path: string;
  message: string;
};

@Injectable()
export class ZodValidationPipe implements PipeTransform {
    constructor(private readonly schema: ZodTypeAny) {}

    transform(value: any, metadata: ArgumentMetadata) {
        const result = this.schema.safeParse(value);

        if (!result.success) {
            const errors: ZodValidationIssue[] = result.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            }));

            throw new BadRequestException({
              message: 'Validation failed',
              errors,
            });
        }

        return result.data;
    }
}