import { PermissionKey, RoleType } from '../../../../../src/infastructures/prisma/common/client';
import {
  CREDENTIAL_MAX_HOURS,
  CREDENTIAL_MIN_HOURS,
  PROVISIONABLE_DEPARTMENTS,
} from '../../../../../src/modules/users/validators/users-site-validator';
import {
  BLOCK_IP_ENDPOINT,
  CREATE_ENDPOINT,
  FieldCase,
  REISSUE_ENDPOINT,
  VALID_BLOCK,
  VALID_GENERATE,
  VALID_MANUAL,
  VALID_REISSUE,
  VALID_USER_ID,
  fieldBodyCases,
  fieldUserIdCases,
  useUsersApp,
} from '../users-site-support';

/**
 * Users Module · Master — Accounts — valid inputs (field validation).
 *
 * Every case is a legitimate value an administrator can submit from the Add user,
 * Reissue credentials or Block IP dialog. Expected result: PASS — the request is
 * accepted and handed to the service once. The invalid cases live in ../invalid/.
 */

const ALL_PERMISSIONS = Object.values(PermissionKey);

/** An address of exactly `length` characters. */
const emailOfLength = (length: number) => `${'a'.repeat(length - '@uclm.edu.ph'.length)}@uclm.edu.ph`;

const withoutLifetime = <T extends { expires_in_hours?: number }>(body: T) => {
  const { expires_in_hours: _omitted, ...rest } = body;
  return rest;
};

/* ── Add user — POST /api/v1/users ─────────────────────────────────────────── */

