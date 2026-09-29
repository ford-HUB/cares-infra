-- CreateEnum
CREATE TYPE "CertificateDeploymentStatus" AS ENUM ('SCHEDULED', 'DISTRIBUTING', 'PAUSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "CertificateDeployment" (
    "certificate_deployment_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "certificate_template_id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "category" "CertificateTemplateCategory" NOT NULL,
    "orientation" "CertificateOrientation" NOT NULL,
    "design" JSONB NOT NULL,
    "event_id" INTEGER NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_venue" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "status" "CertificateDeploymentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "participants" INTEGER NOT NULL DEFAULT 0,
    "distributed" INTEGER NOT NULL DEFAULT 0,
    "claimed" INTEGER NOT NULL DEFAULT 0,
    "deployed_by_user_id" TEXT,
    "deployed_by_name" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateDeployment_pkey" PRIMARY KEY ("certificate_deployment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateDeployment_reference_key" ON "CertificateDeployment"("reference");

-- CreateIndex
CREATE INDEX "CertificateDeployment_status_idx" ON "CertificateDeployment"("status");

-- CreateIndex
CREATE INDEX "CertificateDeployment_event_id_idx" ON "CertificateDeployment"("event_id");

-- CreateIndex
CREATE INDEX "CertificateDeployment_createdAt_idx" ON "CertificateDeployment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateDeployment_certificate_template_id_event_id_key" ON "CertificateDeployment"("certificate_template_id", "event_id");

-- AddForeignKey
ALTER TABLE "CertificateDeployment" ADD CONSTRAINT "CertificateDeployment_certificate_template_id_fkey" FOREIGN KEY ("certificate_template_id") REFERENCES "CertificateTemplate"("certificate_template_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateDeployment" ADD CONSTRAINT "CertificateDeployment_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateDeployment" ADD CONSTRAINT "CertificateDeployment_deployed_by_user_id_fkey" FOREIGN KEY ("deployed_by_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
