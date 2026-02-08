CREATE TABLE IF NOT EXISTS "PageViewEvent" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "ipEncrypted" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "userAgent" TEXT,
    "referrerDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageViewEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PageViewEvent_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PageViewEvent_articleId_idx" ON "PageViewEvent"("articleId");
CREATE INDEX IF NOT EXISTS "PageViewEvent_createdAt_idx" ON "PageViewEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "PageViewEvent_country_idx" ON "PageViewEvent"("country");

CREATE TABLE IF NOT EXISTS "DailyArticleAnalytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "articleId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyArticleAnalytics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyArticleAnalytics_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyArticleAnalytics_date_articleId_key" ON "DailyArticleAnalytics"("date", "articleId");
CREATE INDEX IF NOT EXISTS "DailyArticleAnalytics_date_idx" ON "DailyArticleAnalytics"("date");
CREATE INDEX IF NOT EXISTS "DailyArticleAnalytics_articleId_idx" ON "DailyArticleAnalytics"("articleId");

CREATE TABLE IF NOT EXISTS "DailySiteAnalytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailySiteAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailySiteAnalytics_date_key" ON "DailySiteAnalytics"("date");
CREATE INDEX IF NOT EXISTS "DailySiteAnalytics_date_idx" ON "DailySiteAnalytics"("date");

CREATE TABLE IF NOT EXISTS "DailyArticleUniqueVisitor" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "articleId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyArticleUniqueVisitor_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyArticleUniqueVisitor_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyArticleUniqueVisitor_date_articleId_ipHash_key" ON "DailyArticleUniqueVisitor"("date", "articleId", "ipHash");
CREATE INDEX IF NOT EXISTS "DailyArticleUniqueVisitor_date_idx" ON "DailyArticleUniqueVisitor"("date");
CREATE INDEX IF NOT EXISTS "DailyArticleUniqueVisitor_articleId_idx" ON "DailyArticleUniqueVisitor"("articleId");

CREATE TABLE IF NOT EXISTS "DailySiteUniqueVisitor" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailySiteUniqueVisitor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailySiteUniqueVisitor_date_ipHash_key" ON "DailySiteUniqueVisitor"("date", "ipHash");
CREATE INDEX IF NOT EXISTS "DailySiteUniqueVisitor_date_idx" ON "DailySiteUniqueVisitor"("date");
