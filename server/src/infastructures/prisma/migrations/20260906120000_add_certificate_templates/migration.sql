-- CreateEnum
CREATE TYPE "CertificateTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CertificateTemplateCategory" AS ENUM ('PARTICIPATION', 'APPRECIATION', 'VOLUNTEER_HOURS', 'COMPLETION', 'SPONSORSHIP');

-- CreateEnum
CREATE TYPE "CertificateOrientation" AS ENUM ('LANDSCAPE', 'PORTRAIT');

-- CreateEnum
CREATE TYPE "CertificateAssetKind" AS ENUM ('IMAGE', 'FRAME', 'SEAL');

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "certificate_template_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CertificateTemplateCategory" NOT NULL DEFAULT 'PARTICIPATION',
    "status" "CertificateTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "orientation" "CertificateOrientation" NOT NULL DEFAULT 'LANDSCAPE',
    "issued" INTEGER NOT NULL DEFAULT 0,
    "deployed_events" INTEGER NOT NULL DEFAULT 0,
    "design" JSONB NOT NULL,
    "updated_by_user_id" TEXT,
    "updated_by_name" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("certificate_template_id")
);

-- CreateTable
CREATE TABLE "CertificateTemplateSignatory" (
    "certificate_template_signatory_id" TEXT NOT NULL,
    "certificate_template_id" TEXT NOT NULL,
    "coordinator_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "signature_token" TEXT NOT NULL DEFAULT '{{signature-image}}',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplateSignatory_pkey" PRIMARY KEY ("certificate_template_signatory_id")
);

-- CreateTable
CREATE TABLE "CertificateTemplateAsset" (
    "certificate_template_asset_id" TEXT NOT NULL,
    "certificate_template_id" TEXT NOT NULL,
    "kind" "CertificateAssetKind" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateTemplateAsset_pkey" PRIMARY KEY ("certificate_template_asset_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateTemplate_reference_key" ON "CertificateTemplate"("reference");

-- CreateIndex
CREATE INDEX "CertificateTemplate_status_idx" ON "CertificateTemplate"("status");

-- CreateIndex
CREATE INDEX "CertificateTemplate_category_idx" ON "CertificateTemplate"("category");

-- CreateIndex
CREATE INDEX "CertificateTemplate_updatedAt_idx" ON "CertificateTemplate"("updatedAt");

-- CreateIndex
CREATE INDEX "CertificateTemplateSignatory_certificate_template_id_positio_idx" ON "CertificateTemplateSignatory"("certificate_template_id", "position");

-- CreateIndex
CREATE INDEX "CertificateTemplateSignatory_coordinator_user_id_idx" ON "CertificateTemplateSignatory"("coordinator_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateTemplateSignatory_certificate_template_id_coordin_key" ON "CertificateTemplateSignatory"("certificate_template_id", "coordinator_user_id");

-- CreateIndex
CREATE INDEX "CertificateTemplateAsset_certificate_template_id_idx" ON "CertificateTemplateAsset"("certificate_template_id");

-- AddForeignKey
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTemplateSignatory" ADD CONSTRAINT "CertificateTemplateSignatory_certificate_template_id_fkey" FOREIGN KEY ("certificate_template_id") REFERENCES "CertificateTemplate"("certificate_template_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTemplateSignatory" ADD CONSTRAINT "CertificateTemplateSignatory_coordinator_user_id_fkey" FOREIGN KEY ("coordinator_user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTemplateAsset" ADD CONSTRAINT "CertificateTemplateAsset_certificate_template_id_fkey" FOREIGN KEY ("certificate_template_id") REFERENCES "CertificateTemplate"("certificate_template_id") ON DELETE CASCADE ON UPDATE CASCADE;
