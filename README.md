# Marginal

Ekonomiapp (PWA) som låser pengar till räkningar, autogiro och Klarna och visar vad som är fritt till lön.

## Driftsätt på Cloudflare Pages (gratis)

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → välj `marginal`.
2. Build command: tomt. Build output directory: `/`. Spara och deploya.
3. Settings → Variables and Secrets → lägg till `ANTHROPIC_API_KEY` (typ Secret). Deploya om.

AI-funktionen ligger i `functions/api/scan.js`.

## Driftsätt på Netlify

1. Dra hela mappen till Netlify (eller pusha till GitHub och koppla repot).
2. Site settings → Environment variables → lägg till `ANTHROPIC_API_KEY` med din nyckel från console.anthropic.com.
3. Valfritt: `MODEL` om du vill byta modell (standard `claude-sonnet-5-5`).
4. Deploya om. Klart.

## Filer

- `index.html` – hela appen (vanilla JS).
- `netlify/edge-functions/scan.js` – läser skärmbilder och text med Claude. Nyckeln stannar på servern. Svaret strömmas, så funktionen slår inte i Netlifys tidsgräns.
- `manifest.webmanifest`, `sw.js`, `icon-*.png` – gör appen installerbar och offline-tålig.

## Data

Varje användares data sparas i den egna webbläsaren (localStorage). Inget sparas på servern. Bilder skickas till Claude bara när användaren trycker Läs av.

## Innan andra börjar använda den

- Lägg till skydd mot missbruk av `/api/scan` (inloggning eller begränsning per användare), annars kan vem som helst använda din API-nyckel via sidan.
- Skriv en integritetspolicy: appen hanterar ekonomiska uppgifter och bilder skickas till en AI-tjänst.
