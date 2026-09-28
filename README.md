# test-liverpool-E2E

[![E2E Tests](https://github.com/JorgeJayr/test-liverpool-E2E/actions/workflows/test.yml/badge.svg)](https://github.com/JorgeJayr/test-liverpool-E2E/actions/workflows/test.yml)

Automatización E2E del flujo de búsqueda de Liverpool (liverpool.com.mx) con Playwright y TypeScript: buscar, filtrar por color, ordenar por precio y extraer los primeros resultados.

<!-- TODO: ampliar esta descripción al terminar la Parte 2 (validación UI vs API) -->

## Requisitos

- Node.js 20 o superior
- npm

## Instalación

```bash
npm ci
npx playwright install --with-deps
```

## Ejecución

```bash
npm test                # headless (modo por defecto), en chromium, firefox y webkit
npm run test:headed     # con el navegador visible
npm run report          # abre el reporte HTML de la última corrida
npm run typecheck       # revisión de tipos de TypeScript
```

Para correr un solo navegador:

```bash
npx playwright test --project=chromium
```

### Parámetros opcionales

El término de búsqueda y el color se pueden cambiar con variables de entorno (por defecto: `playstation 5` y `Blanco`).
> Nota: el término de búsqueda debe tener un filtro de color "Blanco" (o el valor de `COLOR_FILTER`) en sus resultados. Si no lo tiene, el test falla con un mensaje explícito.

```bash
# Git Bash / macOS / Linux
SEARCH_TERM="xbox series x" npm test

# PowerShell
$env:SEARCH_TERM="xbox series x"; npm test
```

## Estructura

```
config/               constantes (término de búsqueda, color, cantidad de resultados)
pages/                Page Objects (BasePage, SearchPage, ResultsPage)
tests/e2e/            specs
.github/workflows/    pipeline de CI (test.yml)
```

<!-- TODO: agregar la carpeta api/ (interceptación de red) cuando exista -->

## CI

El workflow `.github/workflows/test.yml` se ejecuta en cada push y pull request a `main`: instala dependencias, revisa tipos, corre las pruebas en headless y sube el reporte HTML como artifact (`playwright-report`).