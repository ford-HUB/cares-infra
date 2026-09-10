-- Retire the original three-item catalog; existing UserInterest.selected rows keep
-- their old codes, but they are no longer offered to new volunteers.
UPDATE "Interest"
SET "is_active" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('ACADEMIC_ACTIVITIES', 'DONATION_DRIVES', 'ENVIRONMENT');

-- Seed the event-type interest catalog (same order as the portal's EVENT_CATEGORIES).
INSERT INTO "Interest" ("interest_id", "code", "label", "description", "is_active", "sort_order", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'SCHOOL',         'School',         'Academic activities and campus programs',       true, 1,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'COMMUNITY',      'Community',      'Barangay and neighborhood initiatives',         true, 2,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'EMERGENCY',      'Emergency',      'Rapid response when disaster strikes',          true, 3,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DONATION_DRIVE', 'Donation Drive', 'Collecting goods, funds, and supplies',         true, 4,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CHARITY',        'Charity',        'Fundraisers and giving programs',               true, 5,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'RELIEF_PROGRAM', 'Relief Program', 'Distributing aid to affected families',         true, 6,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'HEALTH',         'Health',         'Medical missions and wellness drives',          true, 7,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'OUTREACH',       'Outreach',       'Visiting and supporting communities in need',   true, 8,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'TRAINING',       'Training',       'Workshops and skills development',              true, 9,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SEMINAR',        'Seminar',        'Talks, lectures, and awareness sessions',       true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'OTHERS',         'Others',         'Anything else CARES organizes',                 true, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "is_active" = true,
    "sort_order" = EXCLUDED."sort_order",
    "updatedAt" = CURRENT_TIMESTAMP;
