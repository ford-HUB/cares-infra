import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

type ApiErrorResponse = {
  ok: false;
  message: string;
  errors?: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    if (exception instanceof HttpException) {
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

      if (p.errors !== undefined) body.errors = p.errors;

      return res.status(status).json(body);
    }

    const body: ApiErrorResponse = {
      ok: false,
      message: 'Internal server error',
    };

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
