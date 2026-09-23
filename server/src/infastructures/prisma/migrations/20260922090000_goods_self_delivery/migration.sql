-- Goods donations are now dropped off by the donor at the CARES office instead
-- of being picked up: the address and preferred time go away, the pickup date
-- becomes the delivery date and the contact number is simply the donor's.

-- AlterTable
ALTER TABLE "Donation" DROP COLUMN "pickup_address",
DROP COLUMN "pickup_time_minutes";

ALTER TABLE "Donation" RENAME COLUMN "pickup_contact" TO "donor_contact";
ALTER TABLE "Donation" RENAME COLUMN "pickup_date" TO "delivery_date";
