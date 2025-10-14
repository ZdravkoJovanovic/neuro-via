// app/api/location/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = `https://${process.env.supabase_project_id}.supabase.co`;
const SERVICE_ROLE = process.env.supabase_service_role as string;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Supabase-ENV fehlt: supabase_project_id / supabase_service_role');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    const clean = String(address ?? '').trim();

    if (!clean) {
      return NextResponse.json({ error: 'address_required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('locations')
      .insert({ address: clean })
      .select('id, uuid, address')
      .single();

    if (error) {
      // evtl. Unique-Fehler, falls noch Constraint besteht
      // @ts-ignore
      if (error.code === '23505') {
        return NextResponse.json({ error: 'address_exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, location: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'bad_request', details: e?.message }, { status: 400 });
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from('locations')
    .select('id, uuid, address')
    .order('id', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
  }
  return NextResponse.json({ locations: data ?? [] }, { status: 200 });
}
