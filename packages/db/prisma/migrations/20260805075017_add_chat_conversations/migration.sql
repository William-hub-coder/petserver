-- AlterTable
ALTER TABLE "message_messages" ADD COLUMN "conversationId" TEXT;

-- CreateTable
CREATE TABLE "message_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "userId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "bookingId" TEXT,
    "lastMsgAt" DATETIME,
    "lastPreview" TEXT,
    "userUnread" INTEGER NOT NULL DEFAULT 0,
    "merchantUnread" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "message_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_conversations_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT NOT NULL,
    "moderationStatus" TEXT NOT NULL DEFAULT 'clean',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "message_conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_chat_messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_moderation_flags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatMessageId" TEXT,
    "conversationId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reporterUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "resolveNote" TEXT,
    CONSTRAINT "message_moderation_flags_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "message_chat_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_moderation_flags_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "message_conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "message_conversations_bookingId_key" ON "message_conversations"("bookingId");

-- CreateIndex
CREATE INDEX "message_conversations_userId_merchantId_kind_idx" ON "message_conversations"("userId", "merchantId", "kind");

-- CreateIndex
CREATE INDEX "message_conversations_userId_lastMsgAt_idx" ON "message_conversations"("userId", "lastMsgAt");

-- CreateIndex
CREATE INDEX "message_conversations_merchantId_lastMsgAt_idx" ON "message_conversations"("merchantId", "lastMsgAt");

-- CreateIndex
CREATE INDEX "message_chat_messages_conversationId_createdAt_idx" ON "message_chat_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "message_moderation_flags_status_createdAt_idx" ON "message_moderation_flags"("status", "createdAt");

-- CreateIndex
CREATE INDEX "message_messages_conversationId_idx" ON "message_messages"("conversationId");
