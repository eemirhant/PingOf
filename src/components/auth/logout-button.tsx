"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { logoutAction } from "@/lib/actions/auth";
import { deactivatePushOnLogout } from "@/lib/firebase/messaging-client";

type LogoutButtonProps = {
  label?: string;
  className?: string;
};

export function LogoutButton({
  label = "Çıkış",
  className = "",
}: LogoutButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => {
      void (async () => {
        await deactivatePushOnLogout();
        await logoutAction();
      })();
    });
  }

  return (
    <button
      type="button"
      className={`btn btn-secondary btn-sm logout-btn ${className}`.trim()}
      disabled={pending}
      onClick={handleLogout}
    >
      <LogOut
        aria-hidden="true"
        strokeWidth={1.75}
        className="logout-btn-icon"
      />
      {pending ? "Çıkış…" : label}
    </button>
  );
}
