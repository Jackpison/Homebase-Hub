/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var V=null,T=Symbol("Fragment");function ke(t,i,n){if(i==="ref"){typeof n=="function"?n(t):n&&(n.current=t);return}if(!(i==="children"||n==null||n===!1)){if(i==="className"){t.setAttribute("class",n);return}if(i==="style"){for(let e in n){let c=n[e];c==null||c===!1||(e.startsWith("--")?t.style.setProperty(e,String(c)):t.style[e]=typeof c=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(e)?c+"px":c)}return}if(/^on[A-Z]/.test(i)&&typeof n=="function"){t.addEventListener(i.slice(2).toLowerCase(),n);return}if(i==="htmlFor"){t.setAttribute("for",n);return}t.setAttribute(i,n===!0?"":String(n))}}function ve(t,i){for(let n of i)n==null||n===!1||n===!0||(Array.isArray(n)?ve(t,n):n instanceof Node?t.appendChild(n):t.appendChild(document.createTextNode(String(n))))}function O(t,i,...n){if(typeof t=="function")return t({...i,children:n});let e=t===T?document.createDocumentFragment():document.createElement(t);if(t!==T)for(let c in i||{})ke(e,c,i[c]);return ve(e,n),e}var Pe=(t,i)=>t&&i&&t.length===i.length&&t.every((n,e)=>Object.is(n,i[e]));function _(t){let i=V,n=i.i++;return i.hooks[n]||(i.hooks[n]={current:t})}function U(t,i){let n=V,e=n.i++;n.effects.push([e,t,i])}function Te(t,i,n){let e={hooks:[],effects:[],i:0,cleanups:[],props:i,dead:!1,queued:!1,tree:null},c=()=>{let s=e.effects;e.effects=[];for(let[p,q,N]of s){let S=e.cleanups[p];if(S&&N&&Pe(S.deps,N))continue;if(S&&S.fn)try{S.fn()}catch{}let R;try{R=q()}catch{R=null}e.cleanups[p]={deps:N,fn:typeof R=="function"?R:null}}},b=s=>{V=e,e.i=0,e.effects=[];let p;try{p=t(e.props)}finally{V=null}s&&(e.tree=p,p instanceof Node&&n.appendChild(p)),c()};e.queue=()=>{e.queued||e.dead||(e.queued=!0,Promise.resolve().then(()=>{e.queued=!1,e.dead||b(!1)}))},b(!0);let g=e.tree instanceof Node?e.tree:n,M=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],W=s=>{if(e.dead||s.__hubFwd||s.target instanceof Element&&s.target.closest("input,textarea,select"))return;let p;try{p=new s.constructor(s.type,s)}catch{return}p.__hubFwd=!0,g.dispatchEvent(p)},I=M.filter(()=>matchMedia("(pointer: fine)").matches);return I.forEach(s=>window.addEventListener(s,W,{passive:!0})),{update(s){e.props={...e.props,...s},b(!1)},destroy(){e.dead=!0,I.forEach(s=>window.removeEventListener(s,W));for(let s of e.cleanups)if(s&&s.fn)try{s.fn()}catch{}e.cleanups=[],e.tree instanceof Node&&e.tree.parentNode&&e.tree.parentNode.removeChild(e.tree)},root:g}}function ge(t,i){(window.HubDesigns=window.HubDesigns||{})[t]={start:(n,e)=>Te(i,e||{},n)}}var J=8,Oe=1.8,xe={up:[0,1],down:[0,-1],left:[-1,0],right:[1,0]},_e=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ne=`
float hash(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float smin(float a, float b, float k) {
  float r = exp2(-a / k) + exp2(-b / k);
  return -k * log2(r);
}

float sinlerp(float a, float b, float w) {
  return mix(a, b, (sin(w * 3.14159265 - 3.14159265 / 2.0) + 1.0) / 2.0);
}

float vn(vec2 p, float s, float seed) {
  vec2 cellp = floor(p / s);
  vec2 relp = mod(p, s);
  float g1 = hash(vec3(cellp, seed));
  float g2 = hash(vec3(cellp.x + 1.0, cellp.y, seed));
  float g3 = hash(vec3(cellp.x + 1.0, cellp.y + 1.0, seed));
  float g4 = hash(vec3(cellp.x, cellp.y + 1.0, seed));
  float bx = sinlerp(g1, g2, relp.x / s);
  float tx = sinlerp(g4, g3, relp.x / s);
  return sinlerp(bx, tx, relp.y / s);
}

float dbn(vec2 p, float s, float seed) {
  float o = s / 2.0;
  float n0 = vn(p, s, seed);
  float n1 = vn(p + vec2(o, o), s, seed + 0.1);
  float n2 = vn(p + vec2(-o, o), s, seed + 0.2);
  float n3 = vn(p + vec2(o, -o), s, seed + 0.3);
  float n4 = vn(p + vec2(-o, -o), s, seed + 0.4);
  return (2.0 * n0 + 1.5 * n1 + 1.25 * n2 + 1.125 * n3 + n4) / 7.0;
}
`,De=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uFlow;
uniform float uSpeed;
uniform float uScale;
uniform float uTurbulence;
uniform float uFluidity;
uniform float uRimWidth;
uniform float uSharpness;
uniform float uShimmer;
uniform float uGlow;
uniform float uLine;
uniform float uMaxHalf;
uniform vec3 uColors[${J}];
uniform int uColorCount;
uniform vec4 uMagnet;
uniform vec4 uSwirl;
uniform float uReveal;
uniform float uLight;
uniform float uOpaque;
uniform vec3 uBackground;
uniform float uOpacity;
out vec4 outColor;
${Ne}

