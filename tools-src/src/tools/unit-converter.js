// Unit Converter: length, weight, area (with Indian land units), volume, temperature, speed, data, time, pressure and energy.
import { h, panel, seg, select, field, button } from '../ui.js';
import { numField, num, table } from '../lib/calc.js';

// Each unit: [id, name, how many base units one of it is]. Temperature is worked out separately.
const U = {
  length: ['Length', [['mm', 'Millimetre', 0.001], ['cm', 'Centimetre', 0.01], ['m', 'Metre', 1], ['km', 'Kilometre', 1000], ['in', 'Inch', 0.0254], ['ft', 'Foot', 0.3048], ['yd', 'Yard', 0.9144], ['mi', 'Mile', 1609.344], ['nmi', 'Nautical Mile', 1852]]],
  weight: ['Weight', [['mg', 'Milligram', 1e-6], ['g', 'Gram', 0.001], ['kg', 'Kilogram', 1], ['t', 'Tonne', 1000], ['q', 'Quintal', 100], ['oz', 'Ounce', 0.028349523125], ['lb', 'Pound', 0.45359237], ['st', 'Stone', 6.35029318], ['tola', 'Tola', 0.0116638038], ['ct', 'Carat', 0.0002]]],
  area: ['Area', [['m2', 'Square Metre', 1], ['km2', 'Square Kilometre', 1e6], ['ft2', 'Square Foot', 0.09290304], ['yd2', 'Square Yard (Gaj)', 0.83612736], ['in2', 'Square Inch', 0.00064516], ['ac', 'Acre', 4046.8564224], ['ha', 'Hectare', 10000], ['cent', 'Cent', 40.468564224], ['guntha', 'Guntha', 101.17141056], ['mi2', 'Square Mile', 2589988.110336]]],
  volume: ['Volume', [['ml', 'Millilitre', 0.001], ['l', 'Litre', 1], ['m3', 'Cubic Metre', 1000], ['tsp', 'Teaspoon', 0.005], ['tbsp', 'Tablespoon', 0.015], ['cup', 'Cup (US)', 0.2365882365], ['floz', 'Fluid Ounce (US)', 0.0295735295625], ['gal', 'Gallon (US)', 3.785411784], ['galuk', 'Gallon (UK)', 4.54609], ['ft3', 'Cubic Foot', 28.316846592]]],
  temp: ['Temperature', [['c', 'Celsius'], ['f', 'Fahrenheit'], ['k', 'Kelvin']]],
  speed: ['Speed', [['kmh', 'Kilometres an Hour', 1 / 3.6], ['ms', 'Metres a Second', 1], ['mph', 'Miles an Hour', 0.44704], ['kn', 'Knot', 1852 / 3600], ['fts', 'Feet a Second', 0.3048]]],
  data: ['Data', [['b', 'Byte', 1], ['kb', 'Kilobyte (1000)', 1e3], ['mb', 'Megabyte (1000²)', 1e6], ['gb', 'Gigabyte (1000³)', 1e9], ['tb', 'Terabyte (1000⁴)', 1e12], ['kib', 'Kibibyte (1024)', 1024], ['mib', 'Mebibyte (1024²)', 1048576], ['gib', 'Gibibyte (1024³)', 1073741824], ['bit', 'Bit', 0.125], ['mbit', 'Megabit', 125000]]],
  time: ['Time', [['s', 'Second', 1], ['min', 'Minute', 60], ['h', 'Hour', 3600], ['d', 'Day', 86400], ['wk', 'Week', 604800], ['mo', 'Month (average)', 2629746], ['yr', 'Year (365.25 days)', 31557600]]],
  pressure: ['Pressure', [['pa', 'Pascal', 1], ['kpa', 'Kilopascal', 1000], ['bar', 'Bar', 1e5], ['psi', 'Pound per Square Inch (psi)', 6894.757293168], ['atm', 'Atmosphere', 101325], ['mmhg', 'Millimetre of Mercury', 133.322387415]]],
  energy: ['Energy', [['j', 'Joule', 1], ['kj', 'Kilojoule', 1000], ['cal', 'Calorie', 4.184], ['kcal', 'Kilocalorie', 4184], ['wh', 'Watt Hour', 3600], ['kwh', 'Kilowatt Hour (Unit)', 3.6e6]]],
};
const toK = { c: (v) => v + 273.15, f: (v) => (v - 32) * 5 / 9 + 273.15, k: (v) => v }, fromK = { c: (v) => v - 273.15, f: (v) => (v - 273.15) * 9 / 5 + 32, k: (v) => v };
export function convert(kind, v, a, b) {
  if (kind === 'temp') return fromK[b](toK[a](v));
  const L = U[kind][1], fa = L.find((u) => u[0] === a)[2], fb = L.find((u) => u[0] === b)[2]; return v * fa / fb;
}
const nice = (x) => !isFinite(x) ? '—' : Math.abs(x) >= 1e15 || (x !== 0 && Math.abs(x) < 1e-6) ? x.toPrecision(6) : num(x, Math.abs(x) >= 100 ? 4 : 8);

export default function (root) {
  const DEF = { length: ['m', 'ft'], weight: ['kg', 'lb'], area: ['ft2', 'm2'], volume: ['l', 'gal'], temp: ['c', 'f'], speed: ['kmh', 'mph'], data: ['gb', 'mib'], time: ['h', 'min'], pressure: ['bar', 'psi'], energy: ['kwh', 'kj'] };
  const val = numField('Value', 1, { onInput: () => draw() }), fromS = select([], ''), toS = select([], ''), out = h('div', { 'aria-live': 'polite' }), all = h('div');
  fromS.addEventListener('change', () => draw()); toS.addEventListener('change', () => draw());
  const kind = seg('', Object.entries(U).map(([k, [n]]) => [k, n]), 'length', () => fill());
  function fill() {
    const L = U[kind.value][1], [a, b] = DEF[kind.value];
    for (const [s, v] of [[fromS, a], [toS, b]]) s.replaceChildren(...L.map(([id, n]) => h('option', { value: id, text: n, selected: id === v })));
    draw();
  }
  function draw() {
    const v = val.value, k = kind.value, name = (id) => U[k][1].find((u) => u[0] === id)[1];
    if (!isFinite(v)) { out.replaceChildren(h('p', { class: 'note', text: 'Type a number.' })); all.replaceChildren(); return; }
    out.replaceChildren(h('div', { class: 'big-out', text: nice(convert(k, v, fromS.value, toS.value)) + ' ' + name(toS.value) }), h('p', { class: 'hint', text: nice(v) + ' ' + name(fromS.value) + ' is' }));
    all.replaceChildren(table(['Unit', 'Value'], U[k][1].map(([id, n]) => [n, nice(convert(k, v, fromS.value, id))])));
  }
  const swap = button('Swap', { icon: 'convert', onClick: () => { const a = fromS.value; fromS.value = toS.value; toS.value = a; draw(); } });
  root.append(h('div', { class: 'field' }, kind.el), h('div', { class: 'cols pl' },
    panel(h('h2', { text: 'Result' }), out, h('h2', { text: 'In Every Unit' }), all),
    panel(h('h2', { text: 'Convert' }), val.el, field('From', fromS), h('div', { class: 'row' }, swap), field('To', toS),
      h('p', { class: 'hint', text: 'Cent and Guntha are the usual South and West Indian land units. Bigha and Kanal differ from state to state, so they are not listed.' }))));
  fill();
}
