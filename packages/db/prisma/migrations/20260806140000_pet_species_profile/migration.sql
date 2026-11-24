-- Expand pet species coverage + richer profile fields (SQLite TEXT enums)

ALTER TABLE "user_pets" ADD COLUMN "gender" TEXT;
ALTER TABLE "user_pets" ADD COLUMN "dietNote" TEXT;
ALTER TABLE "user_pets" ADD COLUMN "habitatNote" TEXT;
ALTER TABLE "user_pets" ADD COLUMN "specialNeeds" TEXT;
ALTER TABLE "user_pets" ADD COLUMN "notes" TEXT;
ALTER TABLE "user_pets" ADD COLUMN "adoptionSource" TEXT;
