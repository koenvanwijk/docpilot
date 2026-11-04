# DocPilot — GitHub Markdown Agent Editor

Een **webgebaseerde, in-context Markdown-editor** die bestanden rechtstreeks uit GitHub leest, tekst in de **gerenderde Markdown** laat selecteren, geselecteerde blokken met een AI-model laat herschrijven, verschillen toont en **meerdere wijzigingen in één commit** naar GitHub schrijft.

Dit is een werkend **MVP voor persoonlijk / team-intern gebruik**, geen publieke SaaS. Frontend en server gebruiken uitsluitend Node.js 20+ en browser-JavaScript; **geen `npm install` nodig**. Voor de Markdown-rendering worden wel twee externe browserbibliotheken van jsDelivr geladen (Marked en DOMPurify).

## In 3 minuten starten

1. Installeer Node.js 20 of nieuwer.
2. Kopieer `.env.example` naar `.env`.
3. Vul `GITHUB_TOKEN` in: een *fine-grained personal access token* voor de gewenste repository met **Contents: Read and write**. Voor alleen-lezen voldoet Contents: Read. Beperk de token tot je gewenste repository.
4. Vul `AI_API_KEY` en eventueel `AI_MODEL` in voor een OpenAI-compatibel Chat Completions-model.
5. Start de server in de projectmap:

   ```bash
   node server.mjs
   ```

6. Open `http://127.0.0.1:8787` in de browser. Klik **Demo openen** om de interface zonder GitHub-verbinding te bekijken. AI-wijzigingen hebben altijd een aangesloten model nodig.

**Voorbeeldinstellingen:** de interface is vooraf ingevuld met de repository `koenvanwijk/european-physical-ai-operations-reference-architecture`, branch `main`. Pas dit gerust aan. De werkelijke branch wordt niet automatisch gedetecteerd.


## GitHub Pages: statische frontend

Deze distributie bevat `.github/workflows/pages.yml` voor automatische deployment van `public/` op GitHub Pages zodra je de code in een repository hebt gezet. **Pages host alleen de frontend**: `server.mjs` met GitHub-token en AI-credentials moet apart op een HTTPS-backend draaien. Zonder backend kun je via **Demo openen** de UI bekijken, maar niet live GitHub lezen, herschrijven of committen.

1. Maak in GitHub een nieuwe repository, bijvoorbeeld `koenvanwijk/docpilot`. GitHub Pages en het aanmaken van repositories kunnen niet via de huidige ChatGPT GitHub-connector worden geconfigureerd.
2. Upload de inhoud van deze projectmap naar de `main` branch. Publiceer nooit `.env` of GitHub/AI tokens. De workflow is al meegeleverd.
3. Open **Settings → Pages** in de repository. Kies **Build and deployment → Source → GitHub Actions**.
4. Push naar `main` of start de workflow handmatig; het dashboard bij **Actions** laat de deployment zien. De demo is dan normaliter te openen via `https://koenvanwijk.github.io/docpilot/` (alleen nadat GitHub de deployment heeft bevestigd).
5. Voor een werkende editor: host `server.mjs` op een aparte HTTPS-host, configureer `APP_PASSWORD` en `CORS_ALLOWED_ORIGIN=https://koenvanwijk.github.io`. Zet in `public/config.js` uitsluitend de publieke HTTPS-URL van de backend, bijvoorbeeld `window.DOCPILOT_API_BASE_URL = 'https://api.example.com';`. Commit en push; GitHub Pages wordt automatisch vernieuwd. **Zet nooit een token of wachtwoord in `config.js`.**

**Beveiliging:** gebruik een eigen private backend achter TLS en sterke toegangscontrole (bijvoorbeeld Cloudflare Access). `APP_PASSWORD` is alleen een eenvoudige MVP-barrière en geen volwaardige multi-user-authenticatie. Een lokaal HTTP-endpoint op een DGX Spark is wegens HTTPS/mixed-content en bereikbaarheid niet direct vanuit GitHub Pages aanroepbaar. Voor uitsluitend privégebruik is de oorspronkelijke local-only deployment veiliger.

## Workflow

1. Kies GitHub-gebruiker/organisatie, repository en branch. Klik **Zoek bestanden** om `.md`- en `.mdx`-bestanden te tonen, of vul een pad in.
2. Open het document. Selecteer in de gerenderde Markdown een zin, meerdere regels, een alinea of een codeblok. Je kunt ook op een blok klikken voor selectie van dat gehele blok.
3. Geef een vrije instructie, bijvoorbeeld *"Leg dit uit met een concreet ISA-95 voorbeeld"*, of gebruik **Haal dit weg**, **Verkort**, **Verdiep**, **Leg uit**, **Andere voorbeelden** of **Vervang door**.
4. De AI genereert een **replacement voor alleen de betrokken Markdown-blokken**. Het resultaat wordt **alleen in het browserconcept** toegepast. Gebruik **Undo/Redo** indien nodig. Je kunt ook naar **Broncode** schakelen om handmatig aanpassingen te maken.
5. Bekijk **Wijzigingen** voor de regelgebaseerde diff, voer nieuwe AI-opdrachten uit en commit wanneer je klaar bent. Eén GitHub-commit bevat de actuele conceptversie van **dit ene bestand**.

