import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      organizationName: string;
      role: UserRole;
      fullName: string;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId: string;
    organizationName: string;
    role: UserRole;
    fullName: string;
    avatarUrl?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    organizationId: string;
    organizationName: string;
    role: UserRole;
    fullName: string;
    avatarUrl?: string | null;
  }
}

export {};
