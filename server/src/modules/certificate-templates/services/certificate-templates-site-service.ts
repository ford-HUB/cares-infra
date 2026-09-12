import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  CertificateAssetKind,
  CertificateOrientation,
  CertificateTemplateCategory,
  CertificateTemplateStatus,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { S3Service } from '../../../infastructures/s3/s3-service';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type { AuditLogChangeDto } from '../../audit-logs/dto/audit-logs-site-dto';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type {
  CertificateDesignDto,
  CertificateTemplateDto,
  CreateCertificateTemplateDto,
  SaveCertificateTemplateDto,
  SignatoryCoordinatorDto,
  StoredCertificateDesign,
  StoredCertificateImage,
} from '../dto/certificate-templates-site-dto';
import { designAssetIds, toDesignDto } from './certificate-design-mapper';
import {
  CertificateTemplatesRepository,
  type CertificateTemplateRow,
  type CoordinatorRow,
  type PersistSignatory,
} from '../repositories/certificate-templates-repository';
import {
  CERTIFICATE_IMAGE_MAX_BYTES,
  CERTIFICATE_IMAGE_MIMES,
  CERTIFICATE_SVG_MAX_BYTES,
  CERTIFICATE_SVG_MIMES,
  SIGNATURE_IMAGE_TOKEN,
} from '../validators/certificate-templates-site-validator';

type Category = CertificateTemplateDto['category'];
type Status = CertificateTemplateDto['status'];
type Orientation = CertificateTemplateDto['orientation'];

/** Where each block sits on a brand-new sheet — mirrors the customizer's defaults. */
const DEFAULT_LAYOUT = {
  headline: { x: 50, y: 25 },
  title: { x: 50, y: 43 },
  body: { x: 50, y: 58 },
  seal: { x: 50, y: 73 },
  signatures: { x: 50, y: 88 },
};

const DEFAULT_BODY =
  'This certifies that {{recipient}} took part in {{event}} held on {{date}}.';

const CATEGORY_HEADLINES: Record<Category, string> = {
  participation: 'Certificate of Participation',
  appreciation: 'Certificate of Appreciation',
  volunteer_hours: 'Certificate of Volunteer Service',
  completion: 'Certificate of Completion',
  sponsorship: 'Certificate of Sponsorship',
};

const CATEGORY_ACCENTS: Record<Category, CertificateDesignDto['accent']> = {
  participation: 'sky',
  appreciation: 'rose',
  volunteer_hours: 'violet',
  completion: 'emerald',
  sponsorship: 'amber',
};

/**
 * The line printed under a signatory's name. Portal accounts carry a role and a
 * department, not a free-text job title, so the role is what the certificate prints.
 */
const ROLE_TITLES: Record<string, string> = {
  [RoleType.ADMIN]: 'Administrator',
  [RoleType.DIRECTOR]: 'Program Director',
  [RoleType.COORDINATOR]: 'Coordinator',
};

const DEFAULT_DEPARTMENT = 'UCLM CARES';

@Injectable()
export class CertificateTemplatesSiteService {
  private readonly logger = new Logger(CertificateTemplatesSiteService.name);

