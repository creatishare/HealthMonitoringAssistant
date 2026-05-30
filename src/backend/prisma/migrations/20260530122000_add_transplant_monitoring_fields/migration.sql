-- AlterTable
ALTER TABLE "health_records"
ADD COLUMN     "heartRate" INTEGER,
ADD COLUMN     "egfr" DOUBLE PRECISION,
ADD COLUMN     "urineProteinCreatinineRatio" DOUBLE PRECISION,
ADD COLUMN     "urineAlbuminCreatinineRatio" DOUBLE PRECISION,
ADD COLUMN     "urineOccultBlood" TEXT,
ADD COLUMN     "bkVirusCopies" DOUBLE PRECISION,
ADD COLUMN     "cmvVirusCopies" DOUBLE PRECISION,
ADD COLUMN     "ebvVirusCopies" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "user_profiles"
ADD COLUMN     "tacrolimusTargetMin" DOUBLE PRECISION,
ADD COLUMN     "tacrolimusTargetMax" DOUBLE PRECISION;
