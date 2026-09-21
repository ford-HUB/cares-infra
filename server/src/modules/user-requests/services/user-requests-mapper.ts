import type { UserRequestRow } from '../repositories/user-requests-repository';
import type { MobileUserRequestDto } from '../dto/user-requests-mobile-dto';
import type {
  UserRequestAttachmentDto,
  UserRequestDto,
} from '../dto/user-requests-site-dto';

/** Only the proof files actually on the row are listed. */
export function attachmentsOf(row: UserRequestRow): UserRequestAttachmentDto[] {
  const attachments: UserRequestAttachmentDto[] = [];
  if (row.id_front_url)
    attachments.push({
      kind: 'id-front',
      label: 'Valid ID (front)',
      content_type: null,
    });
  if (row.id_back_url)
    attachments.push({
      kind: 'id-back',
      label: 'Valid ID (back)',
      content_type: null,
    });
  if (row.selfie_url)
    attachments.push({
      kind: 'selfie',
      label: 'Face verification selfie',
      content_type: null,
    });
  if (row.residency_proof_url)
    attachments.push({
      kind: 'residency-proof',
      label: 'Proof of residency',
      content_type: row.residency_proof_mime,
    });
  return attachments;
}

export function toSiteDto(row: UserRequestRow): UserRequestDto {
  return {
    user_request_id: row.user_request_id,
    reference_number: row.reference_number,
    kind: row.kind,
    status: row.status,
    requester_id: row.user_id,
    requester_firstname: row.user.firstname,
    requester_lastname: row.user.lastname,
    requester_email: row.user.accounts[0]?.email ?? '',
    requester_role_type: row.user.role.type,
    requester_barangay: row.user.address_barangay,
    requested_role: row.requested_role,
    event_id: row.event_id,
    event_title: row.event?.title ?? null,
    event_started: row.event?.event_started.toISOString() ?? null,
    summary: row.summary,
    face_similarity: row.face_similarity,
    attachments: attachmentsOf(row),
    decided_by_name: row.decided_by
      ? `${row.decided_by.firstname} ${row.decided_by.lastname}`.trim()
      : null,
    decided_at: row.decided_at?.toISOString() ?? null,
    trail: row.trail.map((entry) => ({
      user_request_trail_entry_id: entry.user_request_trail_entry_id,
      label: entry.label,
      actor_name: entry.actor_name,
      created_at: entry.createdAt.toISOString(),
    })),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toMobileDto(row: UserRequestRow): MobileUserRequestDto {
  return {
    user_request_id: row.user_request_id,
    reference_number: row.reference_number,
    kind: row.kind,
    status: row.status,
    requested_role: row.requested_role,
    event_id: row.event_id,
    summary: row.summary,
    decided_at: row.decided_at?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}
