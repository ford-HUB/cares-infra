-- User requests: role-access (volunteer side unlock) and beneficiary event-join
-- requests filed from the mobile app and ruled on from the portal.

-- CreateEnum
CREATE TYPE "UserRequestKind" AS ENUM ('ROLE_ACCESS', 'EVENT_JOIN');

-- CreateEnum
CREATE TYPE "UserRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELETED');

-- CreateTable
CREATE TABLE "UserRequest" (
    "user_request_id" TEXT NOT NULL,
    "reference_number" SERIAL NOT NULL,
    "kind" "UserRequestKind" NOT NULL,
    "status" "UserRequestStatus" NOT NULL DEFAULT 'PENDING',
    "user_id" TEXT NOT NULL,
    "requested_role" "RoleType",
    "event_id" INTEGER,
    "id_front_url" TEXT,
    "id_back_url" TEXT,
    "selfie_url" TEXT,
    "face_similarity" DOUBLE PRECISION,
    "summary" TEXT NOT NULL,
    "decided_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRequest_pkey" PRIMARY KEY ("user_request_id")
);

-- CreateTable
CREATE TABLE "UserRequestTrailEntry" (
    "user_request_trail_entry_id" TEXT NOT NULL,
    "user_request_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRequestTrailEntry_pkey" PRIMARY KEY ("user_request_trail_entry_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRequest_reference_number_key" ON "UserRequest"("reference_number");

-- CreateIndex
CREATE INDEX "UserRequest_user_id_idx" ON "UserRequest"("user_id");

-- CreateIndex
CREATE INDEX "UserRequest_status_idx" ON "UserRequest"("status");

-- CreateIndex
CREATE INDEX "UserRequest_kind_status_idx" ON "UserRequest"("kind", "status");

-- CreateIndex
CREATE INDEX "UserRequestTrailEntry_user_request_id_idx" ON "UserRequestTrailEntry"("user_request_id");

-- AddForeignKey
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRequestTrailEntry" ADD CONSTRAINT "UserRequestTrailEntry_user_request_id_fkey" FOREIGN KEY ("user_request_id") REFERENCES "UserRequest"("user_request_id") ON DELETE CASCADE ON UPDATE CASCADE;
