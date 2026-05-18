const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { table, id } = req.query;

  try {
    // ── SPOTS ─────────────────────────────────────────
    if (table === 'spots') {
      if (req.method === 'GET') {
        const data = await sb('spots?order=id.asc');
        return res.json(data);
      }
      if (req.method === 'POST') {
        const data = await sb('spots', 'POST', req.body);
        return res.status(201).json(data[0]);
      }
      if (req.method === 'PUT' && id) {
        const data = await sb(`spots?id=eq.${id}`, 'PATCH', req.body);
        return res.json(data[0]);
      }
      if (req.method === 'DELETE' && id) {
        await sb(`spots?id=eq.${id}`, 'DELETE');
        return res.json({ ok: true });
      }
    }

    // ── SCHEDULE ──────────────────────────────────────
    if (table === 'schedule') {
      if (req.method === 'GET') {
        const data = await sb('schedule?order=id.asc');
        const map = {};
        for (const row of data) {
          if (!map[row.slot_key]) map[row.slot_key] = [];
          if (row.spot_id === -1) {
            map[row.slot_key].push({ type: 'text', text: row.note || '' });
          } else {
            map[row.slot_key].push({ type: 'spot', id: row.spot_id });
          }
        }
        return res.json(map);
      }
      if (req.method === 'POST') {
        const data = await sb('schedule', 'POST', req.body);
        return res.status(201).json(data[0]);
      }
      if (req.method === 'DELETE' && id) {
        const lastDunder = id.lastIndexOf('__');
        const slot_key = id.substring(0, lastDunder);
        const spot_id = id.substring(lastDunder + 2);
        await sb('schedule?slot_key=eq.'+encodeURIComponent(slot_key)+'&spot_id=eq.'+spot_id+'&limit=1', 'DELETE');
        return res.json({ ok: true });
      }
    }

    // ── CHECKLIST ─────────────────────────────────────
    if (table === 'checklist') {
      if (req.method === 'GET') {
        const data = await sb('checklist?order=sort_order.asc,id.asc');
        return res.json(data);
      }
      if (req.method === 'POST') {
        const data = await sb('checklist', 'POST', req.body);
        return res.status(201).json(data[0]);
      }
      if (req.method === 'PUT' && id) {
        const data = await sb(`checklist?id=eq.${id}`, 'PATCH', req.body);
        return res.json(data[0]);
      }
      if (req.method === 'DELETE' && id) {
        await sb(`checklist?id=eq.${id}`, 'DELETE');
        return res.json({ ok: true });
      }
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
