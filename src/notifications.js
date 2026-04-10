import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from './firebaseConfig';
import { supabase } from './supabase.js';

// ── Message templates ──────────────────────────────────────────────────────────

export const VEHICLE_MESSAGES = [
  'Hola {receptor}, {actor} agregó un {año} {marca} {modelo} {color} al inventario 🚗',
  'Nuevo en el lote 👀 {año} {marca} {modelo} {color} añadido por {actor}',
  '{actor} subió un nuevo vehículo: {marca} {modelo} {año} 🔥',
  'Ya está disponible un {año} {marca} {modelo} {color} en inventario',
  'Oye {receptor}, entró un {marca} {modelo} {año} nuevo al lote',
];

export const QUOTE_MESSAGES = [
  '{actor} cotizó un {año} {marca} {modelo} {color} para {cliente} 📋',
  'Nueva cotización lista: {cliente} — {marca} {modelo} {año}',
  '{actor} preparó una cotización para {cliente} del {año} {marca} {modelo}',
  'Ojo, {cliente} ya recibió cotización del {marca} {modelo} {año} 👀',
  'Movimiento nuevo 💼 {actor} cotizó el {marca} {modelo} {año} para {cliente}',
];

export const CONTRACT_MESSAGES = [
  '¡Contrato generado! {cliente} cerró el {año} {marca} {modelo} {color} con {actor} 🎉',
  '{actor} generó un contrato para {cliente}: {marca} {modelo} {año} ✅',
  'Venta cerrada 🔥 Contrato listo para el {año} {marca} {modelo} de {cliente}',
  'Buenas noticias: {actor} cerró con {cliente} el {marca} {modelo} {año} 🙌',
  'Contrato finalizado 💪 {cliente} ya va con su {año} {marca} {modelo}',
];

// ── Template engine ────────────────────────────────────────────────────────────

/**
 * Picks a random template from the array and replaces {variable} placeholders
 * with the values in the vars object. Unknown placeholders are left as-is.
 *
 * @param {string[]} templates
 * @param {Record<string, string>} vars
 * @returns {string}
 */
export function pickMessage(templates, vars) {
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  );
}

// ── Payload builder ────────────────────────────────────────────────────────────

/**
 * Builds the notification payload for the Cloud Function.
 *
 * @param {'vehicle'|'quote'|'contract'} type
 * @param {{
 *   actorName: string,
 *   vehicleData: { año: string, marca: string, modelo: string, color: string },
 *   clientName?: string,
 *   dealerId: string,
 * }} data
 * @returns {{ type: string, actorName: string, vehicleData: object, clientName: string, dealerId: string }}
 */
export function buildNotificationPayload(type, data) {
  const { actorName, vehicleData, clientName = '', dealerId } = data;
  return {
    type,
    actorName,
    vehicleData,
    clientName,
    dealerId,
  };
}

// ── FCM token registration ─────────────────────────────────────────────────────

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

/**
 * Requests browser notification permission, obtains the FCM token and persists
 * it in Supabase `push_subscriptions`. Safe to call multiple times — the upsert
 * is idempotent on (user_id, fcm_token).
 *
 * @returns {Promise<string|null>} The FCM token, or null if permission was denied.
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[notifications] Notifications API not supported in this browser.');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.info('[notifications] Notification permission not granted:', permission);
    return null;
  }

  let messaging;
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.error('[notifications] Failed to get Firebase Messaging instance:', err);
    return null;
  }

  let fcmToken;
  try {
    fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
  } catch (err) {
    console.error('[notifications] Failed to obtain FCM token:', err);
    return null;
  }

  if (!fcmToken) {
    console.warn('[notifications] FCM returned an empty token.');
    return null;
  }

  // Persist token — we need the authenticated user and their dealer_id.
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[notifications] Could not get authenticated user:', authError);
    return null;
  }

  // Resolve dealer_id from the user's profile.
  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('dealer_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.dealer_id) {
    console.error('[notifications] Could not resolve dealer_id for user:', profileError);
    return null;
  }

  const { error: upsertError } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        dealer_id: profile.dealer_id,
        fcm_token: fcmToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,fcm_token' }
    );

  if (upsertError) {
    console.error('[notifications] Failed to persist FCM token in Supabase:', upsertError);
    // Return the token anyway — the app can still receive foreground messages.
  }

  return fcmToken;
}

// ── Foreground message listener ────────────────────────────────────────────────

/**
 * Registers a foreground message handler. Call this once after the app mounts.
 * Returns an unsubscribe function.
 *
 * @param {(payload: import('firebase/messaging').MessagePayload) => void} handler
 * @returns {() => void} unsubscribe
 */
export function onForegroundMessage(handler) {
  let messaging;
  try {
    messaging = getMessaging(app);
  } catch {
    return () => {};
  }
  return onMessage(messaging, handler);
}

// ── Notification dispatcher ────────────────────────────────────────────────────

const SEND_NOTIFICATION_URL = 'https://us-central1-carbot-online-do.cloudfunctions.net/sendPushNotification';

/**
 * Calls the Cloud Function to fan out a push notification to all members of
 * the same dealer, excluding the actor.
 *
 * @param {{
 *   type: 'vehicle'|'quote'|'contract',
 *   actorName: string,
 *   receptorName?: string,
 *   vehicleData: { año: string, marca: string, modelo: string, color: string },
 *   clientName?: string,
 *   dealerId: string,
 * }} options
 * @returns {Promise<void>}
 */
export async function sendDealerNotification(options) {
  const payload = buildNotificationPayload(options.type, {
    actorName: options.actorName,
    vehicleData: options.vehicleData,
    clientName: options.clientName,
    dealerId: options.dealerId,
  });

  try {
    const response = await fetch(SEND_NOTIFICATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[notifications] sendDealerNotification failed:', response.status, text);
    }
  } catch (err) {
    console.error('[notifications] Network error calling sendPushNotification:', err);
  }
}
