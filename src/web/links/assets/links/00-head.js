/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
// @ts-check
(() => {
const API = 'api.php';
const MAX_TABS = 20, COLS = 4;
const DEFAULT_COLORS = { dark: { bg: '#1a1a1a', accent: '#d9a85b' }, light: { bg: '#f4f4f5', accent: '#a5701c' } };
// ribbon and the 4 column colors follow the accent until they're set on their own
// [key, label, min, max, default] in px
/** @type {[string, string, number, number, number][]} */
const SIZE_KEYS = [['tab', 'Tabs', 14, 32, 20], ['cat', 'Categories', 11, 22, 14], ['link', 'Links', 12, 22, 15]];
function sizesFor(s) {
  const out = {}, old = parseInt(s && s.fontSize, 10); // "fontSize" came from version 5/6
  const legacy = old >= 12 && old <= 20 ? { tab: Math.round(old * 1.35), cat: Math.round(old * .93), link: old } : null;
  for (const [k, , min, max, def] of SIZE_KEYS) {
    const v = parseInt(s && s.sizes && s.sizes[k], 10), lg = /** @type {any} */ (legacy);
    out[k] = v >= min && v <= max ? v : legacy ? Math.min(max, Math.max(min, lg[k])) : def;
  }
  return out;
}
const COLOR_KEYS = [['bg', 'Background'], ['accent', 'Accent (Buttons)'], ['ribbon', 'Tab Ribbon'],
  ['c0', 'Column 1'], ['c1', 'Column 2'], ['c2', 'Column 3'], ['c3', 'Column 4']];
const S = { data: { tabs: [], settings: {} }, auth: false, setup: false, locked: false, rev: '', editing: false, q: '', tab: null };
/** @type {(s: string) => any} */   // (any: the page knows which element each id is)
const $ = s => document.querySelector(s);
const root = document.documentElement;