vec3 palette(float h) {
  float x = clamp(h, 0.0, 1.0) * float(uColorCount - 1);
  int i = int(floor(x));
  int j = min(i + 1, uColorCount - 1);
  return mix(uColors[i], uColors[j], smoothstep(0.0, 1.0, x - float(i)));
}

void main() {
  float ref = 700.0 / max(uScale, 0.05);
  vec2 frag = gl_FragCoord.xy;
  vec2 toMagnet = (frag - uMagnet.xy) / uResolution.y;
  float pull = uMagnet.z * exp(-dot(toMagnet, toMagnet) / (uMagnet.w * uMagnet.w));
  if (pull > 0.001) {
    float angle = pull * 0.55;
    float c = cos(angle);
    float s = sin(angle);
    frag = uMagnet.xy + mat2(c, s, -s, c) * (frag - uMagnet.xy);
  }
  if (uSwirl.w > 0.0) {
    vec2 d = frag - uSwirl.xy;
    float reach = uSwirl.z;
    float angle = uSwirl.w * exp(-dot(d, d) / (reach * reach));
    float c = cos(angle);
    float s = sin(angle);
    frag = uSwirl.xy + mat2(c, s, -s, c) * d;
  }
  vec2 p = frag / uResolution.y * ref;

  float spd = 200.0 * uSpeed;
  float t = uTime;
  vec2 dir = uFlow;
  vec2 perp = vec2(-dir.y, dir.x);
  float distort1 = vn(p + perp * (t * spd), 60.0, 10.0) * 50.0 * uTurbulence;
  float distort2 = vn(p - perp * (t * spd), 120.0, 15.0) * 100.0 * uTurbulence;
  float peaks = dbn(p + distort1 + dir * (t * spd * 0.5), 40.0, 1.0);
  float peaks2 = dbn(p + distort2 - dir * (t * spd * 0.5), 40.0, 0.0);
  float field = smin(peaks, peaks2, max(uFluidity, 0.001));

  float slope = length(vec2(dFdx(field), dFdy(field)));
  float gap = abs(field - 0.4);
  float pixels = gap / max(slope, 1e-6);
  float halfBand = max(uRimWidth, 0.001) * 0.5;
  float across = max(gap / halfBand, pixels / uMaxHalf);
  float band = 5.0 * uRimWidth * (1.0 - across);
  float reveal = smoothstep(0.2, 0.85, pull);
  float shimmer = vn(p + dir * (t * spd * 0.5), 60.0, 12.0) * uShimmer * (1.0 - reveal * 0.75);
  float lit = clamp(band - shimmer, 0.0, 1.0);
  float glow = pow(lit, uSharpness) * uGlow * (1.0 + reveal * 0.25);
  float core = uLine > 0.0 ? smoothstep(uLine + 0.75, uLine - 0.75, pixels) * max(smoothstep(0.08, 0.6, glow), reveal) : 0.0;
  float shine = clamp(glow, 0.0, 1.0);
  float energy = max(shine * shine, core * 0.85) * uReveal;

  float h = clamp(0.5 + (peaks - peaks2) * 0.8, 0.0, 1.0);
  vec3 tint = palette(h);

  if (uLight > 0.5) {
    float chroma = max(tint.r, max(tint.g, tint.b)) - min(tint.r, min(tint.g, tint.b));
    vec3 ink = mix(vec3(0.07, 0.07, 0.08), tint * 0.55, clamp(chroma * 1.6, 0.0, 1.0));
    float cover = energy * uOpacity;
    outColor = uOpaque > 0.5 ? vec4(mix(uBackground, ink, cover), 1.0) : vec4(ink * cover, cover);
    return;
  }

  vec3 light = tint * energy * uOpacity;
  outColor = uOpaque > 0.5 ? vec4(uBackground + light, 1.0) : vec4(light, max(light.r, max(light.g, light.b)));
}`,we=(t,i,n)=>Math.min(n,Math.max(i,t)),ye=(t,i,n)=>{let e=t.createShader(i);return e?(t.shaderSource(e,n),t.compileShader(e),t.getShaderParameter(e,t.COMPILE_STATUS)?e:(t.deleteShader(e),null)):null},We=t=>{let i=ye(t,t.VERTEX_SHADER,_e),n=ye(t,t.FRAGMENT_SHADER,De),e=t.createProgram();if(!i||!n||!e)return null;if(t.attachShader(e,i),t.attachShader(e,n),t.bindAttribLocation(e,0,"aPosition"),t.linkProgram(e),t.deleteShader(i),t.deleteShader(n),!t.getProgramParameter(e,t.LINK_STATUS))return t.deleteProgram(e),null;let c={},b=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let g=0;g<b;g++){let M=t.getActiveUniform(e,g);M&&(c[M.name.replace("[0]","")]=t.getUniformLocation(e,M.name))}return{program:e,uniforms:c}},Ie=({colors:t=["#ffffff","#ffffff","#ffffff"],speed:i=.5,scale:n=1.6,turbulence:e=1,fluidity:c=.1,rimWidth:b=.2,sharpness:g=2.5,shimmer:M=1.5,glow:W=2,lineWidth:I=1,flowDirection:s="down",opacity:p=1,mouseInteraction:q=!0,mouseStrength:N=1,mouseRadius:S=.35,mouseDampening:R=.15,clickSwirl:G=!0,intro:Me=!0,lightMode:Se=!1,transparent:Ee=!0,backgroundColor:Re,paused:Ae=!1,dpr:Le,mixBlendMode:Q,className:ee="",style:te,...Fe})=>{let ne=_(null),oe=_(null),$=_(null),re={colors:Array.isArray(t)&&t.length?t.slice(0,J):["#ffffff"],speed:i,scale:Math.max(.05,n),turbulence:e,fluidity:Math.max(.001,c),rimWidth:Math.max(.001,b),sharpness:Math.max(.1,g),shimmer:Math.max(0,M),glow:Math.max(0,W),lineWidth:Math.max(0,I),flow:xe[s]??xe.down,opacity:we(p,0,1),mouseInteraction:q,mouseStrength:Math.max(0,N),mouseRadius:Math.max(.01,S),mouseDampening:Math.max(0,R),clickSwirl:G,intro:Me,lightMode:Se,transparent:Ee,backgroundColor:Re,paused:Ae,dpr:Le},x=_(re);return x.current=re,U(()=>{let E=ne.current,h=oe.current,o=h?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!E||!h||!o)return;let B=We(o);if(!B)return;let u=B.uniforms,ie=o.createBuffer(),j=o.createVertexArray();o.bindVertexArray(j),o.bindBuffer(o.ARRAY_BUFFER,ie),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),o.STATIC_DRAW),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0);let A=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),X=new Map,ae=(r,a)=>{if(!r)return a;let f=String(r);if(X.has(f))return X.get(f);let l=a;if(A){A.clearRect(0,0,1,1),A.fillStyle="#000000",A.fillStyle=f,A.fillRect(0,0,1,1);let[v,P,y]=A.getImageData(0,0,1,1).data;l=[v/255,P/255,y/255]}return X.set(f,l),l},se=new Float32Array(J*3),D=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,d={x:0,y:0,inside:!1},m={x:0,y:0,active:0},w={x:0,y:0,age:10},ue=0,L=x.current.intro&&!D?0:1,F=0,C=0,z=!0,Y=()=>{let r=x.current,a=h.width/Math.max(1,E.clientWidth);r.colors.forEach((P,y)=>se.set(ae(P,[1,1,1]),y*3));let f=Math.min(1,L);o.viewport(0,0,h.width,h.height),o.useProgram(B.program),o.bindVertexArray(j),o.uniform2f(u.uResolution,h.width,h.height),o.uniform1f(u.uTime,ue),o.uniform2f(u.uFlow,r.flow[0],r.flow[1]),o.uniform1f(u.uSpeed,r.speed),o.uniform1f(u.uScale,r.scale),o.uniform1f(u.uTurbulence,r.turbulence),o.uniform1f(u.uFluidity,r.fluidity),o.uniform1f(u.uRimWidth,r.rimWidth),o.uniform1f(u.uSharpness,r.sharpness),o.uniform1f(u.uShimmer,r.shimmer),o.uniform1f(u.uGlow,r.glow),o.uniform1f(u.uLine,r.lineWidth*a*.5),o.uniform1f(u.uMaxHalf,28*a),o.uniform3fv(u.uColors,se),o.uniform1i(u.uColorCount,r.colors.length),o.uniform4f(u.uMagnet,m.x,m.y,m.active*r.mouseStrength,r.mouseRadius);let l=w.age,v=1.9*Math.min(1,l/.23)*Math.exp(-Math.max(0,l-.23)*1.1);o.uniform4f(u.uSwirl,w.x,w.y,h.height*.22*(1+l*.5),l<6?v:0),o.uniform1f(u.uReveal,f*f*(3-2*f)),o.uniform1f(u.uLight,r.lightMode?1:0),o.uniform1f(u.uOpaque,r.transparent?0:1),o.uniform3fv(u.uBackground,ae(r.backgroundColor,r.lightMode?[1,1,1]:[.0706,.0588,.0902])),o.uniform1f(u.uOpacity,r.opacity),o.drawArrays(o.TRIANGLES,0,3)},fe=r=>{if(F=0,!z||document.hidden)return;let a=x.current,f=C?we((r-C)/1e3,5e-4,.05):1/60;C=r;let l=a.paused||D?0:1;ue+=f*l,w.age+=f,a.intro&&!D&&L<1?L=Math.min(1,L+f/Oe):(!a.intro||D)&&(L=1);let v=a.mouseInteraction&&d.inside,P=a.mouseDampening>0?1-Math.exp(-f/a.mouseDampening):1;v&&(m.x+=(d.x-m.x)*P,m.y+=(d.y-m.y)*P);let y=v?1:0;m.active+=(y-m.active)*(1-Math.exp(-f/.3)),Math.abs(y-m.active)<.001&&(m.active=y),Y(),l>0||m.active!==y||L<1||w.age<6?F=requestAnimationFrame(fe):C=0},k=()=>{!F&&z&&!document.hidden&&(F=requestAnimationFrame(fe))},K=()=>{let r=x.current,a=Math.max(1,E.clientWidth),f=Math.max(1,E.clientHeight),l=Math.min(r.dpr||window.devicePixelRatio||1,2);h.width=Math.max(1,Math.round(a*l)),h.height=Math.max(1,Math.round(f*l)),Y(),k()},Ce=r=>{let a=E.getBoundingClientRect(),f=r.clientX-a.left,l=r.clientY-a.top,v=h.width/Math.max(1,a.width);d.inside=f>=0&&l>=0&&f<=a.width&&l<=a.height,d.x=f*v,d.y=(a.height-l)*v},Z=r=>{let a=d.inside;Ce(r),d.inside&&!a&&m.active<.05&&(m.x=d.x,m.y=d.y),k()},le=r=>{Z(r),!(!d.inside||!x.current.clickSwirl||D)&&(w.x=d.x,w.y=d.y,w.age=0,k())},H=r=>{r.pointerType!=="mouse"&&(d.inside=!1)},ce=()=>{d.inside=!1},de=()=>{C=0,k()},me=new ResizeObserver(K);me.observe(E);let pe=new IntersectionObserver(r=>{z=r.some(a=>a.isIntersecting),z&&(C=0,k())});pe.observe(E),window.addEventListener("pointermove",Z,{passive:!0}),window.addEventListener("pointerdown",le,{passive:!0}),window.addEventListener("pointerup",H,{passive:!0}),window.addEventListener("pointercancel",H,{passive:!0}),document.documentElement.addEventListener("pointerleave",ce),document.addEventListener("visibilitychange",de),K();let he=x.current.dpr;return $.current=()=>{let r=x.current;if(r.dpr!==he){he=r.dpr,K();return}F||Y(),k()},()=>{cancelAnimationFrame(F),$.current=null,me.disconnect(),pe.disconnect(),window.removeEventListener("pointermove",Z),window.removeEventListener("pointerdown",le),window.removeEventListener("pointerup",H),window.removeEventListener("pointercancel",H),document.documentElement.removeEventListener("pointerleave",ce),document.removeEventListener("visibilitychange",de),o.deleteProgram(B.program),o.deleteBuffer(ie),o.deleteVertexArray(j),o.getExtension("WEBGL_lose_context")?.loseContext()}},[]),U(()=>{$.current?.()}),O("div",{ref:ne,className:`flux-lines-container${ee?` ${ee}`:""}`,style:Q?{...te,mixBlendMode:Q}:te,...Fe},O("canvas",{ref:oe,className:"flux-lines-canvas","aria-hidden":"true"}))},be=Ie;ge("flux-lines",be);})();