const addUserCases: FieldCase[] = [
  // Send credentials to (recipient_email)
  { name: 'Admin enters a valid address in "Send credentials to" with Generate selected', input: VALID_GENERATE, expected: 'PASS' },
  { name: 'Admin enters a UCLM address in "Send credentials to"', input: { ...VALID_GENERATE, recipient_email: 'juan.delacruz@uclm.edu.ph' }, expected: 'PASS' },
  { name: 'Admin enters a "Send credentials to" address of exactly 160 characters', input: { ...VALID_GENERATE, recipient_email: emailOfLength(160) }, expected: 'PASS' },
  { name: 'Admin enters a "Send credentials to" address with a plus tag and subdomain', input: { ...VALID_GENERATE, recipient_email: 'staff+cares@mail.uclm.edu.ph' }, expected: 'PASS' },

  // Sign-in email (mode + email)
  { name: 'Admin chooses Generate for the sign-in email and enters no address', input: VALID_GENERATE, expected: 'PASS' },
  { name: 'Admin chooses Manual for the sign-in email and enters a valid address', input: VALID_MANUAL, expected: 'PASS' },
  { name: 'Admin chooses Manual and uses the same address as "Send credentials to"', input: { ...VALID_MANUAL, email: VALID_MANUAL.recipient_email }, expected: 'PASS' },
  { name: 'Admin chooses Manual and enters a sign-in email of exactly 160 characters', input: { ...VALID_MANUAL, email: emailOfLength(160) }, expected: 'PASS' },
  { name: 'Admin chooses Generate while an address from the request is still filled in', input: { ...VALID_GENERATE, email: 'requester@uclm.edu.ph' }, expected: 'PASS' },

  // Role
  { name: 'Admin selects the Admin role', input: { ...VALID_GENERATE, role_type: RoleType.ADMIN }, expected: 'PASS' },
  { name: 'Admin selects the Director role', input: { ...VALID_GENERATE, role_type: RoleType.DIRECTOR }, expected: 'PASS' },
  { name: 'Admin selects the Coordinator role', input: { ...VALID_GENERATE, role_type: RoleType.COORDINATOR }, expected: 'PASS' },
  { name: 'Admin selects the Donor role (Regular User)', input: { ...VALID_GENERATE, role_type: RoleType.DONOR }, expected: 'PASS' },
  { name: 'Admin selects the Beneficiary role (Regular User)', input: { ...VALID_GENERATE, role_type: RoleType.BENEFICIARY }, expected: 'PASS' },

  // Volunteer type (Volunteer role only)
  { name: 'Admin selects the Volunteer role with volunteer type Student', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'STUDENT' }, expected: 'PASS' },
  { name: 'Admin selects the Volunteer role with volunteer type Staff', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'STAFF' }, expected: 'PASS' },
  { name: 'Admin selects the Volunteer role with volunteer type Alumni', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'ALUMNI' }, expected: 'PASS' },
  { name: 'Admin selects the Volunteer role with volunteer type Partner Barangay and Barangay Looc', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'PARTNER_BARANGAY', partner_barangay: 'Barangay Looc' }, expected: 'PASS' },
  { name: 'Admin selects a Partner Barangay volunteer from Barangay Opao', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'PARTNER_BARANGAY', partner_barangay: 'Barangay Opao' }, expected: 'PASS' },
  { name: 'Admin selects a Partner Barangay volunteer from Barangay Umapad', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'PARTNER_BARANGAY', partner_barangay: 'Barangay Umapad' }, expected: 'PASS' },
  { name: 'Admin selects a Partner Barangay volunteer from Barangay Paknaan', input: { ...VALID_MANUAL, role_type: RoleType.VOLUNTEER, volunteer_type: 'PARTNER_BARANGAY', partner_barangay: 'Barangay Paknaan' }, expected: 'PASS' },

  // Department (optional)
  { name: 'Admin leaves Department on "No department"', input: VALID_GENERATE, expected: 'PASS' },
  ...PROVISIONABLE_DEPARTMENTS.map((department): FieldCase => ({
    name: `Admin selects the department "${department}"`,
    input: { ...VALID_GENERATE, department },
    expected: 'PASS',
  })),
  { name: 'Admin selects a department for a Student volunteer', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'STUDENT', department: 'College of Computer Studies' }, expected: 'PASS' },

  // Access scope (permissions, portal roles only)
  { name: 'Admin leaves Access scope on the role default', input: VALID_GENERATE, expected: 'PASS' },
  { name: 'Admin clears every action in Access scope', input: { ...VALID_GENERATE, permissions: [] }, expected: 'PASS' },
  { name: 'Admin picks some actions in Access scope', input: { ...VALID_GENERATE, permissions: ALL_PERMISSIONS.slice(0, 2) }, expected: 'PASS' },
  { name: 'Admin picks every action in Access scope', input: { ...VALID_GENERATE, permissions: ALL_PERMISSIONS }, expected: 'PASS' },

  // Credentials expire in (expires_in_hours)
  { name: 'Admin leaves "Credentials expire in" unset (defaults to 3 days)', input: withoutLifetime(VALID_GENERATE), expected: 'PASS' },
  { name: `Admin sets "Credentials expire in" to the minimum of ${CREDENTIAL_MIN_HOURS} hour`, input: { ...VALID_GENERATE, expires_in_hours: CREDENTIAL_MIN_HOURS }, expected: 'PASS' },
  { name: 'Admin sets "Credentials expire in" to 1 day (24 hours)', input: { ...VALID_GENERATE, expires_in_hours: 24 }, expected: 'PASS' },
  { name: 'Admin sets "Credentials expire in" to 3 days (72 hours)', input: { ...VALID_GENERATE, expires_in_hours: 72 }, expected: 'PASS' },
  { name: 'Admin sets "Credentials expire in" to 7 days (168 hours)', input: { ...VALID_GENERATE, expires_in_hours: 168 }, expected: 'PASS' },
  { name: `Admin sets "Credentials expire in" to the maximum of 90 days (${CREDENTIAL_MAX_HOURS} hours)`, input: { ...VALID_GENERATE, expires_in_hours: CREDENTIAL_MAX_HOURS }, expected: 'PASS' },

  // Every field together
  {
    name: 'Admin fills in every field of the Add user dialog',
    input: { ...VALID_MANUAL, department: 'College of Nursing', permissions: ALL_PERMISSIONS.slice(0, 3), expires_in_hours: 168 },
    expected: 'PASS',
  },
];

