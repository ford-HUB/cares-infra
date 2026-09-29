-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'COMPLETED', 'ABSENT');

-- CreateEnum
CREATE TYPE "GeoValidationMethod" AS ENUM ('GEOFENCE', 'OFFLINE_SYNC', 'AWAITING_SYNC', 'MANUAL');

-- CreateTable
CREATE TABLE "EventAttendance" (
    "event_attendance_id" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "validation_method" "GeoValidationMethod",
    "first_ping_at" TIMESTAMP(3),
    "last_ping_at" TIMESTAMP(3),
    "hours_rendered" DOUBLE PRECISION,
    "remarks" TEXT,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("event_attendance_id")
);

-- CreateIndex
CREATE INDEX "EventAttendance_event_id_idx" ON "EventAttendance"("event_id");

-- CreateIndex
CREATE INDEX "EventAttendance_user_id_idx" ON "EventAttendance"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendance_event_id_user_id_key" ON "EventAttendance"("event_id", "user_id");

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
