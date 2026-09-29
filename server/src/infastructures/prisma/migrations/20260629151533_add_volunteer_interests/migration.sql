-- CreateEnum
CREATE TYPE "InterestCode" AS ENUM ('ACADEMIC_ACTIVITIES', 'DONATION_DRIVES', 'ENVIRONMENT');

-- CreateTable
CREATE TABLE "Interest" (
    "interest_id" TEXT NOT NULL,
    "code" "InterestCode" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("interest_id")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "user_interest_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "selected" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("user_interest_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Interest_code_key" ON "Interest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterest_user_id_key" ON "UserInterest"("user_id");

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed interest catalog
INSERT INTO "Interest" ("interest_id", "code", "label", "description", "is_active", "sort_order", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'ACADEMIC_ACTIVITIES', 'Academic activities', NULL, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DONATION_DRIVES', 'Donation drives', NULL, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ENVIRONMENT', 'Environment', NULL, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
