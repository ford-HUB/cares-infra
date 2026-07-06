import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message-decorator';

export type ApiSuccessResponse<T> = {
  ok: true;
  message?: string;
  data: T;
};

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handlerMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );
    const classMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getClass(),
    );

    const message = handlerMessage ?? classMessage;

    return next.handle().pipe(
      map((data) => {
        const response: ApiSuccessResponse<typeof data> = {
          ok: true,
          data,
        };

        if (message) response.message = message;
        return response;
      }),
    );
  }
}

