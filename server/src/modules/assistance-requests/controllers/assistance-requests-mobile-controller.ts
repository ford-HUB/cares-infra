import {
  Controller,
  Get,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  CancelAssistanceRequestDto,
  CreateAssistanceRequestDto,
  MobileAssistanceRequestDto,
  MobileAssistanceRequestListDto,
  UpdateAssistanceRequestDto,
} from '../dto/assistance-requests-mobile-dto';
import { AssistanceRequestsMobileService } from '../services/assistance-requests-mobile-service';
import {
  ASSISTANCE_ATTACHMENT_MAX_COUNT,
  AssistanceRequestIdParamSchema,
  CancelAssistanceRequestSchema,
  CreateAssistanceRequestSchema,
  MOBILE_ASSISTANCE_ROLE_TYPES,
  MobileAssistanceRequestListResponseSchema,
  MobileAssistanceRequestResponseSchema,
  UpdateAssistanceRequestSchema,
} from '../validators/assistance-requests-mobile-validator';

/** Everything under `me`. */
@Controller('v1/assistance-requests')
@Roles(...MOBILE_ASSISTANCE_ROLE_TYPES)
export class AssistanceRequestsMobileController {
  constructor(
    private readonly assistanceRequestsMobileService: AssistanceRequestsMobileService,
  ) {}

  @Get('me')
  @ResponseMessage('Your assistance requests')
  @ZSerialize(MobileAssistanceRequestListResponseSchema)
  async listMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<MobileAssistanceRequestListDto> {
    return this.assistanceRequestsMobileService.listMine(user.sub);
  }

  /** Multipart: text fields plus up to three `attachments`. */
  @Post('me')
  @ResponseMessage('Your request is pending review')
  @ZSerialize(MobileAssistanceRequestResponseSchema)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'attachments', maxCount: ASSISTANCE_ATTACHMENT_MAX_COUNT },
    ]),
  )
  async create(
    @ZBody(CreateAssistanceRequestSchema) body: CreateAssistanceRequestDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files?: { attachments?: Express.Multer.File[] },
  ): Promise<MobileAssistanceRequestDto> {
    return this.assistanceRequestsMobileService.create(
      user.sub,
      body,
      files?.attachments ?? [],
    );
  }

  /** Only until screening starts. */
  @Patch('me/:id')
  @ResponseMessage('Your request was updated')
  @ZSerialize(MobileAssistanceRequestResponseSchema)
  async update(
    @ZParam('id', AssistanceRequestIdParamSchema) id: string,
    @ZBody(UpdateAssistanceRequestSchema) body: UpdateAssistanceRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MobileAssistanceRequestDto> {
    return this.assistanceRequestsMobileService.update(user.sub, id, body);
  }

  /** Until completed, declined or cancelled. */
  @Post('me/:id/cancel')
  @ResponseMessage('Your request was cancelled')
  @ZSerialize(MobileAssistanceRequestResponseSchema)
  async cancel(
    @ZParam('id', AssistanceRequestIdParamSchema) id: string,
    @ZBody(CancelAssistanceRequestSchema) body: CancelAssistanceRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MobileAssistanceRequestDto> {
    return this.assistanceRequestsMobileService.cancel(user.sub, id, body);
  }
}
