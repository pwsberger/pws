# PWS Sportmarketing Experiment

Een complete Next.js MVP voor een mobielvriendelijk A/B-experiment over sportmarketing en koopgedrag. Deelnemers zien willekeurig variant A of B, beantwoorden daarna een korte vragenlijst en alle voortgang, antwoorden en events worden opgeslagen in Supabase.

## Stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui-stijl componenten
- Supabase database
- Vercel-ready

## Installatie

1. Installeer dependencies:

```bash
npm install
```

2. Maak een Supabase project aan en voer `supabase/schema.sql` uit in de SQL editor.

3. Kopieer `.env.example` naar `.env.local` en vul de waarden in:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
ADMIN_PASSWORD="een-sterk-wachtwoord"
ADMIN_COOKIE_SECRET="een-lange-random-string"
```

4. Start lokaal:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Deploy op Vercel

1. Push deze map naar GitHub.
2. Importeer het project in Vercel.
3. Voeg dezelfde environment variables toe in Vercel.
4. Deploy.

## Datamodel

De database bevat:

- `participants`: demografie, toegewezen variant, device-info, completion-status en totale sessieduur.
- `responses`: per vraag het antwoord, tijd tot antwoord en aantal wijzigingen.
- `events`: page-enter/page-left, advertentie-events, antwoordwijzigingen en afronding.

RLS staat aan. Deelnemers kunnen via de publieke key niet rechtstreeks data lezen. De app schrijft via server actions met de Supabase service role key, die alleen server-side gebruikt wordt.

## Admin

Ga naar `/admin` en log in met `ADMIN_PASSWORD`.

Het dashboard toont:

- totaal aantal deelnemers
- afgeronde enquetes
- deelnemers per variant
- completion rate
- gemiddelde invultijd
- CSV-export

## Onderzoeksflow

1. Welkomscherm
2. Demografische vragen
3. Willekeurige 50/50 toewijzing aan variant A of B
4. Fullscreen advertentie, minimaal 5 seconden zichtbaar
5. Zeven surveyvragen, een vraag per scherm
6. Bedankscherm zonder resultaten

## Betrouwbaarheid

- De toegewezen variant wordt direct opgeslagen bij de participant.
- Antwoorden worden per vraag ge-upsert.
- Voortgang wordt lokaal bewaard, zodat refreshen niet direct de sessie verliest.
- Afronding gebruikt een server-side check tegen dubbele inzendingen.
- Events loggen timing, navigatie, advertentieweergave en antwoordwijzigingen.
