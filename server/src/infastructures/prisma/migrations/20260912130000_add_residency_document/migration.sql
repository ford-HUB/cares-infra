-- Proof-of-residency uploads from the mobile app. The address is OCR'd off the
-- file into User.current_address; the file itself stays on record here.
CREATE TABLE "ResidencyDocument" (
    "residency_document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "extracted_address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidencyDocument_pkey" PRIMARY KEY ("residency_document_id")
);

CREATE INDEX "ResidencyDocument_user_id_createdAt_idx" ON "ResidencyDocument"("user_id", "createdAt");

ALTER TABLE "ResidencyDocument" ADD CONSTRAINT "ResidencyDocument_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
