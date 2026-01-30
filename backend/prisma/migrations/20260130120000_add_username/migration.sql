-- Add username to User and align email nullability
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Allow username-only registrations by making email nullable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Enforce unique usernames (nulls allowed)
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
