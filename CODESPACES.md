# DocPilot via GitHub Codespaces (zonder lokale installatie)

DocPilot is al in deze GitHub-repository geïnstalleerd. GitHub Pages serveert alleen de **statische demo**; de Node.js-server voor GitHub API en AI kan **tijdelijk in GitHub Codespaces** worden uitgevoerd zonder een lokale installatie of aparte hostingprovider.

## Eén keer instellen

1. Maak in GitHub twee **Codespaces secrets** aan onder https://github.com/settings/codespaces en geef de repository `koenvanwijk/docpilot` toegang:
   - `GITHUB_TOKEN`: een fine-grained GitHub PAT met **Contents: read/write** op uitsluitend de repository(s) die je wilt bewerken.
   - `AI_API_KEY`: je sleutel voor een OpenAI-compatible Chat Completions-provider.
2. Optioneel: stel ook `AI_MODEL` en `AI_BASE_URL` als Codespaces secrets in (bijvoorbeeld `AI_MODEL=gpt-4.1-mini`). Standaard wordt de OpenAI API gebruikt.
3. Ga naar https://github.com/koenvanwijk/docpilot → **Code → Codespaces → Create codespace on main**.
4. Bij het starten voert Codespaces de tests uit en start de DocPilot-server automatisch op poort **8787**.
5. Open de doorgestuurde poort **8787** vanuit het **Ports**-paneel (standaard **private**). GitHub vraagt eventueel om in te loggen.
6. DocPilot gebruikt een afzonderlijk app-wachtwoord. Vraag het op in de Codespaces-terminal met:
   ```bash
   cat ~/.local/state/docpilot/app-password
   ```
   Klik rechtsboven op **Toegang**, vul het wachtwoord in en klik op **Zoek bestanden**.

**Het app-wachtwoord en alle API-sleutels mogen nooit in de repository, GitHub Pages, `public/config.js` of in een issue terechtkomen.** Codespaces secrets blijven server-side. Heb je al een `.env`, dan kun je deze lokaal in de Codespace aanmaken; `.gitignore` sluit het bestand uit.

## Markdown bewerken

Vul de GitHub-owner, repository en branch in. Klik **Zoek bestanden** of vul het relatieve Markdown-pad (bijvoorbeeld `README.md`) in. Selecteer in de gerenderde Markdown een alinea, geef de agent een opdracht, inspecteer de diff en commit alle wijzigingen samen.

## Belangrijke grenzen

- Een Codespace is **geen permanente hosting**: hij kan stoppen bij inactiviteit en verbruikt Codespaces-budget.
- De GitHub Pages-site blijft een **statische demo** totdat een permanent bereikbare HTTPS-backend is ingericht.
- De doorgestuurde Codespaces-poort blijft **private** en is alleen bedoeld voor gebruik via je GitHub-login. Zet hem niet op public.
- Een lokaal DeepSeek-endpoint op je DGX is niet zomaar vanaf Codespaces bereikbaar. Gebruik daarvoor een beveiligde tunnel/ingang of een andere toegankelijke AI-provider.
- Het standaard app-wachtwoord staat uitsluitend in het home-directory van de Codespace en kan met `cat ~/.local/state/docpilot/app-password` worden opgevraagd. Als je bewust de Codespaces secret `APP_PASSWORD` instelt, gebruik je dat wachtwoord in plaats daarvan.
- Voor het langdurig hosten van DocPilot achter GitHub Pages heb je een aparte HTTPS-host nodig, bijvoorbeeld een server achter Cloudflare Access.
