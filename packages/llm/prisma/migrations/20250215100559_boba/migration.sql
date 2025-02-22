/*
  Warnings:

  - You are about to drop the column `metadata` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `modelName` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Chat` table. All the data in the column will be lost.
  - The `provider` column on the `Chat` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ModelProvider" AS ENUM ('anthropic', 'groq', 'openai', 'mistral', 'deepseek');

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "metadata",
DROP COLUMN "modelName",
DROP COLUMN "title",
DROP COLUMN "type",
ADD COLUMN     "agents" TEXT[],
ADD COLUMN     "modelId" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-latest',
ADD COLUMN     "storeLocal" BOOLEAN DEFAULT false,
DROP COLUMN "provider",
ADD COLUMN     "provider" "ModelProvider" NOT NULL DEFAULT 'anthropic';
