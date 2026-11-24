-- CreateTable
CREATE TABLE "shop_product_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "tags" JSONB,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shop_product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "shop_products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shop_product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shop_product_reviews_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "shop_order_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_shop_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subtitle" TEXT,
    "coverTone" TEXT,
    "priceCents" INTEGER NOT NULL,
    "originalPriceCents" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '件',
    "tags" JSONB,
    "detail" TEXT,
    "specs" JSONB,
    "status" TEXT NOT NULL DEFAULT 'on_sale',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shop_products_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_shop_products" ("category", "coverTone", "createdAt", "detail", "id", "merchantId", "name", "originalPriceCents", "priceCents", "sales", "specs", "status", "stock", "subtitle", "tags", "unit", "updatedAt") SELECT "category", "coverTone", "createdAt", "detail", "id", "merchantId", "name", "originalPriceCents", "priceCents", "sales", "specs", "status", "stock", "subtitle", "tags", "unit", "updatedAt" FROM "shop_products";
DROP TABLE "shop_products";
ALTER TABLE "new_shop_products" RENAME TO "shop_products";
CREATE INDEX "shop_products_status_category_idx" ON "shop_products"("status", "category");
CREATE INDEX "shop_products_merchantId_idx" ON "shop_products"("merchantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "shop_product_reviews_orderItemId_key" ON "shop_product_reviews"("orderItemId");

-- CreateIndex
CREATE INDEX "shop_product_reviews_productId_rating_idx" ON "shop_product_reviews"("productId", "rating");

-- CreateIndex
CREATE INDEX "shop_product_reviews_productId_createdAt_idx" ON "shop_product_reviews"("productId", "createdAt");
