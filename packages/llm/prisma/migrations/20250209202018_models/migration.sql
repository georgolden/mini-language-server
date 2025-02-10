/*
  Warnings:

  - You are about to drop the column `model` on the `Chat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "model",
ADD COLUMN     "modelName" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-latest',
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'anthropic';
