# CARES ERD

Generated from `server/src/infastructures/prisma/schema.prisma`. Every diagram comes in three scripts:

| File | Notation | Paste into |
|---|---|---|
| `*.dbml` | Crow's Foot | https://dbdiagram.io |
| `*.mmd` | Crow's Foot | https://mermaid.live |
| `*.puml` | Chen | https://www.plantuml.com/plantuml or https://www.planttext.com |

Full diagram: `cares-erd.dbml`, `cares-erd.mmd`, `cares-erd-chen.puml` (57 tables, 70 relationships). Module map: `modules/00-overview.mmd`.

## Modules

Each module folder holds the module's own tables in full, every foreign key those tables hold, and key-only stubs of the tables in other modules they point at. Each relationship is drawn in exactly one module; `modules/00-overview.mmd` shows how the modules connect.

| # | Module | Tables | Relationships | Links to |
|---|---|---|---|---|
| 01 | [Identity & Access](modules/01-identity-access/) | User, Role, Account, OAuthIdentity, GmailConnection, UserRoleAvatar, RolePermissionDefault, UserPermissionOverride, UserActionSuspension | 7 | - |
| 02 | [Verification & School Records](modules/02-verification-school/) | UserVerification, UserBiometric, UserSchoolInfo, Department, Major, YearLevel, ResidencyDocument | 7 | User |
| 03 | [Security & Audit](modules/03-security-audit/) | SecurityPolicy, BlockedIp, LoginActivity, AuditLog | 3 | User |
| 04 | [Events, Attendance & Engagement](modules/04-events-attendance/) | Event, EventAttendance, EventLocationPing, Interest, UserInterest, RankingSettings | 5 | User |
| 05 | [Post-Event Evaluations](modules/05-evaluations/) | EvaluationForm, EvaluationAssignment, EvaluationResponse | 6 | User, Event |
| 06 | [Certificates](modules/06-certificates/) | CertificateTemplate, CertificateTemplateSignatory, CertificateTemplateAsset, CertificateDeployment, IssuedCertificate | 10 | User, Event |
| 07 | [Portal Messaging](modules/07-messaging/) | Conversation, ConversationParticipant, ChatMessage, ChatAttachment | 5 | User |
| 08 | [Announcements & Notifications](modules/08-announcements-notifications/) | Announcement, Notification | 2 | User |
| 09 | [Support Tickets](modules/09-support-tickets/) | SupportTicket, SupportTicketReply | 4 | User |
| 10 | [Monthly Reports](modules/10-monthly-reports/) | MonthlyReportFolder, MonthlyReport, MonthlyReportDocument, MonthlyReportTrailEntry | 6 | User |
| 11 | [User Requests](modules/11-user-requests/) | UserRequest, UserRequestTrailEntry | 4 | User, Event |
| 12 | [Beneficiary Assistance](modules/12-beneficiary-assistance/) | NeedsAssessment, AssistanceRequest, AssistanceRequestAttachment | 3 | User |
| 13 | [Donations & Payments](modules/13-donations-payments/) | Donation, DonationTrailEntry, DonationPayment, PaymentWebhookEvent, PaymentGatewaySettings, PaymentMethodSetting | 8 | User, Event |
