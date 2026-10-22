/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* applies the saved theme and custom colors before the page paints */
try{var D=document.documentElement;if(localStorage.getItem("info3-theme")==="light")D.dataset.theme="light";
var C=JSON.parse(localStorage.getItem("info3")||"null");C=C&&C.page&&C.page.colors;
if(C){var M={bg:"--bg",box:"--box",panel:"--panel"},R=function(sel,x){var r="";for(var k in M)if(x&&/^#[0-9a-f]{6}$/i.test(x[k]||""))r+=M[k]+":"+x[k]+";";return r?sel+"{"+r+"}":""},
T=R(":root",C.dark)+R(':root[data-theme="light"]',C.light);if(T){var E=document.createElement("style");E.id="userColors";E.textContent=T;document.head.appendChild(E)}}}catch(e){}
