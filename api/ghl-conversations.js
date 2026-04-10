// ghl-conversations.js — Vercel Serverless API for GoHighLevel Conversations
// Mirrors getGHLConfig logic from ghl-contacts.js (keep in sync)
//
// Endpoints:
//   GET  ?dealerId=X&limit=25&lastId=Y        → list conversations
//   GET  ?dealerId=X&conversationId=Z         → get single conversation
//   GET  ?dealerId=X&conversationId=Z&messages=1&lastMessageId=Y → get messages
//   POST ?dealerId=X                          → send message (body: {conversationId, type, message, ...})
//   PUT  ?dealerId=X&conversationId=Z         → update conversation (e.g. toggle AI bot)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lpiwkennlavpzisdvnnh.supabase.co';
const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

function toUuid(id) {
  if (!id) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : null;
}

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
  const tokenExpired = now >= expiresAt - 300000;

  if (clientId && clientSecret && refresh_token && tokenExpired) {
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
      if (response.ok && data.access_token) {
        const newExpiresAt = new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString();
        await supabaseAdmin
          .from('dealers')
          .update({
            ghl_access_token: data.access_token,
            ghl_refresh_token: data.refresh_token || refresh_token,
            ghl_token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dealer.id);
        return { access_token: data.access_token, locationId };
      } else {
        if (now >= expiresAt) {
          throw new Error(`Token expirado y no se pudo renovar para dealer ${dealerId}. Reconecta desde Ajustes.`);
        }
      }
    } catch (e) {
      if (e.message.includes('Reconecta')) throw e;
      console.warn('[ghl-conversations] Token refresh error:', e.message);
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

// Read full request body as a Buffer (needed when bodyParser is disabled)
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export const config = {
  api: {
    // Disable automatic body parsing so we can handle both JSON and multipart
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { dealerId, conversationId, messages, lastMessageId, lastId, limit = '25', tags, teamMembers, assignedUserId, contactId, upload, bots, botStatus } = req.query;

  // Parse body: JSON for most requests, raw buffer for multipart uploads
  let reqBodyBuffer = null;
  let reqBodyJson = {};
  const contentType = req.headers['content-type'] || '';
  if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'OPTIONS') {
    reqBodyBuffer = await readRawBody(req);
    if (contentType.includes('application/json') && reqBodyBuffer.length > 0) {
      try { reqBodyJson = JSON.parse(reqBodyBuffer.toString()); } catch (_) {}
    }
  }

  if (!dealerId) return res.status(400).json({ error: 'dealerId es requerido' });

  try {
    const { access_token, locationId } = await getGHLConfig(dealerId);
    const headers = ghlHeaders(access_token);

    // ── GET ──────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      // Fetch all tags for the location
      if (tags === '1') {
        const r = await fetch(`${GHL_BASE}/locations/${locationId}/tags`, { headers });
        const data = await r.json();
        return res.status(r.status).json(data);
      }

      // Fetch team members for @mentions
      if (teamMembers === '1') {
        const r = await fetch(`${GHL_BASE}/users/?locationId=${locationId}`, { headers });
        const data = await r.json();
        const members = (data.users || []).map(u => ({
          id: u.id,
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          email: u.email,
          avatar: u.profilePhoto || null,
        }));
        return res.status(200).json({ members });
      }

      // Fetch conversation AI agents/bots for this location
      if (bots === '1') {
        const params = new URLSearchParams({ locationId });
        const r = await fetch(`${GHL_BASE}/conversation-ai/agents/search?${params}`, { headers });
        const data = await r.json();
        // Return simplified list of active bots
        const agents = (data.agents || data.data || []).map(a => ({
          id: a.id,
          name: a.name,
          status: a.status,
          mode: a.mode,
          channels: a.channels || [],
        }));
        return res.status(200).json({ agents, hasBot: agents.length > 0 });
      }

      // Get bot status for a specific conversation
      if (conversationId && botStatus === '1') {
        const r = await fetch(`${GHL_BASE}/conversations-ai/employeeConfigs/${conversationId}`, { headers });
        if (!r.ok) {
          // 404 = no bot config for this conversation (bot never assigned)
          if (r.status === 404) return res.status(200).json({ status: null, hasConfig: false });
          const data = await r.json().catch(() => ({}));
          return res.status(r.status).json(data);
        }
        const data = await r.json();
        return res.status(200).json({
          status: data.status || null,
          hasConfig: true,
          sleepingTill: data.sleepingTill || null,
          reactivateAfterTimeValue: data.reactivateAfterTimeValue || null,
          reactivateAfterTimeUnit: data.reactivateAfterTimeUnit || null,
        });
      }

      // Get messages for a conversation
      if (conversationId && messages === '1') {
        const params = new URLSearchParams({ limit: '50' });
        if (lastMessageId) params.set('lastMessageId', lastMessageId);
        const r = await fetch(`${GHL_BASE}/conversations/${conversationId}/messages?${params}`, { headers });
        const data = await r.json();
        return res.status(r.status).json(data);
      }

      // Get single conversation
      if (conversationId) {
        const r = await fetch(`${GHL_BASE}/conversations/${conversationId}`, { headers });
        const data = await r.json();
        return res.status(r.status).json(data);
      }

      // List conversations
      const params = new URLSearchParams({ locationId, limit, sortBy: 'last_message_date', sort: 'desc' });
      if (lastId) params.set('startAfterId', lastId);
      if (assignedUserId) params.set('assignedTo', assignedUserId);
      const r = await fetch(`${GHL_BASE}/conversations/search?${params}`, { headers });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // ── POST (upload media file for a conversation) ──────────────────
    if (req.method === 'POST' && upload === '1') {
      if (!conversationId) return res.status(400).json({ error: 'conversationId es requerido para upload' });
      if (!contentType.includes('multipart/form-data')) {
        return res.status(400).json({ error: 'Se requiere multipart/form-data para upload' });
      }

      // Parse incoming multipart, then rebuild it adding the fields GHL requires:
      // conversationId and locationId must be form fields, not query params.
      let incomingForm;
      try {
        // Use the Web API Request to parse multipart (available in Node 18+)
        const tmpReq = new Request('https://localhost', {
          method: 'POST',
          headers: { 'content-type': contentType },
          body: reqBodyBuffer,
        });
        incomingForm = await tmpReq.formData();
      } catch (parseErr) {
        console.error('[ghl-conversations] multipart parse error:', parseErr.message);
        return res.status(400).json({ error: 'No se pudo parsear el multipart' });
      }

      const fileEntry = incomingForm.get('file');
      if (!fileEntry) {
        return res.status(400).json({ error: 'Campo "file" no encontrado en el multipart' });
      }

      // Reconstruct FormData with the fields GHL's upload endpoint requires
      const outForm = new FormData();
      outForm.append('conversationId', conversationId);
      outForm.append('locationId', locationId);
      // Normalize audio MIME types: strip codec parameters GHL may not accept
      // e.g. "audio/webm;codecs=opus" → "audio/webm"
      const rawMime = fileEntry.type || 'application/octet-stream';
      const normalizedMime = rawMime.split(';')[0].trim();
      const fileName = fileEntry.name || 'file';
      const normalizedFile = normalizedMime !== rawMime
        ? new File([await fileEntry.arrayBuffer()], fileName, { type: normalizedMime })
        : fileEntry;
      outForm.append('file', normalizedFile, fileName);

      const uploadRes = await fetch(`${GHL_BASE}/conversations/messages/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          Version: GHL_API_VERSION,
          // Do NOT set content-type manually — fetch sets it with the correct boundary
        },
        body: outForm,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        console.error('[ghl-conversations] upload error:', uploadRes.status, uploadData);
        return res.status(uploadRes.status).json(uploadData);
      }
      // GHL returns { uploadedFiles: [url] } or { url }
      const url = uploadData.uploadedFiles?.[0] || uploadData.url || null;
      return res.status(200).json({ url });
    }

    // ── POST (send message) ──────────────────────────────────────────
    if (req.method === 'POST') {
      const body = reqBodyJson;
      if (!body.conversationId) return res.status(400).json({ error: 'conversationId es requerido' });

      const payload = {
        type: body.type || 'WhatsApp',
        conversationId: body.conversationId,
        // GHL expects attachments as an array of URL strings, not objects
        ...(body.attachments && body.attachments.length > 0
          ? { attachments: body.attachments.map(a => (typeof a === 'string' ? a : a.url)) }
          : {}),
      };
      // Only include message if non-empty — GHL allows attachment-only messages
      if (body.message) payload.message = body.message;

      const r = await fetch(`${GHL_BASE}/conversations/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // ── PUT (update conversation or add/remove tag on contact) ────────
    if (req.method === 'PUT') {
      const body = reqBodyJson;

      // Toggle conversation AI bot status
      if (conversationId && botStatus === '1') {
        const status = body.status; // "active" or "inactive"
        if (!status || !['active', 'inactive'].includes(status)) {
          return res.status(400).json({ error: 'status debe ser "active" o "inactive"' });
        }
        const payload = {
          data: {
            status,
            ...(status === 'inactive' ? {
              reactivateAfterTimeValue: body.reactivateAfterTimeValue || 24,
              reactivateAfterTimeUnit: body.reactivateAfterTimeUnit || 'hour',
            } : {}),
          },
          locationId,
        };
        const r = await fetch(`${GHL_BASE}/conversations-ai/employeeConfigs/${conversationId}`, {
          method: 'PUT',
          headers: {
            ...headers,
            channel: 'APP',
            source: 'WEB_USER',
          },
          body: JSON.stringify(payload),
        });
        const data = await r.json().catch(() => ({}));
        return res.status(r.status).json(data);
      }

      // Add tag to contact
      if (contactId && body.addTag) {
        const r = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ tags: [body.addTag] }),
        });
        const data = await r.json();
        return res.status(r.status).json(data);
      }

      // Remove tag from contact
      if (contactId && body.removeTag) {
        const r = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ tags: [body.removeTag] }),
        });
        const data = await r.json();
        return res.status(r.status).json(data);
      }

      if (!conversationId) return res.status(400).json({ error: 'conversationId es requerido para PUT' });

      const r = await fetch(`${GHL_BASE}/conversations/${conversationId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // ── DELETE (delete conversation) ─────────────────────────────────
    if (req.method === 'DELETE') {
      if (!conversationId) return res.status(400).json({ error: 'conversationId es requerido para DELETE' });
      const r = await fetch(`${GHL_BASE}/conversations/${conversationId}`, { method: 'DELETE', headers });
      if (r.status === 200 || r.status === 204) return res.status(200).json({ success: true });
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[ghl-conversations] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
