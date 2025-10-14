// app/api/leads/get-desktop-leads/route.ts
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
    'id, lead_uuid, location_id, first_name, last_name, stiege, stockwerk, tuere, created_at, locations(address)';

  let query = supabase.from('door_2_door_leads').select(cols);

  if (locationId) query = query.eq('location_id', Number(locationId));
  query = query.order('created_at', { ascending: false }).limit(200);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 });

  const leads = (data || []).map((row: any) => ({
    id: row.id,
    lead_uuid: row.lead_uuid,
    location_id: row.location_id,
    address: row.locations?.address ?? '',
    first_name: row.first_name ?? '',
    last_name: row.last_name ?? null,
    stiege: row.stiege ?? '',
    stockwerk: row.stockwerk ?? '',
    tuere: row.tuere ?? '',
    created_at: row.created_at,
  }));

  return NextResponse.json({ leads }, { status: 200 });
}
