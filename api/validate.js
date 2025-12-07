// api/validate.js
import fetch from 'node-fetch';

const AUTH_HOST = "salep-auth.sce.manh.com";
const API_HOST = "salep.sce.manh.com";
const CLIENT_ID = "omnicomponent.1.0.0";
const CLIENT_SECRET = "b4s8rgTyg55XYNun";
const PASSWORD = "Blu3sk!es2300";
const USERNAME_BASE = "sdtadmin@";

const HA_WEBHOOK_URL = process.env.HA_WEBHOOK_URL || "http://sidmsmith.zapto.org:8123/api/webhook/manhattan_app_usage";
const APP_NAME = "schedule-app";
const APP_VERSION = "0.1.5";

// Get OAuth token
async function getToken(org) {
  const url = `https://${AUTH_HOST}/oauth/token`;
  const username = `${USERNAME_BASE}${org.toLowerCase()}`;
  const body = new URLSearchParams({
    grant_type: 'password',
    username,
    password: PASSWORD
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
    },
    body
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

// API call wrapper
async function apiCall(method, path, token, org, body = null) {
  const url = `https://${API_HOST}${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    selectedOrganization: org,
    selectedLocation: `${org}-DM1`
  };

  const res = await fetch(url, { 
    method, 
    headers, 
    body: body ? JSON.stringify(body) : undefined 
  });
  return res.ok ? await res.json() : { error: await res.text() };
}

// Send HA message helper
async function sendHAMessage(eventName, metadata = {}) {
  try {
    const payload = {
      event_name: eventName,
      app_name: APP_NAME,
      app_version: APP_VERSION,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    await fetch(HA_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('[HA] Failed to send message:', error.message);
  }
}

// Export handler
export default async function handler(req, res) {
  console.log(`[API] ${req.method} ${req.url}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, org, lpn, code } = req.body;

  // === HA TRACK ENDPOINT ===
  if (action === 'ha-track') {
    const { eventName, metadata } = req.body;
    if (eventName) {
      await sendHAMessage(eventName, metadata);
    }
    return res.json({ success: true });
  }

  // === APP OPENED (NO ORG) ===
  if (action === 'app_opened') {
    return res.json({ success: true });
  }

  // === AUTHENTICATE ===
  if (action === 'auth') {
    const token = await getToken(org);
    if (!token) {
      return res.json({ success: false, error: "Auth failed" });
    }
    return res.json({ success: true, token });
  }

  // === SCHEDULE ATTEMPTED (modal opened) ===
  if (action === 'schedule_attempted') {
    return res.json({ success: true });
  }

  // === GET CONDITION CODES ===
  if (action === 'get-codes') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });

    const codesRes = await apiCall('GET', '/dcinventory/api/dcinventory/conditionCode?size=50', token, org);
    const items = codesRes.data || [];
    const codes = items
      .map(x => ({ code: x.ConditionCodeId, desc: x.Description }))
      .sort((a, b) => a.code.localeCompare(b.code));
    codes.unshift({ code: '', desc: 'Select Code' });

    return res.json({ codes });
  }

  // === Need token for secure actions ===
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });

  // === CALENDAR DATA ===
  if (action === 'calendar-data') {
    const dateOnly = req.body.date || new Date().toISOString().split('T')[0];
    const payload = {
      FacilityId: `${org}-DM1`,
      CalendarDate: `${dateOnly}T05:00:00`,
      ResourceGroups: req.body.resourceGroups || [
        {
          ResourceGroupName: "Dock",
          ResourceUnits: [
            { ResourceId: "Dock 1" }
          ]
        }
      ]
    };

    console.log('[calendar-data] Request', JSON.stringify({ org, payload }, null, 2));
    const calendarRes = await apiCall('POST', '/appointment/api/appointment/calendarData', token, org, payload);
    console.log('[calendar-data] Response', JSON.stringify(calendarRes, null, 2));
    return res.json(calendarRes);
  }

  if (action === 'schedule-appointment') {
    const preferredDateTime = req.body.preferredDateTime;
    if (!preferredDateTime) {
      return res.status(400).json({ success: false, error: 'PreferredDateTime required' });
    }

    const payload = {
      AppointmentTypeId: "DROP_UNLOAD",
      EquipmentTypeId: "48FT",
      PreferredDateTime: preferredDateTime,
      Duration: 60,
      AppointmentStatusId: "3000"
    };

    console.log('[schedule-appointment] Request', JSON.stringify({ org, payload }, null, 2));
    const scheduleRes = await apiCall('POST', '/appointment/api/appointment/scheduleAppointment', token, org, payload);
    console.log('[schedule-appointment] Response', JSON.stringify(scheduleRes, null, 2));
    
    return res.json(scheduleRes);
  }

  // Unknown action
  return res.status(400).json({ error: "Unknown action" });
}

export const config = { api: { bodyParser: true } };