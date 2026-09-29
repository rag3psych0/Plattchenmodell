import { berechneQuadratischeErgaenzung } from '../../engine/rechnen.js';

/**
 * "Normalform zu Scheitelform" (Runde 21, Punkt 10, Nutzer-Vorgabe: "Erstelle
 * einen Reiter unter Funktionen: Parabeln. Darunter mache einen Reiter
 * 'Normalform zu Scheitelform'. Hier soll eine Parabel der Form x²+bx+c in
 * die Form (x-d)²+e gebracht werden durch quadratische Ergänzung.").
 *
 * Übung (kein reiner Erklär-Schritt-für-Schritt-Ablauf wie "Quadratische
 * Ergänzung" unter Erklärungen): eine zufällige Parabel x² + bx + c wird
 * vorgegeben, die Schülerin/der Schüler bestimmt SELBST die beiden Werte d
 * und e der Scheitelform (x − d)² + e und trägt sie in die vorgegebene
 * Formel-Schablone ein (dasselbe `.qe-form__symbol`-Muster wie beim
 * Startgleichung-Formular der Erklärung, siehe
 * modules/quadratische-ergaenzung/erklaerung.js).
 *
 * Rechnerisch reicht die bereits vorhandene `berechneQuadratischeErgaenzung`
 * (engine/rechnen.js) vollständig aus: x² + bx + c = (x + b/2)² + rest –
 * die dort verwendete Klammer "(x + b/2)" ist exakt dieselbe wie die hier
 * geforderte "(x − d)", nur mit umgekehrtem Vorzeichen der Konstante
 * (d = −b/2), "e" entspricht `rest` unverändert. Wie dort ist `b` auf gerade
 * Zahlen ungleich 0 beschränkt (sonst wäre b/2 kein ganzes Plättchen mehr,
 * bzw. bei b=0 gäbe es nichts zu ergänzen) – die Zufallsgenerierung hier
 * respektiert das von vornherein, sodass immer eine gültige Aufgabe entsteht.
 *
 * @param {HTMLElement} container
 */
export function mountNormalformZuScheitelform(container) {
  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `
    <p class="modul-intro">Bringe die Parabel x² + bx + c mittels quadratischer Ergänzung in die Scheitelform (x − d)² + e. Bestimme d und e, trage sie ein und überprüfe deine Antwort.</p>
    <button type="button" class="zufall-btn">Zufällige Parabel generieren</button>
    <p class="parabel-aufgabe">x² <span class="parabel-b"></span>x <span class="parabel-c"></span></p>
    <form class="scheitelform-form rechnung-form" novalidate>
      <span class="qe-form__symbol">(x −</span>
      <div class="feld"><label for="scheitelform-feld-d">d</label><input id="scheitelform-feld-d" type="number" name="d" step="1" required></div>
      <span class="qe-form__symbol">)² +</span>
      <div class="feld"><label for="scheitelform-feld-e">e</label><input id="scheitelform-feld-e" type="number" name="e" step="1" required></div>
      <button type="submit" class="ueberpruefen-btn">Überprüfen</button>
    </form>
    <p class="term-check-feedback" role="status" aria-live="polite"></p>
  `);

  const bEl = container.querySelector('.parabel-b');
  const cEl = container.querySelector('.parabel-c');
  const form = container.querySelector('.scheitelform-form');
  const dInput = container.querySelector('#scheitelform-feld-d');
  const eInput = container.querySelector('#scheitelform-feld-e');
  const feedbackEl = container.querySelector('.term-check-feedback');
  const zufallBtn = container.querySelector('.zufall-btn');

  let aktuellesB = 0;
  let aktuellesC = 0;

  function zufaelligeGanzzahl(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Gerade Zahl ungleich 0 (Bereich −10 bis 10) – Pflicht für `berechneQuadratischeErgaenzung`. */
  function zufaelligesB() {
    let b = 0;
    while (b === 0) b = 2 * zufaelligeGanzzahl(-5, 5);
    return b;
  }

  function formatiereKoeffizient(wert) {
    return `${wert >= 0 ? '+' : '−'} ${Math.abs(wert)}`;
  }

  function setzeFeedback(text, klasse) {
    feedbackEl.textContent = text;
    feedbackEl.classList.remove('term-check-feedback--richtig', 'term-check-feedback--falsch', 'term-check-feedback--fehler');
    if (klasse) feedbackEl.classList.add(klasse);
  }

  function neueAufgabe() {
    aktuellesB = zufaelligesB();
    aktuellesC = zufaelligeGanzzahl(-10, 10);
    bEl.textContent = formatiereKoeffizient(aktuellesB);
    cEl.textContent = formatiereKoeffizient(aktuellesC);
    dInput.value = '';
    eInput.value = '';
    setzeFeedback('', null);
  }

  zufallBtn.addEventListener('click', neueAufgabe);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (dInput.value.trim() === '' || eInput.value.trim() === '') {
      setzeFeedback('Bitte für d und e jeweils eine Zahl eintragen.', 'term-check-feedback--fehler');
      return;
    }
    const dWert = Number(dInput.value);
    const eWert = Number(eInput.value);
    if (!Number.isFinite(dWert) || !Number.isFinite(eWert)) {
      setzeFeedback('Bitte für d und e jeweils eine Zahl eintragen.', 'term-check-feedback--fehler');
      return;
    }

    const { rest } = berechneQuadratischeErgaenzung(aktuellesB, aktuellesC);
    const erwartetD = -(aktuellesB / 2);
    const erwartetE = rest;

    if (dWert === erwartetD && eWert === erwartetE) {
      setzeFeedback('Richtig!', 'term-check-feedback--richtig');
    } else {
      setzeFeedback('Noch nicht richtig – versuch es noch einmal.', 'term-check-feedback--falsch');
    }
  });

  neueAufgabe();
}
