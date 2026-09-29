-- Event-specific evaluation: a questionnaire is now one of many, and each event points
-- at the one it asks. An event with no row falls back to the questionnaire flagged
-- `is_default`, which is the single form every event shared before this migration.

-- AlterTable
ALTER TABLE "EvaluationForm" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EvaluationAssignment" (
    "evaluation_assignment_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "assigned_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationAssignment_pkey" PRIMARY KEY ("evaluation_assignment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationAssignment_event_id_key" ON "EvaluationAssignment"("event_id");

-- CreateIndex
CREATE INDEX "EvaluationAssignment_form_id_idx" ON "EvaluationAssignment"("form_id");

-- AddForeignKey
ALTER TABLE "EvaluationAssignment" ADD CONSTRAINT "EvaluationAssignment_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "EvaluationForm"("evaluation_form_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAssignment" ADD CONSTRAINT "EvaluationAssignment_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAssignment" ADD CONSTRAINT "EvaluationAssignment_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The questionnaire that already existed served every event, so it keeps doing that.
UPDATE "EvaluationForm"
SET "is_default" = true
WHERE "evaluation_form_id" = (
    SELECT "evaluation_form_id" FROM "EvaluationForm" ORDER BY "createdAt" ASC LIMIT 1
);
