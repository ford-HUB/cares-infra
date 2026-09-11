import { Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementState } from '../../../infastructures/prisma/common/client';
import type {
  AnnouncementDto,
  AnnouncementListDto,
  ListAnnouncementsQueryDto,
  SaveAnnouncementDto,
  SetAnnouncementStateDto,
} from '../dto/announcements-site-dto';
import {
  AnnouncementsRepository,
  type AnnouncementRow,
  type SaveAnnouncementInput,
} from '../repositories/announcements-repository';

@Injectable()
export class AnnouncementsSiteService {
  constructor(
    private readonly announcementsRepository: AnnouncementsRepository,
  ) {}

  /**
   * Every read sweeps first: a scheduled notice whose time has come is published (and
   * its reach counted), and a published one past its expiry is retired. There is no
   * scheduler, so the polling page is what moves the board forward.
   */
  async listAnnouncements(
    query: ListAnnouncementsQueryDto,
  ): Promise<AnnouncementListDto> {
    await this.sweep();

    const { rows, total } =
      await this.announcementsRepository.listAnnouncements({
        state: query.state,
        limit: query.limit,
      });

    return { items: rows.map(toAnnouncement), total };
  }

  async createAnnouncement(
    staffUserId: string,
    draft: SaveAnnouncementDto,
  ): Promise<AnnouncementDto> {
    const authorName =
      await this.announcementsRepository.findUserName(staffUserId);
    if (!authorName) {
      throw new NotFoundException('Signed-in account not found');
    }

    const row = await this.announcementsRepository.createAnnouncement(
      toInput(draft),
      { id: staffUserId, name: authorName },
    );

    return toAnnouncement(row);
  }

  /** Read first so a bad id is a 404 rather than the P2025 a blind update would raise. */
  async updateAnnouncement(
    id: string,
    draft: SaveAnnouncementDto,
  ): Promise<AnnouncementDto> {
    await this.requireAnnouncement(id);

    const row = await this.announcementsRepository.updateAnnouncement(
      id,
      toInput(draft),
    );

    return toAnnouncement(row);
  }

  /**
   * Publishing stamps the real send time and counts who it reached; taking down keeps
   * the original publish time so the record still says when it went out.
   */
  async setState(
    id: string,
    body: SetAnnouncementStateDto,
  ): Promise<AnnouncementDto> {
    const current = await this.requireAnnouncement(id);

    const row =
      body.state === AnnouncementState.PUBLISHED
        ? await this.publish(current, new Date())
        : await this.announcementsRepository.setState(id, {
            state: AnnouncementState.EXPIRED,
          });

    return toAnnouncement(row);
  }

  async setPinned(id: string, pinned: boolean): Promise<AnnouncementDto> {
    await this.requireAnnouncement(id);
    const row = await this.announcementsRepository.setPinned(id, pinned);
    return toAnnouncement(row);
  }

  private async sweep(): Promise<void> {
    const now = new Date();
    const due = await this.announcementsRepository.findDueScheduled(now);

    // The scheduled time stays as the publish time: it went out when it said it would.
    await Promise.all(due.map((row) => this.publish(row, row.publish_at)));
    await this.announcementsRepository.expireLapsed(now);
  }

  private async publish(
    row: AnnouncementRow,
    publishAt: Date,
  ): Promise<AnnouncementRow> {
    // A notice re-published after being taken down keeps the reach it already had.
    const reach =
      row.reach > 0
        ? row.reach
        : await this.announcementsRepository.countAudience(row.audiences);

    return this.announcementsRepository.setState(row.announcement_id, {
      state: AnnouncementState.PUBLISHED,
      publishAt,
      reach,
    });
  }

  private async requireAnnouncement(id: string): Promise<AnnouncementRow> {
    const row = await this.announcementsRepository.findAnnouncement(id);
    if (!row) {
      throw new NotFoundException('Announcement not found');
    }
    return row;
  }
}

function toInput(draft: SaveAnnouncementDto): SaveAnnouncementInput {
  return {
    title: draft.title,
    body: draft.body,
    tone: draft.tone,
    audiences: draft.audiences,
    channels: draft.channels,
    state: draft.state,
    publishAt: new Date(draft.publish_at),
    expiresAt: draft.expires_at ? new Date(draft.expires_at) : null,
    pinned: draft.pinned,
    windowId: draft.window_id,
  };
}

export function toAnnouncement(row: AnnouncementRow): AnnouncementDto {
  return {
    announcement_id: row.announcement_id,
    title: row.title,
    body: row.body,
    tone: row.tone,
    audiences: row.audiences,
    channels: row.channels,
    state: row.state,
    publish_at: row.publish_at.toISOString(),
    expires_at: row.expires_at ? row.expires_at.toISOString() : null,
    pinned: row.pinned,
    window_id: row.window_id,
    author_id: row.author_id,
    author_name: row.author_name,
    reach: row.reach,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
