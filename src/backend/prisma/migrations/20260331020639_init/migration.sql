-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "DialysisType" AS ENUM ('none', 'hemodialysis', 'peritoneal');

-- CreateEnum
CREATE TYPE "PrimaryDisease" AS ENUM ('diabetic_nephropathy', 'hypertensive_nephropathy', 'chronic_glomerulonephritis', 'other');

-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('manual', 'ocr', 'import');

-- CreateEnum
CREATE TYPE "DrugType" AS ENUM ('cyclosporine', 'tacrolimus', 'sirolimus', 'other');

-- CreateEnum
CREATE TYPE "SamplingTime" AS ENUM ('C0', 'C2');

-- CreateEnum
CREATE TYPE "MedicationFrequency" AS ENUM ('once_daily', 'twice_daily', 'three_daily', 'every_other_day', 'weekly');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('active', 'paused', 'discontinued');

-- CreateEnum
CREATE TYPE "MedicationLogStatus" AS ENUM ('taken', 'missed', 'skipped');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('metric', 'medication', 'system');

-- CreateEnum
CREATE TYPE "LabReportStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "gender" "Gender",
    "birthDate" TIMESTAMP(3),
    "height" DOUBLE PRECISION,
    "currentWeight" DOUBLE PRECISION,
    "dialysisType" "DialysisType" NOT NULL DEFAULT 'none',
    "dryWeight" DOUBLE PRECISION,
    "baselineCreatinine" DOUBLE PRECISION,
    "diagnosisDate" TIMESTAMP(3),
    "primaryDisease" "PrimaryDisease",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordDate" DATE NOT NULL,
    "creatinine" DOUBLE PRECISION,
    "urea" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "phosphorus" DOUBLE PRECISION,
    "uricAcid" DOUBLE PRECISION,
    "hemoglobin" DOUBLE PRECISION,
    "bloodSugar" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "bloodPressureSystolic" INTEGER,
    "bloodPressureDiastolic" INTEGER,
    "urineVolume" INTEGER,
    "notes" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_concentration_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordDate" DATE NOT NULL,
    "drugType" "DrugType" NOT NULL,
    "drugName" TEXT NOT NULL,
    "concentration" DOUBLE PRECISION NOT NULL,
    "samplingTime" "SamplingTime" NOT NULL,
    "lastDoseTime" TIMESTAMP(3) NOT NULL,
    "bloodDrawTime" TIMESTAMP(3) NOT NULL,
    "referenceRangeMin" DOUBLE PRECISION NOT NULL,
    "referenceRangeMax" DOUBLE PRECISION NOT NULL,
    "isInRange" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_concentration_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specification" TEXT,
    "dosage" DOUBLE PRECISION NOT NULL,
    "dosageUnit" TEXT NOT NULL,
    "frequency" "MedicationFrequency" NOT NULL,
    "reminderTimes" TIME[],
    "reminderMinutesBefore" INTEGER NOT NULL DEFAULT 5,
    "status" "MedicationStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "actualTime" TIMESTAMP(3),
    "status" "MedicationLogStatus" NOT NULL,
    "skipReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "AlertLevel" NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'metric',
    "recordId" TEXT,
    "metric" TEXT,
    "medicationId" TEXT,
    "medicationLogId" TEXT,
    "message" TEXT NOT NULL,
    "suggestion" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageHash" TEXT,
    "ocrRawText" TEXT,
    "ocrResult" JSONB,
    "extractedData" JSONB,
    "confidenceScores" JSONB,
    "status" "LabReportStatus" NOT NULL DEFAULT 'pending',
    "healthRecordId" TEXT,
    "reportDate" TIMESTAMP(3),
    "hospital" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenJti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_medications" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "commonSpecifications" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "common_medications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "user_profiles_dialysisType_idx" ON "user_profiles"("dialysisType");

-- CreateIndex
CREATE INDEX "health_records_userId_idx" ON "health_records"("userId");

-- CreateIndex
CREATE INDEX "health_records_userId_recordDate_idx" ON "health_records"("userId", "recordDate");

-- CreateIndex
CREATE INDEX "health_records_recordDate_idx" ON "health_records"("recordDate");

-- CreateIndex
CREATE INDEX "health_records_createdAt_idx" ON "health_records"("createdAt");

-- CreateIndex
CREATE INDEX "drug_concentration_records_userId_idx" ON "drug_concentration_records"("userId");

-- CreateIndex
CREATE INDEX "drug_concentration_records_userId_recordDate_idx" ON "drug_concentration_records"("userId", "recordDate");

-- CreateIndex
CREATE INDEX "drug_concentration_records_drugType_idx" ON "drug_concentration_records"("drugType");

-- CreateIndex
CREATE INDEX "drug_concentration_records_userId_drugType_recordDate_idx" ON "drug_concentration_records"("userId", "drugType", "recordDate");

-- CreateIndex
CREATE INDEX "medications_userId_idx" ON "medications"("userId");

-- CreateIndex
CREATE INDEX "medications_userId_status_idx" ON "medications"("userId", "status");

-- CreateIndex
CREATE INDEX "medications_status_idx" ON "medications"("status");

-- CreateIndex
CREATE INDEX "medication_logs_userId_idx" ON "medication_logs"("userId");

-- CreateIndex
CREATE INDEX "medication_logs_medicationId_idx" ON "medication_logs"("medicationId");

-- CreateIndex
CREATE INDEX "medication_logs_userId_scheduledTime_idx" ON "medication_logs"("userId", "scheduledTime");

-- CreateIndex
CREATE INDEX "medication_logs_scheduledTime_idx" ON "medication_logs"("scheduledTime");

-- CreateIndex
CREATE INDEX "medication_logs_status_idx" ON "medication_logs"("status");

-- CreateIndex
CREATE INDEX "medication_logs_userId_medicationId_scheduledTime_idx" ON "medication_logs"("userId", "medicationId", "scheduledTime");

-- CreateIndex
CREATE INDEX "alerts_userId_idx" ON "alerts"("userId");

-- CreateIndex
CREATE INDEX "alerts_userId_level_idx" ON "alerts"("userId", "level");

-- CreateIndex
CREATE INDEX "alerts_userId_isRead_idx" ON "alerts"("userId", "isRead");

-- CreateIndex
CREATE INDEX "alerts_userId_createdAt_idx" ON "alerts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "alerts_level_idx" ON "alerts"("level");

-- CreateIndex
CREATE INDEX "alerts_userId_isRead_level_idx" ON "alerts"("userId", "isRead", "level");

-- CreateIndex
CREATE INDEX "lab_reports_userId_idx" ON "lab_reports"("userId");

-- CreateIndex
CREATE INDEX "lab_reports_userId_reportDate_idx" ON "lab_reports"("userId", "reportDate");

-- CreateIndex
CREATE INDEX "lab_reports_status_idx" ON "lab_reports"("status");

-- CreateIndex
CREATE INDEX "lab_reports_healthRecordId_idx" ON "lab_reports"("healthRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenJti_key" ON "refresh_tokens"("tokenJti");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenJti_idx" ON "refresh_tokens"("tokenJti");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_concentration_records" ADD CONSTRAINT "drug_concentration_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "health_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_medicationLogId_fkey" FOREIGN KEY ("medicationLogId") REFERENCES "medication_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_reports" ADD CONSTRAINT "lab_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_reports" ADD CONSTRAINT "lab_reports_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "health_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
