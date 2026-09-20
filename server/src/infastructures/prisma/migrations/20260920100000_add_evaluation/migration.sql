-- Post-event evaluation: the questionnaire the director builds in the portal and the
-- answers volunteers submit for completed events they took part in.

-- CreateEnum
CREATE TYPE "EvaluationFormStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "EvaluationResponseStatus" AS ENUM ('COMPLETE', 'PARTIAL');

-- CreateTable
CREATE TABLE "EvaluationForm" (
    "evaluation_form_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "header_typography" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "status" "EvaluationFormStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationForm_pkey" PRIMARY KEY ("evaluation_form_id")
);

-- CreateTable
CREATE TABLE "EvaluationResponse" (
    "evaluation_response_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "rating" INTEGER,
    "status" "EvaluationResponseStatus" NOT NULL DEFAULT 'COMPLETE',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationResponse_pkey" PRIMARY KEY ("evaluation_response_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResponse_event_id_user_id_key" ON "EvaluationResponse"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "EvaluationResponse_event_id_idx" ON "EvaluationResponse"("event_id");

-- CreateIndex
CREATE INDEX "EvaluationResponse_user_id_idx" ON "EvaluationResponse"("user_id");

-- AddForeignKey
ALTER TABLE "EvaluationResponse" ADD CONSTRAINT "EvaluationResponse_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "EvaluationForm"("evaluation_form_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResponse" ADD CONSTRAINT "EvaluationResponse_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResponse" ADD CONSTRAINT "EvaluationResponse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
