-- CreateEnum
CREATE TYPE "MonthlyReportStatus" AS ENUM ('UNDER_REVIEW', 'APPROVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ReportDepartment" AS ENUM ('CCS', 'CBA', 'CEA', 'CNAHS', 'CAS', 'CCJE');

-- CreateEnum
CREATE TYPE "MonthlyReportDocumentKind" AS ENUM ('DOCX', 'PDF', 'XLSX', 'IMAGE');

-- CreateEnum
CREATE TYPE "MonthlyReportTrailAction" AS ENUM ('SUBMITTED', 'APPROVED', 'RETURNED', 'RESUBMITTED');

-- CreateTable
CREATE TABLE "MonthlyReportFolder" (
    "monthly_report_folder_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "created_by_name" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReportFolder_pkey" PRIMARY KEY ("monthly_report_folder_id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "monthly_report_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "department" "ReportDepartment" NOT NULL,
    "status" "MonthlyReportStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "summary" TEXT NOT NULL,
    "metric_events" INTEGER NOT NULL DEFAULT 0,
    "metric_volunteers" INTEGER NOT NULL DEFAULT 0,
    "metric_service_hours" INTEGER NOT NULL DEFAULT 0,
    "metric_beneficiaries" INTEGER NOT NULL DEFAULT 0,
    "submitted_by_user_id" TEXT,
    "submitted_by_name" TEXT NOT NULL,
    "submitted_by_email" TEXT NOT NULL,
    "submitted_by_title" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewer_user_id" TEXT,
    "reviewer_name" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "folder_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("monthly_report_id")
);

-- CreateTable
CREATE TABLE "MonthlyReportDocument" (
    "monthly_report_document_id" TEXT NOT NULL,
    "monthly_report_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "kind" "MonthlyReportDocumentKind" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyReportDocument_pkey" PRIMARY KEY ("monthly_report_document_id")
);

-- CreateTable
CREATE TABLE "MonthlyReportTrailEntry" (
    "monthly_report_trail_entry_id" TEXT NOT NULL,
    "monthly_report_id" TEXT NOT NULL,
    "action" "MonthlyReportTrailAction" NOT NULL,
    "actor_name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyReportTrailEntry_pkey" PRIMARY KEY ("monthly_report_trail_entry_id")
);

-- CreateIndex
CREATE INDEX "MonthlyReportFolder_createdAt_idx" ON "MonthlyReportFolder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_reference_key" ON "MonthlyReport"("reference");

-- CreateIndex
CREATE INDEX "MonthlyReport_status_idx" ON "MonthlyReport"("status");

-- CreateIndex
CREATE INDEX "MonthlyReport_period_idx" ON "MonthlyReport"("period");

-- CreateIndex
CREATE INDEX "MonthlyReport_department_idx" ON "MonthlyReport"("department");

-- CreateIndex
CREATE INDEX "MonthlyReport_folder_id_idx" ON "MonthlyReport"("folder_id");

-- CreateIndex
CREATE INDEX "MonthlyReport_updatedAt_idx" ON "MonthlyReport"("updatedAt");

-- CreateIndex
CREATE INDEX "MonthlyReportDocument_monthly_report_id_idx" ON "MonthlyReportDocument"("monthly_report_id");

-- CreateIndex
CREATE INDEX "MonthlyReportTrailEntry_monthly_report_id_createdAt_idx" ON "MonthlyReportTrailEntry"("monthly_report_id", "createdAt");

-- AddForeignKey
ALTER TABLE "MonthlyReportFolder" ADD CONSTRAINT "MonthlyReportFolder_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "MonthlyReportFolder"("monthly_report_folder_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReportDocument" ADD CONSTRAINT "MonthlyReportDocument_monthly_report_id_fkey" FOREIGN KEY ("monthly_report_id") REFERENCES "MonthlyReport"("monthly_report_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReportTrailEntry" ADD CONSTRAINT "MonthlyReportTrailEntry_monthly_report_id_fkey" FOREIGN KEY ("monthly_report_id") REFERENCES "MonthlyReport"("monthly_report_id") ON DELETE CASCADE ON UPDATE CASCADE;
