import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ZodError } from 'zod';

type ApiErrorResponse = {
  ok: false;
  message: string;
  errors?: unknown;
};

type ValidationIssue = {
  path: string;
  message: string;
};

/**
 * nest-zod throws `BadRequestException('Validation failed', { cause: ZodError })`, so the
 * per-issue detail the clients render lives on the cause rather than in the response payload.
 */
const zodIssues = (exception: unknown): ValidationIssue[] | undefined => {
  const cause = exception instanceof Error ? exception.cause : undefined;

  if (!(cause instanceof ZodError)) {
    return undefined;
  }

  return cause.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    // A 500 is the server's own fault (nest-zod's "Serialization failed" among them), so
    // its detail goes to the log below. A deliberate 502 or 503 still tells the client why.
    if (
      exception instanceof HttpException &&
      exception.getStatus() !== Number(HttpStatus.INTERNAL_SERVER_ERROR)
    ) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        const body: ApiErrorResponse = { ok: false, message: payload };
        return res.status(status).json(body);
      }

      const p = payload as Record<string, any>;
      const message =
        typeof p.message === 'string'
          ? p.message
          : Array.isArray(p.message)
            ? p.message.join(', ')
            : exception.message || 'Request failed';

      const body: ApiErrorResponse = {
        ok: false,
        message,
      };

      const errors = p.errors ?? zodIssues(exception);
      if (errors !== undefined) body.errors = errors;

      return res.status(status).json(body);
    }

    const body: ApiErrorResponse = {
      ok: false,
      message: 'Internal server error',
    };

    if (exception instanceof Error) {
      console.error(
        '[HttpExceptionFilter]',
        exception.message,
        exception.stack,
        ...(zodIssues(exception) ?? []),
      );
    } else {
      console.error('[HttpExceptionFilter]', exception);
    }

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
