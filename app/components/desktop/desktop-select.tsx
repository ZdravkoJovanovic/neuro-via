'use client';

import { useEffect, useState } from 'react';

type LocationRow = { id: number; uuid: string; address: string };
type Props = { onSelect: (loc: LocationRow) => void; hideLabel?: boolean };

export default function DesktopSelect({ onSelect, hideLabel = false }: Props) {
  const [items, setItems] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/location/select-location', { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.details || 'Fehler beim Laden');
        setItems(Array.isArray(json?.locations) ? json.locations : []);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setErr(e?.message || 'Fehler');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <div className="hidden md:block">
      {!hideLabel && (
        <label
          htmlFor="desktop-select"
          className="block text-xs uppercase tracking-wider text-neutral-400 mb-2"
        >
          Auswahl
        </label>
      )}

      <div className="relative">
        <select
          id="desktop-select"
          defaultValue=""
          onChange={(e) => {
            const id = Number(e.target.value);
            const loc = items.find((x) => x.id === id);
            if (loc) onSelect(loc);
          }}
          className="block w-[320px] h-9 bg-[#181818] text-white border border-[#2A2A2A] px-3 pr-10
                     rounded-none appearance-none focus:outline-none focus:ring-0 focus:border-[#5C5C5C]
                     text-[16px] font-medium"
        >
          <option value="" disabled>
            {loading ? 'Lade Adressen…' : err ? 'Fehler beim Laden' : 'Adresse auswählen'}
          </option>
          {!loading && !err &&
            items.map((loc) => (
              <option key={loc.id} value={String(loc.id)} className="bg-[#181818]">
                {loc.address}
              </option>
            ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70 select-none">
          ▾
        </span>
      </div>
    </div>
  );
}
