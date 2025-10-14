'use client';

type View = 'leads' | 'events';
type Props = { value: View; onChange: (v: View) => void };

export default function DesktopTabs({ value, onChange }: Props) {
  return (
    <div className="hidden md:flex gap-2">
      <button
        type="button"
        aria-pressed={value === 'leads'}
        onClick={() => onChange('leads')}
        className={`h-9 px-4 rounded-none text-[16px] ${
          value === 'leads'
            ? 'bg-white text-black'
            : 'bg-[#181818] text-white border border-[#2A2A2A]'
        }`}
      >
        LEADS
      </button>

      <button
        type="button"
        aria-pressed={value === 'events'}
        onClick={() => onChange('events')}
        className={`h-9 px-4 rounded-none text-[16px] ${
          value === 'events'
            ? 'bg-white text-black'
            : 'bg-[#181818] text-white border border-[#2A2A2A]'
        }`}
      >
        EVENTS
      </button>
    </div>
  );
}
