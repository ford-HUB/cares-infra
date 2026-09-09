-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');

-- AlterTable: social-only accounts have no password to store.
ALTER TABLE "Account" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: donor sign-up never asks for an age.
ALTER TABLE "User" ALTER COLUMN "age" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "OAuthIdentity" (
    "oauth_identity_id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthIdentity_pkey" PRIMARY KEY ("oauth_identity_id")
);

-- CreateIndex
CREATE INDEX "OAuthIdentity_user_id_idx" ON "OAuthIdentity"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthIdentity_provider_provider_user_id_key" ON "OAuthIdentity"("provider", "provider_user_id");

-- AddForeignKey
ALTER TABLE "OAuthIdentity" ADD CONSTRAINT "OAuthIdentity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
