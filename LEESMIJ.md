# Snelcel Isolatietechniek — website

Een statische site van achttien pagina's. De inhoud staat apart van de opmaak, en met
één commando wordt daar de complete site uit gegenereerd.

## Bouwen

```
python3 bouw.py
```

Het resultaat komt in `site/`. Die map is wat je publiceert. Je hoeft er verder niets
mee te doen: geen build tools, geen npm, geen framework. Alleen Python 3.

## Hoe het in elkaar zit

```
inhoud/          wat er op de site staat
  bedrijf.json     telefoonnummer, KvK, domein, HubSpot-id's, Tag Manager
  paginas.json     per pagina de bestandsnaam, de titel en de omschrijving
  reviews.json     de reviews, komen op vier pagina's terug
  paginas/         de inhoud van elke pagina als HTML
sjablonen/       wat op elke pagina hetzelfde is
  kop.html         de navigatie met bovenbalk en megamenu's
  voet.html        de footer
  zoeklaag.html    het zoekvenster
  cookiebalk.html  de cookiebanner
  consent.js       standaardtoestemming, moet boven Tag Manager staan
  gtm.js           de Tag Manager-code
bron/            wat ongewijzigd wordt gekopieerd
  stijl.css
  script.js
  afbeeldingen/
bouw.py          het bouwscript
site/            het resultaat, niet met de hand bewerken
```

**Bewerk nooit iets in `site/`.** Dat wordt bij elke bouw overschreven. Alles wat je
wilt wijzigen zit in `inhoud/`, `sjablonen/` of `bron/`.

## Veelvoorkomende wijzigingen

**Telefoonnummer, KvK, btw, domein en dergelijke.** Zet ze in `inhoud/bedrijf.json` en
bouw opnieuw. Ze staan als `{{telefoon}}`, `{{kvk}}` en zo verder in de bestanden en
worden overal tegelijk vervangen. Het telefoonnummer alleen al staat op negen plekken.

**Een review toevoegen of vervangen.** Voeg een regel toe aan `inhoud/reviews.json` en
bouw opnieuw. Hij verschijnt dan op de homepagina, beide dienstpagina's en de
garantiepagina.

**Tekst op een pagina.** Open het bestand in `inhoud/paginas/`, bijvoorbeeld
`dakisolatie.html`, en pas de tekst aan. Dat is gewone HTML zonder kop en voet.

**Titel of omschrijving van een pagina.** Die staan in `inhoud/paginas.json`. Ze komen
in de `<title>`, de meta description en de Open Graph-gegevens terecht.

**Een pagina toevoegen.** Maak een HTML-bestand in `inhoud/paginas/`, zet een regel in
`paginas.json`, en voeg hem toe aan het menu in `sjablonen/kop.html`. Het bouwscript
regelt de rest, inclusief de sitemap en de zoekindex.

**Menu of footer.** Die staan in `sjablonen/kop.html` en `sjablonen/voet.html`. Eén keer
aanpassen geldt voor alle pagina's.

## Wat het bouwscript zelf regelt

- De `{{tekens}}` vervangen door de waarden uit `bedrijf.json`
- De reviews op de plek van `<!--LIJST:reviews-->` zetten
- Per pagina een canonical-adres en Open Graph-gegevens
- Het huidige menu-item aanwijzen met `aria-current`
- `zoekindex.json` opbouwen uit alle koppen, nu 299 stuks
- `sitemap.xml` en `robots.txt` met het domein uit `bedrijf.json`
- De 404-pagina
- `stijl.css`, `script.js` en de afbeeldingen kopiëren

## Nog in te vullen

In `inhoud/bedrijf.json` staan deze velden nu op een plaatshouder of leeg:

- `telefoon` en `telefoon_link`
- `kvk`
- `btw`
- `iban`
- `certificaatnummer` en `certificaatdatum` van het keurmerk natuurvriendelijk isoleren

Verder staan de privacyverklaring en de algemene voorwaarden nog als lege link in de
footer, en ontbreken de sociale profielen van Tamara en Mickey op Over ons.

## Publiceren

De map `site/` is een gewone statische site. Die kan op Cloudflare Pages, Netlify,
GitHub Pages of elke webhosting.

Bij Cloudflare Pages of Netlify koppel je de repository en zet je:

- Build command: `python3 bouw.py`
- Output directory: `site`

Dan is elke push naar de hoofdtak binnen een minuut live, met een voorbeeldversie per
wijziging. Zet daarbij `snelcel.nl` als primair domein en laat `www.snelcel.nl`
doorsturen, anders bestaat de site op twee adressen.

## Twee dingen om te weten

**Het script staat in één bestand, maar elk onderdeel is afgeschermd.** Er zitten twaalf
blokken in `bron/script.js`, elk in een eigen `try`. Gaat er ergens iets mis, dan zie je
in de console welk onderdeel het is en blijft de rest werken. Haal die afscherming niet
weg: zonder dat legt één fout alles stil wat erna komt.

**De formulieren werken alleen op een domein.** Open je een pagina rechtstreeks vanaf je
schijf, dan blokkeert de browser de verbinding met HubSpot. Het formulier zegt dat dan
ook. Op `snelcel.test` of op de live site werkt het gewoon.
