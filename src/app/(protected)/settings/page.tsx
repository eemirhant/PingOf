import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AddPlayerForm } from "@/components/settings/add-player-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { CopyInviteButton } from "@/components/settings/copy-invite-button";
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences-card";
import { OrganizationLogoForm } from "@/components/settings/organization-logo-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { PushNotificationsCard } from "@/components/settings/push-notifications-card";
import { RegenerateInviteButton } from "@/components/settings/regenerate-invite-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getOrganizationSettings } from "@/lib/auth/join";
import { getResolvedNotificationSettings } from "@/lib/notifications/preferences";
import { getUserProfile } from "@/lib/profile/update-profile";
import { avatarColorForUser } from "@/lib/utils/avatar";

async function getInviteBaseUrl(): Promise<string> {
  const { getRequestOrigin } = await import("@/lib/dev/public-url");
  return getRequestOrigin();
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [organization, profile, notificationSettings] = await Promise.all([
    getOrganizationSettings(session.user.organizationId),
    getUserProfile(session.user.id, session.user.organizationId),
    getResolvedNotificationSettings(session.user.id),
  ]);

  if (!organization || !profile) {
    redirect("/login");
  }

  const isOwner = session.user.role === "OWNER";
  const baseUrl = await getInviteBaseUrl();
  const inviteUrl = `${baseUrl}/join/${organization.inviteCode}`;
  const avatarColor = avatarColorForUser(
    profile.id,
    profile.avatarUrl,
    profile.avatarColor,
  );

  return (
    <div className="mx-auto max-w-[720px] px-6 py-8">
      <div className="mb-6">
        <Link href="/" className="text-text-muted hover:text-text-secondary text-sm">
          ← Ana sayfa
        </Link>
        <h1 className="mt-2 text-xl font-bold text-text-primary">Ayarlar</h1>
      </div>

      <div className="card mb-4">
        <ProfileForm
          userId={profile.id}
          fullName={profile.fullName}
          email={profile.email}
          roleLabel={isOwner ? "👑 Kurucu" : "Üye"}
          isOwner={isOwner}
          avatarColor={avatarColor}
          avatarUrl={profile.avatarUrl}
        />
      </div>

      {isOwner ? (
        <div
          className="card mb-4"
          style={{ borderColor: "rgba(234,179,8,0.2)" }}
        >
          <OrganizationLogoForm
            organizationName={organization.name}
            logoUrl={organization.logoUrl}
          />
        </div>
      ) : null}

      <div className="card mb-4">
        <ChangePasswordForm />
      </div>

      <PushNotificationsCard />

      <NotificationPreferencesCard
        initialPreferences={notificationSettings.preferences}
      />

      <div
        className="card mb-4"
        style={isOwner ? { borderColor: "rgba(234,179,8,0.2)" } : undefined}
      >
        <div className="card-title flex items-center gap-1.5">
          Davet Linki
          {isOwner ? (
            <span
              className="badge"
              style={{
                background: "rgba(234,179,8,0.12)",
                color: "#fde047",
                border: "1px solid rgba(234,179,8,0.2)",
              }}
            >
              Sıfırlama: Kurucu
            </span>
          ) : null}
        </div>
        <p className="text-text-secondary mb-3 text-sm">
          Bu linki paylaşarak yeni oyuncuların <strong>{organization.name}</strong>{" "}
          organizasyonuna katılmasını sağlayabilirsin.
        </p>
        <div className="invite-code mb-2">{inviteUrl}</div>
        <div className="flex gap-2">
          <CopyInviteButton inviteUrl={inviteUrl} />
          {isOwner ? (
            <RegenerateInviteButton currentInviteCode={organization.inviteCode} />
          ) : null}
        </div>
      </div>

      <div className="card mb-4">
        <AddPlayerForm />
      </div>

      <div className="card mb-4">
        <div className="card-title">Üyeler ({organization.users.length})</div>
        <div>
          {organization.users.map((member) => {
            const isMe = member.id === session.user.id;
            return (
              <div key={member.id} className="settings-item">
                <div className="flex flex-1 items-center gap-3">
                  <UserAvatar
                    userId={member.id}
                    fullName={member.fullName}
                    avatarUrl={member.avatarUrl}
                    avatarColor={member.avatarColor}
                    size="sm"
                  />
                  <div>
                    <div className="settings-item-title">
                      {member.fullName}
                      {isMe ? (
                        <span className="text-accent-light text-xs"> (Sen)</span>
                      ) : null}
                    </div>
                    <div className="settings-item-desc">{member.email}</div>
                  </div>
                </div>
                <span
                  className={`badge ${member.role === "OWNER" ? "" : "badge-planned"}`}
                  style={
                    member.role === "OWNER"
                      ? {
                          background: "rgba(234,179,8,0.12)",
                          color: "#fde047",
                          border: "1px solid rgba(234,179,8,0.2)",
                        }
                      : undefined
                  }
                >
                  {member.role === "OWNER" ? "👑 Kurucu" : "Üye"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="card mb-4"
        style={{
          borderColor: "rgba(244,63,94,0.25)",
          background: "rgba(244,63,94,0.06)",
        }}
      >
        <div className="card-title">Oturum</div>
        <p className="text-text-secondary mb-3 text-sm">
          Hesabından güvenli şekilde çıkış yapabilirsin.
        </p>
        <LogoutButton label="Çıkış Yap" className="logout-btn--settings" />
      </div>
    </div>
  );
}
