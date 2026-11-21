import { PermissionKey, RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { PARTNER_BARANGAYS } from '../../../../../src/modules/auth/validators/auth-mobile-validator';
import {
  CREDENTIAL_MAX_HOURS,
  CREDENTIAL_MIN_HOURS,
  PROVISIONABLE_DEPARTMENTS,
  ProvisionVolunteerTypeSchema,
  ProvisionableRoleSchema,
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
  oneOf,
  useUsersApp,
} from '../users-site-support';

/**
 * Users Module · Master — Accounts — invalid inputs (field validation).
 *
 * Every case is an intentionally wrong value in the Add user, Reissue credentials or
 * Block IP dialog. Expected result: FAIL — the request is rejected with
 * "Validation failed" (400), the stated field carries the stated message, and the
 * service is never reached. A case whose input is refused that way is Passed.
 * The valid cases live in ../valid/.
 */

const ALL_PERMISSIONS = Object.values(PermissionKey);

/** An address of exactly `length` characters. */
const emailOfLength = (length: number) => `${'a'.repeat(length - '@uclm.edu.ph'.length)}@uclm.edu.ph`;

/* Messages the schema reports — custom ones from users-site-validator.ts, the rest Zod's. */
const MSG = {
  recipientEmail: 'A valid recipient email address is required',
  email: 'A valid email address is required',
  manualEmailRequired: 'An email address is required when entering it manually',
  emailTooLong: 'Too big: expected string to have <=160 characters',
  mode: oneOf(['manual', 'generate']),
  role: oneOf(ProvisionableRoleSchema.options),
  volunteerType: oneOf(ProvisionVolunteerTypeSchema.options),
  volunteerTypeRequired: 'Choose whether the volunteer is a student, staff, alumni or partner barangay',
  volunteerTypeNotApplicable: 'A volunteer type only applies to volunteer accounts',
  partnerBarangay: oneOf(PARTNER_BARANGAYS),
  partnerBarangayRequired: 'Choose the partner barangay the volunteer belongs to',
  partnerBarangayNotApplicable: 'A partner barangay only applies to partner barangay volunteers',
  partnerBarangayDepartment: 'A partner barangay volunteer is not part of a department',
  department: oneOf(PROVISIONABLE_DEPARTMENTS),
  permissionKey: oneOf(ALL_PERMISSIONS),
  permissionsTooMany: `Too big: expected array to have <=${ALL_PERMISSIONS.length} items`,
  permissionsAppRole: 'Access scope only applies to portal accounts',
  lifetimeTooSmall: `Too small: expected number to be >=${CREDENTIAL_MIN_HOURS}`,
  lifetimeTooBig: `Too big: expected number to be <=${CREDENTIAL_MAX_HOURS}`,
  lifetimeNotWhole: 'Invalid input: expected int, received number',
  ipAddress: 'A valid IP address is required',
  reasonTooLong: 'Too big: expected string to have <=500 characters',
  reasonControlChar: 'Reason cannot contain control characters',
  userId: 'A valid user id is required',
  expected: (type: string, received: string) => `Invalid input: expected ${type}, received ${received}`,
  unknownKey: (key: string) => `Unrecognized key: "${key}"`,
};

const VOLUNTEER = { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'STUDENT' };
const PARTNER_VOLUNTEER = { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'PARTNER_BARANGAY', partner_barangay: 'Barangay Looc' };

/* ── Add user — POST /api/v1/users ─────────────────────────────────────────── */

const addUserCases: FieldCase[] = [
  // Send credentials to (recipient_email)
  { name: 'Admin leaves "Send credentials to" out of the request', input: { ...VALID_GENERATE, recipient_email: undefined }, expected: 'FAIL', field: 'recipient_email', message: MSG.recipientEmail },
  { name: 'Admin leaves "Send credentials to" empty', input: { ...VALID_GENERATE, recipient_email: '' }, expected: 'FAIL', field: 'recipient_email', message: MSG.recipientEmail },
  { name: 'Admin enters only spaces in "Send credentials to"', input: { ...VALID_GENERATE, recipient_email: '   ' }, expected: 'FAIL', field: 'recipient_email', message: MSG.recipientEmail },
  { name: 'Admin enters an address without "@" in "Send credentials to"', input: { ...VALID_GENERATE, recipient_email: 'name.uclm.edu.ph' }, expected: 'FAIL', field: 'recipient_email', message: MSG.recipientEmail },
  { name: 'Admin enters an address without a domain in "Send credentials to"', input: { ...VALID_GENERATE, recipient_email: 'name@' }, expected: 'FAIL', field: 'recipient_email', message: MSG.recipientEmail },
  { name: 'Admin enters an address without a name in "Send credentials to"', input: { ...VALID_GENERATE, recipient_email: '@uclm.edu.ph' }, expected: 'FAIL', field: 'recipient_email', message: MSG.recipientEmail },
  // Sign-in email (mode + email)
  { name: 'Admin leaves the sign-in email choice (Generate / Manual) out of the request', input: { ...VALID_GENERATE, mode: undefined }, expected: 'FAIL', field: 'mode', message: MSG.mode },
  { name: 'Admin sends a sign-in email choice that is neither Generate nor Manual', input: { ...VALID_GENERATE, mode: 'import' }, expected: 'FAIL', field: 'mode', message: MSG.mode },
  { name: 'Admin sends the sign-in email choice in upper case (GENERATE)', input: { ...VALID_GENERATE, mode: 'GENERATE' }, expected: 'FAIL', field: 'mode', message: MSG.mode },
  { name: 'Admin sends an empty sign-in email choice', input: { ...VALID_GENERATE, mode: '' }, expected: 'FAIL', field: 'mode', message: MSG.mode },
  { name: 'Admin chooses Manual but enters no sign-in email', input: { ...VALID_MANUAL, email: undefined }, expected: 'FAIL', field: 'email', message: MSG.manualEmailRequired },
  { name: 'Admin chooses Manual and leaves the sign-in email empty', input: { ...VALID_MANUAL, email: '' }, expected: 'FAIL', field: 'email', message: MSG.email },
  { name: 'Admin chooses Manual and enters a sign-in email without "@"', input: { ...VALID_MANUAL, email: 'requester.uclm.edu.ph' }, expected: 'FAIL', field: 'email', message: MSG.email },
  { name: 'Admin chooses Manual and enters a sign-in email without a domain', input: { ...VALID_MANUAL, email: 'requester@' }, expected: 'FAIL', field: 'email', message: MSG.email },
  { name: 'Admin chooses Manual and enters a sign-in email of 161 characters (one over the limit)', input: { ...VALID_MANUAL, email: emailOfLength(161) }, expected: 'FAIL', field: 'email', message: MSG.emailTooLong },

  // Role
  { name: 'Admin leaves the Role out of the request', input: { ...VALID_GENERATE, role_type: undefined }, expected: 'FAIL', field: 'role_type', message: MSG.role },
  { name: 'Admin sends an empty Role', input: { ...VALID_GENERATE, role_type: '' }, expected: 'FAIL', field: 'role_type', message: MSG.role },
  { name: 'Admin sends a Role that does not exist (SUPERADMIN)', input: { ...VALID_GENERATE, role_type: 'SUPERADMIN' }, expected: 'FAIL', field: 'role_type', message: MSG.role },
  { name: 'Admin sends the Role in lower case (coordinator)', input: { ...VALID_GENERATE, role_type: 'coordinator' }, expected: 'FAIL', field: 'role_type', message: MSG.role },
  { name: 'Admin sends the Volunteer role in lower case', input: { ...VOLUNTEER, role_type: 'volunteer' }, expected: 'FAIL', field: 'role_type', message: MSG.role },

  // Volunteer type
  { name: 'Admin selects the Volunteer role without a volunteer type', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER }, expected: 'FAIL', field: 'volunteer_type', message: MSG.volunteerTypeRequired },
  { name: 'Admin sends a volunteer type that does not exist (FACULTY)', input: { ...VOLUNTEER, volunteer_type: 'FACULTY' }, expected: 'FAIL', field: 'volunteer_type', message: MSG.volunteerType },
  { name: 'Admin sends the volunteer type in lower case (student)', input: { ...VOLUNTEER, volunteer_type: 'student' }, expected: 'FAIL', field: 'volunteer_type', message: MSG.volunteerType },
  { name: 'Admin sends a volunteer type on a Coordinator account', input: { ...VALID_GENERATE, volunteer_type: 'STUDENT' }, expected: 'FAIL', field: 'volunteer_type', message: MSG.volunteerTypeNotApplicable },
  { name: 'Admin sends a volunteer type on a Donor account', input: { ...VALID_GENERATE, role_type: RoleType.DONOR, volunteer_type: 'STAFF' }, expected: 'FAIL', field: 'volunteer_type', message: MSG.volunteerTypeNotApplicable },
  { name: 'Admin sends a volunteer type on a Beneficiary account', input: { ...VALID_GENERATE, role_type: RoleType.BENEFICIARY, volunteer_type: 'ALUMNI' }, expected: 'FAIL', field: 'volunteer_type', message: MSG.volunteerTypeNotApplicable },

  // Partner barangay
  { name: 'Admin selects a Partner Barangay volunteer without choosing the barangay', input: { ...PARTNER_VOLUNTEER, partner_barangay: undefined }, expected: 'FAIL', field: 'partner_barangay', message: MSG.partnerBarangayRequired },
  { name: 'Admin sends a barangay that is not a partner (Barangay Lahug)', input: { ...PARTNER_VOLUNTEER, partner_barangay: 'Barangay Lahug' }, expected: 'FAIL', field: 'partner_barangay', message: MSG.partnerBarangay },
  { name: 'Admin sends the partner barangay in lower case', input: { ...PARTNER_VOLUNTEER, partner_barangay: 'barangay looc' }, expected: 'FAIL', field: 'partner_barangay', message: MSG.partnerBarangay },
  { name: 'Admin sends the partner barangay without the "Barangay" prefix', input: { ...PARTNER_VOLUNTEER, partner_barangay: 'Looc' }, expected: 'FAIL', field: 'partner_barangay', message: MSG.partnerBarangay },
  { name: 'Admin sends a partner barangay on a Student volunteer', input: { ...VOLUNTEER, partner_barangay: 'Barangay Opao' }, expected: 'FAIL', field: 'partner_barangay', message: MSG.partnerBarangayNotApplicable },
  { name: 'Admin sends a partner barangay on a Coordinator account', input: { ...VALID_GENERATE, partner_barangay: 'Barangay Opao' }, expected: 'FAIL', field: 'partner_barangay', message: MSG.partnerBarangayNotApplicable },
  { name: 'Admin selects a department for a Partner Barangay volunteer', input: { ...PARTNER_VOLUNTEER, department: 'College of Nursing' }, expected: 'FAIL', field: 'department', message: MSG.partnerBarangayDepartment },

  // Department
  { name: 'Admin sends a department that is not on the list', input: { ...VALID_GENERATE, department: 'College of Astronomy' }, expected: 'FAIL', field: 'department', message: MSG.department },
  { name: 'Admin sends the department in lower case', input: { ...VALID_GENERATE, department: 'college of nursing' }, expected: 'FAIL', field: 'department', message: MSG.department },
  { name: 'Admin sends the department as an abbreviation (CCS)', input: { ...VALID_GENERATE, department: 'CCS' }, expected: 'FAIL', field: 'department', message: MSG.department },
  { name: 'Admin sends an empty department instead of "No department"', input: { ...VALID_GENERATE, department: '' }, expected: 'FAIL', field: 'department', message: MSG.department },
  { name: 'Admin sends a number as the department', input: { ...VALID_GENERATE, department: 7 }, expected: 'FAIL', field: 'department', message: MSG.expected('string', 'number') },

  // Access scope (permissions)
  { name: 'Admin sends an Access scope action that does not exist', input: { ...VALID_GENERATE, permissions: ['ALL'] }, expected: 'FAIL', field: 'permissions.0', message: MSG.permissionKey },
  { name: 'Admin sends an Access scope action in lower case', input: { ...VALID_GENERATE, permissions: [ALL_PERMISSIONS[0].toLowerCase()] }, expected: 'FAIL', field: 'permissions.0', message: MSG.permissionKey },
  { name: 'Admin sends more Access scope actions than exist (one repeated)', input: { ...VALID_GENERATE, permissions: [...ALL_PERMISSIONS, ALL_PERMISSIONS[0]] }, expected: 'FAIL', field: 'permissions', message: MSG.permissionsTooMany },
  { name: 'Admin sends the Access scope as a single text value instead of a list', input: { ...VALID_GENERATE, permissions: ALL_PERMISSIONS[0] }, expected: 'FAIL', field: 'permissions', message: MSG.expected('array', 'string') },
  { name: 'Admin sets an Access scope on a Volunteer account', input: { ...VOLUNTEER, permissions: [] }, expected: 'FAIL', field: 'permissions', message: MSG.permissionsAppRole },
  { name: 'Admin sets an Access scope on a Donor account', input: { ...VALID_GENERATE, role_type: RoleType.DONOR, permissions: ALL_PERMISSIONS.slice(0, 1) }, expected: 'FAIL', field: 'permissions', message: MSG.permissionsAppRole },
  { name: 'Admin sets an Access scope on a Beneficiary account', input: { ...VALID_GENERATE, role_type: RoleType.BENEFICIARY, permissions: ALL_PERMISSIONS.slice(0, 1) }, expected: 'FAIL', field: 'permissions', message: MSG.permissionsAppRole },

  // Credentials expire in (expires_in_hours)
  { name: 'Admin sets "Credentials expire in" to 0 hours', input: { ...VALID_GENERATE, expires_in_hours: 0 }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.lifetimeTooSmall },
  { name: 'Admin sets "Credentials expire in" to a negative number of hours', input: { ...VALID_GENERATE, expires_in_hours: -24 }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.lifetimeTooSmall },
  { name: `Admin sets "Credentials expire in" to ${CREDENTIAL_MAX_HOURS + 1} hours (one over 90 days)`, input: { ...VALID_GENERATE, expires_in_hours: CREDENTIAL_MAX_HOURS + 1 }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.lifetimeTooBig },
  { name: 'Admin sets "Credentials expire in" to a fraction of an hour (1.5)', input: { ...VALID_GENERATE, expires_in_hours: 1.5 }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.lifetimeNotWhole },
  { name: 'Admin sends "Credentials expire in" as text ("72")', input: { ...VALID_GENERATE, expires_in_hours: '72' }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.expected('number', 'string') },
  { name: 'Admin sends "Credentials expire in" as null', input: { ...VALID_GENERATE, expires_in_hours: null }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.expected('number', 'null') },

  // Fields the dialog does not have
  { name: 'Admin submits an empty Add user form', input: {}, expected: 'FAIL', field: 'recipient_email', message: MSG.recipientEmail },
  { name: 'Admin sends a password of their choosing (the password is always generated)', input: { ...VALID_GENERATE, password: 'Chosen!Passw0rd' }, expected: 'FAIL', field: '', message: MSG.unknownKey('password') },
  { name: 'Admin sends the person\'s first name (filled in by the account holder later)', input: { ...VALID_GENERATE, firstname: 'Juan' }, expected: 'FAIL', field: '', message: MSG.unknownKey('firstname') },
];

