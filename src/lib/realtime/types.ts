export type RealtimeEventDto = {
  id: string;
  type: string;
  entityId: string | null;
  actorUserId: string | null;
  createdAt: string;
};

export type RealtimeEventsResponse = {
  events: RealtimeEventDto[];
  unreadNotifications: number;
  pendingChallenges: number;
  serverTime: string;
};
