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
    @ZBody(CreateEventSchema) data: CreateEventDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<EventDto> {
    return this.eventsSiteService.createEvent(data, files);
  }

  @Put(':id')
  @ResponseMessage('Event updated')
  @ZSerialize(EventResponseSchema)
  @UseInterceptors(FilesInterceptor('event_images', EVENT_MAX_IMAGE_COUNT))
  async updateEvent(
    @ZParam('id', EventIdParamSchema) id: number,
    @ZBody(UpdateEventSchema) data: UpdateEventDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<EventDto> {
    return this.eventsSiteService.updateEvent(id, data, files);
  }

  @Patch(':id/donations')
  @ResponseMessage('Donation options updated')
  @ZSerialize(EventResponseSchema)
  async updateDonations(
    @ZParam('id', EventIdParamSchema) id: number,
    @ZBody(UpdateDonationsSchema) data: UpdateDonationsDto,
  ): Promise<EventDto> {
    return this.eventsSiteService.updateDonations(id, data);
  }

  @Patch(':id/cancel')
  @ResponseMessage('Event cancelled')
  @ZSerialize(EventResponseSchema)
  async cancelEvent(
    @ZParam('id', EventIdParamSchema) id: number,
  ): Promise<EventDto> {
    return this.eventsSiteService.cancelEvent(id);
  }

  @Delete(':id')
  @ResponseMessage('Event deleted')
  @ZSerialize(DeleteEventResponseSchema)
  async deleteEvent(@ZParam('id', EventIdParamSchema) id: number) {
    await this.eventsSiteService.deleteEvent(id);
    return { deleted: true };
  }
}
