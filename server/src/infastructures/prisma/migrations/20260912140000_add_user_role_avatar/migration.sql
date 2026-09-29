-- One profile photo per role for mobile users. The app's role switcher is
-- local, so a volunteer/donor/beneficiary on the same account each keep their
-- own picture here instead of sharing User.avatar.
CREATE TABLE "UserRoleAvatar" (
    "user_role_avatar_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_type" "RoleType" NOT NULL,
    "avatar_url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoleAvatar_pkey" PRIMARY KEY ("user_role_avatar_id")
);

CREATE UNIQUE INDEX "UserRoleAvatar_user_id_role_type_key" ON "UserRoleAvatar"("user_id", "role_type");

ALTER TABLE "UserRoleAvatar" ADD CONSTRAINT "UserRoleAvatar_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
