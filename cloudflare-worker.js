/**
 * Sterling Park Bid Calculator — DVSA MOT History API proxy
 *
 * The DVSA MOT History API does not allow direct browser requests
 * (no CORS headers), so this tiny Cloudflare Worker sits in between:
 * the app calls this Worker, the Worker calls DVSA/Microsoft, and adds
 * the CORS headers the browser needs.
 *
 * Your DVSA client ID/secret/API key are sent from the app to this
 * Worker on every request and are never stored here — the Worker is
 * just a pass-through. See README.md for full deploy instructions.
 *
 * Routes:
 *   POST /token          body: { tenantId, clientId, clientSecret }
 *                         -> proxies to Microsoft Entra, returns the token JSON
 *   GET  /mot/{reg}       headers: Authorization: Bearer <token>, x-api-key: <key>
 *                         -> proxies to the DVSA MOT History API
 */

const ALLOWED_ORIGIN = "*"; // tighten to your app's origin once deployed, e.g. "https://yourname.netlify.app"

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}

async function handleToken(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid JSON body" }, 400);
  }
  const { tenantId, clientId, clientSecret } = body;
  if (!tenantId || !clientId || !clientSecret) {
    return json({ error: "tenantId, clientId and clientSecret are required" }, 400);
  }

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.set("grant_type", "client_credentials");
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  params.set("scope", "https://tapi.dvsa.gov.uk/.default");

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const text = await resp.text();
  if (!resp.ok) {
    return json({ error: "token request failed", status: resp.status, detail: text }, resp.status);
  }
  return new Response(text, { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders() } });
}

async function handleMot(request, reg) {
  const auth = request.headers.get("Authorization");
  const apiKey = request.headers.get("x-api-key");
  if (!auth) return json({ error: "missing Authorization header" }, 401);
  if (!apiKey) return json({ error: "missing x-api-key header" }, 401);

  const url = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${encodeURIComponent(reg)}`;
  const resp = await fetch(url, {
    headers: {
      "Authorization": auth,
      "x-api-key": apiKey,
      "Accept": "application/json"
    }
  });

  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/token" && request.method === "POST") {
      return handleToken(request);
    }

    const motMatch = url.pathname.match(/^\/mot\/([^/]+)$/);
    if (motMatch && request.method === "GET") {
      return handleMot(request, decodeURIComponent(motMatch[1]));
    }

    return json({ error: "not found" }, 404);
  }
};
