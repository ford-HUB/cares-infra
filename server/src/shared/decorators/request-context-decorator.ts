import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';

/** Read once for the audit trail instead of `@Ip()`/`@Headers()` per handler. */
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
