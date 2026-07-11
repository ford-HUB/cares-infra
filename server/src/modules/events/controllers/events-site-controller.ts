import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PORTAL_ROLE_TYPES } from 'src/common/constants/portal-role-types';
import { ResponseMessage } from 'src/common/decorators/response-message-decorator';
import { Roles } from 'src/common/decorators/roles-decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation-pipe';
import { EventsSiteService } from '../services/events-site-service';
import {
    CreateEventInput,
    CreateEventSchema,
    EVENT_MAX_IMAGE_COUNT,
    EventIdParamSchema,
    UpdateDonationsInput,
    UpdateDonationsSchema,
    UpdateEventInput,
    UpdateEventSchema,
} from '../validators/events-site-validator';

@Controller('v1/events')
@Roles(...PORTAL_ROLE_TYPES)
export class EventsSiteController {
    constructor(private readonly eventsSiteService: EventsSiteService) {}

    @Get()
    @ResponseMessage('Events')
    async listEvents() {
        return this.eventsSiteService.listEvents();
    }

    @Post()
    @ResponseMessage('Event created')
    @UseInterceptors(FilesInterceptor('event_images', EVENT_MAX_IMAGE_COUNT))
    async createEvent(
        @Body(new ZodValidationPipe(CreateEventSchema)) data: CreateEventInput,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        return this.eventsSiteService.createEvent(data, files);
    }

    @Put(':id')
    @ResponseMessage('Event updated')
    @UseInterceptors(FilesInterceptor('event_images', EVENT_MAX_IMAGE_COUNT))
    async updateEvent(
        @Param(new ZodValidationPipe(EventIdParamSchema)) params: { id: number },
        @Body(new ZodValidationPipe(UpdateEventSchema)) data: UpdateEventInput,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        return this.eventsSiteService.updateEvent(params.id, data, files);
    }

    @Patch(':id/donations')
    @ResponseMessage('Donation options updated')
    async updateDonations(
        @Param(new ZodValidationPipe(EventIdParamSchema)) params: { id: number },
        @Body(new ZodValidationPipe(UpdateDonationsSchema)) data: UpdateDonationsInput,
    ) {
        return this.eventsSiteService.updateDonations(params.id, data);
    }

    @Patch(':id/cancel')
    @ResponseMessage('Event cancelled')
    async cancelEvent(
        @Param(new ZodValidationPipe(EventIdParamSchema)) params: { id: number },
    ) {
        return this.eventsSiteService.cancelEvent(params.id);
    }

    @Delete(':id')
    @ResponseMessage('Event deleted')
    async deleteEvent(
        @Param(new ZodValidationPipe(EventIdParamSchema)) params: { id: number },
    ) {
        await this.eventsSiteService.deleteEvent(params.id);
        return { deleted: true };
    }
}
