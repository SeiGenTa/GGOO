/*
  Warnings:

  - You are about to drop the column `default` on the `Rol` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Rol" DROP COLUMN "default",
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false;
