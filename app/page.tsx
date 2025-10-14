'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// Navbars
const NavbarMobile  = dynamic(() => import('./components/mobile/navbar'), { ssr: false });
const NavbarDesktop = dynamic(() => import('./components/desktop/navbar'), { ssr: false });

// Desktop-Toprow
const DesktopSelect = dynamic(() => import('./components/desktop/desktop-select'), { ssr: false });
const DesktopTabs   = dynamic(() => import('./components/desktop/desktop-tabs'), { ssr: false });

// Listen (mit Props typisiert!)
const DesktopLeadsList  = dynamic<{ locationId: number }>(
  () => import('./components/desktop/desktop-leads-list'),
  { ssr: false }
);
const DesktopEventsList = dynamic<{ locationId: number }>(
  () => import('./components/desktop/desktop-events-list'),
  { ssr: false }
);

// Mobile-Fluss
const MobileSelect = dynamic(() => import('./components/mobile/mobile-select'), { ssr: false });
const NewAdress    = dynamic(() => import('./components/mobile/new-adress'), { ssr: false });
const NewLead      = dynamic<{ location: LocationRow }>(
  () => import('./components/mobile/new-lead'),
  { ssr: false }
);

type LocationRow = { id: number; uuid?: string; address: string };

export default function Home() {
  const [selected, setSelected] = useState<LocationRow | null>(null);
  const [desktopView, setDesktopView] = useState<'leads' | 'events'>('leads');

  return (
    <div className="flex flex-col w-full min-h-screen">
      <NavbarMobile />
      <NavbarDesktop />

      <main className="p-4">
        {/* DESKTOP: Top-Row = Select + Tabs */}
        <div className="hidden md:flex items-end gap-3 mb-4">
          <DesktopSelect hideLabel onSelect={(loc: LocationRow) => setSelected(loc)} />
          <DesktopTabs value={desktopView} onChange={setDesktopView} />
        </div>

        {/* DESKTOP: Inhalte */}
        <div className="hidden md:block">
          {!selected && (
            <div className="bg-[#181818] border border-[#2A2A2A] px-4 py-2 text-neutral-400 text-[14px]">
              Bitte zuerst eine Adresse wählen.
            </div>
          )}

          {selected && desktopView === 'leads'  && <DesktopLeadsList  locationId={selected.id} />}
          {selected && desktopView === 'events' && <DesktopEventsList locationId={selected.id} />}
        </div>

        {/* MOBILE */}
        <div className="md:hidden">
          {!selected ? (
            <>
              <MobileSelect onSelect={(loc: LocationRow) => setSelected(loc)} />
              <NewAdress />
            </>
          ) : (
            <NewLead location={selected} />
          )}
        </div>
      </main>
    </div>
  );
}
