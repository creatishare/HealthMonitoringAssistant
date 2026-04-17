/*
  Warnings:

  - The `userType` column on the `user_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('kidney_failure', 'kidney_transplant', 'other');

-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "userType",
ADD COLUMN     "userType" "UserType";

-- CreateIndex
CREATE INDEX "user_profiles_userType_idx" ON "user_profiles"("userType");
