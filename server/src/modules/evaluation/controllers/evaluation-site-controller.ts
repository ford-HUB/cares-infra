import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  StreamableFile,
} from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  AssignableEventDto,
  AssignEvaluationFormDto,
  CreateEvaluationFormDto,
  EvaluationAssignmentDto,
  EvaluationFormDto,
  EvaluationResponseRowDto,
  EvaluationResponsesQueryDto,
  SaveEvaluationFormDto,
} from '../dto/evaluation-site-dto';
import { EvaluationSiteService } from '../services/evaluation-site-service';
import {
  AssignableEventListSchema,
  AssignEvaluationFormSchema,
  CreateEvaluationFormSchema,
  EvaluationAssignmentListSchema,
  EvaluationAssignmentSchema,
  EvaluationFormIdParamSchema,
  EvaluationFormListSchema,
  EvaluationFormResponseSchema,
  EvaluationImageIndexParamSchema,
  EvaluationQuestionIdParamSchema,
  EvaluationResponseIdParamSchema,
  EvaluationResponseListSchema,
  EvaluationResponsesQuerySchema,
  SaveEvaluationFormSchema,
} from '../validators/evaluation-site-validator';

/**
 * The Director Portal's Evaluation area: the questionnaire builder, the Forms list
 * that points each event at one, and the answers that come back.
 */
@Controller('v1/evaluation')
@Roles(...PORTAL_ROLE_TYPES)
export class EvaluationSiteController {
  constructor(private readonly evaluationSiteService: EvaluationSiteService) {}

  @Get('forms')
  @ResponseMessage('Evaluation questionnaires')
  @ZSerialize(EvaluationFormListSchema)
  async listForms(): Promise<EvaluationFormDto[]> {
    return this.evaluationSiteService.listForms();
  }

  @Post('forms')
  @HttpCode(201)
  @ResponseMessage('Questionnaire created')
  @ZSerialize(EvaluationFormResponseSchema)
  async createForm(
    @ZBody(CreateEvaluationFormSchema) data: CreateEvaluationFormDto,
  ): Promise<EvaluationFormDto> {
    return this.evaluationSiteService.createForm(data);
  }

  @Get('forms/:id')
  @ResponseMessage('Evaluation questionnaire')
  @ZSerialize(EvaluationFormResponseSchema)
  async getForm(
    @ZParam('id', EvaluationFormIdParamSchema) id: string,
  ): Promise<EvaluationFormDto> {
    return this.evaluationSiteService.getForm(id);
  }

  @Put('forms/:id')
  @ResponseMessage('Questionnaire saved')
  @ZSerialize(EvaluationFormResponseSchema)
  async saveForm(
    @ZParam('id', EvaluationFormIdParamSchema) id: string,
    @ZBody(SaveEvaluationFormSchema) data: SaveEvaluationFormDto,
  ): Promise<EvaluationFormDto> {
    return this.evaluationSiteService.saveForm(id, data);
  }

  @Delete('forms/:id')
  @ResponseMessage('Questionnaire deleted')
  async deleteForm(
    @ZParam('id', EvaluationFormIdParamSchema) id: string,
  ): Promise<void> {
    return this.evaluationSiteService.deleteForm(id);
  }

  @Put('forms/:id/default')
  @ResponseMessage('Default questionnaire updated')
  @ZSerialize(EvaluationFormResponseSchema)
  async setDefaultForm(
    @ZParam('id', EvaluationFormIdParamSchema) id: string,
  ): Promise<EvaluationFormDto> {
    return this.evaluationSiteService.setDefaultForm(id);
  }

  @Get('assignments')
  @ResponseMessage('Evaluation assignments')
  @ZSerialize(EvaluationAssignmentListSchema)
  async listAssignments(): Promise<EvaluationAssignmentDto[]> {
    return this.evaluationSiteService.listAssignments();
  }

  @Get('assignable-events')
  @ResponseMessage('Assignable events')
  @ZSerialize(AssignableEventListSchema)
  async listAssignableEvents(): Promise<AssignableEventDto[]> {
    return this.evaluationSiteService.listAssignableEvents();
  }

  @Post('assignments')
  @HttpCode(201)
  @ResponseMessage('Questionnaire assigned')
  @ZSerialize(EvaluationAssignmentSchema)
  async assignForm(
    @CurrentUser() user: JwtPayload,
    @ZBody(AssignEvaluationFormSchema) data: AssignEvaluationFormDto,
  ): Promise<EvaluationAssignmentDto> {
    return this.evaluationSiteService.assignForm(data, user.sub);
  }

  @Delete('assignments/:id')
  @ResponseMessage('Questionnaire unassigned')
  async unassignForm(
    @ZParam('id', EvaluationFormIdParamSchema) id: string,
  ): Promise<void> {
    return this.evaluationSiteService.unassignForm(id);
  }

  @Get('responses')
  @ResponseMessage('Evaluation responses')
  @ZSerialize(EvaluationResponseListSchema)
  async listResponses(
    @ZQuery(EvaluationResponsesQuerySchema) query: EvaluationResponsesQueryDto,
  ): Promise<EvaluationResponseRowDto[]> {
    return this.evaluationSiteService.listResponses(query.event_id);
  }

  /** Answer photos are private in S3, so the portal streams them here. */
  @Get('responses/:id/answers/:questionId/images/:index')
  async getAnswerImage(
    @ZParam('id', EvaluationResponseIdParamSchema) id: string,
    @ZParam('questionId', EvaluationQuestionIdParamSchema) questionId: string,
    @ZParam('index', EvaluationImageIndexParamSchema) index: number,
  ) {
    const asset = await this.evaluationSiteService.getAnswerImage(
      id,
      questionId,
      index,
    );
    return new StreamableFile(asset.buffer, {
      type: asset.contentType,
      disposition: 'inline',
    });
  }
}
