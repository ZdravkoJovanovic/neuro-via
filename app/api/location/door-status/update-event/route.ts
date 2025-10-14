// app/api/location/door-status/update-event/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = `https://${process.env.supabase_project_id}.supabase.co`;
const SERVICE_ROLE = process.env.supabase_service_role as string;
if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('Missing Supabase ENV');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

type DoorEvent = 'not_opened' | 'opened' | 'lead' | 'rejection';
type NextEvent = 'opened' | 'lead' | 'rejection';

type Body = {
  location_id: number;
  stiege: string;
  stockwerk: string;
  tuere: string;
  event: NextEvent;
};

const rank: Record<DoorEvent, number> = {
  not_opened: 0,
  opened: 1,
  lead: 2,
  rejection: 2,
};

function calcDeltas(from: DoorEvent, to: NextEvent) {
  let doorsOpened = 0, leads = 0, rejections = 0;

  switch (to) {
    case 'opened':
      if (from === 'not_opened') doorsOpened = 1;
      break;

    case 'lead':
      if (from === 'not_opened') doorsOpened = 1;   // opened implizit
      if (from !== 'lead') leads = 1;
      if (from === 'rejection') rejections = -1;    // Wechsel rejection -> lead
      break;

    case 'rejection':
      if (from === 'not_opened') doorsOpened = 1;   // opened implizit
      if (from !== 'rejection') rejections = 1;
      if (from === 'lead') leads = -1;              // Wechsel lead -> rejection
      break;
  }

  return { doorsOpened, leads, rejections };
}

export async function POST(req: Request) {
  try {
    const { location_id, stiege, stockwerk, tuere, event } = (await req.json()) as Body;
    if (!location_id || !stiege || !stockwerk || !tuere || !event) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    // 1) Aktuellen Tür-Status holen (falls nicht vorhanden → not_opened anlegen)
    const { data: row, error: selErr } = await supabase
      .from('door_status')
      .select('id, event')
      .eq('location_id', location_id)
      .eq('stiege', stiege)
      .eq('stockwerk', stockwerk)
      .eq('tuere', tuere)
      .maybeSingle();
    if (selErr) return NextResponse.json({ error: 'db_error', details: selErr.message }, { status: 500 });

    let currentEvent: DoorEvent = 'not_opened';
    if (!row) {
      const { error: insErr } = await supabase.from('door_status').insert({
        location_id, stiege, stockwerk, tuere, event: 'not_opened',
      });
      if (insErr) return NextResponse.json({ error: 'db_error', details: insErr.message }, { status: 500 });
    } else {
      currentEvent = (row.event as DoorEvent) ?? 'not_opened';
    }

    // 2) Kein Downgrade zulassen
    if (rank[currentEvent] > rank[event]) {
      const { data: locNow, error: locErr } = await supabase
        .from('locations')
        .select('id, uuid, address, door_count, doors_opened, rejections, leads')
        .eq('id', location_id)
        .single();
      if (locErr) return NextResponse.json({ error: 'db_error', details: locErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, location: locNow }, { status: 200 });
    }

    // 3) Deltas für Aggregates berechnen
    const { doorsOpened, leads, rejections } = calcDeltas(currentEvent, event);

    // 4) Tür-Status updaten
    const { error: updDoorErr } = await supabase
      .from('door_status')
      .update({ event, updated_at: new Date().toISOString() })
      .eq('location_id', location_id)
      .eq('stiege', stiege)
      .eq('stockwerk', stockwerk)
      .eq('tuere', tuere);
    if (updDoorErr) return NextResponse.json({ error: 'db_error', details: updDoorErr.message }, { status: 500 });

    // 5) Location-Aggregate updaten (nie negativ)
    const { data: locCur, error: locSelErr } = await supabase
      .from('locations')
      .select('id, doors_opened, rejections, leads')
      .eq('id', location_id)
      .single();
    if (locSelErr) return NextResponse.json({ error: 'db_error', details: locSelErr.message }, { status: 500 });

    const patch = {
      doors_opened: Math.max(0, (locCur?.doors_opened ?? 0) + doorsOpened),
      rejections:   Math.max(0, (locCur?.rejections   ?? 0) + rejections),
      leads:        Math.max(0, (locCur?.leads        ?? 0) + leads),
    };

    const { data: locUpd, error: locUpdErr } = await supabase
      .from('locations')
      .update(patch)
      .eq('id', location_id)
      .select('id, uuid, address, door_count, doors_opened, rejections, leads')
      .single();
    if (locUpdErr) return NextResponse.json({ error: 'db_error', details: locUpdErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, location: locUpd }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'bad_request', details: e?.message }, { status: 400 });
  }
}
