import { Controller, Get, Put } from '@nestjs/common';
import { ZBody, ZQuery, ZSerialize } from 'nest-zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type {
  EvaluationFormDto,
  EvaluationResponseRowDto,
  EvaluationResponsesQueryDto,
  SaveEvaluationFormDto,
} from '../dto/evaluation-site-dto';
import { EvaluationSiteService } from '../services/evaluation-site-service';
import {
  EvaluationFormResponseSchema,
  EvaluationResponseListSchema,
  EvaluationResponsesQuerySchema,
  SaveEvaluationFormSchema,
} from '../validators/evaluation-site-validator';

/** The Director Portal's Evaluation area: the questionnaire builder and its answers. */
@Controller('v1/evaluation')
@Roles(...PORTAL_ROLE_TYPES)
export class EvaluationSiteController {
  constructor(private readonly evaluationSiteService: EvaluationSiteService) {}

  @Get('form')
  @ResponseMessage('Evaluation questionnaire')
  @ZSerialize(EvaluationFormResponseSchema)
  async getForm(): Promise<EvaluationFormDto> {
    return this.evaluationSiteService.getForm();
  }

  @Put('form')
  @ResponseMessage('Questionnaire saved')
  @ZSerialize(EvaluationFormResponseSchema)
  async saveForm(
    @ZBody(SaveEvaluationFormSchema) data: SaveEvaluationFormDto,
  ): Promise<EvaluationFormDto> {
    return this.evaluationSiteService.saveForm(data);
  }

  @Get('responses')
  @ResponseMessage('Evaluation responses')
  @ZSerialize(EvaluationResponseListSchema)
  async listResponses(
    @ZQuery(EvaluationResponsesQuerySchema) query: EvaluationResponsesQueryDto,
  ): Promise<EvaluationResponseRowDto[]> {
    return this.evaluationSiteService.listResponses(query.event_id);
  }
}
