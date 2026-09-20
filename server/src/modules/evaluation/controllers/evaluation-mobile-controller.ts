import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { RoleType } from '../../../infastructures/prisma/common/client';
import { EventIdParamSchema } from '../../events/validators/events-site-validator';
import type {
  EvaluationSubmissionsResponseDto,
  EventEvaluationDto,
  SubmitEvaluationDto,
  SubmitEvaluationResponseDto,
} from '../dto/evaluation-mobile-dto';
import { EvaluationMobileService } from '../services/evaluation-mobile-service';
import {
  EvaluationSubmissionsResponseSchema,
  EventEvaluationResponseSchema,
  SubmitEvaluationResponseSchema,
  SubmitEvaluationSchema,
} from '../validators/evaluation-mobile-validator';

/** The volunteer app's side of the post-event questionnaire. */
@Controller('v1/evaluation')
@Roles(RoleType.VOLUNTEER)
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

  @Post('events/:id/responses')
  @HttpCode(201)
  @ResponseMessage('Feedback submitted')
  @ZSerialize(SubmitEvaluationResponseSchema)
  async submit(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
    @ZBody(SubmitEvaluationSchema) data: SubmitEvaluationDto,
  ): Promise<SubmitEvaluationResponseDto> {
    return this.evaluationMobileService.submit(user.sub, id, data);
  }
}
