// app/api/leads/get-desktop-lead-events/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = `https://${process.env.supabase_project_id}.supabase.co`;
const SERVICE_ROLE = process.env.supabase_service_role as string;
if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('Missing Supabase ENV');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('location_id');

  const cols =
    'id, location_id, stiege, stockwerk, tuere, event, created_at, updated_at, locations(address)';

  let query = supabase.from('door_status').select(cols);
  if (locationId) query = query.eq('location_id', Number(locationId));

  query = query.order('updated_at', { ascending: false }).limit(300);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });

  const events = (data || []).map((row: any) => ({
    id: row.id,
    location_id: row.location_id,
    address: row.locations?.address ?? '',
    stiege: row.stiege ?? '',
    stockwerk: row.stockwerk ?? '',
    tuere: row.tuere ?? '',
    event: row.event as 'not_opened' | 'opened' | 'lead' | 'rejection',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return NextResponse.json({ events }, { status: 200 });
}
