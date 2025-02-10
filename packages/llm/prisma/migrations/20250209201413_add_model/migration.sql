-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "model" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-latest',
ADD COLUMN     "workspace" TEXT;
