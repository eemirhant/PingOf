"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ENTITY_MISSING_QUERY } from "@/lib/notifications/deep-link";

/**
 * Shows a soft toast when deep link lands with ?entityMissing=1,
 * then strips the query param without interrupting the toast.
 */
export function EntityMissingToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (searchParams.get(ENTITY_MISSING_QUERY) !== "1") return;
    if (shownRef.current) return;
    shownRef.current = true;
    setVisible(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete(ENTITY_MISSING_QUERY);
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    router.replace(next, { scroll: false });

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      shownRef.current = false;
    }, 4200);

    return () => window.clearTimeout(hideTimer);
  }, [searchParams, pathname, router]);

  if (!visible) return null;

  return (
    <div className="entity-missing-toast" role="status" aria-live="polite">
      İlgili kayıt artık bulunamadı.
    </div>
  );
}
