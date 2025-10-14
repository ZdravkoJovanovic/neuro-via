// app/api/location/select-location/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = `https://${process.env.supabase_project_id}.supabase.co`;
const SERVICE_ROLE = process.env.supabase_service_role as string;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Supabase-ENV fehlt: supabase_project_id / supabase_service_role');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const cols = 'id, uuid, address, door_count, doors_opened, rejections, leads';

  if (id) {
    const { data, error } = await supabase
      .from('locations')
      .select(cols)
      .eq('id', Number(id))
      .single();

    if (error) return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
    if (!data)  return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ location: data }, { status: 200 });
  }

  const { data, error } = await supabase
    .from('locations')
    .select(cols)
    .order('id', { ascending: false });

  if (error) return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });
  return NextResponse.json({ locations: data ?? [] }, { status: 200 });
}
