/** Relative Turkish time label for notification center. */
export function formatRelativeTimeTr(
  date: Date,
  now: Date = new Date(),
): string {
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "Az önce";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dakika önce`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} saat önce`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} gün önce`;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
