"use server";

import { auth } from "@/auth";
import { getDashboardTop5 } from "@/lib/stats/service";

export async function loadDashboardTop5Action() {
  const session = await auth();
  if (!session?.user) return [];
  return getDashboardTop5(session.user.organizationId);
}
