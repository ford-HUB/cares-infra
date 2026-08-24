-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'UNDER_VERIFICATION', 'CLIENT_FEEDBACK', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketType" AS ENUM ('BUG', 'LOGIN', 'ACCOUNT', 'VERIFICATION', 'EVENT', 'MOBILE_APP', 'FEATURE_REQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportTicketAuthorType" AS ENUM ('STAFF', 'REQUESTER');

-- CreateTable
CREATE TABLE "SupportTicket" (
    "support_ticket_id" TEXT NOT NULL,
    "reference_number" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "SupportTicketType" NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "requester_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "source" "LoginSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("support_ticket_id")
);

-- CreateTable
CREATE TABLE "SupportTicketReply" (
    "support_ticket_reply_id" TEXT NOT NULL,
    "support_ticket_id" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "author_type" "SupportTicketAuthorType" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketReply_pkey" PRIMARY KEY ("support_ticket_reply_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_reference_number_key" ON "SupportTicket"("reference_number");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_requester_id_idx" ON "SupportTicket"("requester_id");

-- CreateIndex
CREATE INDEX "SupportTicket_assignee_id_idx" ON "SupportTicket"("assignee_id");

-- CreateIndex
CREATE INDEX "SupportTicket_updatedAt_idx" ON "SupportTicket"("updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicketReply_support_ticket_id_createdAt_idx" ON "SupportTicketReply"("support_ticket_id", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketReply" ADD CONSTRAINT "SupportTicketReply_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "SupportTicket"("support_ticket_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketReply" ADD CONSTRAINT "SupportTicketReply_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
