# Test Strategy — Liverpool E2E

## 1. ¿Qué NO automatizaría en este flujo, y por qué?

**Flujos transaccionales reales (carrito, checkout, pago).** Un test que complete
una compra en producción puede generar pedidos falsos, cobros reales o afectar
inventario. Este tipo de prueba requiere un ambiente de staging con datos
controlados que Liverpool no expone públicamente.

**Verificación visual subjetiva.** Que las imágenes de producto sean correctas o
que el layout "se vea bien" requiere criterio humano o regresión visual con
baseline aprobado manualmente. Un `expect` de texto no puede validarlo con certeza.

**El modo headed como parte del pipeline.** Es una herramienta de debugging local,
no de CI. Es lenta, consume recursos y no corre en servidores sin pantalla sin
configuración adicional.

**Consistencia de filtros de color para cualquier término de búsqueda.** El color
"Blanco" no existe para todos los productos del catálogo. Automatizar una aserción
que dependa de un filtro específico sería frágil porque el catálogo de Liverpool
cambia continuamente.

---

## 2. Si Liverpool agregara un CAPTCHA, ¿cómo lo manejaría?

No se intenta evadir ni simular comportamiento humano. Las herramientas de bypass
crean una dependencia frágil: el proveedor actualiza su detección, el bypass se
rompe, y el equipo queda en un ciclo de mantenimiento indefinido que además viola
los términos de servicio del sitio.

La solución correcta es coordinar con los equipos internos de desarrollo y
ciberseguridad para obtener alguna de estas alternativas:

- **Ambiente de staging sin CAPTCHA**, donde las pruebas E2E corran sin afectar
  producción.
- **Allowlist de IPs** para los runners de CI, excluidas del sistema de gestión
  de bots.
- **Token de bypass en headers** (`X-Testing-Bypass: <token>`) emitido por el
  equipo de seguridad y configurado en `extraHTTPHeaders` del `playwright.config.ts`.

Si ninguna opción está disponible a corto plazo: documentar la limitación, hacer
que el test **falle explícitamente** al detectar el CAPTCHA (nunca usar
`test.skip()` silencioso), y mover esa cobertura a pruebas de API directas que
no pasen por él.

---

## 3. Riesgos de flakiness y cómo se mitigaron

| Riesgo | Causa | Mitigación |
|---|---|---|
| Bloqueo del WAF (Akamai) en headless | El Chromium empaquetado de Playwright es detectado como automatización y recibe HTTP 403 | Se configuró el navegador con flags estándar de Chromium que eliminan las señales de automatización sin modificar su comportamiento funcional |
| Widget Bambuser bloqueando clicks | El widget de live shopping añade `bambuser-booting` al `<html>` durante su inicialización, interceptando todos los eventos de puntero | `waitForResults()` espera explícitamente a que esa clase desaparezca antes de cualquier interacción |
| Condición de carrera DOM vs. red | Después de filtrar u ordenar, la lista se actualiza de forma asíncrona; leer antes de que llegue la respuesta devuelve datos viejos | Se usa `Promise.all` con `page.waitForResponse` iniciado antes del click, esperando la respuesta real de `/api/plp/search` |
| Testid inestable del buscador | El `data-testid` del input es generado por el CMS y puede cambiar entre despliegues; además existe un duplicado oculto para móvil | Se usa el placeholder visible como selector (`input[placeholder*="Buscar por producto"]:visible`) |
| Layout responsive ambiguo | El viewport de 1280px cae justo en el breakpoint de Tailwind, alternando entre layout compacto y de escritorio de forma impredecible | Se fija el viewport a 1920×1080 dentro de cada proyecto, después del spread de `devices` |
| Timeout de WebKit en paralelo local | WebKit es el más lento de los tres navegadores; en paralelo con Chromium y Firefox en una máquina local puede agotar el timeout de navegación | `retries: 1` en local y `retries: 2` en CI; Playwright marca los tests que necesitan reintento como "flaky" en el reporte, manteniéndolos visibles |

---

## 4. Cambios para integrarlo a un pipeline con 50+ suites

**Headless obligatorio.** Las trazas, videos y screenshots automáticos en fallo
ya configurados en este proyecto son suficientes para diagnosticar cualquier error.

**Reducir el alcance a un smoke test genérico.** El test actual depende de que el
término de búsqueda tenga disponible el filtro de color "Blanco". En un pipeline
compartido, un cambio de catálogo puede romper el test sin que nadie haya tocado
código. El smoke test se centraría en: buscar un término, verificar que hay
resultados, ordenar por precio y verificar que el orden es correcto, sin filtros
de color que dependan del catálogo.

**Un solo navegador en CI para la suite de smoke.** Con 50+ suites en paralelo,
triplicar el tiempo ejecutando en tres navegadores no está justificado. Se corre
en Chromium y se reservan Firefox y WebKit para ejecuciones nocturnas o bajo
demanda.

**Jobs separados: unitarias vs. E2E.** Las pruebas unitarias de `cross-validation`
no necesitan navegador y corren en segundos. En un job separado fallan rápido y
bloquean el pipeline antes de gastar minutos en el E2E si hay un error de lógica.

**`concurrency` con `cancel-in-progress: true`.** Ya configurado. En un pipeline
compartido evita que dos pushes seguidos acumulen runs que consumen recursos de
todo el equipo.

**Timeout de job reducido a 10-15 minutos.** Con un smoke test bien acotado, el
`timeout-minutes: 30` actual es excesivo y en un pipeline compartido un test
colgado bloquea recursos para las otras suites.