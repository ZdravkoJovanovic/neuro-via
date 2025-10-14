'use client';

import { useId, useState } from 'react';

export default function NewAdress() {
  const [open, setOpen] = useState(false);
  const [addr, setAddr] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputId = useId();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = addr.trim();
    if (!clean) {
      setMsg('Bitte Adresse eingeben.');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: clean }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json?.error === 'address_exists' ? 'Adresse existiert bereits.' : 'Fehler beim Speichern.');
      } else {
        setMsg('Gespeichert.');
        setAddr('');
        setOpen(false);
      }
    } catch {
      setMsg('Netzwerkfehler.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="md:hidden mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 px-3 bg-white text-black border border-[#2A2A2A] text-[16px]"
      >
        New Adress
      </button>

      {open && (
        <form className="mt-3" onSubmit={onSubmit}>
          <label htmlFor={inputId} className="sr-only">
            Adresse
          </label>
          <input
            id={inputId}
            placeholder="Adresse eingeben…"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            className="block w-full h-10 bg-[#181818] text-white border border-[#2A2A2A] px-3
                       appearance-none focus:outline-none focus:ring-0 focus:border-[#5C5C5C]
                       text-[16px] font-medium"
            autoComplete="street-address"
            inputMode="text"
          />

          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-3 bg-green-500 text-white disabled:opacity-60 text-[16px]"
            >
              {loading ? 'Speichern…' : 'Bestätigen'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 px-3 bg-[#181818] text-white border border-[#2A2A2A] text-[16px]"
            >
              Abbrechen
            </button>
          </div>

          {msg && <p className="mt-2 text-sm text-neutral-400">{msg}</p>}
        </form>
      )}
    </div>
  );
}
