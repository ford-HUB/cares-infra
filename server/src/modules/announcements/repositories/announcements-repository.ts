import { Injectable } from '@nestjs/common';
import {
  AnnouncementState,
  Prisma,
  RoleType,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementChannel,
  type AnnouncementTone,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export type AnnouncementRow = Announcement;

export interface ListAnnouncementsInput {
  state: AnnouncementState | 'all';
  limit: number;
}

export interface SaveAnnouncementInput {
  title: string;
  body: string;
  tone: AnnouncementTone;
  audiences: AnnouncementAudience[];
  channels: AnnouncementChannel[];
  state: AnnouncementState;
  publishAt: Date;
  expiresAt: Date | null;
  pinned: boolean;
  windowId: string | null;
}

export interface SetAnnouncementStateInput {
  state: AnnouncementState;
  /** Set when the notice goes out, so a published row always carries the real time. */
  publishAt?: Date;
  reach?: number;
}

/** Which account roles each audience label addresses. */
const AUDIENCE_ROLES: Record<AnnouncementAudience, RoleType[]> = {
  VOLUNTEERS: [RoleType.VOLUNTEER],
  BENEFICIARIES: [RoleType.BENEFICIARY],
  DONORS: [RoleType.DONOR],
  STAFF: [RoleType.ADMIN, RoleType.DIRECTOR, RoleType.COORDINATOR],
};

@Injectable()
export class AnnouncementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAnnouncements(input: ListAnnouncementsInput) {
    const where: Prisma.AnnouncementWhereInput =
      input.state === 'all' ? {} : { state: input.state };

    // Two independent reads, so they run concurrently rather than holding a
    // transaction slot open — a capped read needs no atomicity.
    const [rows, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { publish_at: 'desc' }],
        take: input.limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return { rows, total };
  }

  /** Scheduled rows whose publish time has passed — the ones the read sweep promotes. */
  async findDueScheduled(now: Date): Promise<AnnouncementRow[]> {
    return this.prisma.announcement.findMany({
      where: { state: AnnouncementState.SCHEDULED, publish_at: { lte: now } },
    });
  }

  /** Published rows past their expiry retire in one write; no per-row data is needed. */
  async expireLapsed(now: Date): Promise<number> {
    const result = await this.prisma.announcement.updateMany({
      where: { state: AnnouncementState.PUBLISHED, expires_at: { lte: now } },
      data: { state: AnnouncementState.EXPIRED },
    });
    return result.count;
  }

  async findAnnouncement(id: string): Promise<AnnouncementRow | null> {
    return this.prisma.announcement.findUnique({
      where: { announcement_id: id },
    });
  }

  /**
   * The JWT carries no name, and the row snapshots the author's — so the name is read
   * here rather than trusted from the request body.
   */
  async findUserName(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { firstname: true, lastname: true },
    });

    return user ? `${user.firstname} ${user.lastname}` : null;
  }

  /** How many unrestricted accounts a notice addressed to these audiences reaches right now. */
  async countAudience(audiences: AnnouncementAudience[]): Promise<number> {
    const roles = [...new Set(audiences.flatMap((one) => AUDIENCE_ROLES[one]))];
    if (roles.length === 0) return 0;

    return this.prisma.user.count({
      where: { is_restricted: false, role: { type: { in: roles } } },
    });
  }

  async createAnnouncement(
    data: SaveAnnouncementInput,
    author: { id: string; name: string },
  ): Promise<AnnouncementRow> {
    return this.prisma.announcement.create({
      data: {
        ...toColumns(data),
        author_id: author.id,
        author_name: author.name,
      },
    });
  }

  async updateAnnouncement(
    id: string,
    data: SaveAnnouncementInput,
  ): Promise<AnnouncementRow> {
    return this.prisma.announcement.update({
      where: { announcement_id: id },
      data: toColumns(data),
    });
  }

  async setState(
    id: string,
    data: SetAnnouncementStateInput,
  ): Promise<AnnouncementRow> {
    return this.prisma.announcement.update({
      where: { announcement_id: id },
      data: {
        state: data.state,
        ...(data.publishAt ? { publish_at: data.publishAt } : {}),
        ...(data.reach === undefined ? {} : { reach: data.reach }),
      },
    });
  }

  async setPinned(id: string, pinned: boolean): Promise<AnnouncementRow> {
    return this.prisma.announcement.update({
      where: { announcement_id: id },
      data: { pinned },
    });
  }
}

function toColumns(data: SaveAnnouncementInput) {
  return {
    title: data.title,
    body: data.body,
    tone: data.tone,
    audiences: data.audiences,
    channels: data.channels,
    state: data.state,
    publish_at: data.publishAt,
    expires_at: data.expiresAt,
    pinned: data.pinned,
    window_id: data.windowId,
  } satisfies Prisma.AnnouncementUncheckedUpdateInput;
}
