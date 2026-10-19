-- Rankings → Customization gains a Participation Role criterion: extra points per
-- attended event for a volunteer whose Organizer, Facilitator or Speaker role was
-- approved. Null until a director saves it; the server falls back to its defaults.

-- AlterTable
ALTER TABLE "RankingSettings" ADD COLUMN     "participation_role_points" JSONB;
