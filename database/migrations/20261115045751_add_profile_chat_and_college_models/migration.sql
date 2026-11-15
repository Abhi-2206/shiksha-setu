-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('GEN', 'OBC', 'SC', 'ST', 'EWS', 'MBC', 'TFWS', 'PWD');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('STUDENT', 'ASSISTANT');

-- AlterTable safely without data loss
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STUDENT'::"Role";

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fullName" TEXT,
    "phoneNumber" TEXT,
    "alternatePhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "district" TEXT,
    "state" TEXT DEFAULT 'Rajasthan',
    "pincode" TEXT,
    "isRajasthanDomicile" BOOLEAN NOT NULL DEFAULT true,
    "qualifyingExam" TEXT,
    "tenthPercentage" DOUBLE PRECISION,
    "twelfthPercentage" DOUBLE PRECISION,
    "diplomaPercentage" DOUBLE PRECISION,
    "examRank" INTEGER,
    "examRollNumber" TEXT,
    "category" "Category" NOT NULL DEFAULT 'GEN',
    "subCategory" TEXT,
    "preferredCourse" TEXT,
    "preferredLocation" TEXT,
    "preferredCollegeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL DEFAULT 'STUDENT',
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "College" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Rajasthan',
    "type" TEXT NOT NULL DEFAULT 'Government',
    "establishedYear" INTEGER,
    "website" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollegeCutoff" (
    "id" SERIAL NOT NULL,
    "collegeId" INTEGER NOT NULL,
    "courseName" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "admissionYear" INTEGER NOT NULL,
    "openingRank" INTEGER NOT NULL,
    "closingRank" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "sourceYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeCutoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_userId_idx" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_examRank_idx" ON "StudentProfile"("examRank");

-- CreateIndex
CREATE INDEX "StudentProfile_category_idx" ON "StudentProfile"("category");

-- CreateIndex
CREATE INDEX "StudentProfile_preferredLocation_idx" ON "StudentProfile"("preferredLocation");

-- CreateIndex
CREATE INDEX "ChatSession_userId_idx" ON "ChatSession"("userId");

-- CreateIndex
CREATE INDEX "ChatSession_createdAt_idx" ON "ChatSession"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "College_code_key" ON "College"("code");

-- CreateIndex
CREATE INDEX "College_code_idx" ON "College"("code");

-- CreateIndex
CREATE INDEX "College_location_idx" ON "College"("location");

-- CreateIndex
CREATE INDEX "College_district_idx" ON "College"("district");

-- CreateIndex
CREATE INDEX "College_type_idx" ON "College"("type");

-- CreateIndex
CREATE INDEX "College_isActive_idx" ON "College"("isActive");

-- CreateIndex
CREATE INDEX "CollegeCutoff_collegeId_idx" ON "CollegeCutoff"("collegeId");

-- CreateIndex
CREATE INDEX "CollegeCutoff_courseName_idx" ON "CollegeCutoff"("courseName");

-- CreateIndex
CREATE INDEX "CollegeCutoff_category_idx" ON "CollegeCutoff"("category");

-- CreateIndex
CREATE INDEX "CollegeCutoff_admissionYear_idx" ON "CollegeCutoff"("admissionYear");

-- CreateIndex
CREATE INDEX "CollegeCutoff_closingRank_idx" ON "CollegeCutoff"("closingRank");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeCutoff_collegeId_courseName_category_admissionYear_r_key" ON "CollegeCutoff"("collegeId", "courseName", "category", "admissionYear", "round");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegeCutoff" ADD CONSTRAINT "CollegeCutoff_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
