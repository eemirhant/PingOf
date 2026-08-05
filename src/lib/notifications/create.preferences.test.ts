import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationType } from "@/domain/notification";
import { MANAGED_NOTIFICATION_TYPES } from "@/domain/notification-preferences";

const {
  createManyMock,
  findFirstMock,
  getSettingsMock,
  sendPushMock,
  publishMock,
} = vi.hoisted(() => ({
  createManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  getSettingsMock: vi.fn(),
  sendPushMock: vi.fn(),
  publishMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    notification: { createMany: createManyMock },
    user: { findFirst: findFirstMock },
  },
}));

vi.mock("@/lib/notifications/preferences", () => ({
  getResolvedNotificationSettingsForUsers: getSettingsMock,
}));

vi.mock("@/lib/notifications/onesignal", () => ({
  sendOneSignalPushToUsers: sendPushMock,
}));

vi.mock("@/lib/realtime/publish", () => ({
  publishOrgEvent: publishMock,
}));

vi.mock("@/lib/notifications/diagnostics/store", () => ({
  appendDiagStep: vi.fn(),
  getAlsContext: vi.fn(() => undefined),
  isNotificationDiagVerbose: vi.fn(() => false),
  notificationDiagAls: { run: (_: unknown, fn: () => unknown) => fn() },
  recordDiagEvent: vi.fn(),
  startNotificationTrace: vi.fn(),
  updateTrace: vi.fn(),
}));

import { createNotificationsForUsers } from "@/lib/notifications/create";
import { buildDefaultPreferences } from "@/domain/notification-preferences";

describe("createNotificationsForUsers — preference delivery", () => {
  const userId = "user-test-1";
  const orgId = "org-test-1";

  beforeEach(() => {
    vi.clearAllMocks();
    findFirstMock.mockResolvedValue({ organizationId: orgId });
    createManyMock.mockResolvedValue({ count: 1 });
    sendPushMock.mockResolvedValue({ sentBatches: 1, skipped: false });
    publishMock.mockResolvedValue(undefined);
  });

  it("delivers in-app + push for every managed type when prefs allow", async () => {
    const preferences = buildDefaultPreferences();
    for (const key of MANAGED_NOTIFICATION_TYPES) {
      preferences[key] = { inApp: true, push: true };
    }
    getSettingsMock.mockResolvedValue(
      new Map([[userId, { preferences }]]),
    );

    for (const type of MANAGED_NOTIFICATION_TYPES) {
      createManyMock.mockClear();
      sendPushMock.mockClear();

      const count = await createNotificationsForUsers({
        userIds: [userId],
        type,
        title: `Test ${type}`,
        body: "body",
        linkUrl: "/notifications",
      });

      expect(count).toBe(1);
      expect(createManyMock).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            userId,
            type,
            title: `Test ${type}`,
          }),
        ],
      });
      expect(sendPushMock).toHaveBeenCalledWith(
        [userId],
        expect.objectContaining({
          title: `Test ${type}`,
          tag: `pingof-${type}`,
        }),
      );
    }
  });

  it("skips push when preference push is off", async () => {
    const preferences = buildDefaultPreferences();
    preferences[NotificationType.CHALLENGE_RECEIVED] = {
      inApp: true,
      push: false,
    };
    getSettingsMock.mockResolvedValue(
      new Map([[userId, { preferences }]]),
    );

    await createNotificationsForUsers({
      userIds: [userId],
      type: NotificationType.CHALLENGE_RECEIVED,
      title: "Teklif",
      body: "body",
    });

    expect(createManyMock).toHaveBeenCalled();
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("skips in-app when preference inApp is off but still pushes", async () => {
    const preferences = buildDefaultPreferences();
    preferences[NotificationType.MATCH_RESULT] = {
      inApp: false,
      push: true,
    };
    getSettingsMock.mockResolvedValue(
      new Map([[userId, { preferences }]]),
    );

    const count = await createNotificationsForUsers({
      userIds: [userId],
      type: NotificationType.MATCH_RESULT,
      title: "Sonuç",
      body: "body",
    });

    expect(count).toBe(0);
    expect(createManyMock).not.toHaveBeenCalled();
    expect(sendPushMock).toHaveBeenCalledWith(
      [userId],
      expect.objectContaining({ title: "Sonuç" }),
    );
  });

  it("always delivers unmanaged types (stake) regardless of managed map", async () => {
    getSettingsMock.mockResolvedValue(
      new Map([[userId, { preferences: buildDefaultPreferences() }]]),
    );

    await createNotificationsForUsers({
      userIds: [userId],
      type: NotificationType.STAKE_CREATED,
      title: "İddia",
      body: "body",
    });

    expect(createManyMock).toHaveBeenCalled();
    expect(sendPushMock).toHaveBeenCalled();
  });
});
