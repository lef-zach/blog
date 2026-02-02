-- Add featured image layout and size enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeaturedImageLayout') THEN
        CREATE TYPE "FeaturedImageLayout" AS ENUM ('BANNER', 'PORTRAIT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeaturedImageSize') THEN
        CREATE TYPE "FeaturedImageSize" AS ENUM ('S', 'M', 'B');
    END IF;
END$$;

ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "featuredImageLayout" "FeaturedImageLayout" NOT NULL DEFAULT 'BANNER';
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "featuredImageSize" "FeaturedImageSize" NOT NULL DEFAULT 'M';
