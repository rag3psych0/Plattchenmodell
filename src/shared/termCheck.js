import { parseTerm, parseGleichung, koeffizientenGleich, istVereinfachterTermText } from '../engine/termParser.js';

/**
 * Prüft eine Termeingabe gegen die tatsächlichen ("erwarteten") Koeffizienten
 * und schreibt eine Rückmeldung in `feedbackEl`. Verwendet von
 * "Plättchen zu Term" und "Term zu Plättchen" – beide vergleichen am Ende
 * dieselben Koeffizienten, nur in umgekehrter Eingabe-Reihenfolge.
 *
 * Seit Runde 21 (Punkt 6): `erfordertVereinfachteForm` (nur bei "Plättchen
 * zu Term" gesetzt, wo der eingetippte Text selbst die abzulesende Lösung
 * ist) verlangt zusätzlich zum reinen Wertevergleich, dass der Text bereits
 * VOLLSTÄNDIG vereinfacht ist (siehe `istVereinfachterTermText`) – "2x+3x"
 * wird dann trotz gleichen Werts noch nicht akzeptiert.
 *
 * @param {string} eingabeText
 * @param {{x2:number, x:number, zahl:number}} erwartet
 * @param {HTMLElement} feedbackEl
 * @param {{erfordertVereinfachteForm?: boolean}} [opts]
 * @returns {'richtig'|'falsch'|'unvereinfacht'|'fehler'}
 */
export function pruefeTermEingabe(eingabeText, erwartet, feedbackEl, opts = {}) {
  const { erfordertVereinfachteForm = false } = opts;
  feedbackEl.classList.remove(
    'term-check-feedback--richtig',
    'term-check-feedback--falsch',
    'term-check-feedback--fehler',
  );

  const geparst = parseTerm(eingabeText);
  if (!geparst) {
    feedbackEl.textContent = 'Konnte den Term nicht lesen. Beispiel: 2x² − x + 3 (auch als 2x^2 - x + 3 möglich).';
    feedbackEl.classList.add('term-check-feedback--fehler');
    return 'fehler';
  }

  if (!koeffizientenGleich(geparst, erwartet)) {
    feedbackEl.textContent = 'Noch nicht richtig – versuch es noch einmal.';
    feedbackEl.classList.add('term-check-feedback--falsch');
    return 'falsch';
  }

  if (erfordertVereinfachteForm && !istVereinfachterTermText(eingabeText)) {
    feedbackEl.textContent = 'Der Wert stimmt schon, aber fasse gleichartige Glieder noch zusammen – trage den vollständig vereinfachten Term ein.';
    feedbackEl.classList.add('term-check-feedback--falsch');
    return 'unvereinfacht';
  }

  feedbackEl.textContent = 'Richtig!';
  feedbackEl.classList.add('term-check-feedback--richtig');
  return 'richtig';
}

/**
 * Wie `pruefeTermEingabe`, aber für eine ganze Gleichung: vergleicht beide
 * Seiten getrennt. Verwendet von "Plättchen zu Gleichung" und "Gleichung zu
 * Plättchen".
 *
 * Seit Runde 21 (Punkt 6): `erfordertVereinfachteForm` prüft beide
 * Seiten-Texte einzeln mit `istVereinfachterTermText` (siehe
 * `pruefeTermEingabe`).
 *
 * @param {string} eingabeText
 * @param {{x2:number, x:number, zahl:number}} erwartetLinks
 * @param {{x2:number, x:number, zahl:number}} erwartetRechts
 * @param {HTMLElement} feedbackEl
 * @param {{erfordertVereinfachteForm?: boolean}} [opts]
 * @returns {'richtig'|'falsch'|'unvereinfacht'|'fehler'}
 */
export function pruefeGleichungEingabe(eingabeText, erwartetLinks, erwartetRechts, feedbackEl, opts = {}) {
  const { erfordertVereinfachteForm = false } = opts;
  feedbackEl.classList.remove(
    'term-check-feedback--richtig',
    'term-check-feedback--falsch',
    'term-check-feedback--fehler',
  );

  const geparst = parseGleichung(eingabeText);
  if (!geparst) {
    feedbackEl.textContent = 'Konnte die Gleichung nicht lesen. Beispiel: 2x² − x + 3 = −x + 5 (auch als 2x^2 - x + 3 = -x + 5 möglich).';
    feedbackEl.classList.add('term-check-feedback--fehler');
    return 'fehler';
  }

  const passt = koeffizientenGleich(geparst.links, erwartetLinks) && koeffizientenGleich(geparst.rechts, erwartetRechts);
  if (!passt) {
    feedbackEl.textContent = 'Noch nicht richtig – versuch es noch einmal.';
    feedbackEl.classList.add('term-check-feedback--falsch');
    return 'falsch';
  }

  if (erfordertVereinfachteForm) {
    const [textLinks, textRechts] = eingabeText.split('=');
    if (!istVereinfachterTermText(textLinks) || !istVereinfachterTermText(textRechts)) {
      feedbackEl.textContent = 'Der Wert stimmt schon, aber fasse auf beiden Seiten noch gleichartige Glieder zusammen – trage die vollständig vereinfachte Gleichung ein.';
      feedbackEl.classList.add('term-check-feedback--falsch');
      return 'unvereinfacht';
    }
  }

  feedbackEl.textContent = 'Richtig!';
  feedbackEl.classList.add('term-check-feedback--richtig');
  return 'richtig';
}
