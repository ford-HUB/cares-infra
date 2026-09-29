-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('Upcoming', 'Ongoing', 'Completed', 'Cancelled');

-- CreateTable
CREATE TABLE "Event" (
    "event_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "event_started" TIMESTAMP(3) NOT NULL,
    "event_ended" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "max_participants" INTEGER NOT NULL,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "organizer_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department" TEXT,
    "specified_category" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "EventStatus" NOT NULL DEFAULT 'Upcoming',
    "funds_donation" BOOLEAN NOT NULL DEFAULT false,
    "goods_donation" BOOLEAN NOT NULL DEFAULT false,
    "goods_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "beneficiary_applicable" BOOLEAN NOT NULL DEFAULT false,
    "max_beneficiaries" INTEGER,
    "geojson" JSONB,
    "area_sqm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("event_id")
);
