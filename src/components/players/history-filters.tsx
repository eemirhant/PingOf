import Link from "next/link";

type HistoryFiltersProps = {
  playerId: string;
  format: string;
  from: string;
  to: string;
};

export function HistoryFilters({ playerId, format, from, to }: HistoryFiltersProps) {
  const base = `/players/${playerId}`;

  return (
    <form method="get" action={base} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[120px] flex-1">
        <label className="text-text-muted mb-1 block text-[0.7rem] font-bold uppercase">
          Format
        </label>
        <select name="format" defaultValue={format} className="form-input form-select">
          <option value="all">Tümü</option>
          <option value="singles">1v1</option>
          <option value="doubles">2v2</option>
        </select>
      </div>
      <div className="min-w-[140px] flex-1">
        <label className="text-text-muted mb-1 block text-[0.7rem] font-bold uppercase">
          Başlangıç
        </label>
        <input type="date" name="from" defaultValue={from} className="form-input" />
      </div>
      <div className="min-w-[140px] flex-1">
        <label className="text-text-muted mb-1 block text-[0.7rem] font-bold uppercase">
          Bitiş
        </label>
        <input type="date" name="to" defaultValue={to} className="form-input" />
      </div>
      <button type="submit" className="btn btn-secondary btn-sm min-h-11">
        Filtrele
      </button>
      {format !== "all" || from || to ? (
        <Link href={base} className="btn btn-ghost btn-sm min-h-11">
          Temizle
        </Link>
      ) : null}
    </form>
  );
}
