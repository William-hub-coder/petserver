-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_merchant_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "tags" JSONB,
    "images" JSONB,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merchant_reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "merchant_bookings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "merchant_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "merchant_reviews_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_merchant_reviews" ("bookingId", "content", "createdAt", "id", "images", "merchantId", "rating", "userId") SELECT "bookingId", "content", "createdAt", "id", "images", "merchantId", "rating", "userId" FROM "merchant_reviews";
DROP TABLE "merchant_reviews";
ALTER TABLE "new_merchant_reviews" RENAME TO "merchant_reviews";
CREATE UNIQUE INDEX "merchant_reviews_bookingId_key" ON "merchant_reviews"("bookingId");
CREATE INDEX "merchant_reviews_merchantId_rating_idx" ON "merchant_reviews"("merchantId", "rating");
CREATE INDEX "merchant_reviews_merchantId_createdAt_idx" ON "merchant_reviews"("merchantId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
