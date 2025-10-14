// app/api/door-status/upsert/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = `https://${process.env.supabase_project_id}.supabase.co`;
const SERVICE_ROLE = process.env.supabase_service_role as string;
if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('Missing Supabase ENV');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

type Body = {
  location_id: number;
  stiege: string;
  stockwerk: string;
  tuere: string; // Tür-Nummer als Text, konsistent zu deinem Schema
};

export async function POST(req: Request) {
  try {
    const { location_id, stiege, stockwerk, tuere } = (await req.json()) as Body;
    if (!location_id || !stiege || !stockwerk || !tuere) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    // (1) door_status upsert → not_opened falls neu, sonst Event unverändert lassen
    const { data: existing, error: selErr } = await supabase
      .from('door_status')
      .select('id, event')
      .eq('location_id', location_id)
      .eq('stiege', stiege)
      .eq('stockwerk', stockwerk)
      .eq('tuere', tuere)
      .maybeSingle();

    if (selErr) return NextResponse.json({ error: 'db_error', details: selErr.message }, { status: 500 });

    if (!existing) {
      const { error: insErr } = await supabase.from('door_status').insert({
        location_id, stiege, stockwerk, tuere, event: 'not_opened',
      });
      if (insErr) return NextResponse.json({ error: 'db_error', details: insErr.message }, { status: 500 });
    } else {
      // existiert bereits → nur updated_at „touchen“
      const { error: updTouchErr } = await supabase
        .from('door_status')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updTouchErr) return NextResponse.json({ error: 'db_error', details: updTouchErr.message }, { status: 500 });
    }

    // (2) locations.door_count immer +1 (jeder Tür-Klick zählt als Klopfen)
    // hole aktuelle Zähler
    const { data: locCur, error: locSelErr } = await supabase
      .from('locations')
      .select('id, door_count, doors_opened, rejections, leads')
      .eq('id', location_id)
      .single();
    if (locSelErr) return NextResponse.json({ error: 'db_error', details: locSelErr.message }, { status: 500 });

    const { data: locUpd, error: locUpdErr } = await supabase
      .from('locations')
      .update({ door_count: Number(locCur.door_count ?? 0) + 1 })
      .eq('id', location_id)
      .select('id, uuid, address, door_count, doors_opened, rejections, leads')
      .single();
    if (locUpdErr) return NextResponse.json({ error: 'db_error', details: locUpdErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, location: locUpd }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'bad_request', details: e?.message }, { status: 400 });
  }
}
