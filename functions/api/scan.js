// Läser skärmbilder och text med Claude och strömmar svaret tillbaka.
// Cloudflare Pages Function. Kräver miljövariabeln ANTHROPIC_API_KEY (Settings → Variables and Secrets).
// Valfritt: MODEL (standard claude-sonnet-5-5).

const MAX_IMAGES = 8;
const MAX_TEXT = 60000;
const MAX_IMAGE_B64 = 4_000_000; // per bild, efter krympning i webbläsaren

export async function onRequestPost({ request: req, env }) {
  // Bara anrop från den egna sidan
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return new Response("Forbidden", { status: 403 });

  const key = env.ANTHROPIC_API_KEY;
  if (!key) return new Response("ANTHROPIC_API_KEY saknas", { status: 500 });

  let body;
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }
  const text = typeof body.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
  const images = Array.isArray(body.images) ? body.images : [];
  if (!text && !images.length) return new Response("Inget att läsa", { status: 400 });
  if (images.length > MAX_IMAGES) return new Response("För många bilder", { status: 413 });
  const okTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  for (const im of images) {
    if (!im || !okTypes.includes(im.media_type) || typeof im.data !== "string" || im.data.length > MAX_IMAGE_B64)
      return new Response("Ogiltig bild", { status: 413 });
  }
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today || "") ? body.today : new Date().toISOString().slice(0, 10);

  const prompt=`Du läser ${text?'inklistrad text':'skärmbilder'} från svenska appar och webbsidor (Klarna, Kivra, Swedbank). Dagens datum är ${today}.
Hitta ALLA räkningar, fakturor och kommande betalningar som syns. Hitta också kontosaldo om en Swedbank-bild visar det.
Svara ENDAST med JSON i formen:
{"balance": number|null, "items":[{"name":"Butik eller avsändare","amount":123,"source":"Klarna|Kivra|Autogiro|E-faktura|Kort|Annat","kind":"once|monthly|split","date":"ÅÅÅÅ-MM-DD","day":28,"every":"30|month","left":3,"auto":true,"paid":false}]}
Regler:
- amount = beloppet som ska betalas NÄSTA gång, i kronor, utan ören-avrundning.
- Klarna "Betala om 30 dagar"/faktura: kind "once", date = förfallodag, auto false om inte kortdragning syns.
- Klarna "Dela upp i 3"/"Betala i 3 delar": kind "split", every "30", left = antal delbetalningar som är kvar inklusive nästa, auto true.
- Klarna delbetalning/finansiering per månad: kind "split", every "month", left = antal månader kvar om det syns, annars 12.
- Kivra-faktura: source "Kivra", kind "once", date = förfallodag, auto false.
- Autogiro eller kommande betalning i Swedbank som återkommer varje månad: kind "monthly", day = dag i månaden, source "Autogiro", auto true.
- Hoppa över sådant som redan är betalt. Om år saknas, välj närmaste framtida datum.
- Samma räkning på flera bilder ska bara finnas med en gång.`;

  const content = [
    ...images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } })),
    { type: "text", text: text ? prompt + "\n\nTEXT:\n" + text : prompt },
  ];

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: env.MODEL || "claude-sonnet-5-5",
      max_tokens: 4000,
      stream: true,
      messages: [{ role: "user", content }],
    }),
  });
  if (!upstream.ok) return new Response("AI-fel", { status: upstream.status === 429 ? 429 : 502 });

  // Strömma vidare direkt, så att inga tidsgränser slår till
  return new Response(upstream.body, { headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
}
