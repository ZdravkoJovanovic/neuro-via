'use client';

import { CiMenuBurger } from 'react-icons/ci';

export default function NavbarDesktop() {
  return (
    <header className="hidden md:block sticky top-0 z-50 text-white">
      <div className="h-12 flex items-center px-6">
        <h1 className="text-2xl font-bold select-none">NEURO-VIA</h1>
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
