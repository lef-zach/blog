-- Add short link fields to articles
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "shortCode" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "shortClicks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "shortLastHitAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Article_shortCode_key" ON "Article"("shortCode");

-- Short link events for referrer analytics
CREATE TABLE IF NOT EXISTS "ShortLinkEvent" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "referrerDomain" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShortLinkEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ShortLinkEvent_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShortLinkEvent_articleId_idx" ON "ShortLinkEvent"("articleId");
CREATE INDEX IF NOT EXISTS "ShortLinkEvent_createdAt_idx" ON "ShortLinkEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "ShortLinkEvent_referrerDomain_idx" ON "ShortLinkEvent"("referrerDomain");
