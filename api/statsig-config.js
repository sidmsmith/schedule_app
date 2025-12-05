// api/statsig-config.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientKey = process.env.STATSIG_CLIENT_KEY;
  if (clientKey) {
    return res.json({ key: clientKey });
  } else {
    return res.json({
      error: "STATSIG_CLIENT_KEY not configured",
      note: "Please set STATSIG_CLIENT_KEY environment variable in Vercel project settings. The key should start with 'client-'"
    });
  }
}

