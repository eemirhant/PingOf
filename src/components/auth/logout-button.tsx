import { logoutAction } from "@/lib/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="btn btn-secondary btn-sm logout-btn">
        Çıkış
      </button>
    </form>
  );
}
