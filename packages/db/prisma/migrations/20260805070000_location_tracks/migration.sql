-- AlterTable Booking: home-visit destination + phase
ALTER TABLE "merchant_bookings" ADD COLUMN "destLat" REAL;
ALTER TABLE "merchant_bookings" ADD COLUMN "destLng" REAL;
ALTER TABLE "merchant_bookings" ADD COLUMN "providerUserId" TEXT;
ALTER TABLE "merchant_bookings" ADD COLUMN "servicePhase" TEXT;

-- Redefine ShopOrderStatus to include delivering (SQLite)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_shop_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_pay',
    "totalCents" INTEGER NOT NULL,
    "freightCents" INTEGER NOT NULL DEFAULT 0,
    "addressSnapshot" TEXT,
    "remark" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shop_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_shop_orders" ("addressSnapshot", "createdAt", "freightCents", "id", "paidAt", "remark", "status", "totalCents", "updatedAt", "userId")
SELECT "addressSnapshot", "createdAt", "freightCents", "id", "paidAt", "remark", "status", "totalCents", "updatedAt", "userId" FROM "shop_orders";
DROP TABLE "shop_orders";
ALTER TABLE "new_shop_orders" RENAME TO "shop_orders";
CREATE INDEX "shop_orders_userId_createdAt_idx" ON "shop_orders"("userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable DeliveryMission
CREATE TABLE "shop_delivery_missions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopOrderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "courierName" TEXT,
    "courierPhone" TEXT,
    "originLat" REAL,
    "originLng" REAL,
    "destLat" REAL,
    "destLng" REAL,
    "destAddress" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "progress" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shop_delivery_missions_shopOrderId_fkey" FOREIGN KEY ("shopOrderId") REFERENCES "shop_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "shop_delivery_missions_shopOrderId_key" ON "shop_delivery_missions"("shopOrderId");
CREATE INDEX "shop_delivery_missions_status_idx" ON "shop_delivery_missions"("status");

-- CreateTable LocationTrack
CREATE TABLE "location_tracks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "accuracyM" REAL,
    "heading" REAL,
    "speed" REAL,
    "source" TEXT NOT NULL DEFAULT 'mock',
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "location_tracks_subjectType_subjectId_recordedAt_idx" ON "location_tracks"("subjectType", "subjectId", "recordedAt");
