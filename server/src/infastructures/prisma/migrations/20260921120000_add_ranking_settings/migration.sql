-- Volunteer rankings: the scoring rule (points per attendance, escalating absence
-- penalty) and the tier ladder the portal customises and the app draws frames from.

-- CreateTable
CREATE TABLE "RankingSettings" (
    "ranking_settings_id" TEXT NOT NULL,
    "points_per_attendance" INTEGER NOT NULL DEFAULT 10,
    "absence_penalty_step" INTEGER NOT NULL DEFAULT 2,
    "absence_reset_days" INTEGER NOT NULL DEFAULT 7,
    "default_period" TEXT NOT NULL DEFAULT 'month',
    "tiers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankingSettings_pkey" PRIMARY KEY ("ranking_settings_id")
);
