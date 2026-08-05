import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { verifyPassword } from "@/lib/auth/password";
import { getUserByEmail } from "@/lib/auth/register";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user, trigger, session }) {
      // Never keep avatar payloads in the JWT (base64 photos blow cookie size).
      delete token.avatarUrl;

      if (user) {
        token.id = user.id!;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.role = user.role;
        token.fullName = user.fullName;
        token.email = user.email;
      }

      if (trigger === "update" && session?.user) {
        if (typeof session.user.fullName === "string") {
          token.fullName = session.user.fullName;
          token.name = session.user.fullName;
        }
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.organizationId = token.organizationId;
      session.user.organizationName = token.organizationName;
      session.user.role = token.role;
      session.user.fullName = token.fullName;
      session.user.name = token.fullName;
      session.user.email = token.email ?? session.user.email;
      // Avatars are loaded from DB in the layout — not from the session cookie.
      session.user.avatarUrl = null;
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials);

          if (!parsed.success) {
            return null;
          }

          const user = await getUserByEmail(parsed.data.email);

          if (!user) {
            return null;
          }

          const isValid = await verifyPassword(
            parsed.data.password,
            user.passwordHash,
          );

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            fullName: user.fullName,
            organizationId: user.organizationId,
            organizationName: user.organization.name,
            role: user.role,
          };
        } catch (error) {
          // Never let DB/runtime errors become an unhandled 500 on /api/auth/*
          console.error("[auth] authorize failed", error);
          return null;
        }
      },
    }),
  ],
});