  constructor(
    private readonly repository: CertificateTemplatesRepository,
    private readonly s3Service: S3Service,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async listTemplates(): Promise<CertificateTemplateDto[]> {
    const templates = await this.repository.findAll();
    return templates.map((template) => this.mapToDto(template));
  }

  async listCoordinators(): Promise<SignatoryCoordinatorDto[]> {
    const coordinators = await this.repository.listCoordinators();
    return coordinators.map((coordinator) => mapCoordinator(coordinator));
  }

  async createTemplate(
    caller: JwtPayload,
    data: CreateCertificateTemplateDto,
    context: RequestContextDto = {},
  ): Promise<CertificateTemplateDto> {
    const author = await this.resolveCaller(caller);
    const reference = await this.nextReference();

    // A certificate needs someone to sign it, and the director creating it is the one
    // account we know is present — they can swap the line in the customizer.
    const signatory: PersistSignatory = {
      coordinatorUserId: author.user_id,
      name: fullName(author),
      title: titleOf(author),
      department: departmentOf(author),
      signatureToken: SIGNATURE_IMAGE_TOKEN,
      position: 0,
    };

    const design: StoredCertificateDesign = {
      accent: CATEGORY_ACCENTS[data.category],
      frame: 'plain',
      layout: DEFAULT_LAYOUT,
      font: 'default',
      element_fonts: {},
      element_sizes: {},
      element_widths: {},
      element_heights: {},
      element_aligns: {},
      headline: CATEGORY_HEADLINES[data.category],
      body: DEFAULT_BODY,
      show_seal: false,
      seal_label: '',
      images: [],
    };

    const created = await this.repository.create(
      reference,
      {
        name: data.name,
        description: data.description,
        category: toPrismaCategory(data.category),
        // New designs start as drafts: a template is not deployable until a director
        // has actually looked at it in the customizer.
        status: CertificateTemplateStatus.DRAFT,
        orientation: toPrismaOrientation(data.orientation),
        design,
        updatedByUserId: author.user_id,
        updatedByName: fullName(author),
      },
      [signatory],
    );

    await this.auditLogRecorder.record({
      action: 'certificate-template.created',
      description: `Created the certificate template "${created.name}"`,
      category: 'CERTIFICATE',
      actor: caller,
      targetType: 'certificate-template',
      targetLabel: created.name,
      targetId: created.certificate_template_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { reference: created.reference },
    });

    return this.mapToDto(created);
  }

  async saveTemplate(
    caller: JwtPayload,
    id: string,
    data: SaveCertificateTemplateDto,
    context: RequestContextDto = {},
  ): Promise<CertificateTemplateDto> {
    const existing = await this.requireTemplate(id);
    const author = await this.resolveCaller(caller);

    const signatories = await this.resolveSignatories(data.signatories);
    const { design, orphanAssetIds } = await this.ingestDesign(
      existing,
      data.design,
    );

    const changes = diffTemplate(existing, data);

    const updated = await this.repository.update(
      id,
      {
        name: data.name,
        description: data.description,
        category: toPrismaCategory(data.category),
        status: toPrismaStatus(data.status),
        orientation: toPrismaOrientation(data.orientation),
        design,
        updatedByUserId: author.user_id,
        updatedByName: fullName(author),
      },
      signatories,
    );

    // Only once the save is committed: a file dropped from a design that then failed
    // to save would take the still-referenced original with it.
    await this.discardAssets(existing, orphanAssetIds);

    await this.auditLogRecorder.record({
      action: 'certificate-template.updated',
      description: changes.length
        ? `Updated the certificate template "${updated.name}" (${changes.length} field${changes.length === 1 ? '' : 's'})`
        : `Saved the certificate template "${updated.name}" with no changes`,
      category: 'CERTIFICATE',
      actor: caller,
      targetType: 'certificate-template',
      targetLabel: updated.name,
      targetId: updated.certificate_template_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes,
      metadata: {
        reference: updated.reference,
        signatories: signatories.map((one) => one.name).join(', '),
      },
    });

    return this.mapToDto(updated);
  }

  async deleteTemplate(
    caller: JwtPayload,
    id: string,
    context: RequestContextDto = {},
  ): Promise<{ id: string }> {
    const existing = await this.requireTemplate(id);

    if (existing.issued > 0) {
      throw new ConflictException(
        'Certificates have already been issued from this template — archive it instead',
      );
    }
    if (existing.deployed_events > 0) {
      throw new ConflictException(
        'This template is deployed to an event — remove it there first',
      );
    }

    await this.repository.delete(id);
    await this.discardAssets(
      existing,
      existing.assets.map((asset) => asset.certificate_template_asset_id),
    );

    await this.auditLogRecorder.record({
      action: 'certificate-template.deleted',
      description: `Deleted the certificate template "${existing.name}"`,
      category: 'CERTIFICATE',
      // The row is gone, so this entry is the only remaining record of the design.
      severity: 'WARNING',
      actor: caller,
      targetType: 'certificate-template',
      targetLabel: existing.name,
      targetId: existing.certificate_template_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { reference: existing.reference },
    });

    return { id };
  }

  /**
   * The imported files sit in a private bucket, so their S3 URLs cannot go in an
   * `<img src>` — the portal reads them through here. A content-hash ETag plus
   * `no-cache` lets the browser revalidate rather than re-download a sheet's artwork
   * on every redraw of the customizer.
   */
  async getAsset(
    templateId: string,
    assetId: string,
  ): Promise<{ buffer: Buffer; contentType: string; etag: string }> {
    const asset = await this.repository.findAsset(templateId, assetId);
    if (!asset) {
      throw new NotFoundException('Template asset not found');
    }

    const object = await this.s3Service.getObject(asset.storage_key);

    return {
      buffer: object.buffer,
      contentType: asset.content_type || object.contentType,
      etag: `"${createHash('sha1').update(object.buffer).digest('hex')}"`,
    };
  }

  /**
   * Resolves one signature line's `{{signature-image}}` to the actual image the
   * coordinator uploaded on their profile. The customizer never calls this — a
   * director picks an account, not a picture — but the print job does, and so does
   * anything else that has to render a finished certificate.
   */
  async getSignatorySignature(
    templateId: string,
    signatoryId: string,
  ): Promise<{ buffer: Buffer; contentType: string; etag: string }> {
    const template = await this.requireTemplate(templateId);
    const signatory = template.signatories.find(
      (one) => one.certificate_template_signatory_id === signatoryId,
    );

    if (!signatory) {
      throw new NotFoundException('Signatory not found on this template');
    }

    const storedUrl = signatory.coordinator.accounts[0]?.signature_url;
    if (!storedUrl) {
      throw new NotFoundException(
        `${signatory.name} has not uploaded a signature image`,
      );
    }

    const object = await this.s3Service.getObject(storedUrl);

    return {
      buffer: object.buffer,
      contentType: object.contentType,
      etag: `"${createHash('sha1').update(object.buffer).digest('hex')}"`,
    };
  }

  private async requireTemplate(id: string): Promise<CertificateTemplateRow> {
    const template = await this.repository.findById(id);
    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }
    return template;
  }

