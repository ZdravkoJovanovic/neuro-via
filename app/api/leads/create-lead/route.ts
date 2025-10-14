// app/api/leads/create-lead/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = `https://${process.env.supabase_project_id}.supabase.co`;
const SERVICE_ROLE = process.env.supabase_service_role as string;
if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('Missing Supabase ENV');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

type DoorEvent = 'not_opened' | 'opened' | 'lead' | 'rejection';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const location_id = Number(body?.location_id);
    const stiege     = String(body?.stiege ?? '').trim();
    const stockwerk  = String(body?.stockwerk ?? '').trim();
    const tuere      = String(body?.tuere ?? '').trim();
    const first_name = String(body?.first_name ?? '').trim();

    if (!location_id || !stiege || !stockwerk || !tuere || !first_name) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    // Türstatus holen/initialisieren
    const { data: ds, error: dsErr } = await supabase
      .from('door_status')
      .select('id, event')
      .eq('location_id', location_id)
      .eq('stiege', stiege)
      .eq('stockwerk', stockwerk)
      .eq('tuere', tuere)
      .maybeSingle();
    if (dsErr) return NextResponse.json({ error: 'db_error', details: dsErr.message }, { status: 500 });

    let fromEvent: DoorEvent = ds?.event ?? 'not_opened';

    if (!ds) {
      const { error: insStatusErr } = await supabase
        .from('door_status')
        .insert({ location_id, stiege, stockwerk, tuere, event: 'not_opened' });
      if (insStatusErr) return NextResponse.json({ error: 'db_error', details: insStatusErr.message }, { status: 500 });
      fromEvent = 'not_opened';
    }

    // Türstatus -> lead (idempotent)
    if (fromEvent !== 'lead') {
      const { error: updDoorErr } = await supabase
        .from('door_status')
        .update({ event: 'lead', updated_at: new Date().toISOString() })
        .eq('location_id', location_id)
        .eq('stiege', stiege)
        .eq('stockwerk', stockwerk)
        .eq('tuere', tuere);
      if (updDoorErr) return NextResponse.json({ error: 'db_error', details: updDoorErr.message }, { status: 500 });
    }

    // Aggregates anpassen (nur beim echten Wechsel)
    let dDoorsOpened = 0, dLeads = 0, dRejections = 0;
    if (fromEvent === 'not_opened') dDoorsOpened = 1;
    if (fromEvent !== 'lead') dLeads = 1;
    if (fromEvent === 'rejection') dRejections = -1;

    if (dDoorsOpened || dLeads || dRejections) {
      const { data: cur, error: selErr } = await supabase
        .from('locations')
        .select('doors_opened, rejections, leads')
        .eq('id', location_id)
        .single();
      if (selErr) return NextResponse.json({ error: 'db_error', details: selErr.message }, { status: 500 });

      const patch = {
        doors_opened: Math.max(0, (cur?.doors_opened ?? 0) + dDoorsOpened),
        rejections:   Math.max(0, (cur?.rejections   ?? 0) + dRejections),
        leads:        Math.max(0, (cur?.leads        ?? 0) + dLeads),
      };

      const { error: updLocErr } = await supabase
        .from('locations')
        .update(patch)
        .eq('id', location_id);
      if (updLocErr) return NextResponse.json({ error: 'db_error', details: updLocErr.message }, { status: 500 });
    }

    // Lead eintragen – OHNE lead_uuid (DB-Default generiert ihn)
    const { data: lead, error: leadErr } = await supabase
      .from('door_2_door_leads')
      .insert({
        location_id,
        first_name,
        last_name: null,
        stiege,
        stockwerk,
        tuere,
      })
      .select('id, lead_uuid, location_id, stiege, stockwerk, tuere, first_name')
      .single();

    if (leadErr) {
      // @ts-ignore 23505 = unique violation (pro Tür schon Lead vorhanden)
      if (leadErr.code === '23505') {
        return NextResponse.json({ error: 'door_already_has_lead' }, { status: 409 });
      }
      return NextResponse.json({ error: 'db_error', details: leadErr.message }, { status: 500 });
    }

    const { data: location, error: locErr } = await supabase
      .from('locations')
      .select('id, uuid, address, door_count, doors_opened, rejections, leads')
      .eq('id', location_id)
      .single();
    if (locErr) return NextResponse.json({ error: 'db_error', details: locErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, lead, location }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'bad_request', details: e?.message }, { status: 400 });
  }
}
