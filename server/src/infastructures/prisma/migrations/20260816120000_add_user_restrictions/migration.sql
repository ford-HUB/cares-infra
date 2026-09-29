-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_restricted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_login_ip" TEXT,
ADD COLUMN     "restricted_at" TIMESTAMP(3),
ADD COLUMN     "restriction_reason" TEXT;

-- CreateTable
CREATE TABLE "BlockedIp" (
    "blocked_ip_id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "reason" TEXT,
    "user_id" TEXT,
    "blocked_by_user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("blocked_ip_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIp_ip_address_key" ON "BlockedIp"("ip_address");

-- AddForeignKey
ALTER TABLE "BlockedIp" ADD CONSTRAINT "BlockedIp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
