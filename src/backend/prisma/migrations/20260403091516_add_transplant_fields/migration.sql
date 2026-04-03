-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "hasTransplant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transplantDate" TIMESTAMP(3);
