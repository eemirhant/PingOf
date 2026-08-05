/**
 * Coarse mobile phone detection from request headers.
 * Used to skip desktop-only dashboard work on phones.
 * Tablets (often without "Mobile" in UA) are treated as desktop.
 */
export function isMobilePhoneRequest(headerList: Headers): boolean {
  const chMobile = headerList.get("sec-ch-ua-mobile");
  if (chMobile === "?1") return true;
  if (chMobile === "?0") return false;

  const ua = headerList.get("user-agent") ?? "";
  return /iPhone|iPod|Android.+Mobile|Windows Phone|Opera Mini/i.test(ua);
}
