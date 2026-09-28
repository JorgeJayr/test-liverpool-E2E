# test-liverpool-E2E

[![E2E Tests](https://github.com/JorgeJayr/test-liverpool-E2E/actions/workflows/test.yml/badge.svg)](https://github.com/JorgeJayr/test-liverpool-E2E/actions/workflows/test.yml)

Automatización E2E del flujo de búsqueda de Liverpool (liverpool.com.mx) con
Playwright y TypeScript: buscar "playstation 5", filtrar por color Blanco,
ordenar por precio de menor a mayor, extraer los primeros 5 resultados e
interceptar la respuesta de red para validación cruzada UI vs. API.

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
npm test                # headless por defecto, en Chromium, Firefox y WebKit
npm run test:headed     # con el navegador visible (para debugging local)
npm run report          # abre el reporte HTML de la última corrida
npm run typecheck       # revisión de tipos de TypeScript
```

Para correr un solo navegador:

```bash
npx playwright test --project=chromium
```

### Parámetros opcionales

El término de búsqueda y el color se pueden cambiar con variables de entorno.

> **Nota:** el término de búsqueda debe tener el filtro de color configurado en
> `COLOR_FILTER` disponible en sus resultados. Si no lo tiene, el test falla con
> un mensaje explícito. El valor por defecto (`playstation 5` + `Blanco`) siempre
> funciona.

```bash
# Git Bash / macOS / Linux
SEARCH_TERM="xbox series x" COLOR_FILTER="Blanco" npm test

# PowerShell
$env:SEARCH_TERM="xbox series x"; $env:COLOR_FILTER="Blanco"; npm test
```

## Estructura

```
api/                  interceptación y parser de la respuesta de /api/plp/search
config/               constantes parametrizables (término, color, cantidad, umbrales)
pages/                Page Objects (BasePage, SearchPage, ResultsPage)
utils/                utilidades reutilizables (parsePrice)
tests/
  e2e/                spec principal del flujo Liverpool
  unit/               pruebas unitarias offline del comparador y parser
.github/workflows/    pipeline de CI (test.yml)
```

## Lo que hace el test

1. Navega a liverpool.com.mx y cierra el banner de cookies si aparece.
2. Busca el término configurado en `SEARCH_TERM`.
3. Filtra los resultados por el color configurado en `COLOR_FILTER`.
4. Ordena por precio de menor a mayor e intercepta la respuesta de `/api/plp/search`.
5. Extrae nombre, precio y ID de los primeros 5 productos de la UI.
6. Valida que los precios estén en orden ascendente.
7. Parsea los productos de la respuesta interceptada y cruza los datos con la UI.
8. Verifica que al menos 3 de 5 productos de la UI aparezcan en la respuesta.
9. Registra discrepancias de nombre, precio u orden como anotaciones en el reporte
   y las adjunta como `comparison.json` y `discrepancies.json`.

## CI

El workflow `.github/workflows/test.yml` corre en cada push y pull request a
`main`. Instala dependencias con `npm ci`, verifica tipos con `tsc --noEmit`,
instala los navegadores de Playwright, corre las pruebas en headless y sube el
reporte HTML como artifact (`playwright-report`).