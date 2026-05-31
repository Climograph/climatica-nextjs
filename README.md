<div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
  <img src="./src/assets/climatica-logo.svg" alt="Climatica Logo" width="50" style="flex-shrink: 0;" />
  <h1 style="margin: 0; padding: 0; line-height: 1.2;">Climatica – Global Climate Explorer</h1>
</div>

**Climatica** is an interactive web application for exploring, analyzing, and comparing climate data worldwide.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Developer Setup](#developer-setup)
- [License](#license)

---

## Features

- **City Climate** — search any city and see temperature/precipitation charts, key stats, and an interactive map
- **Compare Cities** — compare two cities side-by-side with overlaid charts
- **Compare Periods** — compare climate across different 30-year baselines for the same city
- **Regional Heatmap** — draw a region on the map and analyze its climate distribution
- **Flexible Controls** — switch datasets (climate/weather), variables, grid resolution, and month filters
- **Multilingual** — English, Spanish, Ukrainian
- **Export** — save charts as PNG or download data as CSV

---

## Quick Start

### Requirements

- [Node.js LTS](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Python 3](https://www.python.org/downloads/) (for one-time data preparation)

### Steps

**1. Clone and install:**

```bash
git clone <repository-url>
cd climatica-nextjs
npm install
```

**2. Create `.env` file** in the root folder:

```env
WORLDCLIM_API_KEY=your-worldclim-api-key
REDIS_URL=redis://localhost:6379
SOLR_URL=http://localhost:8983
```

**3. Download GeoNames city data** (one time only):

- [allCountries.zip](https://download.geonames.org/export/dump/allCountries.zip) (~400MB)
- [alternateNamesV2.zip](https://download.geonames.org/export/dump/alternateNamesV2.zip) (~200MB)

Extract both files into `docker/solr/data/`

**4. Generate cities CSV:**

```bash
python3 --version  # should be 3.8+
python3 docker/solr/scripts/prepare_data.py
```

**5. Start Docker services:**

```bash
npm run docker:up
```

Wait ~30 seconds for Solr to start, then:

**6. Import city data into Solr:**

```bash
npm run solr:reindex
```

This takes approximately 3 minutes since indexing should go through pretty large file.

**7. Start the app:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Useful commands

```bash
npm run docker:up       # Start Docker services
npm run docker:down     # Stop Docker services
npm run docker:reboot   # Reset and restart Docker services
npm run solr:reindex    # Re-import city data into Solr
npm run docker:logs     # View Docker logs
```

---

### Tests

```bash
npm run test              # run unit tests
npm run test:coverage     # unit tests with coverage report
npm run test:e2e          # E2E tests (requires Docker running + dev server)
npm run test:e2e:ui       # E2E tests with Playwright UI
```

Unit tests cover: Redis client, caching strategies, cities route,
WorldClim route, SolrService, WorldClimService, URL utils, city descriptions.

E2E tests cover: city search, climate data loading, i18n switching,
navigation, 404 page.

---

## Developer Setup

### Tech Stack

| Technology        | Purpose                           |
| ----------------- | --------------------------------- |
| Next.js 16        | Full-stack framework (App Router) |
| React 19          | UI framework                      |
| TypeScript        | Type safety                       |
| TanStack Query v4 | Data fetching & caching           |
| Zustand v5        | Client state                      |
| Tailwind CSS v4   | Styling                           |
| Leaflet           | Interactive maps                  |
| Recharts          | Charts                            |
| next-intl         | Multilingual support              |
| Solr 8            | City search database              |
| Redis 7           | Server-side caching               |
| ioredis           | Redis client                      |

### Project Structure

```
climatica-next-app/
├── docker/
│   ├── solr/
│   │   ├── data/           # GeoNames data files (gitignored)
│   │   ├── scripts/        # prepare_data.py
│   │   ├── schema.json     # Solr schema
│   │   └── solrconfig.xml  # Solr configuration
│   └── docker-compose.yml
├── src/
│   ├── app/
│   │   ├── api/            # Next.js Route Handlers (server proxy)
│   │   │   ├── cities/     # City search → Redis → Solr
│   │   │   └── worldclim/  # WorldClim API proxy
│   │   ├── climate-statistics/
│   │   ├── compare-cities/
│   │   ├── compare-periods/
│   │   └── heat-map/
│   ├── components/         # Shared UI components
│   ├── hooks/              # Custom React hooks
│   ├── libs/
│   │   ├── api/            # Axios client
│   │   ├── redis/          # Redis client + caching strategies
│   │   └── services/       # Solr, Wikidata, WorldClim services
│   ├── constants/
│   ├── types/
│   └── utils/
```

### Data Flow

```
Component → Hook → fetch /api/* → Route Handler → Redis → Solr/WorldClim
```

- Hooks never call services directly — always via `/api/` routes
- Redis caches city search results (7 days) and climate data (30 days)
- Popular queries get extended TTL automatically
- WorldClim API key stays server-side only

### Code Standards

- Types: `T` prefix — `TClimatePeriod`
- Enums: `E` prefix — `EDataset`
- Constants: `*.constant.ts`
- Types: `*.type.ts`
- Utils: `*.util.ts`

```bash
npm run check   # type-check + lint + format
```

### External APIs

**WorldClim** — `https://scrapi.gsic.uva.es/apis/worldclim`

- Auth: Bearer token (`WORLDCLIM_API_KEY`)
- Global climate & weather grids (1951–2024)

**Wikidata** — `https://www.wikidata.org/w/api.php`

- Used only for reverse geocoding (coordinate → nearest city)

**GeoNames** — one-time data import into local Solr

- Source: [geonames.org](https://www.geonames.org/)

---

## License

Licensed under the terms in the [LICENSE](LICENSE) file.

**Author**: Andrii Kononenko [wastxrq] — wastardy.k@gmail.com
