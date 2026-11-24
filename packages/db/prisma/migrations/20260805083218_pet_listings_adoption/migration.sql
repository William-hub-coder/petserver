-- CreateTable
CREATE TABLE "pet_listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "gender" TEXT,
    "ageMonths" INTEGER,
    "city" TEXT NOT NULL DEFAULT '上海',
    "district" TEXT,
    "address" TEXT,
    "lat" REAL,
    "lng" REAL,
    "coverUrl" TEXT,
    "images" JSONB,
    "vaccinated" BOOLEAN NOT NULL DEFAULT false,
    "sterilized" BOOLEAN NOT NULL DEFAULT false,
    "licenseNo" TEXT,
    "quarantineNote" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "merchantId" TEXT NOT NULL,
    "publisherUserId" TEXT NOT NULL,
    "reviewNote" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pet_listings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pet_listings_publisherUserId_fkey" FOREIGN KEY ("publisherUserId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pet_adopt_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "motive" TEXT NOT NULL,
    "experience" TEXT,
    "acceptHomeVisit" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pet_adopt_applications_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "pet_listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pet_adopt_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_message_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "userId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "bookingId" TEXT,
    "listingId" TEXT,
    "lastMsgAt" DATETIME,
    "lastPreview" TEXT,
    "userUnread" INTEGER NOT NULL DEFAULT 0,
    "merchantUnread" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "message_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_conversations_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_conversations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "pet_listings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_message_conversations" ("bookingId", "createdAt", "id", "kind", "lastMsgAt", "lastPreview", "merchantId", "merchantUnread", "status", "updatedAt", "userId", "userUnread") SELECT "bookingId", "createdAt", "id", "kind", "lastMsgAt", "lastPreview", "merchantId", "merchantUnread", "status", "updatedAt", "userId", "userUnread" FROM "message_conversations";
DROP TABLE "message_conversations";
ALTER TABLE "new_message_conversations" RENAME TO "message_conversations";
CREATE UNIQUE INDEX "message_conversations_bookingId_key" ON "message_conversations"("bookingId");
CREATE INDEX "message_conversations_userId_merchantId_kind_idx" ON "message_conversations"("userId", "merchantId", "kind");
CREATE INDEX "message_conversations_listingId_idx" ON "message_conversations"("listingId");
CREATE INDEX "message_conversations_userId_lastMsgAt_idx" ON "message_conversations"("userId", "lastMsgAt");
CREATE INDEX "message_conversations_merchantId_lastMsgAt_idx" ON "message_conversations"("merchantId", "lastMsgAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "pet_listings_status_channel_city_idx" ON "pet_listings"("status", "channel", "city");

-- CreateIndex
CREATE INDEX "pet_listings_merchantId_idx" ON "pet_listings"("merchantId");

-- CreateIndex
CREATE INDEX "pet_listings_publisherUserId_idx" ON "pet_listings"("publisherUserId");

-- CreateIndex
CREATE INDEX "pet_adopt_applications_listingId_createdAt_idx" ON "pet_adopt_applications"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "pet_adopt_applications_userId_idx" ON "pet_adopt_applications"("userId");
