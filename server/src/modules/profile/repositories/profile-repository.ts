import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import {
  AttendanceStatus,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import type { UpdateMobileProfileDto } from '../dto/profile-mobile-dto';
import { PersistPortalProfileDto } from '../dto/profile-site-dto';

/** The row shape the mobile profile endpoint reads. */
export type MobileProfileRow = NonNullable<
  Awaited<ReturnType<ProfileRepository['findMobileProfile']>>
>;

/** The row shape the portal profile endpoints read — also what the cache stores. */
export type PortalProfileRow = NonNullable<
  Awaited<ReturnType<ProfileRepository['findPortalProfile']>>
>;

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPortalProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        gender: true,
        age: true,
        phone_number: true,
        avatar: true,
        portal_department: true,
        address_street: true,
        address_barangay: true,
        address_city: true,
        address_province: true,
        accounts: {
          select: { email: true, signature_url: true },
          take: 1,
        },
        role: {
          select: { type: true },
        },
      },
    });
  }

  /**
   * One query for every role: the role-specific relations come back empty for
   * roles that never write them (a donor has no school info), so the service can
   * pick the section for the caller's role without a second round-trip.
   */
  async findMobileProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        firstname: true,
        middle_name: true,
        lastname: true,
        gender: true,
        age: true,
        phone_number: true,
        avatar: true,
        current_address: true,
        address_street: true,
        address_barangay: true,
        address_city: true,
        address_province: true,
        household_size: true,
        createdAt: true,
        residency_documents: {
          select: {
            residency_document_id: true,
            file_name: true,
            mime_type: true,
            size_bytes: true,
            extracted_address: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        // One picture per side of the account; `avatar` above is only the
        // legacy fallback for the registered role.
        role_avatars: {
          select: { role_type: true, avatar_url: true },
        },
        accounts: {
          select: { email: true, password: true },
          take: 1,
        },
        role: {
          select: { type: true },
        },
        user_school_info: {
          select: {
            id_number: true,
            graduation_year: true,
            department: { select: { name: true } },
            major: { select: { name: true } },
            year_level: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        // A volunteer's ID check is the verification opened at registration,
        // which owns the biometric (face matched against the ID scan).
        user_verifications: {
          where: { user_biometric: { isActive: true } },
          select: { user_biometric_id: true },
          take: 1,
        },
        user_interest: {
          select: { selected: true },
        },
        oauth_identities: {
          select: { provider: true },
        },
      },
    });
  }

  /** Service-hour totals for the volunteer stats row. */
  async summarizeAttendance(userId: string) {
    const [registered, completed] = await Promise.all([
      this.prisma.eventAttendance.count({ where: { user_id: userId } }),
      this.prisma.eventAttendance.aggregate({
        where: { user_id: userId, status: AttendanceStatus.COMPLETED },
        _count: { _all: true },
        _sum: { hours_rendered: true },
      }),
    ]);

    return {
      registered,
      completed: completed._count._all,
      hours: completed._sum.hours_rendered ?? 0,
    };
  }

  async updatePortalProfile(
    userId: string,
    data: PersistPortalProfileDto & {
      avatar?: string | null;
      signature_url?: string | null;
    },
  ) {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        firstname: data.firstname,
        lastname: data.lastname,
        phone_number: data.phone_number,
        gender: data.gender,
        age: data.age,
        portal_department: data.department,
        address_street: data.address_street,
        address_barangay: data.address_barangay,
        address_city: data.address_city,
        address_province: data.address_province,
        ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
        // The signature is account state — see `Account.signature_url`.
        ...(data.signature_url !== undefined
          ? {
              accounts: {
                updateMany: {
                  where: {},
                  data: { signature_url: data.signature_url },
                },
              },
            }
          : {}),
      },
      select: { user_id: true },
    });
  }

  /** Mobile edit — the free-text address column only; the portal's split
   * address fields are left as they are. */
  async updateMobileProfile(
    userId: string,
    data: UpdateMobileProfileDto & { avatar?: string },
  ) {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        firstname: data.firstname,
        middle_name: data.middle_name || null,
        lastname: data.lastname,
        phone_number: data.phone_number,
        gender: data.gender,
        age: data.age,
        ...(data.current_address !== undefined
          ? { current_address: data.current_address }
          : {}),
        household_size: data.household_size ?? null,
        ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
      },
      select: { user_id: true },
    });
  }

  /** Sets (or replaces) the profile photo of one side of the account. */
  async upsertRoleAvatar(
    userId: string,
    roleType: RoleType,
    avatarUrl: string,
  ) {
    return this.prisma.userRoleAvatar.upsert({
      where: { user_id_role_type: { user_id: userId, role_type: roleType } },
      create: { user_id: userId, role_type: roleType, avatar_url: avatarUrl },
      update: { avatar_url: avatarUrl },
      select: { user_role_avatar_id: true },
    });
  }

  /**
   * Records a proof-of-residency upload and moves the person to the address
   * OCR read off it. The portal's split address columns are cleared so the
   * new free-text address is what every reader shows, not the stale split.
   */
  async applyResidencyDocument(
    userId: string,
    data: {
      file_url: string;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      extracted_address: string;
    },
  ) {
    return this.prisma.$transaction([
      this.prisma.residencyDocument.create({
        data: { ...data, user_id: userId },
        select: { residency_document_id: true },
      }),
      this.prisma.user.update({
        where: { user_id: userId },
        data: {
          current_address: data.extracted_address,
          address_street: null,
          address_barangay: null,
          address_city: null,
          address_province: null,
        },
        select: { user_id: true },
      }),
    ]);
  }

  async findResidencyDocument(userId: string, documentId: string) {
    return this.prisma.residencyDocument.findFirst({
      where: { residency_document_id: documentId, user_id: userId },
      select: { file_url: true, mime_type: true, file_name: true },
    });
  }

  async findIdNumberOwner(idNumber: string, excludeUserId: string) {
    return this.prisma.userSchoolInfo.findFirst({
      where: { id_number: idNumber, NOT: { user_id: excludeUserId } },
      select: { user_id: true },
    });
  }

  /**
   * Rewrites the volunteer's school record from a fresh OCR read. The latest
   * row is updated in place (there is one per volunteer in practice); a
   * volunteer with none yet gets one created. Department / major / year level
   * are looked up by name the same way registration does.
   */
  async replaceSchoolRecord(
    userId: string,
    data: {
      id_number: string;
      department: string;
      major: string;
      year_level: string;
      graduation_year: number;
      graduation_month: number;
      graduation_day: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const [department, major, yearLevel] = await Promise.all([
        this.findOrCreateByName(
          tx.department,
          'department_id',
          data.department,
        ),
        this.findOrCreateByName(tx.major, 'major_id', data.major),
        this.findOrCreateByName(tx.yearLevel, 'year_level_id', data.year_level),
      ]);

      const fields = {
        id_number: data.id_number,
        graduation_year: data.graduation_year,
        graduation_month: data.graduation_month,
        graduation_day: data.graduation_day,
        department_id: department,
        major_id: major,
        year_level_id: yearLevel,
      };

      const existing = await tx.userSchoolInfo.findFirst({
        where: { user_id: userId },
        orderBy: { createdAt: 'desc' },
        select: { user_school_info_id: true },
      });

      if (existing) {
        return tx.userSchoolInfo.update({
          where: { user_school_info_id: existing.user_school_info_id },
          data: fields,
          select: { user_school_info_id: true },
        });
      }

      return tx.userSchoolInfo.create({
        data: { ...fields, user_id: userId },
        select: { user_school_info_id: true },
      });
    });
  }

  /** `department` / `major` / `yearLevel` share one `{ id, name }` shape. */
  private async findOrCreateByName<K extends string>(
    table: {
      findFirst(args: {
        where: { name: string };
        select: Record<K, true>;
      }): Promise<Record<K, string> | null>;
      create(args: {
        data: { name: string };
        select: Record<K, true>;
      }): Promise<Record<K, string>>;
    },
    idField: K,
    name: string,
  ): Promise<string> {
    const normalized = name.trim();
    const select = { [idField]: true } as Record<K, true>;
    const existing = await table.findFirst({
      where: { name: normalized },
      select,
    });
    if (existing) return existing[idField];
    const created = await table.create({ data: { name: normalized }, select });
    return created[idField];
  }

  async findPhoneOwner(phoneNumber: string, excludeUserId: string) {
    return this.prisma.user.findFirst({
      where: {
        phone_number: phoneNumber,
        NOT: { user_id: excludeUserId },
      },
      select: { user_id: true },
    });
  }
}