Concepten worden voor hetzelfde bestand automatisch bewaard in de **localStorage van deze browser** (zonder wachtwoorden of tokens). Bij opnieuw openen wordt het concept alleen hersteld wanneer de GitHub-bestands-SHA nog gelijk is.

## Lokaal DeepSeek-endpoint (bijvoorbeeld op DGX Spark)

De backend ondersteunt een **OpenAI-compatible** endpoint, zoals dat van vLLM of LM Studio. Bijvoorbeeld:

```dotenv
AI_BASE_URL=http://192.168.1.50:8000/v1
AI_API_KEY=local
AI_MODEL=deepseek-your-served-model-name
AI_JSON_MODE=0
```

Gebruik de daadwerkelijke endpoint-URL en modelnaam van je server. `AI_JSON_MODE=0` laat de server zelf JSON uit de modeltekst parsen, wanneer het endpoint `response_format: {"type":"json_object"}` niet implementeert. Een instructiemodel dat JSON betrouwbaar produceert is belangrijk. Test de output voordat je commit.

**Let op:** een op je netwerk gehost model wordt niet vanzelf vanuit ChatGPT of deze app bereikbaar. Deze Node-server moet netwerktoegang hebben tot het opgegeven endpoint.

## GitHub- en editveiligheid

- De browser krijgt **nooit** de GitHub- of AI-token te zien: alleen de Node-backend leest `.env`.
- Voor iedere commit haalt de backend de actuele **GitHub content SHA** opnieuw op. Als het bestand inmiddels door iemand anders is aangepast, volgt **HTTP 409** en wordt niets teruggeschreven. GitHub controleert bovendien zelf de meegestuurde SHA bij het schrijven.
- GitHub-inhoud wordt als onbetrouwbare data behandeld in de AI-prompt. De browser rendert Markdown met **DOMPurify** en activeert geen HTML-scripts uit bestanden.
- De agent mag uitsluitend het aangewezen bronblok vervangen, niet de gehele Markdown-file. Je kunt de uitkomst inspecteren in de diff en met Undo herstellen.
- De server luistert standaard alleen op `127.0.0.1`. Voor toegang vanaf andere computers (`HOST=0.0.0.0`) wordt **APP_PASSWORD verplicht**. Dit is nog **geen complete multi-user-authenticatie**: zet een netwerkdeployment achter TLS + een vertrouwde reverse proxy, SSO, VPN of Cloudflare Access. Gebruik geen onbeveiligde publieke poort.
- Bij een GitHub-branch met branch protection kan een direct commit worden afgewezen. Gebruik dan een aparte werkbranch; de MVP maakt **nog geen pull request**.

## Techniek

- **Frontend:** HTML/CSS/JavaScript, Marked (GFM), DOMPurify.
- **Selectie:** de Markdown-parser bewaart `raw`-tokens. Ieder gerenderd hoofdblok krijgt een broncode-offset (`data-source-start`, `data-source-end`). De browser vertaalt een tekstselectie naar die offsets en stuurt de gemarkeerde tekst plus volledige brontekst van de betrokken blokken mee.
- **AI:** server-side Chat Completions API met omringende tekst, documentkoppen en instructie; verwacht `{"replacement":"...","summary":"..."}`. De server past deze vervanging strikt op de gekozen offsets toe.
- **GitHub:** REST `GET contents`, `GET git/trees` (voor bestanden), `PUT contents` (voor commit). De commit gebruikt de oorspronkelijke content SHA als concurrency check.
- **Diff:** lokale line-level LCS, met een versimpelde variant voor lange documenten.
- **Tests:** `node --test`.

## Grenzen van de MVP

- Een selectie wordt naar **hele Markdown-hoofdblokken** gemapt. Binnen een tabel of lijst ontvangt de agent doorgaans het gehele blok, met de letterlijk geselecteerde passage als aanwijzing. Dat is bewust betrouwbaarder dan een onvolledige Markdown-slice. In een volgende versie kunnen op AST-niveau fijnere subblokken gekozen worden.
- Eén bestand per commit. Geen batch-commit over meerdere bestanden, geen GitHub OAuth of GitHub App, geen eigen PR-flow en geen gebruikersaccounts.
- GFM Markdown wordt ondersteund; **MDX-componenten, Mermaid-diagrammen, GitHub-only alerts en relatieve afbeeldingen uit privé-repositories** worden niet volledig gerepliceerd in de preview.
- Marked en DOMPurify komen van een externe CDN; zorg dat je browser toegang heeft tot `cdn.jsdelivr.net`, of vendor die scripts lokaal in een volgende stap.
- De API gaat uit van GitHub-bestanden kleiner dan circa 850 kB en een doelselectie van maximaal 25.000 Markdown-tekens.
- Voor AI-edit is een betrouwbare, server-side geconfigureerde provider vereist; **sleutels mogen nooit rechtstreeks in de browser worden gezet**.

## Testen

```bash
node --test
node --check server.mjs
node --check public/app.js
```

## Mogelijke volgende uitbreidingen

- GitHub App OAuth (per gebruiker en repository) + concepten server-side opgeslagen.
- Side-by-side comment threads met wijzigingsvoorstellen, accept/reject per patch.
- Workbranch + pull request, CI-checks en protected-branch compatibiliteit.
- Precieze selectie van list items, tabelcellen en inline tekst via Markdown AST source maps.
- GitHub-achtige preview inclusief Mermaid, admonitions en lokale assets.