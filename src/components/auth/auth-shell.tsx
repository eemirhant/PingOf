import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  maxWidth?: "md" | "lg";
};

export function AuthShell({ children, maxWidth = "md" }: AuthShellProps) {
  return (
    <div className="auth-bg">
      <div
        className={`auth-card card-glass w-full p-10 ${maxWidth === "lg" ? "max-w-[500px]" : "max-w-[440px]"}`}
      >
        {children}
      </div>
    </div>
  );
}

export function AuthLogo() {
  return (
    <div className="auth-logo mb-8 text-center">
      <div className="auth-logo-icon">🏓</div>
      <h1 className="auth-title text-text-primary">PingOf</h1>
      <p className="auth-subtitle text-text-secondary">Ofis masa tenisi takip platformu</p>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="auth-divider my-5">
      <span className="text-text-muted text-[0.8125rem]">ya da</span>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="auth-link font-semibold text-text-accent hover:text-accent">
      {children}
    </Link>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-text-secondary hover:text-text-primary inline-flex items-center gap-2 text-sm font-medium transition-colors"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {children}
    </Link>
  );
}
