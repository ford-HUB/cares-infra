-- Volunteer GPS readings from the mobile recorder: live pings while online, CSV
-- batches for whatever was buffered offline. event_id is the device's hint only.

-- CreateTable
CREATE TABLE "EventLocationPing" (
    "event_location_ping_id" SERIAL NOT NULL,
    "event_id" INTEGER,
    "user_id" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy_m" DOUBLE PRECISION NOT NULL,
    "in_area" BOOLEAN NOT NULL,
    "source" "GeoValidationMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLocationPing_pkey" PRIMARY KEY ("event_location_ping_id")
);

-- CreateIndex
CREATE INDEX "EventLocationPing_event_id_user_id_captured_at_idx" ON "EventLocationPing"("event_id", "user_id", "captured_at");

-- CreateIndex
CREATE INDEX "EventLocationPing_user_id_captured_at_idx" ON "EventLocationPing"("user_id", "captured_at");

-- AddForeignKey
ALTER TABLE "EventLocationPing" ADD CONSTRAINT "EventLocationPing_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLocationPing" ADD CONSTRAINT "EventLocationPing_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
