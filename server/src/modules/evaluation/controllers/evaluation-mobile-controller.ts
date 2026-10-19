import {
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { MOBILE_SIGN_IN_ROLE_TYPES } from '../../../shared/constants/mobile-role-types';
import { EventIdParamSchema } from '../../events/validators/events-site-validator';
import type {
  EvaluationSubmissionsResponseDto,
  EventEvaluationDto,
  SubmitEvaluationDto,
  SubmitEvaluationResponseDto,
} from '../dto/evaluation-mobile-dto';
import { EvaluationMobileService } from '../services/evaluation-mobile-service';
import {
  EVALUATION_IMAGE_MAX_BYTES,
  EVALUATION_IMAGE_MAX_FILES,
} from '../validators/evaluation-site-validator';
import {
  EvaluationSubmissionsResponseSchema,
  EventEvaluationResponseSchema,
  SubmitEvaluationResponseSchema,
  SubmitEvaluationSchema,
} from '../validators/evaluation-mobile-validator';

/** The volunteer app's side of the post-event questionnaire. */
@Controller('v1/evaluation')
@Roles(...MOBILE_SIGN_IN_ROLE_TYPES)
export class EvaluationMobileController {
  constructor(
    private readonly evaluationMobileService: EvaluationMobileService,
  ) {}

  @Get('submissions')
  @ResponseMessage('Evaluation submissions')
  @ZSerialize(EvaluationSubmissionsResponseSchema)
  async listSubmissions(
    @CurrentUser() user: JwtPayload,
  ): Promise<EvaluationSubmissionsResponseDto> {
    return this.evaluationMobileService.listSubmissions(user.sub);
  }

  @Get('events/:id')
  @ResponseMessage('Event evaluation')
  @ZSerialize(EventEvaluationResponseSchema)
  async getForEvent(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
  ): Promise<EventEvaluationDto> {
    return this.evaluationMobileService.getForEvent(user.sub, id);
  }

  /**
   * JSON, or multipart when the form asks for photos: `answers` as a JSON string
   * plus `image_<questionId>` files. The per-question cap is checked in the
   * service; the interceptor only bounds the request as a whole.
   */
  @Post('events/:id/responses')
  @HttpCode(201)
  @ResponseMessage('Feedback submitted')
  @ZSerialize(SubmitEvaluationResponseSchema)
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        fileSize: EVALUATION_IMAGE_MAX_BYTES,
        files: EVALUATION_IMAGE_MAX_FILES * 10,
      },
    }),
  )
  async submit(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
    @ZBody(SubmitEvaluationSchema) data: SubmitEvaluationDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<SubmitEvaluationResponseDto> {
    return this.evaluationMobileService.submit(user.sub, id, data, files ?? []);
  }
}