/* ── Reissue credentials — POST /api/v1/users/:id/reissue-credentials ──────── */

const reissueCases: FieldCase[] = [
  { name: 'Admin re-issues credentials that expire in 0 hours', input: { expires_in_hours: 0 }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.lifetimeTooSmall },
  { name: 'Admin re-issues credentials with a negative lifetime', input: { expires_in_hours: -1 }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.lifetimeTooSmall },
  { name: `Admin re-issues credentials that expire in ${CREDENTIAL_MAX_HOURS + 1} hours (one over 90 days)`, input: { expires_in_hours: CREDENTIAL_MAX_HOURS + 1 }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.lifetimeTooBig },
  { name: 'Admin re-issues credentials with a fractional lifetime (2.5 hours)', input: { expires_in_hours: 2.5 }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.lifetimeNotWhole },
  { name: 'Admin re-issues credentials with the lifetime as text ("24")', input: { expires_in_hours: '24' }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.expected('number', 'string') },
  { name: 'Admin re-issues credentials with the lifetime as null', input: { expires_in_hours: null }, expected: 'FAIL', field: 'expires_in_hours', message: MSG.expected('number', 'null') },
  { name: 'Admin re-issues credentials with a password of their choosing', input: { ...VALID_REISSUE, password: 'Chosen!Passw0rd' }, expected: 'FAIL', field: '', message: MSG.unknownKey('password') },
  { name: 'Admin re-issues credentials with a different sign-in email', input: { ...VALID_REISSUE, email: 'other@uclm.edu.ph' }, expected: 'FAIL', field: '', message: MSG.unknownKey('email') },
];

