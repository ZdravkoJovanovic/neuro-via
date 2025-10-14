'use client';

import { useEffect, useState } from 'react';

type LocationRow = { id: number; uuid?: string; address: string };
type FullLocation = LocationRow & {
  door_count: number;
  doors_opened: number;
  rejections: number;
  leads: number;
};
type Props = { location: LocationRow };

export default function NewLead({ location }: Props) {
  // Lokale Positionszähler für die aktuelle Session
  const [door, setDoor] = useState(0);     // aktuelle Türnummer (Session)
  const [stock, setStock] = useState(0);
  const [stiege, setStiege] = useState(0);

  // DB-Zustand
  const [loc, setLoc] = useState<FullLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyDoor, setBusyDoor] = useState(false);

  // Lead-Form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<'save' | 'reject' | null>(null);

  // aktuellen Standort laden (für Zähleranzeige)
  useEffect(() => {
    const c = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/location/select-location?id=${location.id}`, { signal: c.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.details || 'Fehler beim Laden');
        setLoc(json.location);
      } catch (e) {
        if (!(e as any)?.name?.includes('Abort')) console.error(e);
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    })();
    return () => c.abort();
  }, [location.id]);

  const readyForDoor = () => stiege > 0 && stock > 0;

  // Tür klicken → Türnummer +1, Snapshot "not_opened" upserten + door_count++
  async function onDoorClick() {
    if (!readyForDoor() || busyDoor) return;
    const nextDoor = door + 1;
    setDoor(nextDoor);
    setBusyDoor(true);
    try {
      const res = await fetch('/api/location/door-status/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: location.id,
          stiege: String(stiege),
          stockwerk: String(stock),
          tuere: String(nextDoor),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || 'Upsert fehlgeschlagen');
      setLoc(json.location);
    } catch (e) {
      console.error(e);
      alert('Tür konnte nicht gespeichert werden.');
      // optional: rollback
      // setDoor(nextDoor - 1);
    } finally {
      setBusyDoor(false);
    }
  }

  // Beim Öffnen des Lead-Forms Status -> "opened" (idempotent)
  async function markOpened() {
    try {
      const res = await fetch('/api/location/door-status/update-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: location.id,
          stiege: String(stiege),
          stockwerk: String(stock),
          tuere: String(door),
          event: 'opened',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || 'Open fehlgeschlagen');
      setLoc(json.location);
    } catch (e) {
      console.error(e);
      // UI bleibt offen; Server ist idempotent
    }
  }

  return (
    <div className="md:hidden mt-4">
      <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Aktive Adresse</p>
      <div className="bg-[#181818] border border-[#2A2A2A] px-3 py-2 text-white text-[16px] mb-4">
        {location.address}
      </div>

      {/* 2×2: Tür / Stock / Stiege / New Lead */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onDoorClick}
          disabled={loading || busyDoor || !readyForDoor()}
          className="h-14 px-4 bg-orange-500 text-white rounded-none flex items-center justify-between text-[16px] font-medium select-none disabled:opacity-60"
          title={!readyForDoor() ? 'Erst Stiege und Stock setzen' : 'Tür klopfen'}
        >
          <span>Tür</span>
          <span className="font-mono tabular-nums">{door}</span>
        </button>

        <button
          type="button"
          onClick={() => setStock((v) => v + 1)}
          className="h-14 px-4 bg-blue-500 text-white rounded-none flex items-center justify-between text-[16px] font-medium select-none"
        >
          <span>Stock</span>
          <span className="font-mono tabular-nums">{stock}</span>
        </button>

        <button
          type="button"
          onClick={() => setStiege((v) => v + 1)}
          className="h-14 px-4 bg-green-500 text-white rounded-none flex items-center justify-between text-[16px] font-medium select-none"
        >
          <span>Stiege</span>
          <span className="font-mono tabular-nums">{stiege}</span>
        </button>

        <button
          type="button"
          onClick={async () => {
            if (door <= 0) return;           // erst Tür drücken
            const opening = !showForm;
            setShowForm(opening);            // UI sofort öffnen
            if (opening) markOpened();       // Status -> opened (nicht blockierend)
          }}
          aria-pressed={showForm}
          className="h-14 px-4 bg-violet-500 text-white rounded-none flex items-center justify-between text-[16px] font-medium select-none"
          title={door <= 0 ? 'Erst Tür drücken' : 'Lead beginnen'}
        >
          <span>New Lead</span>
          <span className="font-mono tabular-nums">{showForm ? '–' : '+'}</span>
        </button>
      </div>

      {/* Lead-Form */}
      {showForm && (
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (door <= 0 || !name.trim()) return;
            try {
              setBusy('save');
              const res = await fetch('/api/leads/create-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location_id: location.id,
                  stiege: String(stiege),
                  stockwerk: String(stock),
                  tuere: String(door),
                  first_name: name.trim(),
                }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json?.error || 'Speichern fehlgeschlagen');
              setLoc(json.location);   // Zähler aktualisieren
              setName('');
              setPhone('');
              setShowForm(false);
            } catch (err) {
              console.error(err);
              alert('Speichern fehlgeschlagen.');
            } finally {
              setBusy(null);
            }
          }}
        >
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full h-10 bg-[#181818] text-white border border-[#2A2A2A] px-3
                       appearance-none focus:outline-none focus:ring-0 focus:border-[#5C5C5C]
                       text-[16px] font-medium"
          />

          <input
            placeholder="Telefon (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className="block w-full h-10 bg-[#181818] text-white border border-[#2A2A2A] px-3
                       appearance-none focus:outline-none focus:ring-0 focus:border-[#5C5C5C]
                       text-[16px] font-medium"
          />

          <div className="flex items-start gap-3">
            <button
              type="submit"
              disabled={busy === 'save'}
              className="h-9 px-3 bg-green-500 text-white rounded-none text-[16px] disabled:opacity-60"
            >
              {busy === 'save' ? 'Speichern…' : 'Speichern'}
            </button>

            <div className="min-w-0">
              <p className="text-sm text-neutral-400 truncate">
                {location.address}{name ? ` • ${name}` : ''}{phone ? ` • ${phone}` : ''}
              </p>
              <p className="text-xs text-neutral-500">
                Stiege <span className="font-mono tabular-nums">{stiege}</span> •{' '}
                Stock <span className="font-mono tabular-nums">{stock}</span> •{' '}
                Tür <span className="font-mono tabular-nums">{door}</span>
              </p>
            </div>
          </div>

          {/* Unauffälliger Rejection-Button */}
          <div className="mt-2">
            <button
              type="button"
              disabled={busy === 'reject' || door <= 0}
              onClick={async () => {
                try {
                  setBusy('reject');
                  const res = await fetch('/api/location/door-status/update-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      location_id: location.id,
                      stiege: String(stiege),
                      stockwerk: String(stock),
                      tuere: String(door),
                      event: 'rejection',
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json?.details || 'Rejection fehlgeschlagen');
                  setLoc(json.location);
                  setShowForm(false);
                } catch (err) {
                  console.error(err);
                  alert('Rejection fehlgeschlagen.');
                } finally {
                  setBusy(null);
                }
              }}
              className="h-8 px-3 bg-[#242424] text-neutral-400 border border-[#2A2A2A] rounded-none text-[14px] disabled:opacity-60"
            >
              Rejection
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