  private async resolveCaller(caller: JwtPayload): Promise<CoordinatorRow> {
    const [author] = await this.repository.findCoordinators([caller.sub]);
    if (!author) {
      throw new NotFoundException('The signed-in account no longer exists');
    }
    return author;
  }

  /**
   * `CT-2026-014`. Read-then-write rather than a sequence, so the reference stays
   * human and restarts each year; the unique index is what actually guarantees it, and
   * two directors creating a template in the same second is not a case worth a lock.
   */
  private async nextReference(): Promise<string> {
    const year = new Date().getFullYear();
    const highest = await this.repository.highestReferenceSequence(year);
    return `CT-${year}-${String(highest + 1).padStart(3, '0')}`;
  }

  /**
   * Signature lines are built from the directory, never from what the caller typed:
   * the name over a coordinator's signature has to be that coordinator's own.
   */
  private async resolveSignatories(
    requested: SaveCertificateTemplateDto['signatories'],
  ): Promise<PersistSignatory[]> {
    const ids = requested.map((one) => one.coordinator_id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'The same coordinator cannot sign a certificate twice',
      );
    }

    const accounts = await this.repository.findCoordinators(ids);
    const byId = new Map(
      accounts.map((account) => [account.user_id, account] as const),
    );

    return ids.map((id, position) => {
      const account = byId.get(id);
      if (!account) {
        throw new BadRequestException(
          'One of the signatories is not a staff account',
        );
      }

      return {
        coordinatorUserId: account.user_id,
        name: fullName(account),
        title: titleOf(account),
        department: departmentOf(account),
        signatureToken: SIGNATURE_IMAGE_TOKEN,
        position,
      };
    });
  }

  /**
   * Turns the design the portal submitted into the one that is stored: every file
   * arrives either as a `data:` URL being imported on this save — uploaded to S3 here
   * and recorded as an asset row — or as the asset route of a file already held, which
   * is kept as-is. Anything the new design no longer mentions comes back as an orphan
   * for the caller to drop once the save is committed.
   */
  private async ingestDesign(
    template: CertificateTemplateRow,
    incoming: CertificateDesignDto,
  ): Promise<{ design: StoredCertificateDesign; orphanAssetIds: string[] }> {
    const known = new Set(
      template.assets.map((asset) => asset.certificate_template_asset_id),
    );
    const used = new Set<string>();

    const resolve = async (
      reference: string,
      kind: CertificateAssetKind,
      fallbackName: string,
    ): Promise<string> => {
      const assetId = reference.startsWith('data:')
        ? await this.storeDataUrl(
            template.certificate_template_id,
            reference,
            kind,
            fallbackName,
          )
        : assetIdFromRoute(reference);

      if (!assetId || (!known.has(assetId) && !reference.startsWith('data:'))) {
        throw new BadRequestException(
          'An imported file does not belong to this template',
        );
      }

      used.add(assetId);
      return assetId;
    };

    const images: StoredCertificateImage[] = [];
    for (const image of incoming.images) {
      images.push({
        id: image.id,
        asset_id: await resolve(
          image.url,
          CertificateAssetKind.IMAGE,
          image.name,
        ),
        name: image.name,
        x: image.x,
        y: image.y,
        width: image.width,
        height: image.height,
        shape: image.shape,
        z: image.z,
      });
    }

    const frameAssetId = incoming.frame_svg_url
      ? await resolve(
          incoming.frame_svg_url,
          CertificateAssetKind.FRAME,
          incoming.frame_svg_name ?? 'frame.svg',
        )
      : undefined;

    const sealAssetId = incoming.seal_svg_url
      ? await resolve(
          incoming.seal_svg_url,
          CertificateAssetKind.SEAL,
          incoming.seal_svg_name ?? 'seal.svg',
        )
      : undefined;

    return {
      // Written out rather than spread from the request: the stored shape holds asset
      // ids where the request holds URLs, and spreading would carry a stale `images`
      // or `*_svg_url` key into the JSON the next read trusts.
      design: {
        accent: incoming.accent,
        frame: incoming.frame,
        ...(frameAssetId
          ? {
              frame_asset_id: frameAssetId,
              frame_svg_name: incoming.frame_svg_name,
            }
          : {}),
        layout: incoming.layout,
        font: incoming.font,
        element_fonts: incoming.element_fonts,
        element_sizes: incoming.element_sizes,
        element_widths: incoming.element_widths,
        element_heights: incoming.element_heights,
        element_aligns: incoming.element_aligns,
        headline: incoming.headline,
        body: incoming.body,
        show_seal: incoming.show_seal,
        seal_label: incoming.seal_label,
        seal_style: incoming.seal_style,
        seal_accent: incoming.seal_accent,
        ...(sealAssetId
          ? {
              seal_asset_id: sealAssetId,
              seal_svg_name: incoming.seal_svg_name,
            }
          : {}),
        images,
      },
      orphanAssetIds: [...known].filter((assetId) => !used.has(assetId)),
    };
  }

  /** Decodes one `data:` URL, checks it, and puts the bytes in the bucket. */
  private async storeDataUrl(
    templateId: string,
    dataUrl: string,
    kind: CertificateAssetKind,
    fileName: string,
  ): Promise<string> {
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
    if (!match) {
      throw new BadRequestException(
        'An imported file could not be read — re-import it',
      );
    }

    const [, contentType, encoded] = match;
    const buffer = Buffer.from(encoded, 'base64');

    if (buffer.length === 0) {
      throw new BadRequestException('An imported file is empty');
    }

    const svgOnly = kind !== CertificateAssetKind.IMAGE;
    const allowed = svgOnly ? CERTIFICATE_SVG_MIMES : CERTIFICATE_IMAGE_MIMES;
    const limit = svgOnly
      ? CERTIFICATE_SVG_MAX_BYTES
      : CERTIFICATE_IMAGE_MAX_BYTES;

    if (!(allowed as readonly string[]).includes(contentType)) {
      throw new BadRequestException(
        svgOnly
          ? 'A frame or seal must be an SVG file'
          : 'Only PNG, JPG, SVG or WebP images can be placed on a certificate',
      );
    }
    if (buffer.length > limit) {
      throw new BadRequestException(
        `Each imported file must be ${Math.round(limit / 1024)} KB or smaller`,
      );
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-64);
    const key = `certificate-templates/${templateId}/${kind.toLowerCase()}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;

    await this.s3Service.uploadToS3(key, buffer, contentType);

    const asset = await this.repository.createAsset(templateId, {
      kind,
      storageKey: key,
      fileName,
      contentType,
      byteSize: buffer.length,
    });

    return asset.certificate_template_asset_id;
  }

  /**
   * Drops files no design references any more. Best effort on the S3 side: a leaked
   * object costs storage, whereas failing the save the director already completed
   * costs them their work.
   */
  private async discardAssets(
    template: CertificateTemplateRow,
    assetIds: string[],
  ): Promise<void> {
    if (assetIds.length === 0) return;

    // A live deployment prints from a frozen copy of the design that still points at
    // this template's artwork, so anything a deployment holds is not an orphan however
    // far the template itself has moved on.
    const deployed = new Set(
      (
        await this.repository.deploymentDesigns(
          template.certificate_template_id,
        )
      ).flatMap(designAssetIds),
    );

    const droppable = assetIds.filter((assetId) => !deployed.has(assetId));
    if (droppable.length === 0) return;

    const keys = template.assets
      .filter((asset) =>
        droppable.includes(asset.certificate_template_asset_id),
      )
      .map((asset) => asset.storage_key);

    await this.repository.deleteAssets(droppable);

    for (const key of keys) {
      try {
        await this.s3Service.deleteFromS3(key);
      } catch (error) {
        this.logger.warn(
          `Failed to remove certificate asset ${key}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
  }

  private mapToDto(template: CertificateTemplateRow): CertificateTemplateDto {
    const design = template.design as unknown as StoredCertificateDesign;

    return {
      id: template.certificate_template_id,
      reference: template.reference,
      name: template.name,
      description: template.description,
      category: fromPrismaCategory(template.category),
      status: fromPrismaStatus(template.status),
      orientation: fromPrismaOrientation(template.orientation),
      issued: template.issued,
      deployed_events: template.deployed_events,
      design: toDesignDto(design, template.certificate_template_id),
      signatories: template.signatories.map((signatory) => ({
        id: signatory.certificate_template_signatory_id,
        coordinator_id: signatory.coordinator_user_id,
        name: signatory.name,
        title: signatory.title,
        department: signatory.department,
        signature_token: signatory.signature_token,
        has_signature: Boolean(
          signatory.coordinator.accounts[0]?.signature_url,
        ),
      })),
      updated_at: template.updatedAt.toISOString(),
      updated_by: template.updated_by_name,
    };
  }
}