/* ── Block IP — POST /api/v1/users/:id/block-ip ────────────────────────────── */

const blockCases: FieldCase[] = [
  { name: 'Admin sends an empty IP address', input: { ...VALID_BLOCK, ip_address: '' }, expected: 'FAIL', field: 'ip_address', message: MSG.ipAddress },
  { name: 'Admin enters an IPv4 address with an octet over 255', input: { ...VALID_BLOCK, ip_address: '256.1.1.1' }, expected: 'FAIL', field: 'ip_address', message: MSG.ipAddress },
  { name: 'Admin enters an IPv4 address with only three octets', input: { ...VALID_BLOCK, ip_address: '10.0.1' }, expected: 'FAIL', field: 'ip_address', message: MSG.ipAddress },
  { name: 'Admin enters an IPv4 address with five octets', input: { ...VALID_BLOCK, ip_address: '10.0.0.1.5' }, expected: 'FAIL', field: 'ip_address', message: MSG.ipAddress },
  { name: 'Admin enters a CIDR range instead of one address', input: { ...VALID_BLOCK, ip_address: '10.0.0.0/8' }, expected: 'FAIL', field: 'ip_address', message: MSG.ipAddress },
  { name: 'Admin enters an IP address with a port', input: { ...VALID_BLOCK, ip_address: '203.0.113.10:8080' }, expected: 'FAIL', field: 'ip_address', message: MSG.ipAddress },
  { name: 'Admin enters a hostname instead of an IP address', input: { ...VALID_BLOCK, ip_address: 'localhost' }, expected: 'FAIL', field: 'ip_address', message: MSG.ipAddress },
  { name: 'Admin enters an IPv6 address with an invalid group', input: { ...VALID_BLOCK, ip_address: '2001:db8::zzzz' }, expected: 'FAIL', field: 'ip_address', message: MSG.ipAddress },
  { name: 'Admin sends the IP address as a number', input: { ...VALID_BLOCK, ip_address: 3405803786 }, expected: 'FAIL', field: 'ip_address', message: MSG.ipAddress },
  { name: 'Admin enters a reason of 501 characters (one over the limit)', input: { ...VALID_BLOCK, reason: 'a'.repeat(501) }, expected: 'FAIL', field: 'reason', message: MSG.reasonTooLong },
  { name: 'Admin pastes a reason containing a non-printing character', input: { ...VALID_BLOCK, reason: 'Repeated\u0007 failed sign-ins' }, expected: 'FAIL', field: 'reason', message: MSG.reasonControlChar },
  { name: 'Admin sends the reason as a number', input: { ...VALID_BLOCK, reason: 404 }, expected: 'FAIL', field: 'reason', message: MSG.expected('string', 'number') },
  { name: 'Admin sends who blocked the address (always the signed-in admin)', input: { ...VALID_BLOCK, blocked_by_user_id: VALID_USER_ID }, expected: 'FAIL', field: '', message: MSG.unknownKey('blocked_by_user_id') },
];

/* ── :id path segment (Reissue credentials · Block IP) ─────────────────────── */

const userIdCases: FieldCase<string>[] = [
  { name: 'Admin acts on a user whose id is not a UUID', input: 'user-1', expected: 'FAIL', message: MSG.userId },
  { name: 'Admin acts on a user whose id is a number', input: '42', expected: 'FAIL', message: MSG.userId },
  { name: 'Admin acts on a user whose id is one character short', input: VALID_USER_ID.slice(0, -1), expected: 'FAIL', message: MSG.userId },
  { name: 'Admin acts on a user whose id has no hyphens', input: VALID_USER_ID.replace(/-/g, ''), expected: 'FAIL', message: MSG.userId },
  { name: 'Admin acts on a user whose id contains a non-hex character', input: `${VALID_USER_ID.slice(0, -1)}g`, expected: 'FAIL', message: MSG.userId },
];

describe('users site · master — field validation (invalid inputs)', () => {
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
