/* applies the saved theme and custom colors before the page paints */
try{var D=document.documentElement;if(localStorage.getItem("info3-theme")==="light")D.dataset.theme="light";
var C=JSON.parse(localStorage.getItem("info3")||"null");C=C&&C.page&&C.page.colors;
if(C){var M={bg:"--bg",box:"--box",panel:"--panel"},R=function(sel,x){var r="";for(var k in M)if(x&&/^#[0-9a-f]{6}$/i.test(x[k]||""))r+=M[k]+":"+x[k]+";";return r?sel+"{"+r+"}":""},
T=R(":root",C.dark)+R(':root[data-theme="light"]',C.light);if(T){var E=document.createElement("style");E.id="userColors";E.textContent=T;document.head.appendChild(E)}}}catch(e){}
