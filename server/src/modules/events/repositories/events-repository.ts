import { Injectable } from '@nestjs/common';
import {
  EventStatus,
  Prisma,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import { PersistEventDto } from '../dto/events-site-dto';

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { event_started: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.event.findUnique({
      where: { event_id: id },
    });
  }

  async create(data: PersistEventDto) {
    return this.prisma.event.create({
      data: this.toPrismaData(data),
    });
  }

  async update(id: number, data: PersistEventDto) {
    return this.prisma.event.update({
      where: { event_id: id },
      data: this.toPrismaData(data),
    });
  }

  async updateDonations(
    id: number,
    donations: {
      funds_donation: boolean;
      goods_donation: boolean;
      goods_types: string[];
    },
  ) {
    return this.prisma.event.update({
      where: { event_id: id },
      data: donations,
    });
  }

  async updateStatus(id: number, status: EventStatus) {
    return this.prisma.event.update({
      where: { event_id: id },
      data: { status },
    });
  }

  async delete(id: number) {
    return this.prisma.event.delete({
      where: { event_id: id },
    });
  }

  private toPrismaData(data: PersistEventDto): Prisma.EventCreateInput {
    return {
      title: data.title,
      description: data.description,
      event_started: data.event_started,
      event_ended: data.event_ended,
      location: data.location,
      max_participants: data.max_participants,
      organizer_name: data.organizer_name,
      category: data.category,
      department: data.department,
      specified_category: data.specified_category,
      images: data.images,
      status: data.status,
      funds_donation: data.funds_donation,
      goods_donation: data.goods_donation,
      goods_types: data.goods_types,
      beneficiary_applicable: data.beneficiary_applicable,
      max_beneficiaries: data.max_beneficiaries,
      geojson: data.geojson ?? Prisma.DbNull,
      area_sqm: data.area_sqm,
    };
  }
}
