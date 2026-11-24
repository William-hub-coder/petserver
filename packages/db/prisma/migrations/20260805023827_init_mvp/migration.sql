-- CreateTable
CREATE TABLE "user_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '新用户',
    "avatarUrl" TEXT,
    "privacyAcceptedAt" DATETIME,
    "privacyVersion" TEXT,
    "onboardingSkippedAt" DATETIME,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "auth_refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_pets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'cat',
    "breed" TEXT,
    "birthday" DATETIME,
    "weightKg" REAL,
    "sterilized" BOOLEAN NOT NULL DEFAULT false,
    "vaccinated" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "tags" JSONB,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_pets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "merchant_merchants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "creditScore" INTEGER NOT NULL DEFAULT 70,
    "creditGrade" TEXT NOT NULL DEFAULT 'B',
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lat" REAL,
    "lng" REAL,
    "address" TEXT,
    "city" TEXT NOT NULL DEFAULT '上海',
    "district" TEXT,
    "openTime" TEXT,
    "closeTime" TEXT,
    "priceLevel" TEXT,
    "coverUrl" TEXT,
    "coverTone" TEXT,
    "highlight" TEXT,
    "tags" JSONB,
    "selectedBadge" BOOLEAN NOT NULL DEFAULT false,
    "lastInspectedAt" DATETIME,
    "ownerUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "merchant_merchants_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "merchant_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "merchant_services_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "merchant_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "petId" TEXT,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "bookingAt" DATETIME NOT NULL,
    "verifyCode" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "verifiedAt" DATETIME,
    "cancelledAt" DATETIME,
    CONSTRAINT "merchant_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "merchant_bookings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "merchant_bookings_petId_fkey" FOREIGN KEY ("petId") REFERENCES "user_pets" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "merchant_bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "merchant_services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "merchant_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "images" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merchant_reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "merchant_bookings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "merchant_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "merchant_reviews_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "merchant_credit_score_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "scoreBefore" INTEGER NOT NULL,
    "scoreAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merchant_credit_score_logs_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'inbox',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'system',
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_users_phone_key" ON "user_users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "auth_refresh_tokens_tokenHash_key" ON "auth_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_userId_idx" ON "auth_refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "user_pets_userId_idx" ON "user_pets"("userId");

-- CreateIndex
CREATE INDEX "merchant_merchants_status_city_idx" ON "merchant_merchants"("status", "city");

-- CreateIndex
CREATE INDEX "merchant_merchants_category_idx" ON "merchant_merchants"("category");

-- CreateIndex
CREATE INDEX "merchant_services_merchantId_idx" ON "merchant_services"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_bookings_verifyCode_key" ON "merchant_bookings"("verifyCode");

-- CreateIndex
CREATE INDEX "merchant_bookings_userId_idx" ON "merchant_bookings"("userId");

-- CreateIndex
CREATE INDEX "merchant_bookings_merchantId_status_idx" ON "merchant_bookings"("merchantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_reviews_bookingId_key" ON "merchant_reviews"("bookingId");

-- CreateIndex
CREATE INDEX "merchant_reviews_merchantId_idx" ON "merchant_reviews"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_credit_score_logs_merchantId_idx" ON "merchant_credit_score_logs"("merchantId");

-- CreateIndex
CREATE INDEX "message_messages_userId_createdAt_idx" ON "message_messages"("userId", "createdAt");
