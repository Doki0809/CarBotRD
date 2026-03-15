// ghl-contacts.js — Vercel Serverless API for GoHighLevel Contacts
// Mirrors getGHLConfig logic from functions/index.js (keep in sync with that file)
//
// Required Vercel env vars:
//   SUPABASE_SERVICE_ROLE_KEY  — for token refresh writes
//   GHL_CLIENT_ID              — GHL OAuth app client ID
//   GHL_CLIENT_SECRET          — GHL OAuth app client secret
//   VITE_SUPABASE_URL          — Supabase project URL (fallback hardcoded)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lpiwkennlavpzisdvnnh.supabase.co';
const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

function toUuid(id) {
  if (!id) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : null;
}

// Replicates getGHLConfig from functions/index.js
// NOTE: Keep in sync with functions/index.js:2417
async function getGHLConfig(dealerId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;

  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado en Vercel');

  const supabaseAdmin = createClient(SUPABASE_URL, serviceKey);
  const dealerUuid = toUuid(dealerId);

  let { data: dealer, error } = await supabaseAdmin
    .from('dealers')
    .select('*')
    .or(`id.eq.${dealerUuid || dealerId},ghl_location_id.eq.${dealerId}`)
    .maybeSingle();

  if (error || !dealer) {
    // Fallback: search by name
    const { data: dealerByName } = await supabaseAdmin
      .from('dealers')
      .select('*')
      .ilike('nombre', `%${dealerId}%`)
      .limit(1)
      .maybeSingle();
    if (dealerByName) {
      dealer = dealerByName;
    } else {
      throw new Error(`GHL no está conectado para este Dealer (${dealerId})`);
    }
  }

  const access_token = dealer.ghl_access_token || dealer.access_token;
  const refresh_token = dealer.ghl_refresh_token || dealer.refresh_token;
  const expires_at = dealer.ghl_token_expires_at || dealer.ghl_expires_at || dealer.expires_at;
  const locationId = dealer.ghl_location_id || dealer.location_id;

  if (!access_token) throw new Error(`Dealer ${dealerId} no tiene token GHL`);

  const now = Date.now();
  const expiresAt = expires_at ? new Date(expires_at).getTime() : 0;

  // Refresh if within 5-minute buffer — only if credentials available
  if (clientId && clientSecret && now >= expiresAt - 300000) {
    try {
      const response = await fetch(`${GHL_BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token,
          user_type: 'Location',
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
        await supabaseAdmin
          .from('dealers')
          .update({
            ghl_access_token: data.access_token,
            ghl_refresh_token: data.refresh_token,
            ghl_token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dealer.id);
        return { access_token: data.access_token, locationId };
      }
    } catch (e) {
      console.warn('[ghl-contacts] Token refresh failed, using existing token:', e.message);
    }
  }

  return { access_token, locationId };
}

function ghlHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Version: GHL_API_VERSION,
  };
}

// Handle incoming GHL webhook event
async function handleWebhook(req, res) {
  const payload = req.body || {};
  const eventType = payload.type || payload.event;
  const locationId = payload.locationId || payload.location_id;

  console.log('[ghl-contacts webhook]', eventType, locationId);

  // Update dealers.updated_at so the frontend polling detects a change
  if (locationId) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const supabaseAdmin = createClient(SUPABASE_URL, serviceKey);
        await supabaseAdmin
          .from('dealers')
          .update({ updated_at: new Date().toISOString() })
          .eq('ghl_location_id', locationId);
      }
    } catch (e) {
      console.warn('[ghl-contacts webhook] Could not update dealers.updated_at:', e.message);
    }
  }

  // GHL requires a fast 200 response
  return res.status(200).json({ received: true });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Webhook path: POST with ?webhook=1
  if (req.method === 'POST' && req.query.webhook) {
    return handleWebhook(req, res);
  }

  const { dealerId, contactId, limit = '100', startAfterId, query: searchQuery } = req.query;

  if (!dealerId) {
    return res.status(400).json({ error: 'dealerId es requerido' });
  }

  try {
    const { access_token, locationId } = await getGHLConfig(dealerId);
    const headers = ghlHeaders(access_token);

    // ── GET ────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      if (contactId) {
        // Single contact
        const r = await fetch(`${GHL_BASE}/contacts/${contactId}`, { headers });
        const data = await r.json();
        return res.status(r.status).json(data);
      }

      // Contact list with optional search and pagination
      const params = new URLSearchParams({ locationId, limit });
      if (startAfterId) params.set('startAfterId', startAfterId);
      if (searchQuery) params.set('query', searchQuery);

      const r = await fetch(`${GHL_BASE}/contacts/?${params.toString()}`, { headers });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // ── PUT (update contact) ───────────────────────────────────────
    if (req.method === 'PUT') {
      if (!contactId) return res.status(400).json({ error: 'contactId es requerido para PUT' });

      const r = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // ── DELETE ─────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (!contactId) return res.status(400).json({ error: 'contactId es requerido para DELETE' });

      const r = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
        method: 'DELETE',
        headers,
      });
      // GHL returns 200 with empty body on success
      return res.status(r.status).json({ ok: r.ok });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[ghl-contacts] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
