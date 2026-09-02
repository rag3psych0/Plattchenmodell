// Manueller Smoke-Test mit Playwright + dem vorinstallierten Chromium.
// Läuft NICHT als Teil von `node --test` (braucht einen Browser) – dient
// nur der einmaligen visuellen Verifikation während der Entwicklung.
// Playwright ist in dieser Entwicklungsumgebung nur global installiert
// (kein npm-Registry-Zugriff für ein lokales node_modules, siehe Ablaufplan).
// Direkter Pfad nur für diesen Smoke-Test relevant – nicht Teil des
// Produkts, das an Schulen läuft.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';

const url = process.argv[2] ?? 'http://localhost:8842/index.html';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

await page.goto(url, { waitUntil: 'networkidle' });

// Warten, bis die erste Beispielrechnung (3 + (-5)) fertig animiert ist.
await page.waitForSelector('.schritte-log__ergebnis', { timeout: 8000 });

const ergebnisText = await page.textContent('.schritte-log__ergebnis');
const tileCount = await page.locator('.plaettchen-board .plaettchen').count();
const emptyBoardText = await page.locator('.plaettchen-board__empty').count();

console.log('Ergebnis-Zeile:', ergebnisText);
console.log('Anzahl sichtbarer Plättchen am Ende:', tileCount);
console.log('Leeres-Board-Hinweis vorhanden:', emptyBoardText > 0);
console.log('Konsolenfehler:', consoleErrors.length ? consoleErrors : 'keine');

await page.screenshot({ path: 'scripts/screenshot-addition-subtraktion.png', fullPage: true });

// Zweiter Test: Subtraktion mit Nullpaar-Ergänzung (2 - 5)
await page.fill('input[name="a"]', '2');
await page.selectOption('select[name="op"]', '-');
await page.fill('input[name="b"]', '5');
await page.uncheck('input[name="animate"]');
await page.click('button[type="submit"]');
await page.waitForTimeout(300);
const ergebnis2 = await page.textContent('.schritte-log__ergebnis');
console.log('Ergebnis-Zeile (2 - 5):', ergebnis2);
await page.screenshot({ path: 'scripts/screenshot-subtraktion.png', fullPage: true });

await browser.close();

const ok =
  ergebnisText?.includes('-2') &&
  consoleErrors.length === 0 &&
  ergebnis2?.includes('-3');

if (!ok) {
  console.error('SMOKE TEST FEHLGESCHLAGEN');
  process.exit(1);
}
console.log('SMOKE TEST OK');
