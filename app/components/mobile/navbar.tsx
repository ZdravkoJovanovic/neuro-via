'use client';

import { CiMenuBurger } from 'react-icons/ci';

export default function NavbarMobile() {
  return (
    <header className="md:hidden sticky top-0 z-50 text-white">
      <div className="h-12 flex items-center px-4">
        {/* Titel links */}
        <h1 className="text-2xl font-semibold select-none">
          Google
        </h1>

        {/* Menü-Icon rechts (weiß), nur Mobile sichtbar */}
        <button
          type="button"
          aria-label="Menü"
          className="ml-auto w-6 h-6 flex items-center justify-center"
        >
          <CiMenuBurger className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
