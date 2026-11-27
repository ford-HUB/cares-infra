# CARES Data Dictionary

Generated from `server/src/infastructures/prisma/schema.prisma` (PostgreSQL) on 2026-11-22: 57 tables, 635 columns, 54 enumerated types. Regenerate with `python docs/erd/tools/data_dictionary.py`; a print-ready copy is in [data-dictionary.pdf](data-dictionary.pdf).

## Conventions

| Term | Meaning |
|---|---|
| PK | Primary key: uniquely identifies each record. |
| FK | Foreign key: refers to the primary key of another table. |
| UNIQUE | No two records may hold the same value. |
| NOT NULL | A value is required. |
| NULL | The column may be left empty. |
| TEXT | Variable-length string (PostgreSQL). Identifiers generated as UUIDs are stored as TEXT. |
| INT / SERIAL | Whole number; SERIAL is an INT that numbers itself automatically. |
| FLOAT | Decimal number (double precision). |
| TIMESTAMP | Date and time. |
| JSONB | Structured JSON document. |
| Type[] | A list of values of that type. |
| Enum types | A data type such as RoleType is a fixed list of allowed values, listed in the Enumerated Types section. |

## Tables

| # | Table | Description |
|---|---|---|
| 1 | [User](#table-1-user) | Every person with a CARES account: portal staff (admins, directors, coordinators) and mobile users (volunteers, donors, beneficiaries). Holds the profile; sign-in credentials live in Account. |
| 2 | [Role](#table-2-role) | The roles a user can hold. A user's role decides which client they use and their baseline permissions. |
| 3 | [Account](#table-3-account) | Sign-in credentials and account status for a user: email, password hash, temporary-credential expiry, email verification and restriction. |
| 4 | [OAuthIdentity](#table-4-oauthidentity) | A social identity (Google or Facebook) that may sign in as a CARES user. No provider token is stored: it is verified at sign-in and discarded. |
| 5 | [GmailConnection](#table-5-gmailconnection) | A Google mailbox a portal user linked for the portal's mail module. Tokens are refreshed server-side; disconnecting deletes the row. |
| 6 | [UserRoleAvatar](#table-6-userroleavatar) | A mobile user's profile photo for one side of their account (volunteer, donor or beneficiary), so each side keeps its own picture. |
| 7 | [RolePermissionDefault](#table-7-rolepermissiondefault) | Baseline permissions every user of a role inherits. |
| 8 | [UserPermissionOverride](#table-8-userpermissionoverride) | A per-user exception to the role baseline. Only rows that differ from the role default are stored. |
| 9 | [UserActionSuspension](#table-9-useractionsuspension) | A violation-driven suspension of one action. It sits over the user's granted rights, so lifting it restores the original access. |
| 10 | [UserVerification](#table-10-userverification) | One ID check per registration submission, with the face biometric captured for that check. |
| 11 | [UserBiometric](#table-11-userbiometric) | A biometric template (face scan) enrolled during an ID verification. |
| 12 | [UserSchoolInfo](#table-12-userschoolinfo) | School record of a student or alumni user, read from the school ID at registration. |
| 13 | [Department](#table-13-department) | Lookup list of colleges and departments used in school records. |
| 14 | [Major](#table-14-major) | Lookup list of programs and majors used in school records. |
| 15 | [YearLevel](#table-15-yearlevel) | Lookup list of year levels used in school records. |
| 16 | [ResidencyDocument](#table-16-residencydocument) | Proof of residency (barangay certificate or clearance) a mobile user uploaded to change their address. OCR reads the address off the file; the file stays on record. |
| 17 | [SecurityPolicy](#table-17-securitypolicy) | Portal-wide security settings (password rules, lockout, sessions, sign-in hours, IP allowlist). Exactly one row. |
| 18 | [BlockedIp](#table-18-blockedip) | IP addresses that are refused at sign-in (the denylist). |
| 19 | [LoginActivity](#table-19-loginactivity) | One row per sign-in attempt, successful or not. Append-only. |
| 20 | [AuditLog](#table-20-auditlog) | One row per privileged action. Append-only; the actor's name, email and role are copied at write time so later changes cannot rewrite history. |
| 21 | [Event](#table-21-event) | A volunteer or outreach event published by staff, with its schedule, capacity, geofence and donation settings. |
| 22 | [EventAttendance](#table-22-eventattendance) | One volunteer's registration for one event, and the geofence attendance ruling for it. |
| 23 | [EventLocationPing](#table-23-eventlocationping) | One GPS reading from a volunteer's device, sent live (GEOFENCE) or later as an offline CSV batch (OFFLINE_SYNC). Used by the attendance validation service. |
| 24 | [Interest](#table-24-interest) | Catalog of volunteer interests offered at sign-up; mirrors the event categories. |
| 25 | [UserInterest](#table-25-userinterest) | The interests a volunteer selected, used to match them with events. |
| 26 | [RankingSettings](#table-26-rankingsettings) | How the volunteer and donor leaderboards are scored and how the tier ladder is cut. One row. |
| 27 | [EvaluationForm](#table-27-evaluationform) | A post-event questionnaire the director builds in the portal. Volunteers see it once PUBLISHED. |
| 28 | [EvaluationAssignment](#table-28-evaluationassignment) | Which questionnaire an event asks its participants. An event without a row uses the default form. |
| 29 | [EvaluationResponse](#table-29-evaluationresponse) | One volunteer's answers to the questionnaire for one completed event. |
| 30 | [CertificateTemplate](#table-30-certificatetemplate) | A certificate design a director maintains in the portal. The whole drawing (layout, fonts, wording, seal, image positions) is one JSON design document. |
| 31 | [CertificateTemplateSignatory](#table-31-certificatetemplatesignatory) | One signature line on a template, tied to the coordinator account whose signature image prints there. |
| 32 | [CertificateTemplateAsset](#table-32-certificatetemplateasset) | An image file a director imported onto a template (image, frame or seal). The file is in private S3 storage. |
| 33 | [CertificateDeployment](#table-33-certificatedeployment) | One template deployed to one event. The design, signature lines and event details are frozen at deploy time so later template edits do not change promised certificates. |
| 34 | [IssuedCertificate](#table-34-issuedcertificate) | One certificate generated for one participant of a deployment, frozen in full so it never changes afterwards. |
| 35 | [Conversation](#table-35-conversation) | A direct (one-to-one) conversation between two portal staff members. |
| 36 | [ConversationParticipant](#table-36-conversationparticipant) | A portal user's membership in a conversation, with their read position. |
| 37 | [ChatMessage](#table-37-chatmessage) | One message in a conversation. |
| 38 | [ChatAttachment](#table-38-chatattachment) | A file attached to a chat message. |
| 39 | [Announcement](#table-39-announcement) | A notice written on the portal's Maintenance board and shown on System Notices. It publishes and expires on its own when publish_at / expires_at pass. |
| 40 | [Notification](#table-40-notification) | One notification for one recipient. A notice addressed to a role is fanned out to every account holding that role. |
| 41 | [SupportTicket](#table-41-supportticket) | A reported problem, request or report filed by a user. |
| 42 | [SupportTicketReply](#table-42-supportticketreply) | One message in a support ticket thread. |
| 43 | [MonthlyReportFolder](#table-43-monthlyreportfolder) | A custom folder a director creates to group approved reports. College folders are not rows; they come from each report's department. |
| 44 | [MonthlyReport](#table-44-monthlyreport) | A coordinator's report for one month, reviewed by a director. The submitter's details are copied so a decided report keeps reading the way it did. |
| 45 | [MonthlyReportDocument](#table-45-monthlyreportdocument) | A file attached to a monthly report. The file is in private S3 storage. |
| 46 | [MonthlyReportTrailEntry](#table-46-monthlyreporttrailentry) | Append-only history of a report: who submitted, who decided, and the note that came with it. |
| 47 | [UserRequest](#table-47-userrequest) | A request filed from the mobile app for a director to decide: role access, event join or role, registrations and residency verification. |
| 48 | [UserRequestTrailEntry](#table-48-userrequesttrailentry) | One line in a request's history: filed, accepted, removed, restored. |
| 49 | [NeedsAssessment](#table-49-needsassessment) | A beneficiary's Needs Assessment Survey, one per account, overwritten on update. Answers are stored as codes (food, money, ...) for the needs clustering. |
| 50 | [AssistanceRequest](#table-50-assistancerequest) | Assistance a beneficiary asked for from the app (food pack, medicine, ...). The stage timestamps drive the progress trail shown in the app. |
| 51 | [AssistanceRequestAttachment](#table-51-assistancerequestattachment) | A proof document filed with an assistance request (ID, bill, photo, ...). |
| 52 | [Donation](#table-52-donation) | The donation ledger. A money row opens when a checkout is paid; a goods row opens when the donor pledges. Only CONFIRMED rows count towards the donor board. |
| 53 | [DonationTrailEntry](#table-53-donationtrailentry) | Every status change on a donation and who made it; the audit trail and proof the donor was notified. |
| 54 | [DonationPayment](#table-54-donationpayment) | One money-donation checkout a donor started in the app, tracked through the Xendit payment gateway. |
| 55 | [PaymentWebhookEvent](#table-55-paymentwebhookevent) | Every Xendit callback already applied, so a retried callback is ignored. |
| 56 | [PaymentGatewaySettings](#table-56-paymentgatewaysettings) | The Xendit account CARES collects donations into, as the director enters it. One row. Secrets are stored encrypted (AES-256-GCM) and never sent back to a client. |
| 57 | [PaymentMethodSetting](#table-57-paymentmethodsetting) | One donor-facing payment channel and its activation and account-ownership checks. A channel that is not enabled is hidden in the app and refused at checkout. |

## Table 1. User

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_id | TEXT | PK | Unique identifier of the user table. |
| firstname | TEXT | NOT NULL | Given name. |
| lastname | TEXT | NOT NULL | Family name. |
| middle_name | TEXT | NULL | Middle name, if any. |
| gender | GenderType | NOT NULL | Gender (GenderType). |
| age | INT | NOT NULL | Age in years. |
| current_address | TEXT | NOT NULL | Full current address as one line; set at sign-up or read by OCR from a residency document. |
| phone_number | TEXT | UNIQUE | Mobile number; unique per user. |
| avatar | TEXT | NULL | URL of the default profile photo. |
| role_id | TEXT | FK | The role the user holds. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |
| portal_department | TEXT | NULL | Portal staff only: the college or office the staff member belongs to. |
| address_street | TEXT | NULL | Street, house or lot number part of the address. |
| address_barangay | TEXT | NULL | Barangay part of the address. |
| address_city | TEXT | NULL | City or municipality part of the address. |
| address_province | TEXT | NULL | Province part of the address. |
| household_size | INT | NULL | Beneficiaries only: how many people the assistance has to cover. |
| partner_barangay | TEXT | NULL | Partner-barangay volunteers only: the partner barangay they signed up through. |
| beneficiary_type | BeneficiaryType | NULL | Beneficiaries only: REGULAR (signed up without an ID) or STUDENT (verified a UC school ID with a face match). |

The table provides a detailed structure for storing the personal and address information of every CARES account holder, from portal staff to volunteers, donors and beneficiaries. Key fields such as user_id, firstname, lastname, gender, age, current_address, phone_number, and role_id are identified along with their constraints and data types. This structure keeps one complete profile per person across both the staff portal and the mobile app. It also links each user to a role, which decides the features available to them.

## Table 2. Role

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| role_id | TEXT | PK | Unique identifier of the role table. |
| type | RoleType | NOT NULL | Role type (ADMIN, DIRECTOR, COORDINATOR, VOLUNTEER, DONOR, BENEFICIARY). |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the roles that a CARES user can hold. Key fields such as role_id and type are identified along with their constraints and data types. This structure gives every account a single role that separates portal staff from mobile users. It also serves as the basis of the role's default permissions.

## Table 3. Account

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| account_id | TEXT | PK | Unique identifier of the account table. |
| email | TEXT | UNIQUE | Sign-in email address; unique. |
| password | TEXT | NULL | Hashed password; null for an account that only signs in through a social provider. |
| credential_expires_at | TIMESTAMP | NULL | Expiry of temporary credentials an administrator issued; null means the password does not expire. |
| provisioned_by_user_id | TEXT | NULL | Administrator who issued the credential in force; null for self-registration. Stored id, no foreign key. |
| email_verified_at | TIMESTAMP | NULL | When the owner proved the email address (sign-up OTP, social provider, or emailed credential). Mobile password sign-in is refused while null. |
| signature_url | TEXT | NULL | Directors and coordinators: signature image printed onto certificates. |
| is_restricted | BOOLEAN | NOT NULL | Whether the account is restricted from signing in. |
| restricted_at | TIMESTAMP | NULL | When the restriction was applied. |
| restriction_reason | TEXT | NULL | Why the account was restricted. |
| last_login_ip | TEXT | NULL | IP address of the most recent successful sign-in. |
| user_id | TEXT | FK | The user the credentials belong to. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table holds the sign-in credentials and the account status of each user. Key fields such as account_id, email, password, credential_expires_at, provisioned_by_user_id, email_verified_at, is_restricted, and user_id are identified along with their constraints and data types. This structure keeps authentication data apart from the personal profile. It also supports email verification, temporary credentials issued by administrators and the restriction of accounts.

## Table 4. OAuthIdentity

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| oauth_identity_id | TEXT | PK | Unique identifier of the o auth identity table. |
| provider | AuthProvider | NOT NULL | Social provider (GOOGLE, FACEBOOK). |
| provider_user_id | TEXT | NOT NULL | The provider's immutable subject id (Google `sub`, Facebook `id`); unique together with provider. |
| email | TEXT | NULL | Email the provider last reported; kept for support lookups only. |
| user_id | TEXT | FK | The CARES user this identity signs in as. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table records the Google and Facebook identities that a user may sign in with. Key fields such as oauth_identity_id, provider, provider_user_id, email, and user_id are identified along with their constraints and data types. This structure allows one CARES account to be reached through several social providers. It also keeps sign-in secure because no provider token is stored.

## Table 5. GmailConnection

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| gmail_connection_id | TEXT | PK | Unique identifier of the gmail connection table. |
| user_id | TEXT | FK | Portal user who linked the mailbox; unique (one mailbox per user). |
| google_sub | TEXT | NOT NULL | Google account subject id. |
| email | TEXT | NOT NULL | Linked Gmail address. |
| scope | TEXT | NOT NULL | Granted OAuth scopes, space separated, as Google returned them. |
| access_token | TEXT | NOT NULL | Current Google OAuth access token. |
| refresh_token | TEXT | NOT NULL | Google OAuth refresh token used to renew the access token. |
| access_expires_at | TIMESTAMP | NOT NULL | When the current access token expires. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the Google mailbox that a portal user has linked to the system. Key fields such as gmail_connection_id, user_id, google_sub, email, scope, access_token, refresh_token, and access_expires_at are identified along with their constraints and data types. This structure lets staff read and send email from inside the portal. It also allows the access token to be renewed automatically without asking the user to sign in again.

## Table 6. UserRoleAvatar

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_role_avatar_id | TEXT | PK | Unique identifier of the user role avatar table. |
| user_id | TEXT | FK | Owner of the photo. |
| role_type | RoleType | NOT NULL | The side of the account the photo is for; unique together with user_id. |
| avatar_url | TEXT | NOT NULL | URL of the profile photo. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores a separate profile photo for each side of a mobile user's account. Key fields such as user_role_avatar_id, user_id, role_type, and avatar_url are identified along with their constraints and data types. This structure lets a person who is both a volunteer and a donor show a different picture on each side. It also prevents a change on one side from affecting the others.

## Table 7. RolePermissionDefault

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| role_permission_default_id | TEXT | PK | Unique identifier of the role permission default table. |
| role_type | RoleType | NOT NULL | Role the default applies to. |
| permission | PermissionKey | NOT NULL | Permission the role holds by default; unique together with role_type. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table lists the permissions that every user of a given role receives by default. Key fields such as role_permission_default_id, role_type, and permission are identified along with their constraints and data types. This structure defines the baseline access of each role in one place. It also simplifies access control because individual users only need to store their exceptions.

## Table 8. UserPermissionOverride

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_permission_override_id | TEXT | PK | Unique identifier of the user permission override table. |
| user_id | TEXT | FK | User the override applies to. |
| permission | PermissionKey | NOT NULL | Permission being overridden; unique together with user_id. |
| effect | PermissionOverrideEffect | NOT NULL | GRANT adds the permission; REVOKE removes it. |
| reason | TEXT | NULL | Why the override was made. |
| granted_by_user_id | TEXT | NOT NULL | Administrator who set the override. Stored id, no foreign key. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table records the permissions that have been granted to or revoked from an individual user. Key fields such as user_permission_override_id, user_id, permission, effect, reason, and granted_by_user_id are identified along with their constraints and data types. This structure allows administrators to adjust a single user's access without changing the whole role. It also keeps the reason and the administrator behind each change.

## Table 9. UserActionSuspension

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_action_suspension_id | TEXT | PK | Unique identifier of the user action suspension table. |
| user_id | TEXT | FK | Suspended user. |
| permission | PermissionKey | NOT NULL | The action that is suspended. |
| reason | TEXT | NOT NULL | Violation or reason for the suspension. |
| issued_by_user_id | TEXT | NOT NULL | Administrator who issued the suspension. Stored id, no foreign key. |
| expires_at | TIMESTAMP | NULL | When the suspension ends; null means indefinite (until an administrator lifts it). |
| lifted_at | TIMESTAMP | NULL | When the suspension was lifted early; null while in force. |
| lifted_by_user_id | TEXT | NULL | Administrator who lifted it. Stored id, no foreign key. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the suspensions placed on specific actions of a user because of a violation. Key fields such as user_action_suspension_id, user_id, permission, reason, issued_by_user_id, expires_at, lifted_at, and lifted_by_user_id are identified along with their constraints and data types. This structure lets administrators block one action temporarily or indefinitely. It also preserves the user's original rights so that lifting the suspension restores them.

## Table 10. UserVerification

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_verification_id | TEXT | PK | Unique identifier of the user verification table. |
| user_id | TEXT | FK | User whose ID was checked. |
| status | VerificationStatus | NOT NULL | Result of the check: N = pending, F = failed, V = verified. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |
| user_biometric_id | TEXT | FK | Biometric enrolled for this check; unique (one-to-one). |

The table records each identity verification performed when a user registers. Key fields such as user_verification_id, user_id, status, and user_biometric_id are identified along with their constraints and data types. This structure tracks whether a submitted ID is pending, failed or verified. It also ties each check to the face biometric captured for it.

## Table 11. UserBiometric

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_biometric_id | TEXT | PK | Unique identifier of the user biometric table. |
| face_url | TEXT | NOT NULL | URL of the captured face image. |
| embedding | JSONB | NULL | Embedding vector produced by the face-recognition service. |
| embedding_type | EmbeddingType | NOT NULL | Kind of biometric (FACE, FINGERPRINT, IRIS). |
| isActive | BOOLEAN | NOT NULL | Whether this biometric is the one currently used for face matching. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the face biometric enrolled during an identity verification. Key fields such as user_biometric_id, face_url, embedding, embedding_type, and isActive are identified along with their constraints and data types. This structure keeps the face image and embedding used for face matching. It also supports marking which biometric is currently active for the user.

## Table 12. UserSchoolInfo

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_school_info_id | TEXT | PK | Unique identifier of the user school info table. |
| id_number | TEXT | UNIQUE | School ID number; unique. |
| graduation_year | INT | NOT NULL | Graduation year (expected or actual). |
| graduation_month | INT | NOT NULL | Graduation month (1-12). |
| graduation_day | INT | NOT NULL | Graduation day of the month. |
| department_id | TEXT | FK | College or department the student belongs to. |
| major_id | TEXT | FK | Program or major. |
| year_level_id | TEXT | FK | Current year level. |
| user_id | TEXT | FK | The user the school record belongs to. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |
| school_id_url | TEXT | NULL | Scan of the school ID presented at registration; null for roles that register without an ID. |

The table provides a structure for storing the academic information of student and alumni users. Key fields such as user_school_info_id, id_number, graduation_year, graduation_month, department_id, major_id, year_level_id, and user_id are identified along with their constraints and data types. This structure links each user to a department, major and year level. It also keeps the school ID number and the scanned ID used during registration.

## Table 13. Department

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| department_id | TEXT | PK | Unique identifier of the department table. |
| name | TEXT | NOT NULL | Department name. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table holds the list of colleges and departments of the institution. Key fields such as department_id and name are identified along with their constraints and data types. This structure provides consistent department names for school records. It also prevents the same department from being entered in different spellings.

## Table 14. Major

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| major_id | TEXT | PK | Unique identifier of the major table. |
| name | TEXT | NOT NULL | Program or major name. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table holds the list of programs and majors offered by the institution. Key fields such as major_id and name are identified along with their constraints and data types. This structure provides consistent program names for school records. It also supports grouping users by their program.

## Table 15. YearLevel

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| year_level_id | TEXT | PK | Unique identifier of the year level table. |
| name | TEXT | NOT NULL | Year level label (e.g. 1st Year). |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table holds the list of year levels used in school records. Key fields such as year_level_id and name are identified along with their constraints and data types. This structure keeps year levels uniform across all students. It also supports filtering and reporting by year level.

## Table 16. ResidencyDocument

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| residency_document_id | TEXT | PK | Unique identifier of the residency document table. |
| user_id | TEXT | FK | User who uploaded the document. |
| file_url | TEXT | NOT NULL | Storage URL of the uploaded file. |
| file_name | TEXT | NOT NULL | Original file name. |
| mime_type | TEXT | NOT NULL | MIME type of the file. |
| size_bytes | INT | NOT NULL | File size in bytes. |
| extracted_address | TEXT | NOT NULL | Address OCR read from the document and applied to User.current_address. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table stores the proof of residency documents uploaded by mobile users. Key fields such as residency_document_id, user_id, file_url, file_name, mime_type, size_bytes, and extracted_address are identified along with their constraints and data types. This structure keeps the uploaded file on record together with the address read from it by OCR. It also supports the review of a user's change of address.

## Table 17. SecurityPolicy

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| security_policy_id | TEXT | PK | Unique identifier of the security policy table. |
| singleton | BOOLEAN | UNIQUE | Always true and unique, so only one policy row can exist. |
| password_min_length | INT | NOT NULL | Minimum password length. |
| password_require_uppercase | BOOLEAN | NOT NULL | Passwords must contain an uppercase letter. |
| password_require_lowercase | BOOLEAN | NOT NULL | Passwords must contain a lowercase letter. |
| password_require_number | BOOLEAN | NOT NULL | Passwords must contain a digit. |
| password_require_symbol | BOOLEAN | NOT NULL | Passwords must contain a symbol. |
| lockout_enabled | BOOLEAN | NOT NULL | Whether repeated failed sign-ins lock the account. |
| lockout_max_attempts | INT | NOT NULL | Failed attempts allowed within the window before the account locks. |
| lockout_window_minutes | INT | NOT NULL | How far back failed attempts are counted, in minutes. |
| lockout_duration_minutes | INT | NOT NULL | Minutes a lock is held; 0 means until an administrator lifts it. |
| session_idle_timeout_minutes | INT | NOT NULL | Minutes of inactivity before a session is refused; 0 disables the check. |
| session_max_duration_hours | INT | NOT NULL | Maximum session length in hours; 0 leaves it to the token's own expiry. |
| max_concurrent_sessions | INT | NOT NULL | Devices one account may be signed in on at once; 0 means unlimited. |
| login_hours_enabled | BOOLEAN | NOT NULL | Whether sign-in is limited to set hours. |
| login_hours_start_minute | INT | NOT NULL | Start of allowed sign-in hours, in minutes past midnight (server time). |
| login_hours_end_minute | INT | NOT NULL | End of allowed sign-in hours, in minutes past midnight. A start after the end wraps over midnight. |
| ip_allowlist | TEXT[] | NOT NULL | IP addresses allowed to sign in; empty means no allowlist. |
| updated_by_user_id | TEXT | NULL | Administrator who last saved the policy. Stored id, no foreign key. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the portal-wide security settings of the system in a single row. Key fields such as security_policy_id, singleton, password_min_length, password_require_uppercase, password_require_lowercase, password_require_number, password_require_symbol, and lockout_enabled are identified along with their constraints and data types. This structure controls the password rules, account lockout, session limits, sign-in hours and IP allowlist. It also allows administrators to tighten security without changing the code.

## Table 18. BlockedIp

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| blocked_ip_id | TEXT | PK | Unique identifier of the blocked ip table. |
| ip_address | TEXT | UNIQUE | Blocked IP address; unique. |
| reason | TEXT | NULL | Why the address was blocked. |
| user_id | TEXT | FK | Account the block originated from; null for a manually entered address. |
| blocked_by_user_id | TEXT | NOT NULL | Administrator who blocked the address. Stored id, no foreign key. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table records the IP addresses that are refused at sign-in. Key fields such as blocked_ip_id, ip_address, reason, user_id, and blocked_by_user_id are identified along with their constraints and data types. This structure serves as the system's denylist against suspicious addresses. It also keeps the reason and the account that led to each block.

## Table 19. LoginActivity

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| login_activity_id | TEXT | PK | Unique identifier of the login activity table. |
| user_id | TEXT | FK | Matched account; null when the email matched no account. |
| email | TEXT | NOT NULL | Email exactly as submitted (lowercased), kept even when no account matched. |
| ip_address | TEXT | NOT NULL | Client IP address. |
| user_agent | TEXT | NULL | Client user-agent string. |
| source | LoginSource | NOT NULL | Client the attempt came from (PORTAL or MOBILE). |
| outcome | LoginOutcome | NOT NULL | Result of the attempt: SUCCESS or the reason it was refused. |
| failure_reason | TEXT | NULL | Message shown to the client; null on a successful sign-in. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table records every sign-in attempt made to the system, whether successful or not. Key fields such as login_activity_id, user_id, email, ip_address, user_agent, source, outcome, and failure_reason are identified along with their constraints and data types. This structure provides an append-only trail for security monitoring. It also helps administrators detect repeated failures and suspicious addresses.

## Table 20. AuditLog

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| audit_log_id | TEXT | PK | Unique identifier of the audit log table. |
| action | TEXT | NOT NULL | Machine key of the action, e.g. access-control.permission.revoked. |
| description | TEXT | NOT NULL | Sentence the portal shows for the entry. |
| category | AuditCategory | NOT NULL | Area of CARES that produced the entry. |
| severity | AuditSeverity | NOT NULL | How much attention the entry deserves on review. |
| outcome | AuditOutcome | NOT NULL | Whether the action went through (SUCCESS, FAILURE, DENIED). |
| actor_user_id | TEXT | FK | Account that performed the action; null for background jobs and deleted accounts. |
| actor_name | TEXT | NOT NULL | Actor's name at the time of the action. |
| actor_email | TEXT | NOT NULL | Actor's email at the time of the action. |
| actor_role | RoleType | NULL | Actor's role at the time; null when the actor is the system. |
| target_type | TEXT | NOT NULL | Kind of record acted on (user, event, certificate, system, ...). |
| target_label | TEXT | NOT NULL | Display name of the target. |
| target_id | TEXT | NULL | Id of the target record; null when the target is not a single record. |
| ip_address | TEXT | NOT NULL | Client IP address. |
| user_agent | TEXT | NULL | Client user-agent string. |
| source | AuditSource | NOT NULL | Client that wrote the entry (PORTAL, MOBILE, SYSTEM). |
| request_id | TEXT | NULL | Correlates every entry written by one request. |
| reason | TEXT | NULL | Justification the operator gave, when the action asks for one. |
| changes | JSONB | NOT NULL | Field-level before/after pairs: [{ field, before, after }]. |
| metadata | JSONB | NOT NULL | Free-form context (counts, service scores, template names). |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table records every privileged action performed in the system. Key fields such as audit_log_id, action, description, category, severity, outcome, actor_user_id, and actor_name are identified along with their constraints and data types. This structure provides an append-only history of who did what, when and from where. It also copies the actor's details at the time so that later changes cannot rewrite the record.

## Table 21. Event

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| event_id | SERIAL | PK | Unique identifier of the event table. |
| title | TEXT | NOT NULL | Event title. |
| description | TEXT | NOT NULL | Event details. |
| event_started | TIMESTAMP | NOT NULL | Start date and time. |
| event_ended | TIMESTAMP | NOT NULL | End date and time. |
| location | TEXT | NOT NULL | Venue or address. |
| max_participants | INT | NOT NULL | Maximum number of volunteers who can register. |
| participants | INT | NOT NULL | Number of volunteers registered so far. |
| organizer_name | TEXT | NOT NULL | Organizing office or person. |
| category | TEXT | NOT NULL | Event category (matches the InterestCode values). |
| department | TEXT | NULL | Hosting college or department, if any. |
| specified_category | TEXT | NULL | Category typed in when "Others" is chosen. |
| images | TEXT[] | NOT NULL | URLs of the event images. |
| status | EventStatus | NOT NULL | Event lifecycle status. |
| funds_donation | BOOLEAN | NOT NULL | Whether the event accepts money donations. |
| goods_donation | BOOLEAN | NOT NULL | Whether the event accepts goods donations. |
| goods_types | TEXT[] | NOT NULL | Goods types the event accepts (food, clothing, ...). |
| beneficiary_applicable | BOOLEAN | NOT NULL | Whether beneficiaries may ask to join the event. |
| max_beneficiaries | INT | NULL | Maximum number of beneficiaries accepted. |
| geojson | JSONB | NULL | Geofence polygon of the event area (GeoJSON). |
| area_sqm | FLOAT | NULL | Area of the geofence in square metres. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |
| marker_lat | FLOAT | NULL | Latitude of the meeting-spot pin inside the geofence. |
| marker_lng | FLOAT | NULL | Longitude of the meeting-spot pin inside the geofence. |

The table provides a detailed structure for storing the volunteer and outreach events published by staff. Key fields such as event_id, title, description, event_started, event_ended, location, max_participants, and participants are identified along with their constraints and data types. This structure holds the schedule, venue, capacity, geofence and donation settings of each event. It also serves as the basis of registration, attendance, donations and certificates.

## Table 22. EventAttendance

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| event_attendance_id | TEXT | PK | Unique identifier of the event attendance table. |
| event_id | INT | FK | Event registered for. |
| user_id | TEXT | FK | Registered volunteer. |
| status | AttendanceStatus | NOT NULL | Attendance result: PENDING, COMPLETED or ABSENT. |
| validation_method | GeoValidationMethod | NULL | Where the coordinates that decided attendance came from. |
| first_ping_at | TIMESTAMP | NULL | First GPS reading inside the event geofence. |
| last_ping_at | TIMESTAMP | NULL | Last GPS reading inside the event geofence. |
| hours_rendered | FLOAT | NULL | Credited service hours; meaningful once the row is COMPLETED. |
| participation_role | EventParticipationRole | NOT NULL | Role the volunteer registered for (REGULAR, ORGANIZER, FACILITATOR, SPEAKER). |
| role_approval | EventRoleApproval | NOT NULL | Review state of that role. A REJECTED role keeps the registration as a regular volunteer. |
| remarks | TEXT | NULL | Staff remarks on the attendance. |
| registered_at | TIMESTAMP | NOT NULL | When the volunteer registered. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table records each volunteer's registration for an event and the attendance result. Key fields such as event_attendance_id, event_id, user_id, status, validation_method, participation_role, role_approval, and registered_at are identified along with their constraints and data types. This structure tracks whether a volunteer completed, missed or is still pending for an event. It also stores the service hours credited and the role the volunteer registered for.

## Table 23. EventLocationPing

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| event_location_ping_id | SERIAL | PK | Unique identifier of the event location ping table. |
| event_id | INT | FK | Event the device guessed the reading belongs to; null when it could not name one. |
| user_id | TEXT | FK | Volunteer whose device sent the reading. |
| captured_at | TIMESTAMP | NOT NULL | When the reading was taken on the device. |
| latitude | FLOAT | NOT NULL | Latitude in decimal degrees. |
| longitude | FLOAT | NOT NULL | Longitude in decimal degrees. |
| accuracy_m | FLOAT | NOT NULL | GPS accuracy the device reported, in metres. |
| in_area | BOOLEAN | NOT NULL | The device's own inside-the-geofence check at capture time. |
| source | GeoValidationMethod | NOT NULL | How the reading arrived (GEOFENCE live, OFFLINE_SYNC batch). |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table stores the GPS readings sent by volunteers' devices during an event. Key fields such as event_location_ping_id, event_id, user_id, captured_at, latitude, longitude, accuracy_m, and in_area are identified along with their constraints and data types. This structure supplies the coordinates used to validate geofence-based attendance. It also accepts readings recorded offline and synchronized later.

## Table 24. Interest

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| interest_id | TEXT | PK | Unique identifier of the interest table. |
| code | InterestCode | UNIQUE | Interest code; unique. |
| label | TEXT | NOT NULL | Display label. |
| description | TEXT | NULL | Optional explanation shown with the label. |
| is_active | BOOLEAN | NOT NULL | Whether the interest is still offered. |
| sort_order | INT | NOT NULL | Display order. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table holds the catalog of volunteer interests offered during sign-up. Key fields such as interest_id, code, label, description, is_active, and sort_order are identified along with their constraints and data types. This structure mirrors the event categories so that interests can be matched with events. It also allows interests to be reordered or retired without deleting them.

## Table 25. UserInterest

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_interest_id | TEXT | PK | Unique identifier of the user interest table. |
| user_id | TEXT | FK | Volunteer; unique (one row per user). |
| selected | JSONB | NOT NULL | Selected interest codes (JSON array of InterestCode). |
| other_interest | TEXT | NULL | What the volunteer typed under "Others"; null unless OTHERS is selected. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the interests selected by each volunteer. Key fields such as user_interest_id, user_id, selected, and other_interest are identified along with their constraints and data types. This structure supports recommending events that match a volunteer's preferences. It also keeps any interest the volunteer typed under Others.

## Table 26. RankingSettings

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| ranking_settings_id | TEXT | PK | Unique identifier of the ranking settings table. |
| points_per_attendance | INT | NOT NULL | Points a volunteer earns for every attended (COMPLETED) event. |
| absence_penalty_step | INT | NOT NULL | Points the first missed registration costs; each consecutive miss adds it again. |
| absence_reset_days | INT | NOT NULL | Misses further apart than this many days restart the penalty at the first step. |
| default_period | TEXT | NOT NULL | Default leaderboard period (e.g. month). |
| tiers | JSONB | NOT NULL | Tier ladder and avatar frame definitions. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |
| donor_pesos_per_point | INT | NOT NULL | Donor board: one point for every this many pesos of confirmed donations. |
| goods_type_values | JSONB | NULL | Peso value credited per unit of each goods type; null uses the built-in defaults. |
| participation_role_points | JSONB | NULL | Extra points per attended event for an approved special role; null uses the built-in defaults. |

The table stores the scoring rules and tier ladder of the volunteer and donor leaderboards in a single row. Key fields such as ranking_settings_id, points_per_attendance, absence_penalty_step, absence_reset_days, default_period, tiers, donor_pesos_per_point, and goods_type_values are identified along with their constraints and data types. This structure lets the director adjust how points are earned and lost. It also defines the tiers that the mobile app uses for avatar frames.

## Table 27. EvaluationForm

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| evaluation_form_id | TEXT | PK | Unique identifier of the evaluation form table. |
| title | TEXT | NOT NULL | Form title. |
| description | TEXT | NOT NULL | Introductory text shown above the questions. |
| header_typography | JSONB | NOT NULL | Font and style settings of the form header. |
| questions | JSONB | NOT NULL | Question definitions as edited in the form builder. |
| status | EvaluationFormStatus | NOT NULL | DRAFT or PUBLISHED. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |
| is_default | BOOLEAN | NOT NULL | The questionnaire served for events with no assignment; at most one row is true. |

The table stores the post-event evaluation questionnaires built by the director. Key fields such as evaluation_form_id, title, description, header_typography, questions, status, and is_default are identified along with their constraints and data types. This structure keeps the questions in a flexible format so new question types need no database change. It also marks the default form used by events without an assignment.

## Table 28. EvaluationAssignment

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| evaluation_assignment_id | TEXT | PK | Unique identifier of the evaluation assignment table. |
| form_id | TEXT | FK | Questionnaire assigned. |
| event_id | INT | FK | Event it is assigned to; unique (one per event). |
| assigned_by_id | TEXT | FK | Director who assigned it; null once the account is removed. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table records which evaluation form an event asks its participants to answer. Key fields such as evaluation_assignment_id, form_id, event_id, and assigned_by_id are identified along with their constraints and data types. This structure allows each event to use its own questionnaire. It also lets events without an assignment fall back to the default form.

## Table 29. EvaluationResponse

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| evaluation_response_id | TEXT | PK | Unique identifier of the evaluation response table. |
| form_id | TEXT | FK | Questionnaire answered. |
| event_id | INT | FK | Event the feedback is about. |
| user_id | TEXT | FK | Volunteer who answered. |
| answers | JSONB | NOT NULL | Answers keyed by question id. |
| rating | INT | NULL | Star-rating answer copied out so the portal can filter and average it. |
| status | EvaluationResponseStatus | NOT NULL | COMPLETE or PARTIAL (whether every required question was answered). |
| submitted_at | TIMESTAMP | NOT NULL | When the volunteer submitted the response. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores each volunteer's answers to the evaluation of an event they attended. Key fields such as evaluation_response_id, form_id, event_id, user_id, answers, rating, status, and submitted_at are identified along with their constraints and data types. This structure collects feedback per event and per volunteer. It also copies the star rating out so the portal can filter and average responses quickly.

## Table 30. CertificateTemplate

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| certificate_template_id | TEXT | PK | Unique identifier of the certificate template table. |
| reference | TEXT | UNIQUE | Human reference printed on the card, e.g. CT-2026-014; unique. |
| name | TEXT | NOT NULL | Template name. |
| description | TEXT | NOT NULL | What the template is for. |
| category | CertificateTemplateCategory | NOT NULL | Certificate category. |
| status | CertificateTemplateStatus | NOT NULL | DRAFT, PUBLISHED or ARCHIVED. |
| orientation | CertificateOrientation | NOT NULL | LANDSCAPE or PORTRAIT. |
| issued | INT | NOT NULL | Number of certificates printed from this template. |
| deployed_events | INT | NOT NULL | Number of events currently deploying it. |
| design | JSONB | NOT NULL | Full drawing definition of the certificate. |
| updated_by_user_id | TEXT | FK | Last editor; null once the account is removed. |
| updated_by_name | TEXT | NOT NULL | Name of the last editor at the time of saving. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the certificate designs maintained by the director in the portal. Key fields such as certificate_template_id, reference, name, description, category, status, orientation, and updated_by_user_id are identified along with their constraints and data types. This structure keeps the full layout, wording and artwork of each certificate as one design. It also tracks how many certificates and events use each template.

## Table 31. CertificateTemplateSignatory

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| certificate_template_signatory_id | TEXT | PK | Unique identifier of the certificate template signatory table. |
| certificate_template_id | TEXT | FK | Template the line belongs to. |
| coordinator_user_id | TEXT | FK | Coordinator whose signature prints on the line; unique per template. |
| name | TEXT | NOT NULL | Printed name of the signatory. |
| title | TEXT | NOT NULL | Printed position title. |
| department | TEXT | NOT NULL | Printed department. |
| signature_token | TEXT | NOT NULL | Placeholder the print job swaps for the coordinator's signature image. |
| position | INT | NOT NULL | Left-to-right order of the line on the sheet. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the signature lines printed on a certificate template. Key fields such as certificate_template_signatory_id, certificate_template_id, coordinator_user_id, name, title, department, signature_token, and position are identified along with their constraints and data types. This structure ties each line to the coordinator whose signature image is printed. It also keeps the printed name, title and department so that later edits do not reword issued certificates.

## Table 32. CertificateTemplateAsset

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| certificate_template_asset_id | TEXT | PK | Unique identifier of the certificate template asset table. |
| certificate_template_id | TEXT | FK | Template the file belongs to. |
| kind | CertificateAssetKind | NOT NULL | What the file is used for: IMAGE, FRAME or SEAL. |
| storage_key | TEXT | NOT NULL | S3 object key (not a URL). |
| file_name | TEXT | NOT NULL | Original file name. |
| content_type | TEXT | NOT NULL | MIME type of the file. |
| byte_size | INT | NOT NULL | File size in bytes. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table stores the image files imported onto a certificate template. Key fields such as certificate_template_asset_id, certificate_template_id, kind, storage_key, file_name, content_type, and byte_size are identified along with their constraints and data types. This structure keeps a reference to each image, frame or seal held in private storage. It also records the file details needed to serve the image back to the portal.

## Table 33. CertificateDeployment

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| certificate_deployment_id | TEXT | PK | Unique identifier of the certificate deployment table. |
| reference | TEXT | UNIQUE | Human reference for the deployment, e.g. DC-2026-014; unique. |
| certificate_template_id | TEXT | FK | Template deployed; unique together with event_id. |
| template_name | TEXT | NOT NULL | Template name at deploy time. |
| category | CertificateTemplateCategory | NOT NULL | Template category at deploy time. |
| orientation | CertificateOrientation | NOT NULL | Template orientation at deploy time. |
| design | JSONB | NOT NULL | Frozen design, including the signature lines as they read on the day. |
| event_id | INT | FK | Event the template is deployed to. |
| event_name | TEXT | NOT NULL | Event name at deploy time. |
| event_venue | TEXT | NOT NULL | Event venue at deploy time. |
| event_date | TIMESTAMP | NOT NULL | Event date at deploy time. |
| status | CertificateDeploymentStatus | NOT NULL | Deployment status. |
| participants | INT | NOT NULL | Participants the deployment covers. |
| distributed | INT | NOT NULL | Certificates generated and released to participants. |
| claimed | INT | NOT NULL | Certificates the recipient has opened. |
| deployed_by_user_id | TEXT | FK | Account that deployed it; null once removed. |
| deployed_by_name | TEXT | NOT NULL | Name of the deploying account at the time. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table records each certificate template deployed to an event. Key fields such as certificate_deployment_id, reference, certificate_template_id, template_name, category, orientation, event_id, and deployed_by_user_id are identified along with their constraints and data types. This structure freezes the design and event details at the time of deployment. It also tracks how many certificates have been distributed to and claimed by participants.

## Table 34. IssuedCertificate

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| issued_certificate_id | TEXT | PK | Unique identifier of the issued certificate table. |
| certificate_number | TEXT | UNIQUE | Number printed on the sheet, e.g. CERT-2026-000123; unique. |
| certificate_deployment_id | TEXT | FK | Deployment that issued it. |
| event_id | INT | FK | Event the certificate is for. |
| user_id | TEXT | FK | Recipient; unique together with the deployment. |
| recipient_name | TEXT | NOT NULL | Recipient name as printed. |
| event_name | TEXT | NOT NULL | Event name as printed. |
| event_date | TIMESTAMP | NOT NULL | Event date as printed. |
| hours_rendered | FLOAT | NOT NULL | Service hours as printed. |
| organization | TEXT | NOT NULL | Organization name as printed. |
| template_name | TEXT | NOT NULL | Template name at issue time. |
| category | CertificateTemplateCategory | NOT NULL | Certificate category. |
| orientation | CertificateOrientation | NOT NULL | Sheet orientation. |
| design | JSONB | NOT NULL | Frozen sheet with placeholders filled and the signature images it printed. |
| issued_at | TIMESTAMP | NOT NULL | When the certificate was issued. |
| claimed_at | TIMESTAMP | NULL | When the recipient first opened it in the app; null until then. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores every certificate generated for a participant of an event. Key fields such as issued_certificate_id, certificate_number, certificate_deployment_id, event_id, user_id, recipient_name, event_name, and event_date are identified along with their constraints and data types. This structure keeps the complete certificate exactly as it was issued. It also records when the recipient first opened it in the app.

## Table 35. Conversation

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| conversation_id | TEXT | PK | Unique identifier of the conversation table. |
| last_message_at | TIMESTAMP | NULL | Time of the newest message, so the contact list sorts without a join. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the direct conversations between portal staff members. Key fields such as conversation_id and last_message_at are identified along with their constraints and data types. This structure groups the messages exchanged between two users. It also keeps the time of the newest message so that the contact list can be sorted quickly.

## Table 36. ConversationParticipant

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| conversation_participant_id | TEXT | PK | Unique identifier of the conversation participant table. |
| conversation_id | TEXT | FK | Conversation joined. |
| user_id | TEXT | FK | Participant; unique together with conversation_id. |
| last_read_at | TIMESTAMP | NULL | Messages sent after this time count as unread for the participant. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table records the users who take part in each conversation. Key fields such as conversation_participant_id, conversation_id, user_id, and last_read_at are identified along with their constraints and data types. This structure links portal users to their conversations. It also tracks the last time each participant read the conversation to count unread messages.

## Table 37. ChatMessage

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| message_id | TEXT | PK | Unique identifier of the chat message table. |
| conversation_id | TEXT | FK | Conversation the message belongs to. |
| sender_id | TEXT | FK | User who sent the message. |
| body | TEXT | NOT NULL | Message text. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table stores the messages sent within a conversation. Key fields such as message_id, conversation_id, sender_id, and body are identified along with their constraints and data types. This structure keeps the sender, the text and the time of each message. It also supports loading a conversation's history in order.

## Table 38. ChatAttachment

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| attachment_id | TEXT | PK | Unique identifier of the chat attachment table. |
| message_id | TEXT | FK | Message the file is attached to. |
| name | TEXT | NOT NULL | File name. |
| size | INT | NOT NULL | File size in bytes. |
| mime_type | TEXT | NOT NULL | MIME type of the file. |
| url | TEXT | NOT NULL | S3 object URL; streamed through the API, never exposed as a public link. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table stores the files attached to chat messages. Key fields such as attachment_id, message_id, name, size, mime_type, and url are identified along with their constraints and data types. This structure keeps the name, size, type and storage location of each file. It also ensures that files are served through the system rather than as public links.

## Table 39. Announcement

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| announcement_id | TEXT | PK | Unique identifier of the announcement table. |
| title | TEXT | NOT NULL | Notice title. |
| body | TEXT | NOT NULL | Notice text. |
| tone | AnnouncementTone | NOT NULL | INFO, WARNING or CRITICAL. |
| audiences | AnnouncementAudience[] | NOT NULL | Who the notice is for. |
| channels | AnnouncementChannel[] | NOT NULL | Where it is delivered (PORTAL, MOBILE, EMAIL). |
| state | AnnouncementState | NOT NULL | DRAFT, SCHEDULED, PUBLISHED or EXPIRED. |
| publish_at | TIMESTAMP | NOT NULL | When the notice goes live. |
| expires_at | TIMESTAMP | NULL | When the notice comes down; null means it stays up until taken down by hand. |
| pinned | BOOLEAN | NOT NULL | Whether it is kept at the top of the board. |
| window_id | TEXT | NULL | Maintenance window the notice was written for (loose reference, no foreign key). |
| author_id | TEXT | FK | Author account. |
| author_name | TEXT | NOT NULL | Author's name at the time of writing. |
| reach | INT | NOT NULL | Accounts it reached when it went out; 0 until it publishes. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the system notices written by administrators on the maintenance board. Key fields such as announcement_id, title, body, tone, audiences, channels, state, and author_id are identified along with their constraints and data types. This structure controls the audience, channels and schedule of each notice. It also lets a notice publish and expire on its own at the set times.

## Table 40. Notification

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| notification_id | TEXT | PK | Unique identifier of the notification table. |
| user_id | TEXT | FK | Recipient. |
| title | TEXT | NOT NULL | Notification title. |
| description | TEXT | NOT NULL | Notification text. |
| category | NotificationCategory | NOT NULL | Module the notification is about. |
| tone | NotificationTone | NOT NULL | INFO, ATTENTION or CRITICAL. |
| href | TEXT | NULL | Portal path the notification opens. |
| dedupe_key | TEXT | NULL | Key that stops a scheduler sending the same notification twice; unique per user. |
| audience_role | RoleType | NULL | Side of a mobile account the row shows on; null means every side and the portal. |
| read_at | TIMESTAMP | NULL | When the recipient read it; null while unread. |
| dismissed_at | TIMESTAMP | NULL | When the recipient dismissed it. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table stores the notifications delivered to each user. Key fields such as notification_id, user_id, title, description, category, tone, href, and dedupe_key are identified along with their constraints and data types. This structure keeps read and dismissed states per recipient. It also prevents the same notification from being sent twice and targets the correct side of a mobile account.

## Table 41. SupportTicket

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| support_ticket_id | TEXT | PK | Unique identifier of the support ticket table. |
| reference_number | SERIAL | UNIQUE | Sequential tracking number shown to the requester; unique, never reused. |
| subject | TEXT | NOT NULL | Ticket subject. |
| description | TEXT | NOT NULL | Details of the problem or request. |
| type | SupportTicketType | NOT NULL | What the reporter says went wrong. |
| status | SupportTicketStatus | NOT NULL | Ticket status. |
| priority | SupportTicketPriority | NOT NULL | HIGH = Issue, MEDIUM = Support, LOW = Feature. |
| requester_id | TEXT | FK | User who filed the ticket. |
| assignee_id | TEXT | FK | Staff member handling the ticket; null while unassigned. |
| source | LoginSource | NOT NULL | Client the ticket was filed from (PORTAL or MOBILE). |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the problems, requests and reports filed by users through the help desk. Key fields such as support_ticket_id, reference_number, subject, description, type, status, requester_id, and assignee_id are identified along with their constraints and data types. This structure tracks each ticket's type, status, priority and assigned staff member. It also gives the requester a tracking number that is never reused.

## Table 42. SupportTicketReply

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| support_ticket_reply_id | TEXT | PK | Unique identifier of the support ticket reply table. |
| support_ticket_id | TEXT | FK | Ticket the reply belongs to. |
| author_id | TEXT | FK | Author account; null once the account is removed. |
| author_name | TEXT | NOT NULL | Author's name at the time of writing. |
| author_type | SupportTicketAuthorType | NOT NULL | Side of the thread: STAFF or REQUESTER. |
| body | TEXT | NOT NULL | Reply text. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table stores the replies exchanged within a support ticket. Key fields such as support_ticket_reply_id, support_ticket_id, author_id, author_name, author_type, and body are identified along with their constraints and data types. This structure keeps the conversation between staff and the requester in order. It also preserves the author's name even if the account is later removed.

## Table 43. MonthlyReportFolder

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| monthly_report_folder_id | TEXT | PK | Unique identifier of the monthly report folder table. |
| name | TEXT | NOT NULL | Folder name. |
| created_by_user_id | TEXT | FK | Director who created the folder; null once removed. |
| created_by_name | TEXT | NOT NULL | Creator's name at the time. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the custom folders that the director creates for approved monthly reports. Key fields such as monthly_report_folder_id, name, created_by_user_id, and created_by_name are identified along with their constraints and data types. This structure lets the director group reports for purposes such as accreditation. It also keeps the creator's name for reference.

## Table 44. MonthlyReport

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| monthly_report_id | TEXT | PK | Unique identifier of the monthly report table. |
| reference | TEXT | UNIQUE | Tracking number, e.g. MR-2026-014; unique. |
| title | TEXT | NOT NULL | Report title. |
| period | TEXT | NOT NULL | Reporting month in YYYY-MM format. |
| department | ReportDepartment | NOT NULL | College the report counts for. |
| status | MonthlyReportStatus | NOT NULL | UNDER_REVIEW, APPROVED or RETURNED. |
| summary | TEXT | NOT NULL | Narrative summary of the month. |
| metric_events | INT | NOT NULL | Number of events held in the month. |
| metric_volunteers | INT | NOT NULL | Number of volunteers engaged. |
| metric_service_hours | INT | NOT NULL | Total service hours rendered. |
| metric_beneficiaries | INT | NOT NULL | Number of beneficiaries served. |
| submitted_by_user_id | TEXT | FK | Submitting coordinator; null once the account is removed. |
| submitted_by_name | TEXT | NOT NULL | Submitter's name at submission. |
| submitted_by_email | TEXT | NOT NULL | Submitter's email at submission. |
| submitted_by_title | TEXT | NOT NULL | Submitter's position at submission. |
| submitted_at | TIMESTAMP | NOT NULL | When the report was submitted. |
| reviewer_user_id | TEXT | FK | Director who decided the report. |
| reviewer_name | TEXT | NULL | Deciding director's name. |
| decided_at | TIMESTAMP | NULL | When the report was approved or returned. |
| decision_note | TEXT | NULL | Latest decision note; the reason given when a report is returned. |
| folder_id | TEXT | FK | Director's folder the report is filed in; null means it is filed under its college. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table provides a structure for storing the monthly accomplishment reports submitted by coordinators. Key fields such as monthly_report_id, reference, title, period, department, submitted_by_user_id, reviewer_user_id, and folder_id are identified along with their constraints and data types. This structure records the reporting period, college, metrics and review decision of each report. It also keeps the submitter's details as they were on the day of submission.

## Table 45. MonthlyReportDocument

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| monthly_report_document_id | TEXT | PK | Unique identifier of the monthly report document table. |
| monthly_report_id | TEXT | FK | Report the file is attached to. |
| file_name | TEXT | NOT NULL | File name as uploaded, extension included. |
| kind | MonthlyReportDocumentKind | NOT NULL | File kind (DOCX, PDF, XLSX, IMAGE). |
| storage_key | TEXT | NOT NULL | S3 object key (not a URL). |
| content_type | TEXT | NOT NULL | MIME type of the file. |
| byte_size | INT | NOT NULL | File size in bytes. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table stores the files attached to a monthly report. Key fields such as monthly_report_document_id, monthly_report_id, file_name, kind, storage_key, content_type, and byte_size are identified along with their constraints and data types. This structure keeps a reference to each document held in private storage. It also records the file type so the portal can preview or download it.

## Table 46. MonthlyReportTrailEntry

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| monthly_report_trail_entry_id | TEXT | PK | Unique identifier of the monthly report trail entry table. |
| monthly_report_id | TEXT | FK | Report the entry belongs to. |
| action | MonthlyReportTrailAction | NOT NULL | What happened (SUBMITTED, APPROVED, RETURNED, RESUBMITTED). |
| actor_name | TEXT | NOT NULL | Name of the person who acted, at the time. |
| note | TEXT | NULL | Note that came with the action. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table records the history of actions taken on a monthly report. Key fields such as monthly_report_trail_entry_id, monthly_report_id, action, actor_name, and note are identified along with their constraints and data types. This structure shows who submitted, approved or returned a report and the note given. It also lets the coordinator follow the progress of their submission.

## Table 47. UserRequest

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_request_id | TEXT | PK | Unique identifier of the user request table. |
| reference_number | SERIAL | UNIQUE | Sequential tracking number, shown as REQ-007; unique. |
| kind | UserRequestKind | NOT NULL | Type of request. |
| status | UserRequestStatus | NOT NULL | PENDING, ACCEPTED, DELETED or REJECTED. |
| user_id | TEXT | FK | User who filed the request. |
| requested_role | RoleType | NULL | ROLE_ACCESS only: the role asked for. |
| event_id | INT | FK | EVENT_JOIN / EVENT_ROLE only: the event the request is about. |
| participation_role | EventParticipationRole | NULL | EVENT_ROLE only: the event role the volunteer asked to take. |
| id_front_url | TEXT | NULL | Registration and role requests: front image of the ID presented. |
| id_back_url | TEXT | NULL | Back image of the ID presented. |
| selfie_url | TEXT | NULL | Selfie captured for the face match. |
| face_similarity | FLOAT | NULL | Similarity score between the selfie and the ID photo. |
| summary | TEXT | NOT NULL | One-line statement of what is being asked for. |
| decided_by_user_id | TEXT | FK | Director who decided the request. |
| decided_at | TIMESTAMP | NULL | When the request was decided. |
| rejection_reason | TEXT | NULL | Reason shown to the requester when the request is rejected. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |
| selfie_embedding | JSONB | NULL | 512-dimension face embedding from the match, used to enrol the biometric on acceptance. |
| residency_proof_url | TEXT | NULL | EVENT_JOIN only: URL of the proof of residency attached. |
| residency_proof_name | TEXT | NULL | File name of the proof of residency. |
| residency_proof_mime | TEXT | NULL | MIME type of the proof of residency. |
| document_url | TEXT | NULL | BENEFICIARY_REGISTRATION only: URL of the supporting document. |
| document_name | TEXT | NULL | File name of the supporting document. |
| document_mime | TEXT | NULL | MIME type of the supporting document. |
| document_size_bytes | INT | NULL | Size of the supporting document in bytes. |

The table stores the requests that mobile users file for a director's decision. Key fields such as user_request_id, reference_number, kind, status, user_id, event_id, summary, and decided_by_user_id are identified along with their constraints and data types. This structure covers role access, event participation, special event roles, registrations and residency verification. It also keeps the ID images, selfie and documents submitted as proof.

## Table 48. UserRequestTrailEntry

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| user_request_trail_entry_id | TEXT | PK | Unique identifier of the user request trail entry table. |
| user_request_id | TEXT | FK | Request the entry belongs to. |
| label | TEXT | NOT NULL | What happened. |
| actor_name | TEXT | NOT NULL | Who caused it: the requester for the filing, a portal account after that. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table records the history of each user request. Key fields such as user_request_trail_entry_id, user_request_id, label, and actor_name are identified along with their constraints and data types. This structure shows when a request was filed, accepted, removed or restored. It also records who caused each change.

## Table 49. NeedsAssessment

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| needs_assessment_id | TEXT | PK | Unique identifier of the needs assessment table. |
| user_id | TEXT | FK | Beneficiary; unique (one survey per account). |
| needs | TEXT[] | NOT NULL | Q1: what the household needs help with (codes such as food, healthcare, other). |
| other_need | TEXT | NULL | Text entered when "other" is a need. |
| seriousness | INT | NOT NULL | Q2: how serious the need is, 1 (not serious) to 5 (very serious). |
| barriers | TEXT[] | NOT NULL | Q3: what makes the need hard to meet (codes such as money, other, none). |
| other_barrier | TEXT | NULL | Text entered when "other" is a barrier. |
| community_problem | TEXT | NOT NULL | Q4: the problem most commonly seen in the community. |
| other_community_problem | TEXT | NULL | Text entered when the community problem is "other". |
| concern | TEXT | NULL | Q5: anything else the household wants CARES to know. |
| submitted_at | TIMESTAMP | NOT NULL | When the answers were last submitted. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the Needs Assessment Survey answered by each beneficiary. Key fields such as needs_assessment_id, user_id, needs, other_need, seriousness, barriers, community_problem, and submitted_at are identified along with their constraints and data types. This structure records the household's needs, their seriousness and the barriers to meeting them. It also supports the clustering of residential needs for planning assistance.

## Table 50. AssistanceRequest

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| assistance_request_id | TEXT | PK | Unique identifier of the assistance request table. |
| reference_number | SERIAL | UNIQUE | Sequential tracking number, shown as CARES-AR-2026-0007; unique. |
| user_id | TEXT | FK | Beneficiary who filed the request. |
| title | TEXT | NOT NULL | What is needed: the option picked or the text typed. |
| category | AssistanceCategory | NOT NULL | Assistance category. |
| description | TEXT | NOT NULL | Details of the request. |
| urgency | AssistanceUrgency | NOT NULL | How urgent the need is. |
| household_size | INT | NOT NULL | Number of people the assistance must cover. |
| location_latitude | FLOAT | NULL | Latitude of the map pin where assistance is needed; set together with longitude. |
| location_longitude | FLOAT | NULL | Longitude of the map pin where assistance is needed. |
| location_details | TEXT | NULL | Landmark or address details typed beside the pin. |
| status | AssistanceRequestStatus | NOT NULL | Request status. |
| assessment_status | AssistanceAssessmentStatus | NOT NULL | Status of the needs assessment visit. |
| assessment_date | TIMESTAMP | NULL | Date of the needs assessment visit (scheduled or held). |
| assigned_organization | TEXT | NULL | Organization assigned to deliver the assistance. |
| items | TEXT[] | NOT NULL | Items to be released, filled in by staff once decided. |
| status_note | TEXT | NULL | Staff note shown under the status. |
| screened_at | TIMESTAMP | NULL | When screening was completed. |
| decided_at | TIMESTAMP | NULL | When the request was approved or declined. |
| released_at | TIMESTAMP | NULL | When the assistance was released. |
| cancelled_at | TIMESTAMP | NULL | When the beneficiary withdrew the request. |
| cancel_reason | TEXT | NULL | Reason the beneficiary gave for withdrawing. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table provides a structure for storing the assistance requested by beneficiaries through the app. Key fields such as assistance_request_id, reference_number, user_id, title, category, description, urgency, and household_size are identified along with their constraints and data types. This structure tracks the category, urgency, location and status of each request. It also records the date of each stage from screening to release.

## Table 51. AssistanceRequestAttachment

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| assistance_request_attachment_id | TEXT | PK | Unique identifier of the assistance request attachment table. |
| assistance_request_id | TEXT | FK | Request the file is attached to. |
| name | TEXT | NOT NULL | File name. |
| url | TEXT | NOT NULL | Storage URL of the file. |
| mime | TEXT | NOT NULL | MIME type of the file. |
| size_bytes | INT | NOT NULL | File size in bytes. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table stores the proof documents filed with an assistance request. Key fields such as assistance_request_attachment_id, assistance_request_id, name, url, mime, and size_bytes are identified along with their constraints and data types. This structure keeps the name, type, size and location of each file. It also supports the review of requests by staff.

## Table 52. Donation

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| donation_id | TEXT | PK | Unique identifier of the donation table. |
| sequence | SERIAL | UNIQUE | Sequential tracking number, shown as DN-0007; unique. |
| user_id | TEXT | FK | Donor. |
| event_id | INT | FK | Event the donation is for. |
| kind | DonationKind | NOT NULL | MONEY or GOODS. |
| status | DonationStatus | NOT NULL | Donation status. |
| amount | INT | NOT NULL | Whole pesos: amount paid (money) or credited value of the goods (goods). |
| payment_id | TEXT | FK | Settled checkout behind a money donation; unique. |
| goods_type | TEXT | NULL | Goods only: goods type id from the event (food, clothing, ...) or other. |
| goods_item | TEXT | NULL | Goods only: what the donor said they are giving. |
| goods_quantity | INT | NULL | Goods only: quantity pledged. |
| donor_contact | TEXT | NULL | Goods only: number CARES can reach the donor on about the drop-off. |
| delivery_date | TIMESTAMP | NULL | Goods only: the day the donor plans to hand the goods in at the CARES office. |
| confirmed_at | TIMESTAMP | NULL | When staff confirmed the donation. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the money and goods donations made by donors. Key fields such as donation_id, sequence, user_id, event_id, kind, status, amount, and payment_id are identified along with their constraints and data types. This structure tracks each donation from pledge to confirmation. It also records the goods details needed for drop-off at the CARES office.

## Table 53. DonationTrailEntry

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| donation_trail_entry_id | TEXT | PK | Unique identifier of the donation trail entry table. |
| donation_id | TEXT | FK | Donation the entry belongs to. |
| status | DonationStatus | NOT NULL | Status the donation moved to. |
| note | TEXT | NULL | Note that came with the change. |
| actor_id | TEXT | FK | Portal account that made the change; null for system changes. |
| actor_label | TEXT | NOT NULL | "System" for the donor-side submission, otherwise the portal account's name. |
| notified_email | TEXT | NULL | Donor email the status notice went to; null when nothing was sent. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |

The table records every status change made on a donation. Key fields such as donation_trail_entry_id, donation_id, status, note, actor_id, actor_label, and notified_email are identified along with their constraints and data types. This structure provides the audit trail of each donation and who handled it. It also serves as proof that the donor was notified.

## Table 54. DonationPayment

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| donation_payment_id | TEXT | PK | Unique identifier of the donation payment table. |
| user_id | TEXT | FK | Donor. |
| event_id | INT | FK | Event behind the campaign, when the campaign is event-backed. |
| campaign_id | TEXT | NOT NULL | Campaign donated to. |
| campaign_title | TEXT | NOT NULL | Campaign title at checkout. |
| amount | INT | NOT NULL | Amount in whole pesos. |
| currency | TEXT | NOT NULL | Currency code. |
| method | DonationPaymentMethod | NOT NULL | Payment method chosen (GCASH, QRPH, CARD, BANK_TRANSFER). |
| status | DonationPaymentStatus | NOT NULL | Payment status as Xendit reports it. |
| idempotency_key | TEXT | NOT NULL | Client-generated key per checkout attempt; unique per donor so a retried tap returns the same row. |
| gateway_reference | TEXT | UNIQUE | Reference handed to Xendit; unique. Every callback carries it back. |
| gateway_resource_id | TEXT | NULL | Xendit's id for the charge, QR code or invoice created. |
| payment_reference | TEXT | NULL | Xendit's id for the settled payment; the reference shown on the receipt. |
| payment_channel | TEXT | NULL | Channel Xendit reported on settlement (e.g. DD_BPI). |
| checkout_url | TEXT | NULL | GCASH / CARD / BANK_TRANSFER: where the donor completes the payment. |
| qr_string | TEXT | NULL | QRPH only: the EMV string the app renders as a QR code. |
| expires_at | TIMESTAMP | NULL | When the checkout expires. |
| paid_at | TIMESTAMP | NULL | When the payment settled. |
| failure_reason | TEXT | NULL | Why the payment failed. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the online checkouts started by donors through the payment gateway. Key fields such as donation_payment_id, user_id, event_id, campaign_id, campaign_title, amount, currency, and method are identified along with their constraints and data types. This structure tracks each payment from checkout to settlement. It also prevents a retried tap from creating a duplicate payment.

## Table 55. PaymentWebhookEvent

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| webhook_id | TEXT | PK | Primary key; the callback's webhook-id header. |
| event | TEXT | NOT NULL | Xendit event name. |
| gateway_reference | TEXT | NULL | Payment reference the callback is about. |
| payload | JSONB | NOT NULL | Raw callback body. |
| receivedAt | TIMESTAMP | NOT NULL | When the callback was received. |

The table records the payment gateway callbacks that the system has already processed. Key fields such as webhook_id, event, gateway_reference, payload, and receivedAt are identified along with their constraints and data types. This structure ensures that a repeated callback is applied only once. It also keeps the raw callback for troubleshooting.

## Table 56. PaymentGatewaySettings

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| payment_gateway_settings_id | TEXT | PK | Unique identifier of the payment gateway settings table. |
| singleton | BOOLEAN | UNIQUE | Always true and unique, so only one settings row can exist. |
| mode | PaymentGatewayMode | NOT NULL | TEST or LIVE Xendit account. |
| enabled | BOOLEAN | NOT NULL | Whether donations are accepted; every checkout is refused while false. |
| secret_key_cipher | TEXT | NULL | Encrypted Xendit secret API key; null means the environment key is used. |
| secret_key_last4 | TEXT | NULL | Last four characters of the saved key, for telling keys apart. |
| webhook_token_cipher | TEXT | NULL | Encrypted callback verification token from the Xendit dashboard. |
| api_url | TEXT | NULL | Gateway API URL; blank for https://api.xendit.co. |
| statement_name | TEXT | NULL | Name the donor sees on the GCash or card statement. |
| support_email | TEXT | NULL | Email donors use about a payment problem. |
| support_contact | TEXT | NULL | Phone or other contact donors use about a payment problem. |
| verified_at | TIMESTAMP | NULL | When the saved key last answered a live call. |
| verification_error | TEXT | NULL | Why the last key check failed. |
| updated_by_user_id | TEXT | NULL | Director who last saved the settings. Stored id, no foreign key. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the payment gateway account that receives donations in a single row. Key fields such as payment_gateway_settings_id, singleton, mode, enabled, secret_key_cipher, secret_key_last4, webhook_token_cipher, and api_url are identified along with their constraints and data types. This structure keeps the gateway's secret keys encrypted. It also lets the director switch online donations on or off from the portal.

## Table 57. PaymentMethodSetting

| Column | Data Type | Constraints | Description |
|:---:|:---:|:---:|:---:|
| payment_method_setting_id | TEXT | PK | Unique identifier of the payment method setting table. |
| settings_id | TEXT | FK | Gateway settings the channel belongs to. |
| method | DonationPaymentMethod | NOT NULL | Payment method; unique together with settings_id. |
| enabled | BOOLEAN | NOT NULL | Whether the channel is offered to donors. |
| display_name | TEXT | NULL | Name shown in the app; blank keeps the built-in name. |
| instructions | TEXT | NULL | One line shown under the name on the payment step. |
| account_name | TEXT | NULL | Name on the receiving account (reference only). |
| account_number | TEXT | NULL | GCash number or bank account the settlement lands in (reference only). |
| channel_codes | TEXT[] | NOT NULL | Xendit channel codes this method opens (CARD / BANK_TRANSFER); empty uses the defaults. |
| min_amount | INT | NOT NULL | Minimum donation in whole pesos; 0 uses the module-wide limit. |
| max_amount | INT | NOT NULL | Maximum donation in whole pesos; 0 uses the module-wide limit. |
| sort_order | INT | NOT NULL | Display order in the app. |
| verification | PaymentMethodVerification | NOT NULL | Activation status of the channel with the gateway. |
| verified_at | TIMESTAMP | NULL | When the activation check last passed. |
| verification_message | TEXT | NULL | What the gateway said at the last check. |
| verified_channel_codes | TEXT[] | NOT NULL | Channel codes Xendit reported activated at the last check. |
| callbacks_registered_at | TIMESTAMP | NULL | When the callback URLs for this channel were last registered with Xendit. |
| account_proof | PaymentAccountProof | NOT NULL | Progress of the micro-deposit ownership check on the receiving account. |
| account_proof_amount | INT | NULL | Amount sent in whole pesos, which the director must report back; cleared once verified. |
| account_proof_reference | TEXT | NULL | CARES reference on the proof payout. |
| account_proof_id | TEXT | NULL | Xendit's id for the proof payout. |
| account_proof_sent_at | TIMESTAMP | NULL | When the proof payout was sent. |
| account_proof_attempts | INT | NOT NULL | Wrong amounts reported so far; the check locks after the maximum. |
| account_proof_message | TEXT | NULL | What the gateway or the check last said. |
| account_proof_target | TEXT | NULL | Account number the proof covered; editing the number invalidates the proof. |
| account_verified_at | TIMESTAMP | NULL | When ownership of the account was verified. |
| createdAt | TIMESTAMP | NOT NULL | Date and time the record was created. |
| updatedAt | TIMESTAMP | NOT NULL | Date and time the record was last updated. |

The table stores the settings of each payment method offered to donors. Key fields such as payment_method_setting_id, settings_id, method, enabled, channel_codes, min_amount, max_amount, and sort_order are identified along with their constraints and data types. This structure controls which methods are shown in the app and their limits. It also records the activation and ownership checks of the receiving account.

## Enumerated Types

| Enum | Values | Description |
|---|---|---|
| AnnouncementAudience | `VOLUNTEERS`, `BENEFICIARIES`, `DONORS`, `COORDINATORS` | Groups an announcement can target. |
| AnnouncementChannel | `PORTAL`, `MOBILE`, `EMAIL` | Where an announcement is delivered. |
| AnnouncementState | `DRAFT`, `SCHEDULED`, `PUBLISHED`, `EXPIRED` | Publication state of an announcement. |
| AnnouncementTone | `INFO`, `WARNING`, `CRITICAL` | Visual tone of an announcement. |
| AssistanceAssessmentStatus | `NOT_STARTED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED` | Status of the needs assessment visit for a request. |
| AssistanceCategory | `FOOD`, `MEDICAL`, `EDUCATION`, `FINANCIAL`, `LIVELIHOOD`, `DISASTER_RELIEF` | Kind of assistance requested. |
| AssistanceRequestStatus | `PENDING`, `UNDER_REVIEW`, `APPROVED`, `COMPLETED`, `DECLINED` (Final; the beneficiary may file a new request), `CANCELLED` (Withdrawn by the beneficiary) | Status of an assistance request. |
| AssistanceUrgency | `LOW`, `NORMAL`, `HIGH`, `URGENT` | How urgent an assistance request is. |
| AttendanceStatus | `PENDING` (Not yet judged), `COMPLETED` (Stayed inside the event area; hours credited), `ABSENT` (Did not attend) | A volunteer's attendance result for one event (geofence-based). |
| AuditCategory | `AUTHENTICATION`, `ACCESS_CONTROL`, `USER_MANAGEMENT`, `VERIFICATION`, `EVENT`, `CERTIFICATE`, `COMMUNICATION`, `SYSTEM` | Area of CARES that produced an audit entry. |
| AuditOutcome | `SUCCESS`, `FAILURE`, `DENIED` (Permission refusal, not a server error) | Whether an audited action went through. |
| AuditSeverity | `INFO`, `NOTICE`, `WARNING`, `CRITICAL` | How much attention an audit entry deserves on review. |
| AuditSource | `PORTAL`, `MOBILE`, `SYSTEM` (Background job) | Client that wrote an audit entry. |
| AuthProvider | `GOOGLE`, `FACEBOOK` | Social sign-in providers. |
| BeneficiaryType | `REGULAR` (Signed up without an ID), `STUDENT` (Presented a UC school ID and passed the face match; Volunteer side open) | How a beneficiary signed up. |
| CertificateAssetKind | `IMAGE` (Placed by the director), `FRAME` (Replaces the built-in frame (one per template)), `SEAL` (Replaces the built-in seal (one per template)) | What an uploaded certificate file is used for. |
| CertificateDeploymentStatus | `SCHEDULED`, `DISTRIBUTING`, `PAUSED`, `COMPLETED` | Status of a certificate deployment, independent of the event's status. |
| CertificateOrientation | `LANDSCAPE`, `PORTRAIT` | Sheet orientation of a certificate. |
| CertificateTemplateCategory | `PARTICIPATION`, `APPRECIATION`, `VOLUNTEER_HOURS`, `COMPLETION`, `SPONSORSHIP` | Kind of certificate. |
| CertificateTemplateStatus | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Lifecycle state of a certificate template. |
| DonationKind | `MONEY`, `GOODS` | Kind of donation. |
| DonationPaymentMethod | `GCASH` (E-wallet charge), `QRPH` (Dynamic QR Ph code), `CARD` (Hosted checkout, card with 3DS), `BANK_TRANSFER` (Hosted checkout, direct debit (BPI, UnionBank, RCBC, Chinabank)) | Xendit channel behind each payment option. |
| DonationPaymentStatus | `PENDING` (Checkout still open), `PAID`, `FAILED`, `EXPIRED` | Payment lifecycle as Xendit reports it. |
| DonationStatus | `PLEDGED`, `AWAITING_PICKUP` (Goods expected at the CARES office on the delivery date), `VERIFYING`, `CONFIRMED`, `DECLINED` (Rejected by the director), `CANCELLED` (Withdrawn by the donor (only from PLEDGED)) | Status of a donation. Goods: PLEDGED, AWAITING_PICKUP, VERIFYING, CONFIRMED. Money: PLEDGED, VERIFYING, CONFIRMED. |
| EmbeddingType | `FACE`, `FINGERPRINT`, `IRIS` | Kind of biometric template. |
| EvaluationFormStatus | `DRAFT`, `PUBLISHED` | Publication state of an evaluation form. |
| EvaluationResponseStatus | `COMPLETE`, `PARTIAL` | Whether every required question was answered. |
| EventParticipationRole | `REGULAR` (Plain volunteer slot), `ORGANIZER`, `FACILITATOR`, `SPEAKER` | What a volunteer registers to do at an event. Roles other than REGULAR need approval. |
| EventRoleApproval | `APPROVED`, `PENDING`, `REJECTED` | Review state of a volunteer's event role. |
| EventStatus | `Upcoming`, `Ongoing`, `Completed`, `Cancelled` | Lifecycle status of an event. |
| GenderType | `MALE`, `FEMALE`, `OTHER` | A user's gender. |
| GeoValidationMethod | `GEOFENCE` (Live readings), `OFFLINE_SYNC` (Readings pushed later as a CSV batch), `AWAITING_SYNC` (Offline device has not pushed yet), `MANUAL` (Marked by staff) | Where the coordinates used for attendance came from. |
| InterestCode | `ACADEMIC_ACTIVITIES`, `DONATION_DRIVES`, `ENVIRONMENT`, `SCHOOL`, `COMMUNITY`, `EMERGENCY`, `DONATION_DRIVE`, `CHARITY`, `RELIEF_PROGRAM`, `HEALTH`, `OUTREACH`, `TRAINING`, `SEMINAR`, `OTHERS` | Volunteer interests, mirroring the portal's event categories. ACADEMIC_ACTIVITIES, DONATION_DRIVES and ENVIRONMENT are the retired original catalog. |
| LoginOutcome | `SUCCESS`, `INVALID_CREDENTIALS`, `BLOCKED_IP`, `RESTRICTED_ACCOUNT`, `ROLE_NOT_ALLOWED`, `LOCKED_OUT` (Too many failed attempts (security policy)), `OUTSIDE_LOGIN_HOURS` (Outside allowed sign-in hours), `IP_NOT_ALLOWED` (IP not on the allowlist), `CREDENTIAL_EXPIRED` (Temporary credential has expired), `EMAIL_NOT_VERIFIED` (Email never confirmed with the sign-up OTP) | Why a sign-in attempt ended the way it did. Anything other than SUCCESS is a refusal. |
| LoginSource | `PORTAL` (React staff portal), `MOBILE` (Flutter mobile app) | Client an attempt or ticket came from. |
| MonthlyReportDocumentKind | `DOCX`, `PDF`, `XLSX`, `IMAGE` | File kind of a report attachment. |
| MonthlyReportStatus | `UNDER_REVIEW`, `APPROVED`, `RETURNED` | Review state of a monthly report. |
| MonthlyReportTrailAction | `SUBMITTED`, `APPROVED`, `RETURNED`, `RESUBMITTED` | Actions recorded on a report's history. |
| NotificationCategory | `EVENT`, `REPORT`, `ACCESS`, `SYSTEM`, `VOLUNTEER`, `CERTIFICATE`, `DONATION`, `USER_REQUEST`, `SECURITY`, `SUPPORT`, `MAIL` | Module a notification is about. |
| NotificationTone | `INFO`, `ATTENTION`, `CRITICAL` | How loudly a notification asks for attention. |
| PaymentAccountProof | `NOT_STARTED` (No payout sent), `SENDING` (Payout with the gateway), `AWAITING_CONFIRMATION` (Waiting for the director to report the amount), `VERIFIED` (Correct amount reported), `FAILED` (Payout refused or too many wrong answers) | Progress of the micro-deposit check that proves CARES owns the receiving account. |
| PaymentGatewayMode | `TEST`, `LIVE` | Which Xendit account answers. |
| PaymentMethodVerification | `NOT_VERIFIED` (Never checked), `PENDING` (Requested; gateway could not answer yet), `VERIFIED` (Channel activated and callbacks registered), `FAILED` (Gateway refused it) | Activation status of a payment channel with the gateway. |
| PermissionKey | `USERS_VIEW`, `USERS_RESTRICT`, `USERS_BLOCK_IP`, `USERS_EXPORT`, `USERS_REQUEST`, `ACCESS_CONTROL_VIEW`, `ACCESS_CONTROL_MANAGE`, `EVENTS_VIEW`, `EVENTS_CREATE`, `EVENTS_UPDATE`, `EVENTS_DELETE`, `EVENTS_PUBLISH`, `ATTENDANCE_VIEW`, `ATTENDANCE_RECORD`, `ATTENDANCE_EXPORT`, `CERTIFICATES_VIEW`, `CERTIFICATES_TEMPLATE_MANAGE`, `CERTIFICATES_ISSUE`, `DONATIONS_VIEW`, `DONATIONS_RECORD`, `REPORTS_VIEW`, `REPORTS_PUBLISH`, `SECURITY_AUDIT_VIEW`, `SECURITY_SESSION_REVOKE`, `SECURITY_POLICY_MANAGE`, `PAYMENT_SETTINGS_MANAGE`, `SYSTEM_PERFORMANCE_VIEW`, `SYSTEM_NOTICE_MANAGE`, `SYSTEM_SERVICE_MANAGE`, `SYSTEM_MAINTENANCE_MANAGE`, `CHAT_ACCESS`, `MAIL_ACCESS`, `SUPPORT_TICKET_MANAGE`, `MOBILE_APP_ACCESS`, `ATTENDANCE_MANUAL_MARK` | Every action the portal can gate, named {MODULE}_{ACTION}. |
| PermissionOverrideEffect | `GRANT` (Adds the permission), `REVOKE` (Removes the permission) | Direction of a per-user permission override. |
| ReportDepartment | `CCS` (College of Computer Studies), `CBA` (College of Business Administration), `CEA` (College of Engineering and Architecture), `CNAHS` (College of Nursing and Allied Health Sciences), `CAS` (College of Arts and Sciences), `CCJE` (College of Criminal Justice Education) | The colleges a monthly report can count for. |
| RoleType | `ADMIN`, `DIRECTOR`, `COORDINATOR`, `VOLUNTEER`, `DONOR`, `BENEFICIARY` | The roles in CARES. ADMIN, DIRECTOR and COORDINATOR use the portal; the rest use the mobile app. |
| SupportTicketAuthorType | `STAFF`, `REQUESTER` | Which side of a ticket thread a reply sits on. |
| SupportTicketPriority | `HIGH` (Issue), `MEDIUM` (Support), `LOW` (Feature) | Priority of a ticket, which doubles as its triage bucket. |
| SupportTicketStatus | `OPEN`, `IN_PROGRESS`, `UNDER_VERIFICATION` (Fix is in; waiting for the requester to confirm), `CLIENT_FEEDBACK` (Waiting on the requester for detail or a decision), `RESOLVED`, `CLOSED` | Status of a support ticket. |
| SupportTicketType | `BUG`, `LOGIN`, `ACCOUNT`, `VERIFICATION`, `EVENT`, `MOBILE_APP`, `FEATURE_REQUEST`, `OTHER`, `REPORT` (Flagging another user, event, campaign or content) | What the reporter says went wrong; drives triage routing. |
| UserRequestKind | `ROLE_ACCESS` (Donor or beneficiary asking for the volunteer side), `EVENT_JOIN` (Beneficiary asking to attend an event), `BENEFICIARY_REGISTRATION` (New beneficiary account awaiting approval), `EVENT_ROLE` (Volunteer asking for a special event role), `RESIDENCY_VERIFICATION` (Proof of residency uploaded from the profile), `ALUMNI_REGISTRATION` (Alumni sign-up awaiting review), `PARTNER_BARANGAY_REGISTRATION` (Partner-barangay volunteer sign-up awaiting review), `MANUAL_REGISTRATION` (Sign-up whose ID could not be read; verified by hand) | What a mobile user is asking the portal for. |
| UserRequestStatus | `PENDING`, `ACCEPTED`, `DELETED` (Recycle bin; can be restored to PENDING), `REJECTED` (Decision shown to the requester with a reason) | State of a user request. |
| VerificationStatus | `N` (Pending), `F` (Failed), `V` (Verified) | Result of an ID verification. |
