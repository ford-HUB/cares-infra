"""The paragraph printed under each table of the data dictionary.

PARAGRAPHS[model] = (opening, closing). data_dictionary.py writes
    "<opening> Key fields such as a, b, ... and z are identified along with their
     constraints and data types. <closing>"
with the key fields picked from the schema (primary key, foreign keys, then required columns).
"""

PARAGRAPHS = {
    "User": (
        "The table provides a detailed structure for storing the personal and address information of every "
        "CARES account holder, from portal staff to volunteers, donors and beneficiaries.",
        "This structure keeps one complete profile per person across both the staff portal and the mobile app. "
        "It also links each user to a role, which decides the features available to them."),
    "Role": (
        "The table stores the roles that a CARES user can hold.",
        "This structure gives every account a single role that separates portal staff from mobile users. It also "
        "serves as the basis of the role's default permissions."),
    "Account": (
        "The table holds the sign-in credentials and the account status of each user.",
        "This structure keeps authentication data apart from the personal profile. It also supports email "
        "verification, temporary credentials issued by administrators and the restriction of accounts."),
    "OAuthIdentity": (
        "The table records the Google and Facebook identities that a user may sign in with.",
        "This structure allows one CARES account to be reached through several social providers. It also keeps "
        "sign-in secure because no provider token is stored."),
    "GmailConnection": (
        "The table stores the Google mailbox that a portal user has linked to the system.",
        "This structure lets staff read and send email from inside the portal. It also allows the access token "
        "to be renewed automatically without asking the user to sign in again."),
    "UserRoleAvatar": (
        "The table stores a separate profile photo for each side of a mobile user's account.",
        "This structure lets a person who is both a volunteer and a donor show a different picture on each side. "
        "It also prevents a change on one side from affecting the others."),
    "RolePermissionDefault": (
        "The table lists the permissions that every user of a given role receives by default.",
        "This structure defines the baseline access of each role in one place. It also simplifies access control "
        "because individual users only need to store their exceptions."),
    "UserPermissionOverride": (
        "The table records the permissions that have been granted to or revoked from an individual user.",
        "This structure allows administrators to adjust a single user's access without changing the whole role. "
        "It also keeps the reason and the administrator behind each change."),
    "UserActionSuspension": (
        "The table stores the suspensions placed on specific actions of a user because of a violation.",
        "This structure lets administrators block one action temporarily or indefinitely. It also preserves the "
        "user's original rights so that lifting the suspension restores them."),
    "UserVerification": (
        "The table records each identity verification performed when a user registers.",
        "This structure tracks whether a submitted ID is pending, failed or verified. It also ties each check to "
        "the face biometric captured for it."),
    "UserBiometric": (
        "The table stores the face biometric enrolled during an identity verification.",
        "This structure keeps the face image and embedding used for face matching. It also supports marking "
        "which biometric is currently active for the user."),
    "UserSchoolInfo": (
        "The table provides a structure for storing the academic information of student and alumni users.",
        "This structure links each user to a department, major and year level. It also keeps the school ID "
        "number and the scanned ID used during registration."),
    "Department": (
        "The table holds the list of colleges and departments of the institution.",
        "This structure provides consistent department names for school records. It also prevents the same "
        "department from being entered in different spellings."),
    "Major": (
        "The table holds the list of programs and majors offered by the institution.",
        "This structure provides consistent program names for school records. It also supports grouping users "
        "by their program."),
    "YearLevel": (
        "The table holds the list of year levels used in school records.",
        "This structure keeps year levels uniform across all students. It also supports filtering and reporting "
        "by year level."),
    "ResidencyDocument": (
        "The table stores the proof of residency documents uploaded by mobile users.",
        "This structure keeps the uploaded file on record together with the address read from it by OCR. It also "
        "supports the review of a user's change of address."),
    "SecurityPolicy": (
        "The table stores the portal-wide security settings of the system in a single row.",
        "This structure controls the password rules, account lockout, session limits, sign-in hours and IP "
        "allowlist. It also allows administrators to tighten security without changing the code."),
    "BlockedIp": (
        "The table records the IP addresses that are refused at sign-in.",
        "This structure serves as the system's denylist against suspicious addresses. It also keeps the reason "
        "and the account that led to each block."),
    "LoginActivity": (
        "The table records every sign-in attempt made to the system, whether successful or not.",
        "This structure provides an append-only trail for security monitoring. It also helps administrators "
        "detect repeated failures and suspicious addresses."),
    "AuditLog": (
        "The table records every privileged action performed in the system.",
        "This structure provides an append-only history of who did what, when and from where. It also copies the "
        "actor's details at the time so that later changes cannot rewrite the record."),
    "Event": (
        "The table provides a detailed structure for storing the volunteer and outreach events published by "
        "staff.",
        "This structure holds the schedule, venue, capacity, geofence and donation settings of each event. It "
        "also serves as the basis of registration, attendance, donations and certificates."),
    "EventAttendance": (
        "The table records each volunteer's registration for an event and the attendance result.",
        "This structure tracks whether a volunteer completed, missed or is still pending for an event. It also "
        "stores the service hours credited and the role the volunteer registered for."),
    "EventLocationPing": (
        "The table stores the GPS readings sent by volunteers' devices during an event.",
        "This structure supplies the coordinates used to validate geofence-based attendance. It also accepts "
        "readings recorded offline and synchronized later."),
    "Interest": (
        "The table holds the catalog of volunteer interests offered during sign-up.",
        "This structure mirrors the event categories so that interests can be matched with events. It also "
        "allows interests to be reordered or retired without deleting them."),
    "UserInterest": (
        "The table stores the interests selected by each volunteer.",
        "This structure supports recommending events that match a volunteer's preferences. It also keeps any "
        "interest the volunteer typed under Others."),
    "RankingSettings": (
        "The table stores the scoring rules and tier ladder of the volunteer and donor leaderboards in a single "
        "row.",
        "This structure lets the director adjust how points are earned and lost. It also defines the tiers that "
        "the mobile app uses for avatar frames."),
    "EvaluationForm": (
        "The table stores the post-event evaluation questionnaires built by the director.",
        "This structure keeps the questions in a flexible format so new question types need no database change. "
        "It also marks the default form used by events without an assignment."),
    "EvaluationAssignment": (
        "The table records which evaluation form an event asks its participants to answer.",
        "This structure allows each event to use its own questionnaire. It also lets events without an "
        "assignment fall back to the default form."),
    "EvaluationResponse": (
        "The table stores each volunteer's answers to the evaluation of an event they attended.",
        "This structure collects feedback per event and per volunteer. It also copies the star rating out so "
        "the portal can filter and average responses quickly."),
    "CertificateTemplate": (
        "The table stores the certificate designs maintained by the director in the portal.",
        "This structure keeps the full layout, wording and artwork of each certificate as one design. It also "
        "tracks how many certificates and events use each template."),
    "CertificateTemplateSignatory": (
        "The table stores the signature lines printed on a certificate template.",
        "This structure ties each line to the coordinator whose signature image is printed. It also keeps the "
        "printed name, title and department so that later edits do not reword issued certificates."),
    "CertificateTemplateAsset": (
        "The table stores the image files imported onto a certificate template.",
        "This structure keeps a reference to each image, frame or seal held in private storage. It also records "
        "the file details needed to serve the image back to the portal."),
    "CertificateDeployment": (
        "The table records each certificate template deployed to an event.",
        "This structure freezes the design and event details at the time of deployment. It also tracks how many "
        "certificates have been distributed to and claimed by participants."),
    "IssuedCertificate": (
        "The table stores every certificate generated for a participant of an event.",
        "This structure keeps the complete certificate exactly as it was issued. It also records when the "
        "recipient first opened it in the app."),
    "Conversation": (
        "The table stores the direct conversations between portal staff members.",
        "This structure groups the messages exchanged between two users. It also keeps the time of the newest "
        "message so that the contact list can be sorted quickly."),
    "ConversationParticipant": (
        "The table records the users who take part in each conversation.",
        "This structure links portal users to their conversations. It also tracks the last time each participant "
        "read the conversation to count unread messages."),
    "ChatMessage": (
        "The table stores the messages sent within a conversation.",
        "This structure keeps the sender, the text and the time of each message. It also supports loading a "
        "conversation's history in order."),
    "ChatAttachment": (
        "The table stores the files attached to chat messages.",
        "This structure keeps the name, size, type and storage location of each file. It also ensures that files "
        "are served through the system rather than as public links."),
    "Announcement": (
        "The table stores the system notices written by administrators on the maintenance board.",
        "This structure controls the audience, channels and schedule of each notice. It also lets a notice "
        "publish and expire on its own at the set times."),
    "Notification": (
        "The table stores the notifications delivered to each user.",
        "This structure keeps read and dismissed states per recipient. It also prevents the same notification "
        "from being sent twice and targets the correct side of a mobile account."),
    "SupportTicket": (
        "The table stores the problems, requests and reports filed by users through the help desk.",
        "This structure tracks each ticket's type, status, priority and assigned staff member. It also gives the "
        "requester a tracking number that is never reused."),
    "SupportTicketReply": (
        "The table stores the replies exchanged within a support ticket.",
        "This structure keeps the conversation between staff and the requester in order. It also preserves the "
        "author's name even if the account is later removed."),
    "MonthlyReportFolder": (
        "The table stores the custom folders that the director creates for approved monthly reports.",
        "This structure lets the director group reports for purposes such as accreditation. It also keeps the "
        "creator's name for reference."),
    "MonthlyReport": (
        "The table provides a structure for storing the monthly accomplishment reports submitted by coordinators.",
        "This structure records the reporting period, college, metrics and review decision of each report. It "
        "also keeps the submitter's details as they were on the day of submission."),
    "MonthlyReportDocument": (
        "The table stores the files attached to a monthly report.",
        "This structure keeps a reference to each document held in private storage. It also records the file "
        "type so the portal can preview or download it."),
    "MonthlyReportTrailEntry": (
        "The table records the history of actions taken on a monthly report.",
        "This structure shows who submitted, approved or returned a report and the note given. It also lets the "
        "coordinator follow the progress of their submission."),
    "UserRequest": (
        "The table stores the requests that mobile users file for a director's decision.",
        "This structure covers role access, event participation, special event roles, registrations and "
        "residency verification. It also keeps the ID images, selfie and documents submitted as proof."),
    "UserRequestTrailEntry": (
        "The table records the history of each user request.",
        "This structure shows when a request was filed, accepted, removed or restored. It also records who "
        "caused each change."),
    "NeedsAssessment": (
        "The table stores the Needs Assessment Survey answered by each beneficiary.",
        "This structure records the household's needs, their seriousness and the barriers to meeting them. It "
        "also supports the clustering of residential needs for planning assistance."),
    "AssistanceRequest": (
        "The table provides a structure for storing the assistance requested by beneficiaries through the app.",
        "This structure tracks the category, urgency, location and status of each request. It also records the "
        "date of each stage from screening to release."),
    "AssistanceRequestAttachment": (
        "The table stores the proof documents filed with an assistance request.",
        "This structure keeps the name, type, size and location of each file. It also supports the review of "
        "requests by staff."),
    "Donation": (
        "The table stores the money and goods donations made by donors.",
        "This structure tracks each donation from pledge to confirmation. It also records the goods details "
        "needed for drop-off at the CARES office."),
    "DonationTrailEntry": (
        "The table records every status change made on a donation.",
        "This structure provides the audit trail of each donation and who handled it. It also serves as proof "
        "that the donor was notified."),
    "DonationPayment": (
        "The table stores the online checkouts started by donors through the payment gateway.",
        "This structure tracks each payment from checkout to settlement. It also prevents a retried tap from "
        "creating a duplicate payment."),
    "PaymentWebhookEvent": (
        "The table records the payment gateway callbacks that the system has already processed.",
        "This structure ensures that a repeated callback is applied only once. It also keeps the raw callback "
        "for troubleshooting."),
    "PaymentGatewaySettings": (
        "The table stores the payment gateway account that receives donations in a single row.",
        "This structure keeps the gateway's secret keys encrypted. It also lets the director switch online "
        "donations on or off from the portal."),
    "PaymentMethodSetting": (
        "The table stores the settings of each payment method offered to donors.",
        "This structure controls which methods are shown in the app and their limits. It also records the "
        "activation and ownership checks of the receiving account."),
}
