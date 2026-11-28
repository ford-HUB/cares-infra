import { Injectable } from '@nestjs/common';
import {
  CertificateAssetKind,
  CertificateOrientation,
  CertificateTemplateCategory,
  CertificateTemplateStatus,
  Prisma,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import { PORTAL_ROLE_TYPES } from '../../../shared/constants/portal-role-types';
import type { StoredCertificateDesign } from '../dto/certificate-templates-site-dto';

const templateInclude = {
  signatories: {
    orderBy: { position: 'asc' },
    include: {
      coordinator: {
        select: {
          user_id: true,
          accounts: { select: { signature_url: true }, take: 1 },
        },
      },
    },
  },
  assets: true,
} satisfies Prisma.CertificateTemplateInclude;

export type CertificateTemplateRow = Prisma.CertificateTemplateGetPayload<{
  include: typeof templateInclude;
}>;

export interface PersistTemplateDetails {
  name: string;
  description: string;
  category: CertificateTemplateCategory;
  status: CertificateTemplateStatus;
  orientation: CertificateOrientation;
  design: StoredCertificateDesign;
  updatedByUserId: string | null;
  updatedByName: string;
}

export interface PersistSignatory {
  coordinatorUserId: string;
  name: string;
  title: string;
  department: string;
  signatureToken: string;
  position: number;
}

export interface PersistAsset {
  kind: CertificateAssetKind;
  storageKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}

const coordinatorSelect = {
  user_id: true,
  firstname: true,
  lastname: true,
  portal_department: true,
  role: { select: { type: true } },
  accounts: { select: { email: true, signature_url: true }, take: 1 },
} satisfies Prisma.UserSelect;

export type CoordinatorRow = Prisma.UserGetPayload<{
  select: typeof coordinatorSelect;
}>;

@Injectable()
export class CertificateTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CertificateTemplateRow[]> {
    return this.prisma.certificateTemplate.findMany({
      include: templateInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string): Promise<CertificateTemplateRow | null> {
    return this.prisma.certificateTemplate.findUnique({
      where: { certificate_template_id: id },
      include: templateInclude,
    });
  }

  async create(
    reference: string,
    details: PersistTemplateDetails,
    signatories: PersistSignatory[],
  ): Promise<CertificateTemplateRow> {
    return this.prisma.certificateTemplate.create({
      data: {
        reference,
        ...this.toTemplateData(details),
        signatories: { create: signatories.map(toSignatoryData) },
      },
      include: templateInclude,
    });
  }

  /** One transaction so wording and signatories stay in step; lines replaced (max three, order matters). */
  async update(
    id: string,
    details: PersistTemplateDetails,
    signatories: PersistSignatory[],
  ): Promise<CertificateTemplateRow> {
    return this.prisma.$transaction(async (tx) => {
      await tx.certificateTemplateSignatory.deleteMany({
        where: { certificate_template_id: id },
      });

      return tx.certificateTemplate.update({
        where: { certificate_template_id: id },
        data: {
          ...this.toTemplateData(details),
          signatories: { create: signatories.map(toSignatoryData) },
        },
        include: templateInclude,
      });
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.certificateTemplate.delete({
      where: { certificate_template_id: id },
    });
  }

  async createAsset(templateId: string, asset: PersistAsset) {
    return this.prisma.certificateTemplateAsset.create({
      data: {
        certificate_template_id: templateId,
        kind: asset.kind,
        storage_key: asset.storageKey,
        file_name: asset.fileName,
        content_type: asset.contentType,
        byte_size: asset.byteSize,
      },
    });
  }

  async findAsset(templateId: string, assetId: string) {
    return this.prisma.certificateTemplateAsset.findFirst({
      where: {
        certificate_template_asset_id: assetId,
        certificate_template_id: templateId,
      },
    });
  }

  /** Deployments reference template artwork, so a dropped file may still be in use. */
  async deploymentDesigns(
    templateId: string,
  ): Promise<StoredCertificateDesign[]> {
    const deployments = await this.prisma.certificateDeployment.findMany({
      where: { certificate_template_id: templateId },
      select: { design: true },
    });

    return deployments.map(
      (deployment) => deployment.design as unknown as StoredCertificateDesign,
    );
  }

  async deleteAssets(assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) return;

    await this.prisma.certificateTemplateAsset.deleteMany({
      where: { certificate_template_asset_id: { in: assetIds } },
    });
  }

  /** `CT-2026-014`: sequence restarts yearly. */
  async highestReferenceSequence(year: number): Promise<number> {
    const latest = await this.prisma.certificateTemplate.findFirst({
      where: { reference: { startsWith: `CT-${year}-` } },
      orderBy: { reference: 'desc' },
      select: { reference: true },
    });

    if (!latest) return 0;

    const sequence = Number(latest.reference.split('-')[2]);
    return Number.isFinite(sequence) ? sequence : 0;
  }

  /** Excludes restricted accounts. */
  async listCoordinators(): Promise<CoordinatorRow[]> {
    return this.prisma.user.findMany({
      where: {
        accounts: { none: { is_restricted: true } },
        role: { type: { in: PORTAL_ROLE_TYPES as unknown as RoleType[] } },
      },
      select: coordinatorSelect,
      orderBy: [{ firstname: 'asc' }, { lastname: 'asc' }],
    });
  }

  async findCoordinators(userIds: string[]): Promise<CoordinatorRow[]> {
    return this.prisma.user.findMany({
      where: { user_id: { in: userIds } },
      select: coordinatorSelect,
    });
  }

  private toTemplateData(details: PersistTemplateDetails) {
    return {
      name: details.name,
      description: details.description,
      category: details.category,
      status: details.status,
      orientation: details.orientation,
      design: details.design as unknown as Prisma.InputJsonValue,
      updated_by_user_id: details.updatedByUserId,
      updated_by_name: details.updatedByName,
    };
  }
}

function toSignatoryData(signatory: PersistSignatory) {
  return {
    coordinator_user_id: signatory.coordinatorUserId,
    name: signatory.name,
    title: signatory.title,
    department: signatory.department,
    signature_token: signatory.signatureToken,
    position: signatory.position,
  };
}
