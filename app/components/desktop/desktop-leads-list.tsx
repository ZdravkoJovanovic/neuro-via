'use client';

import { useEffect, useState } from 'react';

type LeadRow = {
  id: number;
  lead_uuid: string;
  location_id: number;
  address: string;
  first_name: string;
  last_name: string | null;
  stiege: string;
  stockwerk: string;
  tuere: string;
  created_at: string;
};

function maskUuid(u: string) {
  const raw = u.replace(/-/g, '');
  if (raw.length <= 6) return raw;
  return `${raw.slice(0, 3)}...${raw.slice(-3)}`;
}

export default function DesktopLeadsList({ locationId }: { locationId: number }) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`/api/leads/get-desktop-leads?location_id=${locationId}`, {
          signal: ac.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.details || json?.error || 'Fehler beim Laden');
        setLeads(Array.isArray(json?.leads) ? json.leads : []);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setErr(e?.message || 'Fehler');
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [locationId]);

  if (loading) {
    return (
      <div className="bg-[#181818] border border-[#2A2A2A] px-4 py-2 text-white text-[14px]">
        Lade Leads…
      </div>
    );
  }
  if (err) {
    return (
      <div className="bg-[#181818] border border-[#2A2A2A] px-4 py-2 text-red-400 text-[14px]">
        {err}
      </div>
    );
  }
  if (leads.length === 0) {
    return (
      <div className="bg-[#181818] border border-[#2A2A2A] px-4 py-2 text-neutral-400 text-[14px]">
        Keine Leads für diese Adresse.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leads.map((l) => (
        <div
          key={l.id}
          className="bg-[#0f0f0f] border border-[#2A2A2A] px-3 py-2 text-white text-[14px] flex items-center gap-6 justify-between"
        >
          {/* Adresse links, kompakt */}
          <div className="font-medium truncate max-w-[32%]">{l.address || '—'}</div>

          {/* Mitte: Alles in EINER Zeile */}
          <div className="flex items-center gap-6 flex-1 min-w-0 flex-wrap">
            <div className="text-neutral-300">
              <span className="text-white">
                Stiege {l.stiege || '—'}&nbsp;&nbsp;Stock {l.stockwerk || '—'}&nbsp;&nbsp;Tür {l.tuere || '—'}
              </span>
            </div>
            <div className="text-neutral-300">
              Name: <span className="text-white">{l.first_name || '—'} {l.last_name || ''}</span>
            </div>
            <div className="text-neutral-300">
              Erstellt:{' '}
              <span className="text-white">
                {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
              </span>
            </div>
          </div>

          {/* Rechte Seite: Kundennummer */}
          <div className="text-sm text-neutral-400 shrink-0">
            Kundennummer: {maskUuid(l.lead_uuid)}
          </div>
        </div>
      ))}
    </div>
  );
}
