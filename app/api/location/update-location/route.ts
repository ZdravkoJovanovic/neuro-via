// app/api/location/update-location/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = `https://${process.env.supabase_project_id}.supabase.co`;
const SERVICE_ROLE = process.env.supabase_service_role as string;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Supabase-ENV fehlt: supabase_project_id / supabase_service_role');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

type Field = 'door_count' | 'doors_opened' | 'rejections' | 'leads';
type Op = { field: Field; delta: number };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body?.id);
    const allowed: Field[] = ['door_count', 'doors_opened', 'rejections', 'leads'];

    if (!id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

    const ops: Op[] = Array.isArray(body?.ops)
      ? body.ops
      : body?.field
      ? [{ field: body.field as Field, delta: Number.isFinite(body?.delta) ? Number(body.delta) : 1 }]
      : [];

    if (!ops.length || !ops.every(o => allowed.includes(o.field))) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const { data: cur, error: selErr } = await supabase
      .from('locations')
      .select('id, door_count, doors_opened, rejections, leads')
      .eq('id', id)
      .single();
    if (selErr) return NextResponse.json({ error: 'db_error', details: selErr.message }, { status: 500 });
    if (!cur)   return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const patch = {
      door_count:    Number(cur.door_count ?? 0),
      doors_opened:  Number(cur.doors_opened ?? 0),
      rejections:    Number(cur.rejections ?? 0),
      leads:         Number(cur.leads ?? 0),
    };

    for (const { field, delta } of ops) {
      const d = Number.isFinite(delta) ? Number(delta) : 1;
      // nie negativ
      // @ts-ignore
      patch[field] = Math.max(0, Number(patch[field] ?? 0) + d);
    }

    const { data: updated, error: updErr } = await supabase
      .from('locations')
      .update(patch)
      .eq('id', id)
      .select('id, uuid, address, door_count, doors_opened, rejections, leads')
      .single();

    if (updErr) return NextResponse.json({ error: 'db_error', details: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, location: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'bad_request', details: e?.message }, { status: 400 });
  }
}
