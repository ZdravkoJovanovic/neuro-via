'use client';

import { useEffect, useState } from 'react';

type DoorEvent = 'not_opened' | 'opened' | 'lead' | 'rejection';

type EventRow = {
  id: number;
  location_id: number;
  address: string;
  stiege: string;
  stockwerk: string;
  tuere: string;
  event: DoorEvent;
  created_at: string;
  updated_at: string;
};

function label(e: DoorEvent) {
  switch (e) {
    case 'lead': return 'Lead';
    case 'rejection': return 'Rejection';
    case 'opened': return 'Geöffnet';
    default: return 'Nicht geöffnet';
  }
}
function colorClass(e: DoorEvent) {
  switch (e) {
    case 'lead': return 'text-green-500';
    case 'rejection': return 'text-red-400';
    case 'not_opened': return 'text-yellow-400';
    case 'opened': return 'text-blue-400';
    default: return 'text-white';
  }
}

export default function DesktopEventsList({ locationId }: { locationId: number }) {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`/api/leads/get-desktop-lead-events?location_id=${locationId}`, {
          signal: ac.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.details || json?.error || 'Fehler beim Laden');
        setRows(Array.isArray(json?.events) ? json.events : []);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setErr(e?.message || 'Fehler');
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [locationId]);

  if (loading) {
    return <div className="bg-[#181818] border border-[#2A2A2A] px-4 py-2 text-white text-[14px]">Lade Events…</div>;
  }
  if (err) {
    return <div className="bg-[#181818] border border-[#2A2A2A] px-4 py-2 text-red-400 text-[14px]">{err}</div>;
  }
  if (rows.length === 0) {
    return <div className="bg-[#181818] border border-[#2A2A2A] px-4 py-2 text-neutral-400 text-[14px]">Keine Events für diese Adresse.</div>;
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.id}
          className="bg-[#0f0f0f] border border-[#2A2A2A] px-3 py-2 text-white text-[14px] flex items-center gap-6 justify-between"
        >
          {/* Adresse links */}
          <div className="font-medium truncate max-w-[32%]">{r.address || '—'}</div>

          {/* Mitte: in EINER Zeile */}
          <div className="flex items-center gap-6 flex-1 min-w-0 flex-wrap">
            <div className="text-neutral-300">
              <span className="text-white">
                Stiege {r.stiege || '—'}&nbsp;&nbsp;Stock {r.stockwerk || '—'}&nbsp;&nbsp;Tür {r.tuere || '—'}
              </span>
            </div>
            <div className="text-neutral-300">
              Aktualisiert:{' '}
              <span className="text-white">
                {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
              </span>
            </div>
          </div>

          {/* Rechts: farbcodierter Status, ohne Prefix */}
          <div className={`text-sm font-semibold shrink-0 ${colorClass(r.event)}`}>
            {label(r.event)}
          </div>
        </div>
      ))}
    </div>
  );
}
