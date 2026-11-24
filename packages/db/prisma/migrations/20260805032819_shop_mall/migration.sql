-- CreateTable
CREATE TABLE "shop_products" (
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
    "unit" TEXT NOT NULL DEFAULT '件',
    "tags" JSONB,
    "detail" TEXT,
    "specs" JSONB,
    "status" TEXT NOT NULL DEFAULT 'on_sale',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shop_products_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchant_merchants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shop_cart_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shop_cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shop_cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "shop_products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shop_orders" (
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

-- CreateTable
CREATE TABLE "shop_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "coverTone" TEXT,
    CONSTRAINT "shop_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "shop_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shop_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "shop_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "shop_products_status_category_idx" ON "shop_products"("status", "category");

-- CreateIndex
CREATE INDEX "shop_products_merchantId_idx" ON "shop_products"("merchantId");

-- CreateIndex
CREATE INDEX "shop_cart_items_userId_idx" ON "shop_cart_items"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_cart_items_userId_productId_key" ON "shop_cart_items"("userId", "productId");

-- CreateIndex
CREATE INDEX "shop_orders_userId_createdAt_idx" ON "shop_orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "shop_order_items_orderId_idx" ON "shop_order_items"("orderId");
