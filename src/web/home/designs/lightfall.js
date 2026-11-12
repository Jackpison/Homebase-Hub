/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var Z=null,U=Symbol("Fragment");function ut(o,a,n){if(a==="ref"){typeof n=="function"?n(o):n&&(n.current=o);return}if(!(a==="children"||n==null||n===!1)){if(a==="className"){o.setAttribute("class",n);return}if(a==="style"){for(let r in n){let s=n[r];s==null||s===!1||(r.startsWith("--")?o.style.setProperty(r,String(s)):o.style[r]=typeof s=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(r)?s+"px":s)}return}if(/^on[A-Z]/.test(a)&&typeof n=="function"){o.addEventListener(a.slice(2).toLowerCase(),n);return}if(a==="htmlFor"){o.setAttribute("for",n);return}o.setAttribute(a,n===!0?"":String(n))}}function We(o,a){for(let n of a)n==null||n===!1||n===!0||(Array.isArray(n)?We(o,n):n instanceof Node?o.appendChild(n):o.appendChild(document.createTextNode(String(n))))}function B(o,a,...n){if(typeof o=="function")return o({...a,children:n});let r=o===U?document.createDocumentFragment():document.createElement(o);if(o!==U)for(let s in a||{})ut(r,s,a[s]);return We(r,n),r}var st=(o,a)=>o&&a&&o.length===a.length&&o.every((n,r)=>Object.is(n,a[r]));function O(o){let a=Z,n=a.i++;return a.hooks[n]||(a.hooks[n]={current:o})}function ie(o,a){let n=Z,r=n.i++;n.effects.push([r,o,a])}function Ee(o){let a=Z,n=a.i++;return a.hooks[n]||(a.hooks[n]={value:typeof o=="function"?o():o,set:r=>{let s=a.hooks[n],w=typeof r=="function"?r(s.value):r;Object.is(w,s.value)||(s.value=w,a.queue())}}),[a.hooks[n].value,a.hooks[n].set]}function ct(o,a,n){let r={hooks:[],effects:[],i:0,cleanups:[],props:a,dead:!1,queued:!1,tree:null},s=()=>{let l=r.effects;r.effects=[];for(let[p,J,q]of l){let R=r.cleanups[p];if(R&&q&&st(R.deps,q))continue;if(R&&R.fn)try{R.fn()}catch{}let k;try{k=J()}catch{k=null}r.cleanups[p]={deps:q,fn:typeof k=="function"?k:null}}},w=l=>{Z=r,r.i=0,r.effects=[];let p;try{p=o(r.props)}finally{Z=null}l&&(r.tree=p,p instanceof Node&&n.appendChild(p)),s()};r.queue=()=>{r.queued||r.dead||(r.queued=!0,Promise.resolve().then(()=>{r.queued=!1,r.dead||w(!1)}))},w(!0);let P=r.tree instanceof Node?r.tree:n,A=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],b=l=>{if(r.dead||l.__hubFwd||l.target instanceof Element&&l.target.closest("input,textarea,select"))return;let p;try{p=new l.constructor(l.type,l)}catch{return}p.__hubFwd=!0,P.dispatchEvent(p)},K=A.filter(()=>matchMedia("(pointer: fine)").matches);return K.forEach(l=>window.addEventListener(l,b,{passive:!0})),{update(l){r.props={...r.props,...l},w(!1)},destroy(){r.dead=!0,K.forEach(l=>window.removeEventListener(l,b));for(let l of r.cleanups)if(l&&l.fn)try{l.fn()}catch{}r.cleanups=[],r.tree instanceof Node&&r.tree.parentNode&&r.tree.parentNode.removeChild(r.tree)},root:P}}function qe(o,a){(window.HubDesigns=window.HubDesigns||{})[o]={start:(n,r)=>ct(a,r||{},n)}}var be=8,Ve=4,lt=`#version 300 es
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
}`,pt=2.6,xt=9,Te=Math.PI*2,W=(o,a,n)=>Math.min(n,Math.max(a,o)),ze=(o,a,n)=>{let r=o.createShader(a);return r?(o.shaderSource(r,n),o.compileShader(r),o.getShaderParameter(r,o.COMPILE_STATUS)?r:(o.deleteShader(r),null)):null},ae=(o,a)=>{let n=ze(o,o.VERTEX_SHADER,lt),r=ze(o,o.FRAGMENT_SHADER,a),s=o.createProgram();if(!n||!r||!s)return null;if(o.attachShader(s,n),o.attachShader(s,r),o.bindAttribLocation(s,0,"aPosition"),o.linkProgram(s),o.deleteShader(n),o.deleteShader(r),!o.getProgramParameter(s,o.LINK_STATUS))return o.deleteProgram(s),null;let w={},P=o.getProgramParameter(s,o.ACTIVE_UNIFORMS);for(let A=0;A<P;A++){let b=o.getActiveUniform(s,A);b&&(w[b.name.replace(/\[0\]$/,"")]=o.getUniformLocation(s,b.name))}return{program:s,uniforms:w}},gt=({colors:o=["#ffffff"],backgroundColor:a="#94a3b8",speed:n=.3,streakCount:r=2,streakWidth:s=.8,streakLength:w=1,glow:P=1,density:A=.6,twinkle:b=.3,zoom:K=3,backgroundGlow:l=.1,headGlow:p=.6,depth:J=.5,bloom:q=.35,opacity:R=1,mouseInteraction:k=!0,mouseStrength:ue=.4,mouseRadius:Ye=.45,mouseDampening:je=.15,lens:$e=.5,holdToWarp:Ze=!0,intro:Ke=!0,fade:Je=0,lightMode:Qe=!1,mixBlendMode:ye,paused:et=!1,dpr:tt,className:Ae="",style:ot})=>{let Re=O(null),Se=O(null),se=O(null),S=O(null),[rt,nt]=Ee(0);return S.current={colors:(Array.isArray(o)&&o.length?o:["#ffffff"]).slice(0,be).map(String),backgroundColor:String(a),speed:n,streakCount:Math.round(W(r,1,16)),streakWidth:Math.max(.05,s),streakLength:Math.max(.05,w),glow:Math.max(0,P),density:A,twinkle:W(b,0,1),zoom:Math.max(.1,K),backgroundGlow:Math.max(0,l),headGlow:W(p,0,1),depth:Math.max(0,J),bloom:Math.max(0,q),opacity:W(R,0,1),mouseInteraction:k,mouseStrength:Math.max(0,ue),mouseRadius:Math.max(.01,Ye),mouseDampening:Math.max(0,je),lens:W($e,0,1),holdToWarp:Ze,intro:Ke,fade:W(Je,0,1),lightMode:Qe,paused:et,dpr:tt},ie(()=>{let E=Re.current,x=Se.current,e=x?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!E||!x||!e)return;let Me=!!e.getExtension("EXT_color_buffer_float"),ce=ae(e,ft),le=ae(e,mt),Q=ae(e,dt),fe=ae(e,ht);if(!ce||!le||!Q||!fe)return;let Ce=t=>{t.preventDefault()},Le=()=>nt(t=>t+1);x.addEventListener("webglcontextlost",Ce),x.addEventListener("webglcontextrestored",Le);let Pe=e.createBuffer(),me=e.createVertexArray();e.bindVertexArray(me),e.bindBuffer(e.ARRAY_BUFFER,Pe),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let it=Me?e.RGBA16F:e.RGBA8,de=Me?1:.25,he=()=>({texture:null,framebuffer:e.createFramebuffer(),width:0,height:0}),V=he(),ee=Array.from({length:Ve},()=>[he(),he()]),pe=(t,i,c)=>{t.texture&&t.width===i&&t.height===c||(t.texture&&e.deleteTexture(t.texture),t.texture=e.createTexture(),t.width=i,t.height=c,e.bindTexture(e.TEXTURE_2D,t.texture),e.texStorage2D(e.TEXTURE_2D,1,it,i,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0))},z=(t,i)=>(e.bindFramebuffer(e.FRAMEBUFFER,t?t.framebuffer:null),e.viewport(0,0,t?t.width:x.width,t?t.height:x.height),e.useProgram(i.program),i.uniforms),_=(t,i)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,i)},F=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),xe=new Map,at=t=>{if(xe.has(t))return xe.get(t);let i=[1,1,1];if(F){F.clearRect(0,0,1,1),F.fillStyle="#ffffff",F.fillStyle=t,F.fillRect(0,0,1,1);let[c,g,Y]=F.getImageData(0,0,1,1).data;i=[c/255,g/255,Y/255]}return xe.set(t,i),i},ke=t=>at(t).map(i=>i*i),H=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,ge=new Float32Array(be*3),h={x:0,y:0,inside:!1,held:!1},u={travel:0,intro:S.current.intro&&!H?0:1,mouseX:0,mouseY:0,lensX:0,lensY:0,touch:0,warp:0},D=0,X=0,te=!0,ve=()=>{let t=S.current,i=x.width,c=x.height,g=Math.max(1,E.clientWidth),Y=Math.max(1,E.clientHeight);e.bindVertexArray(me),pe(V,i,c),ee.forEach((f,d)=>{let y=Math.max(1,Math.round(g/2**(d+1))),C=Math.max(1,Math.round(Y/2**(d+1)));pe(f[0],y,C),pe(f[1],y,C)});let j=u.intro,re=Math.min(1,j*2.2),I=1+5*Math.pow(1-j,2)+2.5*u.warp,M=Math.max(1,Math.floor(Te*Math.max(t.density,.05)+.5)),G=Te/M,$=9+u.travel,N=t.colors.map(ke);ge.fill(0);for(let f=0;f<be;f++)ge.set(N[Math.min(f,N.length-1)],f*3);let ne=f=>(2*f-i)/i,Oe=f=>(2*f-c)/i,m=z(V,ce);if(e.uniform2f(m.uView,i,c),e.uniform1f(m.uZoom,t.zoom),e.uniform1f(m.uPhase,$%(16*G)),e.uniform1f(m.uTwinkleClock,$%Te),e.uniform1f(m.uRings,M),e.uniform3fv(m.uColors,ge),e.uniform1i(m.uColorCount,N.length),e.uniform1i(m.uStreakCount,t.streakCount),e.uniform1i(m.uColumns,t.streakWidth>1?2:1),e.uniform1f(m.uWidth,5e-4*t.streakWidth),e.uniform1f(m.uTail,19/(t.streakLength*I)),e.uniform1f(m.uTwinkle,t.twinkle),e.uniform1f(m.uHead,t.headGlow),e.uniform1f(m.uDepth,t.depth),e.uniform4f(m.uMouse,ne(u.mouseX),Oe(u.mouseY),t.mouseInteraction?t.mouseStrength*u.touch:0,t.mouseRadius),e.uniform3f(m.uLens,ne(u.lensX),Oe(u.lensY),t.mouseInteraction?.5*t.lens*u.touch:0),e.uniform1f(m.uLightMode,t.lightMode?1:0),e.uniform1f(m.uEncode,de),e.drawArrays(e.TRIANGLES,0,3),t.bloom>0){let f=V;ee.forEach(([d,y])=>{let C=z(d,le);_(0,f.texture),e.uniform1i(C.uSource,0),e.uniform2f(C.uTarget,d.width,d.height),e.uniform2f(C.uTexel,1/f.width,1/f.height),e.uniform1f(C.uLimit,4*de),e.drawArrays(e.TRIANGLES,0,3);let L=z(y,Q);_(0,d.texture),e.uniform1i(L.uSource,0),e.uniform2f(L.uTarget,y.width,y.height),e.uniform2f(L.uStep,1/d.width,0),e.drawArrays(e.TRIANGLES,0,3),L=z(d,Q),_(0,y.texture),e.uniform1i(L.uSource,0),e.uniform2f(L.uTarget,d.width,d.height),e.uniform2f(L.uStep,0,1/y.height),e.drawArrays(e.TRIANGLES,0,3),f=d})}let v=z(null,fe);_(0,V.texture),e.uniform1i(v.uScene,0),ee.forEach(([f],d)=>{_(d+1,f.texture),e.uniform1i(v[`uBloom${d}`],d+1)}),e.uniform2f(v.uView,i,c),e.uniform1f(v.uDecode,1/de),e.uniform1f(v.uGlow,t.glow),e.uniform1f(v.uBloom,t.bloom),e.uniform1f(v.uPresence,re),e.uniform1f(v.uOpacity,t.opacity),e.uniform1f(v.uFade,t.fade),e.uniform1f(v.uLightMode,t.lightMode?1:0),e.uniform3fv(v.uTopColor,ke(t.backgroundColor)),e.uniform1f(v.uTopGlow,t.backgroundGlow),e.drawArrays(e.TRIANGLES,0,3);for(let f=Ve;f>=0;f--)_(f,null)},_e=t=>{if(D=0,!te||document.hidden)return;let i=S.current,c=X?Math.min(.05,(t-X)/1e3):1/60;X=t,!i.intro||H?u.intro=1:u.intro<1&&(u.intro=Math.min(1,u.intro+c/pt));let g=i.holdToWarp&&h.held&&h.inside&&!H;u.warp+=((g?1:0)-u.warp)*(1-Math.exp(-c*(g?2.2:1.6)));let Y=xt*Math.pow(1-u.intro,2)+6*u.warp,j=!i.paused&&!H;j&&(u.travel+=c*.1*i.speed*(1+Y));let re=x.width/Math.max(1,E.clientWidth),I=h.x*re,M=(E.clientHeight-h.y)*re,G=i.mouseInteraction&&h.inside&&!H;G&&u.touch<.01&&(u.mouseX=I,u.mouseY=M,u.lensX=I,u.lensY=M);let $=i.mouseDampening>0?1-Math.exp(-c/i.mouseDampening):1;u.mouseX+=(I-u.mouseX)*$,u.mouseY+=(M-u.mouseY)*$;let N=1-Math.exp(-c*6);u.lensX+=(I-u.lensX)*N,u.lensY+=(M-u.lensY)*N,u.touch+=((G?1:0)-u.touch)*(1-Math.exp(-c*(G?4:2))),ve();let ne=u.intro<1||u.warp>.001||Math.abs((G?1:0)-u.touch)>.002;j&&i.speed!==0||ne?D=requestAnimationFrame(_e):X=0},T=()=>{!D&&te&&!document.hidden&&(D=requestAnimationFrame(_e))},we=()=>{let t=S.current,i=Math.max(1,E.clientWidth),c=Math.max(1,E.clientHeight),g=Math.min(t.dpr||window.devicePixelRatio||1,2);x.width=Math.max(1,Math.round(i*g)),x.height=Math.max(1,Math.round(c*g)),ve(),T()},Fe=t=>{let i=E.getBoundingClientRect(),c=t.clientX-i.left,g=t.clientY-i.top;return{x:c,y:g,inside:c>=0&&g>=0&&c<=i.width&&g<=i.height}},De=t=>{let i=Fe(t);h.x=i.x,h.y=i.y,h.inside=i.inside,T()},Xe=t=>{let i=Fe(t);i.inside&&(h.x=i.x,h.y=i.y,h.inside=!0,h.held=!0,T())},oe=()=>{h.held=!1,T()},Ie=()=>{h.inside=!1,h.held=!1,T()},Ge=()=>{X=0,T()},Ne=new ResizeObserver(we);Ne.observe(E);let Ue=new IntersectionObserver(t=>{te=t.some(i=>i.isIntersecting),te&&(X=0,T())});Ue.observe(E),window.addEventListener("pointermove",De,{passive:!0}),window.addEventListener("pointerdown",Xe,{passive:!0}),window.addEventListener("pointerup",oe,{passive:!0}),window.addEventListener("pointercancel",oe,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ie),document.addEventListener("visibilitychange",Ge),we();let Be=S.current.dpr;return se.current=()=>{let t=S.current;if(t.dpr!==Be){Be=t.dpr,we();return}D||ve(),T()},()=>{cancelAnimationFrame(D),se.current=null,x.removeEventListener("webglcontextlost",Ce),x.removeEventListener("webglcontextrestored",Le),Ne.disconnect(),Ue.disconnect(),window.removeEventListener("pointermove",De),window.removeEventListener("pointerdown",Xe),window.removeEventListener("pointerup",oe),window.removeEventListener("pointercancel",oe),document.documentElement.removeEventListener("pointerleave",Ie),document.removeEventListener("visibilitychange",Ge),[V,...ee.flat()].forEach(t=>{t.texture&&e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer)}),[ce,le,Q,fe].forEach(t=>e.deleteProgram(t.program)),e.deleteBuffer(Pe),e.deleteVertexArray(me),e.isContextLost()||e.getExtension("WEBGL_lose_context")?.loseContext()}},[rt]),ie(()=>{se.current?.()}),B("div",{ref:Re,className:`lightfall-container${Ae?` ${Ae}`:""}`,style:{...ye?{mixBlendMode:ye}:null,...ot}},B("canvas",{ref:Se,className:"lightfall-canvas","aria-hidden":"true"}))},He=gt;qe("lightfall",He);})();
