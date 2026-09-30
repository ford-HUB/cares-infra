-- Beneficiaries' Needs Assessment Survey and assistance requests move off the
-- app's in-memory prototype stores and into the database.

-- CreateEnum
CREATE TYPE "AssistanceCategory" AS ENUM ('FOOD', 'MEDICAL', 'EDUCATION', 'FINANCIAL', 'LIVELIHOOD', 'DISASTER_RELIEF');

-- CreateEnum
CREATE TYPE "AssistanceUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AssistanceRequestStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AssistanceAssessmentStatus" AS ENUM ('NOT_STARTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "NeedsAssessment" (
    "needs_assessment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "needs" TEXT[],
    "other_need" TEXT,
    "seriousness" INTEGER NOT NULL,
    "barriers" TEXT[],
    "other_barrier" TEXT,
    "community_problem" TEXT NOT NULL,
    "other_community_problem" TEXT,
    "concern" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeedsAssessment_pkey" PRIMARY KEY ("needs_assessment_id")
);

-- CreateTable
CREATE TABLE "AssistanceRequest" (
    "assistance_request_id" TEXT NOT NULL,
    "reference_number" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "AssistanceCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" "AssistanceUrgency" NOT NULL,
    "household_size" INTEGER NOT NULL,
    "status" "AssistanceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "assessment_status" "AssistanceAssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assessment_date" TIMESTAMP(3),
    "assigned_organization" TEXT,
    "items" TEXT[],
    "status_note" TEXT,
    "screened_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistanceRequest_pkey" PRIMARY KEY ("assistance_request_id")
);

-- CreateTable
CREATE TABLE "AssistanceRequestAttachment" (
    "assistance_request_attachment_id" TEXT NOT NULL,
    "assistance_request_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistanceRequestAttachment_pkey" PRIMARY KEY ("assistance_request_attachment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NeedsAssessment_user_id_key" ON "NeedsAssessment"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssistanceRequest_reference_number_key" ON "AssistanceRequest"("reference_number");

-- CreateIndex
CREATE INDEX "AssistanceRequest_user_id_idx" ON "AssistanceRequest"("user_id");

-- CreateIndex
CREATE INDEX "AssistanceRequest_status_idx" ON "AssistanceRequest"("status");

-- CreateIndex
CREATE INDEX "AssistanceRequestAttachment_assistance_request_id_idx" ON "AssistanceRequestAttachment"("assistance_request_id");

-- AddForeignKey
ALTER TABLE "NeedsAssessment" ADD CONSTRAINT "NeedsAssessment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceRequestAttachment" ADD CONSTRAINT "AssistanceRequestAttachment_assistance_request_id_fkey" FOREIGN KEY ("assistance_request_id") REFERENCES "AssistanceRequest"("assistance_request_id") ON DELETE CASCADE ON UPDATE CASCADE;
