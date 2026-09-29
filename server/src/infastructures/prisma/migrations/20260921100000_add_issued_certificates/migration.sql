-- CreateTable
CREATE TABLE "IssuedCertificate" (
    "issued_certificate_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "certificate_deployment_id" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "hours_rendered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "organization" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "category" "CertificateTemplateCategory" NOT NULL,
    "orientation" "CertificateOrientation" NOT NULL,
    "design" JSONB NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuedCertificate_pkey" PRIMARY KEY ("issued_certificate_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssuedCertificate_certificate_number_key" ON "IssuedCertificate"("certificate_number");

-- CreateIndex
CREATE INDEX "IssuedCertificate_user_id_idx" ON "IssuedCertificate"("user_id");

-- CreateIndex
CREATE INDEX "IssuedCertificate_event_id_idx" ON "IssuedCertificate"("event_id");

-- CreateIndex
CREATE INDEX "IssuedCertificate_issued_at_idx" ON "IssuedCertificate"("issued_at");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedCertificate_certificate_deployment_id_user_id_key" ON "IssuedCertificate"("certificate_deployment_id", "user_id");

-- AddForeignKey
ALTER TABLE "IssuedCertificate" ADD CONSTRAINT "IssuedCertificate_certificate_deployment_id_fkey" FOREIGN KEY ("certificate_deployment_id") REFERENCES "CertificateDeployment"("certificate_deployment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedCertificate" ADD CONSTRAINT "IssuedCertificate_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedCertificate" ADD CONSTRAINT "IssuedCertificate_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
