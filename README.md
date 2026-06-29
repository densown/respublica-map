# World Atlas by Res.Publica

Interactive WebGL globe for Reddit that visualizes global indicators with choropleth mapping. Built as a Devvit Web app for [r/Res_Publica_DE](https://www.reddit.com/r/Res_Publica_DE/).

## Features

- **Interactive Globe** — MapLibre GL with globe projection, hover tooltips, click-to-inspect
- **11 Indicators** — GDP, life expectancy, CO2 emissions, military spending, inflation, unemployment, government debt, fertility rate, democracy index, corruption index, internet access
- **Country Console** — detailed country view with rankings, red area charts showing time series, region averages
- **Compare Mode** — select two countries, radar chart + side-by-side comparison table
- **Year Navigation** — browse data from 2000 to 2023 with slider and console arrows
- **Search** — find any country by name or ISO code
- **Dark/Light Mode** — follows system preference
- **Mobile-first** — bottom sheet console on mobile, sidebar on desktop

## Data Sources

- [World Bank Open Data](https://data.worldbank.org/) — economic, health, education, infrastructure indicators
- [V-Dem v14](https://www.v-dem.net/) — democracy and corruption indices (curated anchor points with interpolation)
- [SIPRI](https://www.sipri.org/) — military expenditure (World Bank series)

## Tech Stack

- **Devvit Web** (v0.13.5) — Reddit Developer Platform
- **React 19** + **TypeScript 6**
- **MapLibre GL** — WebGL map rendering with globe projection
- **Vite 8** — build tooling
- **Hono** — server-side routing

## Development

Requires Node.js >= 22 and a [Devvit](https://developers.reddit.com/) account.

```bash
npm install
devvit playtest r/YOUR_TEST_SUB
```

### Updating indicator data

```bash
node scripts/fetch-real-data.cjs
git add public/data/indicators.json
git commit -m "data: update indicators"
```

## Commands

- `npm run dev` — start playtest with live reload
- `npm run build` — build client and server
- `npm run deploy` — type-check, lint, upload to Reddit
- `npm run launch` — deploy + publish for review
- `npm run type-check` — TypeScript check
- `npm run lint` — ESLint

## License

BSD-3-Clause
