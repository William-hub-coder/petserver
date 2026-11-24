-- Rename channel value transfer → sale (SQLite stores enums as TEXT)
UPDATE "pet_listings" SET "channel" = 'sale' WHERE "channel" = 'transfer';
