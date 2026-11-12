/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var Z=null,O=Symbol("Fragment");function ut(o,a,n){if(a==="ref"){typeof n=="function"?n(o):n&&(n.current=o);return}if(!(a==="children"||n==null||n===!1)){if(a==="className"){o.setAttribute("class",n);return}if(a==="style"){for(let r in n){let s=n[r];s==null||s===!1||(r.startsWith("--")?o.style.setProperty(r,String(s)):o.style[r]=typeof s=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(r)?s+"px":s)}return}if(/^on[A-Z]/.test(a)&&typeof n=="function"){o.addEventListener(a.slice(2).toLowerCase(),n);return}if(a==="htmlFor"){o.setAttribute("for",n);return}o.setAttribute(a,n===!0?"":String(n))}}function Ye(o,a){for(let n of a)n==null||n===!1||n===!0||(Array.isArray(n)?Ye(o,n):n instanceof Node?o.appendChild(n):o.appendChild(document.createTextNode(String(n))))}function W(o,a,...n){if(typeof o=="function")return o({...a,children:n});let r=o===O?document.createDocumentFragment():document.createElement(o);if(o!==O)for(let s in a||{})ut(r,s,a[s]);return Ye(r,n),r}var st=(o,a)=>o&&a&&o.length===a.length&&o.every((n,r)=>Object.is(n,a[r]));function Y(o){let a=Z,n=a.i++;return a.hooks[n]||(a.hooks[n]={current:o})}function ae(o,a){let n=Z,r=n.i++;n.effects.push([r,o,a])}function be(o){let a=Z,n=a.i++;return a.hooks[n]||(a.hooks[n]={value:typeof o=="function"?o():o,set:r=>{let s=a.hooks[n],w=typeof r=="function"?r(s.value):r;Object.is(w,s.value)||(s.value=w,a.queue())}}),[a.hooks[n].value,a.hooks[n].set]}function ct(o,a,n){let r={hooks:[],effects:[],i:0,cleanups:[],props:a,dead:!1,queued:!1,tree:null},s=()=>{let c=r.effects;r.effects=[];for(let[p,R,E]of c){let M=r.cleanups[p];if(M&&E&&st(M.deps,E))continue;if(M&&M.fn)try{M.fn()}catch{}let F;try{F=R()}catch{F=null}r.cleanups[p]={deps:E,fn:typeof F=="function"?F:null}}},w=c=>{Z=r,r.i=0,r.effects=[];let p;try{p=o(r.props)}finally{Z=null}c&&(r.tree=p,p instanceof Node&&n.appendChild(p)),s()};r.queue=()=>{r.queued||r.dead||(r.queued=!0,Promise.resolve().then(()=>{r.queued=!1,r.dead||w(!1)}))},w(!0);let _=r.tree instanceof Node?r.tree:n,A=["pointermove","mousemove"],S=["clientX","clientY","screenX","screenY","button","buttons","ctrlKey","shiftKey","altKey","metaKey","pointerId","pointerType","isPrimary","width","height","pressure","movementX","movementY"],J=c=>{if(r.dead||c.__hubFwd||c.target instanceof Element&&c.target.closest("input,textarea,select"))return;let p={bubbles:!1,cancelable:!1};for(let E of S)E in c&&(p[E]=c[E]);let R;try{R=new c.constructor(c.type,p)}catch{return}R.__hubFwd=!0,_.dispatchEvent(R)},Q=A.filter(()=>matchMedia("(pointer: fine)").matches);return Q.forEach(c=>window.addEventListener(c,J,{passive:!0})),{update(c){r.props={...r.props,...c},w(!1)},destroy(){r.dead=!0,Q.forEach(c=>window.removeEventListener(c,J));for(let c of r.cleanups)if(c&&c.fn)try{c.fn()}catch{}r.cleanups=[],r.tree instanceof Node&&r.tree.parentNode&&r.tree.parentNode.removeChild(r.tree)},root:_}}function qe(o,a){(window.HubDesigns=window.HubDesigns||{})[o]={start:(n,r)=>ct(a,r||{},n)}}var Te=8,Ve=4,lt=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,ft=`#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uZoom;
uniform float uPhase;
uniform float uTwinkleClock;
uniform float uRings;
uniform vec3 uColors[8];
uniform int uColorCount;
uniform int uStreakCount;
uniform int uColumns;
uniform float uWidth;
uniform float uTail;
uniform float uTwinkle;
uniform float uHead;
uniform float uDepth;
uniform vec4 uMouse;
uniform vec3 uLens;
uniform float uLightMode;
uniform float uEncode;
out vec4 outColor;

const vec3 CAMERA = vec3(0.0, -0.8888889, -0.2222222);
const float TAU = 6.28318530718;
const float SPACING = 0.005;
const float REACH = 0.32;

uint scramble(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352du;
  x ^= x >> 15;
  x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}

float unit(uint x) {
  return float(x & 0xffffu) / 65535.0;
}

float stroke(float d, float w) {
  float s = max(0.75 * w, 0.55);
  return 0.75 * w / s * exp(-0.5 * d * d / (s * s));
}

float orb(float d, float r) {
  float s = max(0.6 * r, 0.7);
  float e = 0.6 * r / s;
  return e * e * exp(-0.5 * d * d / (s * s));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 screen = (2.0 * frag - uView) / uView.x;
  vec2 p = screen;
  mat2 warp = mat2(1.0);
  if (uLens.z > 0.0) {
    vec2 o = p - uLens.xy;
    float e = uLens.z * exp(-dot(o, o) / (REACH * REACH));
    p -= o * e;
    warp = mat2(1.0 - e) + outerProduct(o, o) * (2.0 * e / (REACH * REACH));
  }

  vec3 dir = vec3(p, uZoom);
  vec3 exits = (1.0 - CAMERA * sign(dir)) / max(abs(dir), vec3(1e-6));
  float u = min(exits.x, min(exits.y, exits.z));
  for (int i = 0; i < 5; i++) {
    vec3 h = CAMERA + u * dir;
    vec3 h2 = h * h;
    u -= (dot(h2, h2) - 1.0) / (4.0 * dot(dir, h2 * h));
  }
  vec3 hit = CAMERA + u * dir;
  vec3 normal = hit * hit * hit;
  float facing = dot(normal, dir);
  vec3 stepX = u * (vec3(1.0, 0.0, 0.0) - dir * (normal.x / facing));
  vec3 stepY = u * (vec3(0.0, 1.0, 0.0) - dir * (normal.y / facing));
  float ring = hit.y * hit.y + hit.z * hit.z;
  float theta = atan(hit.z, hit.y);
  mat2 jacobian = mat2(
    stepX.x,
    (hit.y * stepX.z - hit.z * stepX.y) / ring,
    stepY.x,
    (hit.y * stepY.z - hit.z * stepY.y) / ring
  ) * warp * (2.0 / uView.x);

  vec2 gradX = vec2(jacobian[0][0], jacobian[1][0]);
  vec2 gradTheta = vec2(jacobian[0][1], jacobian[1][1]);
  float scale = max(length(gradX), 1e-8);
  float det = max(abs(gradX.x * gradTheta.y - gradX.y * gradTheta.x), 1e-12);
  float along = scale / det;
  float skew = dot(gradX, gradTheta) / det;
  float spacing = SPACING / scale;
  float detail = smoothstep(1.6, 3.2, spacing);
  if (detail <= 0.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float halfWidth = min(uWidth / scale, 0.2 * spacing);
  float headRadius = min(2.0 * uWidth / scale, 0.35 * spacing);
  float headReach = 4.0 * max(0.6 * headRadius, 0.7);
  float edge = uColumns > 1 ? 1.0 : 0.5;
  float period = TAU / uRings;
  float fog = exp(-max(u * length(dir) - 0.6, 0.0) * 1.6 * uDepth);

  float boost = 1.0;
  if (uMouse.z > 0.0) {
    vec2 m = screen - uMouse.xy;
    boost += 2.0 * uMouse.z * exp(-dot(m, m) / max(uMouse.w * uMouse.w, 1e-4));
  }

  int count = max(uColorCount, 1);
  vec3 total = vec3(0.0);
  for (int layer = 0; layer < 16; layer++) {
    if (layer >= uStreakCount) break;
    float x = hit.x + float(layer) * SPACING / 8.0;
    float nearest = floor(x / SPACING + 0.5);
    float side = x >= nearest * SPACING ? 1.0 : -1.0;
    for (int k = 0; k < 2; k++) {
      if (k >= uColumns) break;
      float column = nearest + side * float(k);
      float across = (x - column * SPACING) / scale;
      uint seed = scramble(uint(int(column) + 65536) + uint(layer) * 0x9e3779b9u);
      uint next = scramble(seed);
      float hue = unit(seed >> 16);
      float delta = theta - uPhase * (1.0 + floor(unit(seed) * 16.0) / 16.0) - unit(next) * period;
      delta -= period * floor(delta / period + 0.5);
      float ahead = delta * along - across * skew;
      if (abs(ahead) > headReach && (delta > 0.0 || -delta * uTail > 3.2)) continue;
      float behind = max(-delta, 0.0);
      float fall = exp(-uTail * behind) * (1.0 - smoothstep(0.5, 0.95, behind / (0.5 * period)));
      fall *= 1.0 - smoothstep(1.2, 3.2, uTail * behind);
      float reach = length(vec2(across, ahead));
      float trail = stroke(ahead > 0.0 ? reach : abs(across), halfWidth * mix(0.4, 1.0, fall)) * fall;
      float glint = orb(reach, headRadius) * mix(3.0, 1.8, uLightMode);
      float weight = mix(1.5, 1.0 + sin(uTwinkleClock + 7.0 * hue + 4.0), uTwinkle);
      weight *= 1.0 - smoothstep(0.72 * edge, edge, abs(across) / spacing);
      vec3 color = uColors[min(int(hue * float(count)), count - 1)];
      vec3 hot = mix(color, vec3(1.0), uHead * (1.0 - uLightMode));
      total += (trail * color + glint * hot) * weight;
    }
  }

  outColor = vec4(total * fog * boost * detail * uEncode, 1.0);
}`,mt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uTexel;
uniform float uLimit;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv - uTexel).rgb;
  color += texture(uSource, uv + uTexel).rgb;
  color += texture(uSource, uv + vec2(uTexel.x, -uTexel.y)).rgb;
  color += texture(uSource, uv + vec2(-uTexel.x, uTexel.y)).rgb;
  outColor = vec4(min(color * 0.25, vec3(uLimit)), 1.0);
}`,dt=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uStep;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv).rgb * 0.181862;
  color += (texture(uSource, uv + uStep * 1.423135).rgb + texture(uSource, uv - uStep * 1.423135).rgb) * 0.284316;
  color += (texture(uSource, uv + uStep * 3.326702).rgb + texture(uSource, uv - uStep * 3.326702).rgb) * 0.106598;
  color += (texture(uSource, uv + uStep * 5.242989).rgb + texture(uSource, uv - uStep * 5.242989).rgb) * 0.018156;
  outColor = vec4(color, 1.0);
}`,ht=`#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uBloom3;
uniform vec2 uView;
uniform float uDecode;
uniform float uGlow;
uniform float uBloom;
uniform float uPresence;
uniform float uOpacity;
uniform float uFade;
uniform float uLightMode;
uniform vec3 uTopColor;
uniform float uTopGlow;
out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  vec3 light = texelFetch(uScene, ivec2(gl_FragCoord.xy), 0).rgb;
  if (uBloom > 0.0) {
    vec3 halo = texture(uBloom0, uv).rgb * 0.42;
    halo += texture(uBloom1, uv).rgb * 0.3;
    halo += texture(uBloom2, uv).rgb * 0.18;
    halo += texture(uBloom3, uv).rgb * 0.1;
    light += halo * uBloom * (uLightMode > 0.5 ? 0.2 : 1.0);
  }
  light *= uDecode * uGlow * uPresence;

  if (uLightMode < 0.5 && uTopGlow > 0.0) {
    float aspect = uView.x / uView.y;
    vec2 q = vec2((uv.x - 0.5) * aspect, 1.04 - uv.y);
    float spread = 0.34 * max(aspect, 0.75);
    float core = exp(-q.x * q.x / (spread * spread) - q.y * q.y / 0.06);
    float halo = exp(-q.x * q.x / (3.6 * spread * spread) - q.y * q.y / 0.18);
    light += uTopColor * uTopGlow * (core * 0.85 + halo * 0.3) * uPresence;
  }

  vec3 lit = max(light, 0.0);
  vec3 mapped = sqrt(1.0 - exp(-1.3 * lit * lit / (lit + 0.025)));
  float peak = max(mapped.r, max(mapped.g, mapped.b));

  float mask = uOpacity;
  float edge = uFade * 0.5;
  if (edge > 0.0) {
    mask *= smootherstep01(uv.x / edge) * smootherstep01((1.0 - uv.x) / edge);
    mask *= smootherstep01(uv.y / edge) * smootherstep01((1.0 - uv.y) / edge);
  }
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;

  if (uLightMode > 0.5) {
    float coverage = clamp(smoothstep(0.0, 0.5, peak) * mask * 0.94 + grain, 0.0, 1.0);
    vec3 chroma = sqrt(clamp(lit / max(max(lit.r, max(lit.g, lit.b)), 1e-6), 0.0, 1.0));
    chroma = pow(chroma, vec3(1.35));
    chroma /= max(max(chroma.r, max(chroma.g, chroma.b)), 1e-4);
    float saturation = 1.0 - min(chroma.r, min(chroma.g, chroma.b));
    chroma = mix(vec3(0.3), chroma, smoothstep(0.08, 0.35, saturation));
    outColor = vec4(chroma * coverage, coverage);
  } else {
    vec3 color = clamp(mapped + grain, 0.0, 1.0) * mask;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`,pt=2.6,xt=9,ye=Math.PI*2,q=(o,a,n)=>Math.min(n,Math.max(a,o)),ze=(o,a,n)=>{let r=o.createShader(a);return r?(o.shaderSource(r,n),o.compileShader(r),o.getShaderParameter(r,o.COMPILE_STATUS)?r:(o.deleteShader(r),null)):null},ue=(o,a)=>{let n=ze(o,o.VERTEX_SHADER,lt),r=ze(o,o.FRAGMENT_SHADER,a),s=o.createProgram();if(!n||!r||!s)return null;if(o.attachShader(s,n),o.attachShader(s,r),o.bindAttribLocation(s,0,"aPosition"),o.linkProgram(s),o.deleteShader(n),o.deleteShader(r),!o.getProgramParameter(s,o.LINK_STATUS))return o.deleteProgram(s),null;let w={},_=o.getProgramParameter(s,o.ACTIVE_UNIFORMS);for(let A=0;A<_;A++){let S=o.getActiveUniform(s,A);S&&(w[S.name.replace(/\[0\]$/,"")]=o.getUniformLocation(s,S.name))}return{program:s,uniforms:w}},gt=({colors:o=["#ffffff"],backgroundColor:a="#94a3b8",speed:n=.3,streakCount:r=2,streakWidth:s=.8,streakLength:w=1,glow:_=1,density:A=.6,twinkle:S=.3,zoom:J=3,backgroundGlow:Q=.1,headGlow:c=.6,depth:p=.5,bloom:R=.35,opacity:E=1,mouseInteraction:M=!0,mouseStrength:F=.4,mouseRadius:se=.45,mouseDampening:Ke=.15,lens:je=.5,holdToWarp:$e=!0,intro:Ze=!0,fade:Je=0,lightMode:Qe=!1,mixBlendMode:Ae,paused:et=!1,dpr:tt,className:Se="",style:ot})=>{let Re=Y(null),Me=Y(null),ce=Y(null),C=Y(null),[rt,nt]=be(0);return C.current={colors:(Array.isArray(o)&&o.length?o:["#ffffff"]).slice(0,Te).map(String),backgroundColor:String(a),speed:n,streakCount:Math.round(q(r,1,16)),streakWidth:Math.max(.05,s),streakLength:Math.max(.05,w),glow:Math.max(0,_),density:A,twinkle:q(S,0,1),zoom:Math.max(.1,J),backgroundGlow:Math.max(0,Q),headGlow:q(c,0,1),depth:Math.max(0,p),bloom:Math.max(0,R),opacity:q(E,0,1),mouseInteraction:M,mouseStrength:Math.max(0,F),mouseRadius:Math.max(.01,se),mouseDampening:Math.max(0,Ke),lens:q(je,0,1),holdToWarp:$e,intro:Ze,fade:q(Je,0,1),lightMode:Qe,paused:et,dpr:tt},ae(()=>{let b=Re.current,x=Me.current,e=x?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!b||!x||!e)return;let Ce=!!e.getExtension("EXT_color_buffer_float"),le=ue(e,ft),fe=ue(e,mt),ee=ue(e,dt),me=ue(e,ht);if(!le||!fe||!ee||!me)return;let Le=t=>{t.preventDefault()},Pe=()=>nt(t=>t+1);x.addEventListener("webglcontextlost",Le),x.addEventListener("webglcontextrestored",Pe);let ke=e.createBuffer(),de=e.createVertexArray();e.bindVertexArray(de),e.bindBuffer(e.ARRAY_BUFFER,ke),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let it=Ce?e.RGBA16F:e.RGBA8,he=Ce?1:.25,pe=()=>({texture:null,framebuffer:e.createFramebuffer(),width:0,height:0}),V=pe(),te=Array.from({length:Ve},()=>[pe(),pe()]),xe=(t,i,l)=>{t.texture&&t.width===i&&t.height===l||(t.texture&&e.deleteTexture(t.texture),t.texture=e.createTexture(),t.width=i,t.height=l,e.bindTexture(e.TEXTURE_2D,t.texture),e.texStorage2D(e.TEXTURE_2D,1,it,i,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0))},z=(t,i)=>(e.bindFramebuffer(e.FRAMEBUFFER,t?t.framebuffer:null),e.viewport(0,0,t?t.width:x.width,t?t.height:x.height),e.useProgram(i.program),i.uniforms),D=(t,i)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,i)},X=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),ge=new Map,at=t=>{if(ge.has(t))return ge.get(t);let i=[1,1,1];if(X){X.clearRect(0,0,1,1),X.fillStyle="#ffffff",X.fillStyle=t,X.fillRect(0,0,1,1);let[l,g,K]=X.getImageData(0,0,1,1).data;i=[l/255,g/255,K/255]}return ge.set(t,i),i},_e=t=>at(t).map(i=>i*i),H=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,ve=new Float32Array(Te*3),h={x:0,y:0,inside:!1,held:!1},u={travel:0,intro:C.current.intro&&!H?0:1,mouseX:0,mouseY:0,lensX:0,lensY:0,touch:0,warp:0},I=0,G=0,oe=!0,we=()=>{let t=C.current,i=x.width,l=x.height,g=Math.max(1,b.clientWidth),K=Math.max(1,b.clientHeight);e.bindVertexArray(de),xe(V,i,l),te.forEach((f,d)=>{let y=Math.max(1,Math.round(g/2**(d+1))),P=Math.max(1,Math.round(K/2**(d+1)));xe(f[0],y,P),xe(f[1],y,P)});let j=u.intro,ne=Math.min(1,j*2.2),N=1+5*Math.pow(1-j,2)+2.5*u.warp,L=Math.max(1,Math.floor(ye*Math.max(t.density,.05)+.5)),U=ye/L,$=9+u.travel,B=t.colors.map(_e);ve.fill(0);for(let f=0;f<Te;f++)ve.set(B[Math.min(f,B.length-1)],f*3);let ie=f=>(2*f-i)/i,We=f=>(2*f-l)/i,m=z(V,le);if(e.uniform2f(m.uView,i,l),e.uniform1f(m.uZoom,t.zoom),e.uniform1f(m.uPhase,$%(16*U)),e.uniform1f(m.uTwinkleClock,$%ye),e.uniform1f(m.uRings,L),e.uniform3fv(m.uColors,ve),e.uniform1i(m.uColorCount,B.length),e.uniform1i(m.uStreakCount,t.streakCount),e.uniform1i(m.uColumns,t.streakWidth>1?2:1),e.uniform1f(m.uWidth,5e-4*t.streakWidth),e.uniform1f(m.uTail,19/(t.streakLength*N)),e.uniform1f(m.uTwinkle,t.twinkle),e.uniform1f(m.uHead,t.headGlow),e.uniform1f(m.uDepth,t.depth),e.uniform4f(m.uMouse,ie(u.mouseX),We(u.mouseY),t.mouseInteraction?t.mouseStrength*u.touch:0,t.mouseRadius),e.uniform3f(m.uLens,ie(u.lensX),We(u.lensY),t.mouseInteraction?.5*t.lens*u.touch:0),e.uniform1f(m.uLightMode,t.lightMode?1:0),e.uniform1f(m.uEncode,he),e.drawArrays(e.TRIANGLES,0,3),t.bloom>0){let f=V;te.forEach(([d,y])=>{let P=z(d,fe);D(0,f.texture),e.uniform1i(P.uSource,0),e.uniform2f(P.uTarget,d.width,d.height),e.uniform2f(P.uTexel,1/f.width,1/f.height),e.uniform1f(P.uLimit,4*he),e.drawArrays(e.TRIANGLES,0,3);let k=z(y,ee);D(0,d.texture),e.uniform1i(k.uSource,0),e.uniform2f(k.uTarget,y.width,y.height),e.uniform2f(k.uStep,1/d.width,0),e.drawArrays(e.TRIANGLES,0,3),k=z(d,ee),D(0,y.texture),e.uniform1i(k.uSource,0),e.uniform2f(k.uTarget,d.width,d.height),e.uniform2f(k.uStep,0,1/y.height),e.drawArrays(e.TRIANGLES,0,3),f=d})}let v=z(null,me);D(0,V.texture),e.uniform1i(v.uScene,0),te.forEach(([f],d)=>{D(d+1,f.texture),e.uniform1i(v[`uBloom${d}`],d+1)}),e.uniform2f(v.uView,i,l),e.uniform1f(v.uDecode,1/he),e.uniform1f(v.uGlow,t.glow),e.uniform1f(v.uBloom,t.bloom),e.uniform1f(v.uPresence,ne),e.uniform1f(v.uOpacity,t.opacity),e.uniform1f(v.uFade,t.fade),e.uniform1f(v.uLightMode,t.lightMode?1:0),e.uniform3fv(v.uTopColor,_e(t.backgroundColor)),e.uniform1f(v.uTopGlow,t.backgroundGlow),e.drawArrays(e.TRIANGLES,0,3);for(let f=Ve;f>=0;f--)D(f,null)},Fe=t=>{if(I=0,!oe||document.hidden)return;let i=C.current,l=G?Math.min(.05,(t-G)/1e3):1/60;G=t,!i.intro||H?u.intro=1:u.intro<1&&(u.intro=Math.min(1,u.intro+l/pt));let g=i.holdToWarp&&h.held&&h.inside&&!H;u.warp+=((g?1:0)-u.warp)*(1-Math.exp(-l*(g?2.2:1.6)));let K=xt*Math.pow(1-u.intro,2)+6*u.warp,j=!i.paused&&!H;j&&(u.travel+=l*.1*i.speed*(1+K));let ne=x.width/Math.max(1,b.clientWidth),N=h.x*ne,L=(b.clientHeight-h.y)*ne,U=i.mouseInteraction&&h.inside&&!H;U&&u.touch<.01&&(u.mouseX=N,u.mouseY=L,u.lensX=N,u.lensY=L);let $=i.mouseDampening>0?1-Math.exp(-l/i.mouseDampening):1;u.mouseX+=(N-u.mouseX)*$,u.mouseY+=(L-u.mouseY)*$;let B=1-Math.exp(-l*6);u.lensX+=(N-u.lensX)*B,u.lensY+=(L-u.lensY)*B,u.touch+=((U?1:0)-u.touch)*(1-Math.exp(-l*(U?4:2))),we();let ie=u.intro<1||u.warp>.001||Math.abs((U?1:0)-u.touch)>.002;j&&i.speed!==0||ie?I=requestAnimationFrame(Fe):G=0},T=()=>{!I&&oe&&!document.hidden&&(I=requestAnimationFrame(Fe))},Ee=()=>{let t=C.current,i=Math.max(1,b.clientWidth),l=Math.max(1,b.clientHeight),g=Math.min(t.dpr||window.devicePixelRatio||1,2);x.width=Math.max(1,Math.round(i*g)),x.height=Math.max(1,Math.round(l*g)),we(),T()},De=t=>{let i=b.getBoundingClientRect(),l=t.clientX-i.left,g=t.clientY-i.top;return{x:l,y:g,inside:l>=0&&g>=0&&l<=i.width&&g<=i.height}},Xe=t=>{let i=De(t);h.x=i.x,h.y=i.y,h.inside=i.inside,T()},Ie=t=>{let i=De(t);i.inside&&(h.x=i.x,h.y=i.y,h.inside=!0,h.held=!0,T())},re=()=>{h.held=!1,T()},Ge=()=>{h.inside=!1,h.held=!1,T()},Ne=()=>{G=0,T()},Ue=new ResizeObserver(Ee);Ue.observe(b);let Be=new IntersectionObserver(t=>{oe=t.some(i=>i.isIntersecting),oe&&(G=0,T())});Be.observe(b),window.addEventListener("pointermove",Xe,{passive:!0}),window.addEventListener("pointerdown",Ie,{passive:!0}),window.addEventListener("pointerup",re,{passive:!0}),window.addEventListener("pointercancel",re,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ge),document.addEventListener("visibilitychange",Ne),Ee();let Oe=C.current.dpr;return ce.current=()=>{let t=C.current;if(t.dpr!==Oe){Oe=t.dpr,Ee();return}I||we(),T()},()=>{cancelAnimationFrame(I),ce.current=null,x.removeEventListener("webglcontextlost",Le),x.removeEventListener("webglcontextrestored",Pe),Ue.disconnect(),Be.disconnect(),window.removeEventListener("pointermove",Xe),window.removeEventListener("pointerdown",Ie),window.removeEventListener("pointerup",re),window.removeEventListener("pointercancel",re),document.documentElement.removeEventListener("pointerleave",Ge),document.removeEventListener("visibilitychange",Ne),[V,...te.flat()].forEach(t=>{t.texture&&e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer)}),[le,fe,ee,me].forEach(t=>e.deleteProgram(t.program)),e.deleteBuffer(ke),e.deleteVertexArray(de),e.isContextLost()||e.getExtension("WEBGL_lose_context")?.loseContext()}},[rt]),ae(()=>{ce.current?.()}),W("div",{ref:Re,className:`lightfall-container${Se?` ${Se}`:""}`,style:{...Ae?{mixBlendMode:Ae}:null,...ot}},W("canvas",{ref:Me,className:"lightfall-canvas","aria-hidden":"true"}))},He=gt;qe("lightfall",He);})();
