/*
  Warnings:

  - You are about to drop the column `content` on the `Message` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('text', 'tool_use', 'tool_result');

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "content";

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "text" TEXT,
    "name" TEXT,
    "input" JSONB,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messageId" INTEGER NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