/** `/api/v1/certificate-templates/:id/assets/:assetId` → `:assetId`. */
function assetIdFromRoute(reference: string): string | null {
  return /\/assets\/([^/?#]+)/.exec(reference)?.[1] ?? null;
}

function fullName(user: CoordinatorRow): string {
  return `${user.firstname} ${user.lastname}`.trim();
}

function titleOf(user: CoordinatorRow): string {
  return ROLE_TITLES[user.role.type] ?? 'Coordinator';
}

function departmentOf(user: CoordinatorRow): string {
  return user.portal_department?.trim() || DEFAULT_DEPARTMENT;
}

function mapCoordinator(user: CoordinatorRow): SignatoryCoordinatorDto {
  return {
    id: user.user_id,
    name: fullName(user),
    title: titleOf(user),
    department: departmentOf(user),
    email: user.accounts[0]?.email ?? '',
    has_signature: Boolean(user.accounts[0]?.signature_url),
  };
}

function toPrismaCategory(category: Category): CertificateTemplateCategory {
  return category.toUpperCase() as CertificateTemplateCategory;
}

function fromPrismaCategory(category: CertificateTemplateCategory): Category {
  return category.toLowerCase() as Category;
}

function toPrismaStatus(status: Status): CertificateTemplateStatus {
  return status.toUpperCase() as CertificateTemplateStatus;
}

function fromPrismaStatus(status: CertificateTemplateStatus): Status {
  return status.toLowerCase() as Status;
}

function toPrismaOrientation(orientation: Orientation): CertificateOrientation {
  return orientation.toUpperCase() as CertificateOrientation;
}

function fromPrismaOrientation(
  orientation: CertificateOrientation,
): Orientation {
  return orientation.toLowerCase() as Orientation;
}

/**
 * Field-level before/after pairs for the audit trail. The design blob is reported as
 * one line rather than field by field: a save moves a dozen coordinates, and listing
 * them would bury the wording and status changes a review actually reads.
 */
function diffTemplate(
  previous: CertificateTemplateRow,
  next: SaveCertificateTemplateDto,
): AuditLogChangeDto[] {
  const design = previous.design as unknown as StoredCertificateDesign;

  const pairs: [string, string, string][] = [
    ['name', previous.name, next.name],
    ['description', previous.description, next.description],
    ['category', fromPrismaCategory(previous.category), next.category],
    ['status', fromPrismaStatus(previous.status), next.status],
    [
      'orientation',
      fromPrismaOrientation(previous.orientation),
      next.orientation,
    ],
    ['headline', design.headline, next.design.headline],
    ['body', design.body, next.design.body],
    ['accent', design.accent, next.design.accent],
    ['frame', design.frame, next.design.frame],
  ];

  const changes = pairs
    .filter(([, before, after]) => before !== after)
    .map(([field, before, after]) => ({ field, before, after }));

  // Compared by account rather than by printed name: the names are re-read from the
  // directory on every save, so a rename elsewhere is not an edit to this template.
  const beforeIds = previous.signatories
    .map((one) => one.coordinator_user_id)
    .join(', ');
  const afterIds = next.signatories.map((one) => one.coordinator_id).join(', ');
  if (beforeIds !== afterIds) {
    changes.push({
      field: 'signatories',
      before: previous.signatories.map((one) => one.name).join(', '),
      after: `${next.signatories.length} account${next.signatories.length === 1 ? '' : 's'}`,
    });
  }

  return changes;
}
