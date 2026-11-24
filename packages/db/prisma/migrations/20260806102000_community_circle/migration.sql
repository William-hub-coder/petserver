-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'daily',
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "mediaUrls" JSONB NOT NULL DEFAULT '[]',
    "coverUrl" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "community_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "community_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "community_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "community_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "community_posts_status_createdAt_idx" ON "community_posts"("status", "createdAt");
CREATE INDEX "community_posts_category_status_createdAt_idx" ON "community_posts"("category", "status", "createdAt");
CREATE INDEX "community_posts_userId_idx" ON "community_posts"("userId");
CREATE UNIQUE INDEX "community_likes_postId_userId_key" ON "community_likes"("postId", "userId");
CREATE INDEX "community_likes_userId_idx" ON "community_likes"("userId");
CREATE INDEX "community_comments_postId_createdAt_idx" ON "community_comments"("postId", "createdAt");
CREATE INDEX "community_comments_userId_idx" ON "community_comments"("userId");
