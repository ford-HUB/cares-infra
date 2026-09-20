import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { S3Service } from '../../../infastructures/s3/s3-service';
import { CertificateTemplatesRepository } from '../../certificate-templates/repositories/certificate-templates-repository';
import {
  certificateAssetRoute,
  toDesignDto,
} from '../../certificate-templates/services/certificate-design-mapper';
import type {
  IssuedCertificateDto,
  IssuedCertificateListDto,
  StoredIssuedDesign,
} from '../dto/certificates-mobile-dto';
import {
  CertificatesRepository,
  type IssuedCertificateRow,
} from '../repositories/certificates-repository';
import { fillCertificateText, fillValuesOf } from './certificate-fill';
import { withCertificateStorage } from './certificate-storage-guard';

type Category = IssuedCertificateDto['category'];
type Orientation = IssuedCertificateDto['orientation'];

/** The volunteer's certificate wallet: what was issued to them, and each sheet. */
@Injectable()
export class CertificatesMobileService {
  constructor(
    private readonly repository: CertificatesRepository,
    private readonly templatesRepository: CertificateTemplatesRepository,
    private readonly s3Service: S3Service,
  ) {}

  async listMine(userId: string): Promise<IssuedCertificateListDto> {
    const rows = await withCertificateStorage(() =>
      this.repository.findForUser(userId),
    );
    return { certificates: rows.map((row) => toDto(row)) };
  }

  /**
   * One certificate, opened. The first open is what the live page counts as
   * "claimed" — the volunteer has actually seen the sheet, not just been sent it.
   */
  async open(userId: string, id: string): Promise<IssuedCertificateDto> {
    const row = await this.requireOwned(userId, id);
    const claimed = row.claimed_at
      ? row
      : await this.repository.markClaimed(
          row.issued_certificate_id,
          new Date(),
        );
    return toDto(claimed);
  }

  /**
   * One piece of the sheet's artwork — frame, seal or an imported image. The bytes
   * still live with the template the deployment was cut from; this route lets the
   * volunteer's own certificate reach them without the portal's rights.
   */
  async getAsset(
    userId: string,
    id: string,
    assetId: string,
  ): Promise<{ buffer: Buffer; contentType: string; etag: string }> {
    const row = await this.requireOwned(userId, id);
    const design = row.design as unknown as StoredIssuedDesign;
    const asset = await this.templatesRepository.findAsset(
      design.template_id,
      assetId,
    );
    if (!asset) {
      throw new NotFoundException('Certificate artwork not found');
    }

    const object = await this.s3Service.getObject(asset.storage_key);
    return {
      buffer: object.buffer,
      contentType: asset.content_type || object.contentType,
      etag: `"${createHash('sha1').update(object.buffer).digest('hex')}"`,
    };
  }

  /** The signature image a line on this certificate was issued with. */
  async getSignature(
    userId: string,
    id: string,
    signatoryId: string,
  ): Promise<{ buffer: Buffer; contentType: string; etag: string }> {
    const row = await this.requireOwned(userId, id);
    const design = row.design as unknown as StoredIssuedDesign;
    const line = design.signatories.find((one) => one.id === signatoryId);
    if (!line) {
      throw new NotFoundException('Signatory not found on this certificate');
    }
    if (!line.signature_key) {
      throw new NotFoundException(
        `${line.name} had no signature image when this certificate was issued`,
      );
    }

    const object = await this.s3Service.getObject(line.signature_key);
    return {
      buffer: object.buffer,
      contentType: object.contentType,
      etag: `"${createHash('sha1').update(object.buffer).digest('hex')}"`,
    };
  }

  private async requireOwned(
    userId: string,
    id: string,
  ): Promise<IssuedCertificateRow> {
    const row = await this.repository.findByIdForUser(id, userId);
    if (!row) throw new NotFoundException('Certificate not found');
    return row;
  }
}

/** `/api/v1/certificates/:id/signatories/:signatoryId/signature` — the app's route. */
function signatureRoute(certificateId: string, signatoryId: string): string {
  return `/api/v1/certificates/${certificateId}/signatories/${signatoryId}/signature`;
}

function toDto(row: IssuedCertificateRow): IssuedCertificateDto {
  const design = row.design as unknown as StoredIssuedDesign;
  const values = fillValuesOf(row);
  // `toDesignDto` builds the portal's asset routes; they are rewritten onto this
  // certificate's own asset route, which the volunteer's token can fetch.
  const drawn = rerouteAssets(
    toDesignDto(design, design.template_id),
    design.template_id,
    row.issued_certificate_id,
  );

  return {
    id: row.issued_certificate_id,
    certificate_number: row.certificate_number,
    deployment_id: row.certificate_deployment_id,
    event_id: row.event_id,
    template_name: row.template_name,
    category: row.category.toLowerCase() as Category,
    orientation: row.orientation.toLowerCase() as Orientation,
    recipient_name: row.recipient_name,
    event_name: row.event_name,
    event_date: row.event_date.toISOString(),
    hours_rendered: row.hours_rendered,
    organization: row.organization,
    headline: fillCertificateText(design.headline, values),
    body: fillCertificateText(design.body, values),
    design: {
      ...drawn,
      headline: fillCertificateText(design.headline, values),
      body: fillCertificateText(design.body, values),
      signatories: design.signatories.map((line) => ({
        id: line.id,
        name: line.name,
        title: line.title,
        department: line.department,
        signature_url: line.signature_key
          ? signatureRoute(row.issued_certificate_id, line.id)
          : null,
      })),
    },
    issued_at: row.issued_at.toISOString(),
    claimed_at: row.claimed_at ? row.claimed_at.toISOString() : null,
  };
}

/** `/api/v1/certificates/:id/assets/:assetId` — the app's route to one artwork file. */
function certificateOwnAssetRoute(
  certificateId: string,
  assetId: string,
): string {
  return `/api/v1/certificates/${certificateId}/assets/${assetId}`;
}

function rerouteAssets<T extends ReturnType<typeof toDesignDto>>(
  design: T,
  templateId: string,
  certificateId: string,
): T {
  const prefix = certificateAssetRoute(templateId, '');
  const reroute = (url: string | undefined) =>
    url && url.startsWith(prefix)
      ? certificateOwnAssetRoute(certificateId, url.slice(prefix.length))
      : url;

  return {
    ...design,
    ...(design.frame_svg_url
      ? { frame_svg_url: reroute(design.frame_svg_url) }
      : {}),
    ...(design.seal_svg_url
      ? { seal_svg_url: reroute(design.seal_svg_url) }
      : {}),
    images: design.images.map((image) => ({
      ...image,
      url: reroute(image.url) ?? image.url,
    })),
  };
}
