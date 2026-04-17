-- AlterTable
ALTER TABLE "user_profiles"
ADD COLUMN "userType" TEXT,
ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "user_profiles_userType_idx" ON "user_profiles"("userType");