/* ── Reissue credentials — POST /api/v1/users/:id/reissue-credentials ──────── */

const reissueCases: FieldCase[] = [
  { name: 'Admin re-issues credentials that expire in 1 day', input: VALID_REISSUE, expected: 'PASS' },
  { name: 'Admin re-issues credentials without choosing a lifetime (defaults to 3 days)', input: {}, expected: 'PASS' },
  { name: `Admin re-issues credentials that expire in the minimum of ${CREDENTIAL_MIN_HOURS} hour`, input: { expires_in_hours: CREDENTIAL_MIN_HOURS }, expected: 'PASS' },
  { name: 'Admin re-issues credentials that expire in 3 days (72 hours)', input: { expires_in_hours: 72 }, expected: 'PASS' },
  { name: `Admin re-issues credentials that expire in the maximum of 90 days (${CREDENTIAL_MAX_HOURS} hours)`, input: { expires_in_hours: CREDENTIAL_MAX_HOURS }, expected: 'PASS' },
];

/* ── Block IP — POST /api/v1/users/:id/block-ip ────────────────────────────── */

const blockCases: FieldCase[] = [
  { name: 'Admin blocks an IPv4 address and gives a reason', input: VALID_BLOCK, expected: 'PASS' },
  { name: 'Admin blocks an IPv4 address without a reason', input: { ip_address: VALID_BLOCK.ip_address }, expected: 'PASS' },
  { name: 'Admin blocks the last sign-in IP (no address) with a reason', input: { reason: VALID_BLOCK.reason }, expected: 'PASS' },
  { name: 'Admin blocks the last sign-in IP with no address and no reason', input: {}, expected: 'PASS' },
  { name: 'Admin blocks a full IPv6 address', input: { ip_address: '2001:db8:85a3::8a2e:370:7334' }, expected: 'PASS' },
  { name: 'Admin blocks a compressed IPv6 address (::1)', input: { ip_address: '::1' }, expected: 'PASS' },
  { name: 'Admin blocks the IPv4 address 0.0.0.0', input: { ip_address: '0.0.0.0' }, expected: 'PASS' },
  { name: 'Admin blocks the IPv4 address 255.255.255.255', input: { ip_address: '255.255.255.255' }, expected: 'PASS' },
  { name: 'Admin leaves the reason empty', input: { ...VALID_BLOCK, reason: '' }, expected: 'PASS' },
  { name: 'Admin enters a reason of exactly 500 characters', input: { ...VALID_BLOCK, reason: 'a'.repeat(500) }, expected: 'PASS' },
  { name: 'Admin enters a reason over several lines', input: { ...VALID_BLOCK, reason: 'Repeated failed sign-ins\nFlagged by the security policy' }, expected: 'PASS' },
  { name: 'Admin enters a reason with punctuation and digits', input: { ...VALID_BLOCK, reason: 'Five failed sign-ins (09:14–09:16), see ticket #42.' }, expected: 'PASS' },
];

/* ── :id path segment (Reissue credentials · Block IP) ─────────────────────── */

const userIdCases: FieldCase<string>[] = [
  { name: 'Admin acts on a user with a valid id', input: VALID_USER_ID, expected: 'PASS' },
  { name: 'Admin acts on a user whose id is in upper case', input: VALID_USER_ID.toUpperCase(), expected: 'PASS' },
];

describe('users site · master — field validation (valid inputs)', () => {
  const ctx = useUsersApp();

  describe('POST /api/v1/users', () => {
    fieldBodyCases(ctx, CREATE_ENDPOINT, addUserCases);
  });

  describe('POST /api/v1/users/:id/reissue-credentials', () => {
    fieldBodyCases(ctx, REISSUE_ENDPOINT, reissueCases);
    fieldUserIdCases(ctx, REISSUE_ENDPOINT, userIdCases);
  });

  describe('POST /api/v1/users/:id/block-ip', () => {
    fieldBodyCases(ctx, BLOCK_IP_ENDPOINT, blockCases);
    fieldUserIdCases(ctx, BLOCK_IP_ENDPOINT, userIdCases);
  });
});
