import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth";

type LogoutButtonProps = {
  /** Visible label — default "Çıkış" (header), settings uses "Çıkış Yap". */
  label?: string;
  /** Extra classes on the submit button. */
  className?: string;
};

export function LogoutButton({ label = "Çıkış", className = "" }: LogoutButtonProps) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={`btn btn-secondary btn-sm logout-btn ${className}`.trim()}
      >
        <LogOut aria-hidden="true" strokeWidth={1.75} className="logout-btn-icon" />
        <span>{label}</span>
      </button>
    </form>
  );
}
