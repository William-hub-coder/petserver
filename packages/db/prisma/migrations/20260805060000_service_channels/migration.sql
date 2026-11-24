-- AlterTable
ALTER TABLE "merchant_services" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'onsite';
ALTER TABLE "merchant_services" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "merchant_bookings" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'onsite';
ALTER TABLE "merchant_bookings" ADD COLUMN "addressSnapshot" TEXT;
ALTER TABLE "merchant_bookings" ADD COLUMN "note" TEXT;

-- CreateIndex
CREATE INDEX "merchant_services_kind_idx" ON "merchant_services"("kind");
CREATE INDEX "merchant_bookings_channel_idx" ON "merchant_bookings"("channel");
