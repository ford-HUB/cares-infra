import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type {
  CreateEventDto,
  EventDto,
  UpdateDonationsDto,
  UpdateEventDto,
} from '../dto/events-site-dto';
import { EventsSiteService } from '../services/events-site-service';
import {
  CreateEventSchema,
  DeleteEventResponseSchema,
  EVENT_MAX_IMAGE_COUNT,
  EventIdParamSchema,
  EventListResponseSchema,
  EventResponseSchema,
  UpdateDonationsSchema,
  UpdateEventSchema,
} from '../validators/events-site-validator';

@Controller('v1/events')
@Roles(...PORTAL_ROLE_TYPES)
export class EventsSiteController {
  constructor(private readonly eventsSiteService: EventsSiteService) {}

  @Get()
  @ResponseMessage('Events')
  @ZSerialize(EventListResponseSchema)
  async listEvents(): Promise<EventDto[]> {
    return this.eventsSiteService.listEvents();
  }

  @Post()
  @ResponseMessage('Event created')
  @ZSerialize(EventResponseSchema)
  @UseInterceptors(FilesInterceptor('event_images', EVENT_MAX_IMAGE_COUNT))
  async createEvent(
    @CurrentUser() caller: JwtPayload,
    @ZBody(CreateEventSchema) data: CreateEventDto,
    @RequestContext() context: RequestContextDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<EventDto> {
    return this.eventsSiteService.createEvent(caller, data, files, context);
  }

  @Put(':id')
  @ResponseMessage('Event updated')
  @ZSerialize(EventResponseSchema)
  @UseInterceptors(FilesInterceptor('event_images', EVENT_MAX_IMAGE_COUNT))
  async updateEvent(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
    @ZBody(UpdateEventSchema) data: UpdateEventDto,
    @RequestContext() context: RequestContextDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<EventDto> {
    return this.eventsSiteService.updateEvent(caller, id, data, files, context);
  }

  @Patch(':id/donations')
  @ResponseMessage('Donation options updated')
  @ZSerialize(EventResponseSchema)
  async updateDonations(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
    @ZBody(UpdateDonationsSchema) data: UpdateDonationsDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<EventDto> {
    return this.eventsSiteService.updateDonations(caller, id, data, context);
  }

  @Patch(':id/cancel')
  @ResponseMessage('Event cancelled')
  @ZSerialize(EventResponseSchema)
  async cancelEvent(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
    @RequestContext() context: RequestContextDto,
  ): Promise<EventDto> {
    return this.eventsSiteService.cancelEvent(caller, id, context);
  }

  @Delete(':id')
  @ResponseMessage('Event deleted')
  @ZSerialize(DeleteEventResponseSchema)
  async deleteEvent(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
    @RequestContext() context: RequestContextDto,
  ) {
    await this.eventsSiteService.deleteEvent(caller, id, context);
    return { deleted: true };
  }
}
