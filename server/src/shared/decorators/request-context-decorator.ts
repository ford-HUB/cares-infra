import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Where the request came from, for the audit trail. Every privileged action records
 * it, so it is read once here rather than repeating `@Ip()` and `@Headers()` on each
 * handler that happens to write an entry.
 */
export interface RequestContextDto {
  ipAddress?: string;
  userAgent?: string;
}

export const RequestContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestContextDto => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  },
);
