/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var Re=null,de=Symbol("Fragment");function so(i,a,u){if(a==="ref"){typeof u=="function"?u(i):u&&(u.current=i);return}if(!(a==="children"||u==null||u===!1)){if(a==="className"){i.setAttribute("class",u);return}if(a==="style"){for(let n in u){let l=u[n];l==null||l===!1||(n.startsWith("--")?i.style.setProperty(n,String(l)):i.style[n]=typeof l=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(n)?l+"px":l)}return}if(/^on[A-Z]/.test(a)&&typeof u=="function"){i.addEventListener(a.slice(2).toLowerCase(),u);return}if(a==="htmlFor"){i.setAttribute("for",u);return}i.setAttribute(a,u===!0?"":String(u))}}function Bt(i,a){for(let u of a)u==null||u===!1||u===!0||(Array.isArray(u)?Bt(i,u):u instanceof Node?i.appendChild(u):i.appendChild(document.createTextNode(String(u))))}function pe(i,a,...u){if(typeof i=="function")return i({...a,children:u});let n=i===de?document.createDocumentFragment():document.createElement(i);if(i!==de)for(let l in a||{})so(n,l,a[l]);return Bt(n,u),n}var ho=(i,a)=>i&&a&&i.length===a.length&&i.every((u,n)=>Object.is(u,a[n]));function ie(i){let a=Re,u=a.i++;return a.hooks[u]||(a.hooks[u]={current:i})}function He(i,a){let u=Re,n=u.i++;u.effects.push([n,i,a])}function at(i){let a=Re,u=a.i++;return a.hooks[u]||(a.hooks[u]={value:typeof i=="function"?i():i,set:n=>{let l=a.hooks[u],m=typeof n=="function"?n(l.value):n;Object.is(m,l.value)||(l.value=m,a.queue())}}),[a.hooks[u].value,a.hooks[u].set]}function mo(i,a,u){let n={hooks:[],effects:[],i:0,cleanups:[],props:a,dead:!1,queued:!1,tree:null},l=()=>{let p=n.effects;n.effects=[];for(let[F,I,Z]of p){let te=n.cleanups[F];if(te&&Z&&ho(te.deps,Z))continue;if(te&&te.fn)try{te.fn()}catch{}let ce;try{ce=I()}catch{ce=null}n.cleanups[F]={deps:Z,fn:typeof ce=="function"?ce:null}}},m=p=>{Re=n,n.i=0,n.effects=[];let F;try{F=i(n.props)}finally{Re=null}p&&(n.tree=F,F instanceof Node&&u.appendChild(F)),l()};n.queue=()=>{n.queued||n.dead||(n.queued=!0,Promise.resolve().then(()=>{n.queued=!1,n.dead||m(!1)}))},m(!0);let A=n.tree instanceof Node?n.tree:u,q=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],X=p=>{if(n.dead||p.__hubFwd||p.target instanceof Element&&p.target.closest("input,textarea,select"))return;let F;try{F=new p.constructor(p.type,p)}catch{return}F.__hubFwd=!0,A.dispatchEvent(F)},O=q.filter(()=>matchMedia("(pointer: fine)").matches);return O.forEach(p=>window.addEventListener(p,X,{passive:!0})),{update(p){n.props={...n.props,...p},m(!1)},destroy(){n.dead=!0,O.forEach(p=>window.removeEventListener(p,X));for(let p of n.cleanups)if(p&&p.fn)try{p.fn()}catch{}n.cleanups=[],n.tree instanceof Node&&n.tree.parentNode&&n.tree.parentNode.removeChild(n.tree)},root:A}}function Ot(i,a){(window.HubDesigns=window.HubDesigns||{})[i]={start:(u,n)=>mo(a,n||{},u)}}var po=.32,It=9,ve=.05,Ge=160,Se=1.7,Ce=.45,vo=2.8,qe=4,zt=4,Ae=256,Ve=48,ct=2e5,xo=[-.81,.58,-.02],kt={forward:[0,1],backward:[0,-1],left:[-1,0],right:[1,0]},go=["lift","trace","light"],yo={plus:0,dots:1},Eo=1.25,Ze=`
precision highp float;
precision highp int;

uniform float uFrequency;
uniform vec2 uMorph;
uniform sampler2D uSculpt;
uniform float uSculptOn;
uniform vec4 uPulses[${qe}];
uniform vec3 uEye;
uniform vec3 uForward;
uniform vec3 uNear;

uint lattice(ivec2 p) {
  uvec2 q = uvec2(p + 1073741824);
  uint h = q.x * 2654435761u + q.y * 2246822519u;
  h = (h ^ (h >> 15u)) * 739982445u;
  h = (h ^ (h >> 12u)) * 695872825u;
  return h ^ (h >> 15u);
}

float corner(ivec2 c, vec2 f) {
  uint h = lattice(c);
  vec2 g = vec2(float(h & 65535u), float(h >> 16u)) / 32767.5 - 1.0;
  return dot(g, f);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  ivec2 c = ivec2(i);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = corner(c, f);
  float b = corner(c + ivec2(1, 0), f - vec2(1.0, 0.0));
  float d = corner(c + ivec2(0, 1), f - vec2(0.0, 1.0));
  float e = corner(c + ivec2(1, 1), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(d, e, u.x), u.y);
}

vec2 octave(vec2 p, vec2 shift) {
  return vec2(1.6 * p.x - 1.2 * p.y, 1.2 * p.x + 1.6 * p.y) + shift;
}

float relief(vec2 t) {
  vec2 p = t * uFrequency;
  vec2 w = vec2(noise(p * 0.42 + uMorph), noise(p * 0.42 - uMorph.yx + vec2(5.2, 1.3)));
  p += w * 0.8;
  float n = noise(p) * 0.55;
  p = octave(p, vec2(7.1, 3.7));
  n += noise(p) * 0.15;
  p = octave(p, vec2(1.9, 8.3));
  n += noise(p) * 0.04;
  float s = log(1.0 + exp(7.0 * (3.0 * n + 0.05))) / 7.0;
  return s * s * 1.4 + 0.1 * n;
}

float swell(vec2 t) {
  float lift = 0.0;
  for (int i = 0; i < ${qe}; i++) {
    vec4 p = uPulses[i];
    if (p.w <= 0.0) continue;
    float x = (length(t - p.xy) - p.z) / (0.28 + p.z * 0.05);
    lift += exp(-x * x) * p.w;
  }
  return lift;
}

vec4 sculpted(vec2 t) {
  return uSculptOn > 0.5 ? textureLod(uSculpt, t / ${Ve}.0, 0.0) : vec4(0.0);
}

float settle(vec2 world) {
  float depth = dot(vec3(world.x, 0.0, world.y) - uEye, uForward);
  float x = clamp((depth - uNear.x) / max(uNear.y - uNear.x, 1e-3), 0.0, 1.0);
  return mix(uNear.z, 1.0, x * x * x * (x * (x * 6.0 - 15.0) + 10.0));
}
`,wo=`#version 300 es
${Ze}
uniform ivec2 uBase;
uniform float uCell;
uniform float uDetail;
layout(location = 0) out vec4 outField;
layout(location = 1) out vec4 outHeight;

void main() {
  vec2 t = vec2(uBase + ivec2(gl_FragCoord.xy)) * uCell;
  vec4 carved = sculpted(t);
  float ring = swell(t);
  float ground = relief(t) + carved.r + ring * 0.14;
  vec2 dp = t * uFrequency * 5.0 + vec2(13.1, 4.7);
  float fine = noise(dp) * 0.6 + noise(octave(dp, vec2(2.3, 6.1))) * 0.3;
  outField = vec4(carved.g, ring, ground, carved.r);
  outHeight = vec4(ground + uDetail * 0.1 * fine, 0.0, 0.0, 1.0);
}`,Fo=i=>`#version 300 es
#define BAKED ${i?1:0}
${Ze}
uniform sampler2D uField;
uniform ivec2 uOrigin;
uniform ivec2 uCamCell;
uniform vec2 uCamFrac;
uniform float uCell;
uniform int uStride;
uniform float uHeight;
uniform mat4 uViewProj;
out vec2 vTexel;
out vec2 vTerrain;
out float vDepth;
out float vLift;
out vec3 vNormal;

float ground(vec2 t) {
  return relief(t) + swell(t) * 0.14;
}

void main() {
  ivec2 step = ivec2(gl_VertexID >> 1, gl_InstanceID + (gl_VertexID & 1)) * uStride;
  ivec2 local = uOrigin + step;
  vec2 terrain = vec2(local + uCamCell) * uCell;
  vec2 world = vec2(local) * uCell - uCamFrac;
  float k = settle(world);
#if BAKED
  ivec2 texel = step + 2;
  vec4 c = texelFetch(uField, texel, 0);
  vec4 l = texelFetch(uField, texel - ivec2(1, 0), 0);
  vec4 r = texelFetch(uField, texel + ivec2(1, 0), 0);
  vec4 d = texelFetch(uField, texel - ivec2(0, 1), 0);
  vec4 u = texelFetch(uField, texel + ivec2(0, 1), 0);
  float h = (c.b - c.a) * k + c.a;
  float dx = (l.b - l.a - r.b + r.a) * k + l.a - r.a;
  float dz = (d.b - d.a - u.b + u.a) * k + d.a - u.a;
  vNormal = vec3(dx * uHeight / (2.0 * uCell), 1.0, dz * uHeight / (2.0 * uCell));
  vTexel = vec2(texel) + 0.5;
#else
  float h = ground(terrain) * k;
  float hx = ground(terrain + vec2(0.04, 0.0)) * k;
  float hz = ground(terrain + vec2(0.0, 0.04)) * k;
  vNormal = vec3((h - hx) * uHeight / 0.04, 1.0, (h - hz) * uHeight / 0.04);
  vTexel = vec2(0.0);
#endif
  vec4 clip = uViewProj * vec4(world.x, h * uHeight, world.y, 1.0);
  gl_Position = clip;
  vTerrain = terrain;
  vDepth = clip.w;
  vLift = h * uHeight;
}`,To=i=>`#version 300 es
#define BAKED ${i?1:0}
${Ze}
uniform sampler2D uField;
uniform highp sampler2D uHeightField;
uniform float uDetail;
uniform float uLines;
uniform float uLineWidth;
uniform float uMajor;
uniform vec3 uColor;
uniform float uBrightness;
uniform vec2 uFade;
uniform vec3 uFocus;
uniform vec4 uHeat;
uniform vec4 uLamp;
uniform vec4 uTrace;
uniform vec3 uSun;
uniform float uRefDepth;
uniform float uReveal;
uniform float uLightMode;
uniform float uOpacity;
uniform vec4 uGlitch[3];
uniform float uGlitchSeed;
uniform float uPixel;
in vec2 vTexel;
in vec2 vTerrain;
in float vDepth;
in float vLift;
in vec3 vNormal;
out vec4 outColor;

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float stroke(float dist, float width, float soft, float density, float crowd) {
  float cover = max(0.0, min(min(width, soft), 0.5 * (width + soft) - dist)) / soft;
  return mix(cover, min(width * density, 1.0) * 0.6, crowd);
}

float sampleHeight(vec2 coord, out vec2 slope) {
  vec2 u = coord - 0.5;
  vec2 i = floor(u + 0.5);
  vec2 f = u - i;
  vec3 wx = vec3(0.5 * (0.5 - f.x) * (0.5 - f.x), 0.75 - f.x * f.x, 0.5 * (0.5 + f.x) * (0.5 + f.x));
  vec3 wy = vec3(0.5 * (0.5 - f.y) * (0.5 - f.y), 0.75 - f.y * f.y, 0.5 * (0.5 + f.y) * (0.5 + f.y));
  vec3 dx = vec3(f.x - 0.5, -2.0 * f.x, 0.5 + f.x);
  vec3 dy = vec3(f.y - 0.5, -2.0 * f.y, 0.5 + f.y);
  ivec2 base = ivec2(i) - 1;
  float total = 0.0;
  slope = vec2(0.0);
  for (int y = 0; y < 3; y++) {
    float a = texelFetch(uHeightField, base + ivec2(0, y), 0).r;
    float b = texelFetch(uHeightField, base + ivec2(1, y), 0).r;
    float c = texelFetch(uHeightField, base + ivec2(2, y), 0).r;
    float row = a * wx.x + b * wx.y + c * wx.z;
    total += row * wy[y];
    slope += vec2((a * dx.x + b * dx.y + c * dx.z) * wy[y], row * dy[y]);
  }
  return total;
}

void main() {
  float py = gl_FragCoord.y / uPixel;
  float shift = 0.0;
  float split = 0.0;
  for (int i = 0; i < 3; i++) {
    if (py >= uGlitch[i].x && py < uGlitch[i].y) {
      shift = uGlitch[i].z * uPixel;
      split = uGlitch[i].w * uPixel;
    }
  }
  vec2 spot = vTerrain - dFdx(vTerrain) * shift;
#if BAKED
  vec2 ex = dFdx(vTexel);
  vec2 ey = dFdy(vTexel);
  vec2 coord = vTexel - ex * shift;
  vec2 slope;
  float h = sampleHeight(coord, slope);
  vec4 field = texture(uField, coord / vec2(textureSize(uField, 0)));
  float trail = field.r;
  float ring = field.g;
  float gx = dot(slope, ex) * uLines;
  float gy = dot(slope, ey) * uLines;
#else
  vec2 dp = spot * uFrequency * 5.0 + vec2(13.1, 4.7);
  float ring = swell(spot);
  float h = relief(spot) + ring * 0.14 + uDetail * 0.1 * (noise(dp) * 0.6 + noise(octave(dp, vec2(2.3, 6.1))) * 0.3);
  float trail = 0.0;
  float gx = dFdx(h) * uLines;
  float gy = dFdy(h) * uLines;
#endif

  float lc = h * uLines + 0.5;
  float density = max(sqrt(gx * gx + gy * gy), 1e-5);
  float dist = abs(fract(lc + 0.5) - 0.5) / density;
  float major = uMajor * (1.0 - step(0.5, mod(floor(lc + 0.5), 5.0)));

  vec2 hd = spot - uHeat.xy;
  float heat = exp(-dot(hd, hd) / (uHeat.z * uHeat.z)) * uHeat.w + trail * 0.6;
  float energy = heat + ring;

  float depth = max(vDepth, 0.01);
  float persp = clamp(sqrt(uRefDepth / depth), 0.6, 1.6);
  float width = uLineWidth * persp * (1.0 + 0.6 * major) * (1.0 + 0.45 * min(energy, 1.5));
  float soft = 1.0 + min(uFocus.y * abs(1.0 - uFocus.x / depth), uFocus.z);
  float crowd = smoothstep(0.3, 0.75, density * max(width, soft));
  float cover = stroke(dist, width, soft, density, crowd);
  vec3 cover3 = vec3(cover);
  if (split > 0.0) {
    float offset = split * density;
    cover3.r = stroke(abs(fract(lc + offset + 0.5) - 0.5) / density, width, soft, density, crowd);
    cover3.b = stroke(abs(fract(lc - offset + 0.5) - 0.5) / density, width, soft, density, crowd);
    vec2 block = floor(vec2(gl_FragCoord.x / (uPixel * 26.0), py / 5.0)) + uGlitchSeed * 71.0;
    float drop = fract(sin(dot(block, vec2(12.9898, 78.233))) * 43758.5453);
    cover3 *= drop > 0.82 ? 0.1 : 1.2;
  }

  vec3 normal = normalize(vNormal);
  float sun = clamp(dot(normal, uSun), 0.0, 1.0);
  vec3 toLamp = uLamp.xyz - vec3(vTerrain.x, vLift, vTerrain.y);
  float lampDistance = length(toLamp);
  float lamp = clamp(dot(normal, toLamp / max(lampDistance, 1e-3)), 0.0, 1.0) * uLamp.w / (1.0 + lampDistance * lampDistance * 0.9);
  float level = mix(0.45, 1.05, smoothstep(0.0, 1.1, h)) * mix(0.35, 1.25, sun * sun) * (1.0 + 0.6 * major);
  level += heat * 1.4 + ring * 3.0 + lamp * 1.2;

  float fade = 1.0 - smoother((depth - uFade.x) / max(uFade.y - uFade.x, 1e-3));
  vec3 light = cover3 * level;

  if (uTrace.y > 0.0) {
    float traceWidth = uLineWidth * persp * 1.8;
    float trace = stroke(abs(h - uTrace.x) * uLines / density, traceWidth, soft, density, crowd);
    vec2 td = spot - uTrace.zw;
    light += trace * uTrace.y * mix(0.35, 1.0, exp(-dot(td, td) / 20.0)) * 2.6;
  }
  light *= fade * uBrightness * uReveal;

  if (uLightMode > 0.5) {
    float ink = (1.0 - exp(-max(max(light.r, light.g), light.b) * 1.8)) * 0.92 * uOpacity;
    outColor = vec4(uColor * ink, ink);
    return;
  }

  vec3 color = 1.0 - exp(-uColor * light * 1.8);
  float top = max(max(color.r, color.g), color.b);
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  color = max(color + dither / 255.0 * step(0.002, top), 0.0);
  outColor = vec4(color, max(max(color.r, color.g), color.b)) * uOpacity;
}`,bo=`#version 300 es
${Ze}
uniform ivec2 uOrigin;
uniform ivec2 uCamCell;
uniform vec2 uCamFrac;
uniform float uSpacing;
uniform int uColumns;
uniform float uHeight;
uniform mat4 uViewProj;
uniform vec2 uView;
uniform float uSize;
uniform float uRefDepth;
uniform vec4 uHeat;
uniform float uTime;
uniform vec4 uGlitch[3];
uniform float uPixel;
out vec2 vCorner;
out float vSize;
out float vGlow;
out float vFrame;
out float vDepth;

void main() {
  ivec2 local = uOrigin + ivec2(gl_InstanceID % uColumns, gl_InstanceID / uColumns);
  ivec2 id = local + uCamCell;
  vec2 terrain = vec2(id) * uSpacing;
  vec2 world = vec2(local) * uSpacing - uCamFrac;
  float ring = swell(terrain);
  float h = (relief(terrain) + ring * 0.14) * settle(world) + sculpted(terrain).r;
  vec4 clip = uViewProj * vec4(world.x, h * uHeight + 0.05, world.y, 1.0);
  uint seed = lattice(id + ivec2(911, 377));
  float a = float(seed & 1023u) / 1023.0;
  float b = float((seed >> 10u) & 1023u) / 1023.0;
  vec2 hd = terrain - uHeat.xy;
  float heat = exp(-dot(hd, hd) / (uHeat.z * uHeat.z)) * uHeat.w;
  float blink = step(0.92, a) * (0.5 + 0.5 * sin(uTime * (1.4 + b * 2.2) + b * 40.0));
  float size = uSize * clamp(sqrt(uRefDepth / max(clip.w, 0.01)), 0.6, 1.3) * (1.0 + 0.4 * heat + 0.35 * blink);
  float frame = max(smoothstep(0.55, 0.95, blink), smoothstep(0.3, 0.8, heat));
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  vec2 offset = corner * (size * (frame > 0.001 ? 2.6 : 1.0) + 1.5);
  float py = (clip.y / clip.w * 0.5 + 0.5) * uView.y / uPixel;
  float shift = 0.0;
  for (int i = 0; i < 3; i++) {
    if (py >= uGlitch[i].x && py < uGlitch[i].y) shift = uGlitch[i].z;
  }
  clip.xy += (offset + vec2(shift * uPixel, 0.0)) / uView * 2.0 * clip.w;
  gl_Position = clip;
  vCorner = offset;
  vSize = size;
  vFrame = frame;
  vGlow = 0.5 + 0.4 * b + blink * 0.9 + heat * 1.8 + ring * 3.0;
  vDepth = clip.w;
}`,Mo=`#version 300 es
precision highp float;
uniform vec3 uColor;
uniform vec2 uFade;
uniform float uReveal;
uniform float uBrightness;
uniform float uLightMode;
uniform float uOpacity;
uniform float uStyle;
uniform float uPixel;
in vec2 vCorner;
in float vSize;
in float vGlow;
in float vFrame;
in float vDepth;
out vec4 outColor;

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 a = abs(vCorner);
  float cover;
  if (uStyle < 0.5) {
    float thick = max(0.6 * uPixel, 0.5);
    float across = clamp(vSize - a.x + 0.5, 0.0, 1.0) * clamp(thick - a.y + 0.5, 0.0, 1.0);
    float down = clamp(vSize - a.y + 0.5, 0.0, 1.0) * clamp(thick - a.x + 0.5, 0.0, 1.0);
    cover = max(across, down);
  } else {
    cover = clamp(vSize * 0.42 - length(vCorner) + 0.5, 0.0, 1.0);
  }
  if (vFrame > 0.001) {
    float edge = vSize * 2.3;
    float reach = edge * 0.45;
    float line = max(0.5 * uPixel, 0.5);
    float sides = clamp(line - abs(a.x - edge) + 0.5, 0.0, 1.0) * clamp(a.y - edge + reach + 0.5, 0.0, 1.0) * clamp(edge + line - a.y + 0.5, 0.0, 1.0);
    float caps = clamp(line - abs(a.y - edge) + 0.5, 0.0, 1.0) * clamp(a.x - edge + reach + 0.5, 0.0, 1.0) * clamp(edge + line - a.x + 0.5, 0.0, 1.0);
    cover = max(cover, max(sides, caps) * vFrame * 0.8);
  }
  float fade = 1.0 - smoother((vDepth - uFade.x) / max(uFade.y - uFade.x, 1e-3));
  float light = cover * vGlow * fade * fade * uReveal * uBrightness;
  if (uLightMode > 0.5) {
    float ink = (1.0 - exp(-light * 1.8)) * 0.92 * uOpacity;
    outColor = vec4(uColor * ink, ink);
    return;
  }
  vec3 color = 1.0 - exp(-uColor * light * 1.8);
  outColor = vec4(color, max(max(color.r, color.g), color.b)) * uOpacity;
}`,Le=`#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,Ro=`#version 300 es
precision highp float;
uniform sampler2D uPrevious;
uniform vec4 uSegment;
uniform vec4 uBrush;
uniform vec4 uBurst;
uniform vec2 uDecay;
out vec4 outColor;

vec2 wrapped(vec2 d) {
  return d - ${Ve}.0 * floor(d / ${Ve}.0 + 0.5);
}

void main() {
  vec4 previous = texelFetch(uPrevious, ivec2(gl_FragCoord.xy), 0);
  vec2 t = gl_FragCoord.xy / ${Ae}.0 * ${Ve}.0;
  vec2 a = wrapped(t - uSegment.xy);
  vec2 ab = uSegment.zw - uSegment.xy;
  float k = clamp(dot(a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec2 d = a - ab * k;
  float g = exp(-dot(d, d) / (uBrush.x * uBrush.x)) * uBrush.w;
  float height = previous.r * uDecay.x;
  height += (uBrush.y - height) * g * uBrush.z;
  float heat = previous.g * uDecay.y;
  heat += (1.0 - heat) * g * uBrush.z;
  vec2 b = wrapped(t - uBurst.xy);
  height += uBurst.w * exp(-dot(b, b) / (uBurst.z * uBurst.z));
  outColor = vec4(height, heat, 0.0, 1.0);
}`,So=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uTexel;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec4 color = texture(uSource, uv - uTexel);
  color += texture(uSource, uv + uTexel);
  color += texture(uSource, uv + vec2(uTexel.x, -uTexel.y));
  color += texture(uSource, uv + vec2(-uTexel.x, uTexel.y));
  outColor = min(color * 0.25, vec4(1.0));
}`,Co=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uStep;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec4 color = texture(uSource, uv) * 0.181862;
  color += (texture(uSource, uv + uStep * 1.423135) + texture(uSource, uv - uStep * 1.423135)) * 0.284316;
  color += (texture(uSource, uv + uStep * 3.326702) + texture(uSource, uv - uStep * 3.326702)) * 0.106598;
  color += (texture(uSource, uv + uStep * 5.242989) + texture(uSource, uv - uStep * 5.242989)) * 0.018156;
  outColor = color;
}`,Lo=`#version 300 es
precision highp float;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uBloom3;
uniform vec2 uView;
uniform float uGlow;
uniform float uLightMode;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  vec4 halo = texture(uBloom0, uv) * 0.4;
  halo += texture(uBloom1, uv) * 0.3;
  halo += texture(uBloom2, uv) * 0.2;
  halo += texture(uBloom3, uv) * 0.1;
  if (uLightMode > 0.5) {
    outColor = halo * uGlow * 0.35;
    return;
  }
  vec3 color = halo.rgb * uGlow * 1.6;
  color = color / (1.0 + color);
  outColor = vec4(color, max(max(color.r, color.g), color.b));
}`,L=(i,a,u)=>Math.min(u,Math.max(a,i)),ne=i=>{let a=L(i,0,1);return a*a*a*(a*(a*6-15)+10)},Ao=(i,a)=>{let u=Math.imul(i+1073741824,2654435761)+Math.imul(a+1073741824,2246822519)>>>0;return u=Math.imul(u^u>>>15,739982445)>>>0,u=Math.imul(u^u>>>12,695872825)>>>0,(u^u>>>15)>>>0},Xe=(i,a,u,n)=>{let l=Ao(i,a);return((l&65535)/32767.5-1)*u+((l>>>16)/32767.5-1)*n},ae=(i,a)=>{let u=Math.floor(i),n=Math.floor(a),l=i-u,m=a-n,A=l*l*l*(l*(l*6-15)+10),q=m*m*m*(m*(m*6-15)+10),X=Xe(u,n,l,m),O=Xe(u+1,n,l-1,m),p=Xe(u,n+1,l,m-1),F=Xe(u+1,n+1,l-1,m-1),I=X+(O-X)*A;return I+(p+(F-p)*A-I)*q},Ut=(i,a,u,n,l)=>{let m=i*u,A=a*u,q=ae(m*.42+n,A*.42+l),X=ae(m*.42-l+5.2,A*.42-n+1.3);m+=q*.8,A+=X*.8;let O=ae(m,A)*.55,p=1.6*m-1.2*A+7.1,F=1.2*m+1.6*A+3.7;O+=ae(p,F)*.15,O+=ae(1.6*p-1.2*F+1.9,1.2*p+1.6*F+8.3)*.04;let I=Math.log(1+Math.exp(7*(3*O+.05)))/7;return I*I*1.4+.1*O},Do=(i,a,u)=>{let n=i*u*5+13.1,l=a*u*5+4.7;return ae(n,l)*.6+ae(1.6*n-1.2*l+2.3,1.2*n+1.6*l+6.1)*.3},Ht=(i,a,u)=>{let n=i.createShader(a);return n?(i.shaderSource(n,u),i.compileShader(n),n):null},ue=(i,a,u)=>{let n=Ht(i,i.VERTEX_SHADER,a),l=Ht(i,i.FRAGMENT_SHADER,u),m=i.createProgram();return!n||!l||!m?null:(i.attachShader(m,n),i.attachShader(m,l),i.linkProgram(m),i.deleteShader(n),i.deleteShader(l),{program:m,uniforms:{}})},Xt=(i,a)=>{if(!i.getProgramParameter(a.program,i.LINK_STATUS))return!1;let u=i.getProgramParameter(a.program,i.ACTIVE_UNIFORMS);for(let n=0;n<u;n++){let l=i.getActiveUniform(a.program,n);l&&(a.uniforms[l.name.replace(/\[0\]$/,"")]=i.getUniformLocation(a.program,l.name))}return!0},_o=i=>{let a=String(i||"#ffffff").replace("#","").trim();(a.length===3||a.length===4)&&(a=a.slice(0,3).split("").map(n=>n+n).join(""));let u=parseInt(a.slice(0,6),16);return Number.isNaN(u)?[1,1,1]:[(u>>16&255)/255,(u>>8&255)/255,(u&255)/255]},Po=(i,a)=>{let u=Math.cos(a),n=[Math.sin(i)*u,-Math.sin(a),Math.cos(i)*u],l=[Math.cos(i),0,-Math.sin(i)],m=[n[1]*l[2]-n[2]*l[1],n[2]*l[0]-n[0]*l[2],n[0]*l[1]-n[1]*l[0]];return{f:n,r:l,u:m}},lt=i=>L(.4877/i,po,.6),No=({eye:i,f:a,r:u,u:n},l,m)=>{let A=1/lt(l),q=1/(ve-Ge),X=[u[0],n[0],-a[0],0,u[1],n[1],-a[1],0,u[2],n[2],-a[2],0,-(u[0]*i[0]+u[1]*i[1]+u[2]*i[2]),-(n[0]*i[0]+n[1]*i[1]+n[2]*i[2]),a[0]*i[0]+a[1]*i[1]+a[2]*i[2],1],O=[A/l,0,0,0,0,A,0,0,0,0,(Ge+ve)*q,-1,0,0,2*Ge*ve*q,0];for(let p=0;p<4;p++)for(let F=0;F<4;F++){let I=0;for(let Z=0;Z<4;Z++)I+=O[Z*4+F]*X[p*4+Z];m[p*4+F]=I}return m},Bo=({color:i="#4f7cff",lineCount:a=22,lineWidth:u=1.2,majorLines:n=!0,elevation:l=1,foreground:m=.2,scale:A=1,detail:q=.35,tilt:X=32,speed:O=.25,direction:p="forward",morph:F=.2,glow:I=.6,depthOfField:Z=.4,fog:te=.35,brightness:ce=1,opacity:$e=1,mouseInteraction:Vt=!0,hoverEffect:ft="lift",mouseRadius:qt=1,mouseStrength:Zt=.6,trail:$t=.3,parallax:jt=.5,clickEffect:Kt="pulse",markers:Wt="none",glitch:Yt=0,intro:Qt=!0,lightMode:Jt=!1,dpr:eo,className:to="",style:oo})=>{let st=ie(null),ht=ie(null),je=ie(null),De=ie(0),[ro,io]=at(0),mt={color:i,lineCount:L(a,2,80),lineWidth:Math.max(.2,u),majorLines:n,elevation:L(l,0,3),foreground:L(m,0,1),scale:L(A,.2,5),detail:L(q,0,1),tilt:L(X,12,90),speed:O,direction:kt[p]??kt.forward,morph:Math.max(0,F),glow:Math.max(0,I),depthOfField:L(Z,0,1),fog:L(te,0,1),brightness:Math.max(0,ce),opacity:L($e,0,1),mouseInteraction:Vt,hoverEffect:go.includes(ft)?ft:"lift",mouseRadius:Math.max(.1,qt),mouseStrength:Math.max(0,Zt),trail:L($t,0,1),parallax:L(jt,0,1),clickEffect:Kt,markers:yo[Wt]??-1,glitch:L(Yt,0,1),intro:Qt,lightMode:Jt,dpr:eo},G=ie(mt);return G.current=mt,He(()=>{let le=st.current,_=ht.current,no=Math.min(G.current.dpr||window.devicePixelRatio||1,2),e=_?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:no<1.5,depth:!0,stencil:!1,powerPreference:"high-performance"});if(!le||!_||!e)return;cancelAnimationFrame(De.current),De.current=0;let _e=e.getExtension("KHR_parallel_shader_compile"),xe=!!e.getExtension("EXT_color_buffer_float"),ge=ue(e,Fo(xe),To(xe)),W=xe?ue(e,Le,wo):null,Y=xe?ue(e,Le,Ro):null,oe=ue(e,Le,So),Q=ue(e,Le,Co),ye=ue(e,Le,Lo),Ee=ue(e,bo,Mo);if(!ge||!oe||!Q||!ye||!Ee)return;let Ke=()=>[ge,W,Y,oe,Q,ye,Ee].filter(Boolean),dt=()=>!_e||Ke().every(t=>e.getProgramParameter(t.program,_e.COMPLETION_STATUS_KHR)),pt=t=>!t||Xt(e,t)?t:(e.deleteProgram(t.program),null),vt=()=>(W=pt(W),Y=pt(Y),[ge,oe,Q,ye,Ee].every(t=>Xt(e,t)));if(!_e&&!vt()){Ke().forEach(t=>e.deleteProgram(t.program));return}let xt=t=>t.preventDefault(),gt=()=>io(t=>t+1);_.addEventListener("webglcontextlost",xt),_.addEventListener("webglcontextrestored",gt);let yt=e.createVertexArray(),uo=xe?e.RGBA16F:e.RGBA8,we=(t,r,c,s)=>{let f=e.createTexture();return e.bindTexture(e.TEXTURE_2D,f),e.texStorage2D(e.TEXTURE_2D,1,c,t,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,s),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,s),f},We=()=>({texture:null,framebuffer:e.createFramebuffer(),depth:null,width:0,height:0}),Ye=(t,r,c,s)=>{t.texture&&t.width===r&&t.height===c||(t.texture&&e.deleteTexture(t.texture),t.texture=we(r,c,uo,e.CLAMP_TO_EDGE),t.width=r,t.height=c,e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0),s&&(t.depth||(t.depth=e.createRenderbuffer()),e.bindRenderbuffer(e.RENDERBUFFER,t.depth),e.renderbufferStorage(e.RENDERBUFFER,e.DEPTH_COMPONENT24,r,c),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.RENDERBUFFER,t.depth)))},Pe=We(),Ne=Array.from({length:zt},()=>[We(),We()]),B=Y?[0,1].map(()=>{let t=we(Ae,Ae,e.RG16F,e.REPEAT),r=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,r),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),{texture:t,framebuffer:r}}):null,Fe=we(1,1,e.RGBA8,e.REPEAT),E={texture:null,heights:null,framebuffer:e.createFramebuffer(),width:0,height:0},fe=0,ao=(t,r)=>{E.texture&&t<=E.width&&r<=E.height||(E.texture&&e.deleteTexture(E.texture),E.heights&&e.deleteTexture(E.heights),E.width=Math.max(t,Math.ceil(E.width*1.25),64),E.height=Math.max(r,Math.ceil(E.height*1.25),64),E.texture=we(E.width,E.height,e.RGBA16F,e.CLAMP_TO_EDGE),E.heights=we(E.width,E.height,e.R32F,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,E.heights),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.bindFramebuffer(e.FRAMEBUFFER,E.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,E.texture,0),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT1,e.TEXTURE_2D,E.heights,0),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]))},$=(t,r)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r)},J=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,Qe=new Float32Array(16),Te=new Float32Array(qe*4),se=new Float32Array(12),z={until:0,next:1.5,roll:0,seed:0},Je=7919,j=()=>(Je=Je*16807%2147483647,(Je-1)/2147483646),K=[],k={x:0,y:0,inside:!1},d={width:1,height:1,ratio:1,cell:.05,cellKey:""},o={intro:G.current.intro&&!J?0:1,rise:1,travelX:0,travelZ:0,morph:0,yaw:0,pitch:0,yawVelocity:0,pitchVelocity:0,presence:0,focus:It,hit:null,brushFrom:null,sculptLife:0,burst:null,level:0,trace:0,clock:0,tilt:G.current.tilt,elevation:G.current.elevation,scale:G.current.scale};o.rise=ne(o.intro);let he=0,Be=0,Oe=!0,Ie=0,ze=!_e,Et=!1,et=()=>{let t=Math.min(o.tilt*Math.PI/180+o.pitch,Math.PI/2-1e-4),r=Po(o.yaw,t),c=o.elevation*Se*o.rise*.18,s=o.elevation*Se*o.rise*1.3+.9,f=Math.max(It,(s-c)/Math.sin(t));return{...r,distance:f,eye:[-r.f[0]*f,c-r.f[1]*f,-r.f[2]*f]}},tt=(t,r,c)=>{let s=d.width/d.height,f=lt(s),x=[0,1,2].map(v=>t.f[v]+t.r[v]*r*f*s+t.u[v]*c*f),C=Math.hypot(x[0],x[1],x[2]);return x.map(v=>v/C)},ot=(t,r)=>r[0]*t.f[0]+r[1]*t.f[1]+r[2]*t.f[2],rt=(t,r)=>{let c=tt(t,0,r);return c[1]>-.001?1/0:t.eye[1]/-c[1]*ot(t,c)},wt=(t,r)=>[rt(t,-1)*.9,t.distance,r.foreground],co=(t,r,c,s)=>{let f=(c-t.eye[0])*t.f[0]-t.eye[1]*t.f[1]+(s-t.eye[2])*t.f[2];return r[2]+(1-r[2])*ne((f-r[0])/Math.max(r[1]-r[0],.001))},Ft=(t,r,c,s)=>{let f=tt(t,c,s),x=o.elevation*Se*o.rise,C=Ce/o.scale,v=wt(t,r),T=y=>{let U=t.eye[0]+f[0]*y,S=t.eye[2]+f[2]*y,re=Ut(o.travelX+U,o.travelZ+S,C,o.morph*.37,o.morph*.23);return t.eye[1]+f[1]*y-re*x*co(t,v,U,S)},R=ve,P=T(R);for(let y=0;y<200&&R<Ge*.5;y++){let U=R+Math.max(.02,P*.4),S=T(U);if(S<0){let re=R,H=U;for(let be=0;be<10;be++){let M=(re+H)*.5;T(M)<0?H=M:re=M}return{x:o.travelX+t.eye[0]+f[0]*H,y:t.eye[1]+f[1]*H,z:o.travelZ+t.eye[2]+f[2]*H,depth:H*ot(t,f)}}R=U,P=S}return null},lo=(t,r,c)=>{let s=o.elevation*Se*o.rise*1.7+.2+r.mouseStrength,f={minX:1/0,maxX:-1/0,minZ:1/0,maxZ:-1/0,near:1/0},x=(C,v)=>{let T=t.eye[0]+C[0]*v,R=t.eye[2]+C[2]*v;f.minX=Math.min(f.minX,T),f.maxX=Math.max(f.maxX,T),f.minZ=Math.min(f.minZ,R),f.maxZ=Math.max(f.maxZ,R)};for(let C of[-1.08,0,1.08])for(let v of[-1.08,1.08]){let T=tt(t,C,v),R=Math.max(ot(t,T),.001),P=ve,y=c*1.05/R;T[1]<-1e-4&&(P=Math.max(ve,(t.eye[1]-s)/-T[1]),y=Math.min(y,t.eye[1]/-T[1])),P=Math.min(P,y),x(T,P),x(T,y),f.near=Math.min(f.near,P*R)}return f},Tt=(t,r)=>{let c=Math.floor(o.travelX/r),s=Math.floor(o.travelZ/r),f=o.travelX-c*r,x=o.travelZ-s*r,C=Math.floor((t.minX+f)/r)-2,v=Math.floor((t.minZ+x)/r)-2,T=L(Math.ceil((t.maxX+f)/r)+2-C,1,4e3),R=L(Math.ceil((t.maxZ+x)/r)+2-v,1,Math.floor(ct*1.5/T));return{cell:r,camX:c,camZ:s,fracX:f,fracZ:x,k0:C,m0:v,columns:T,rows:R}},it=()=>{if(!ze)return;let t=G.current,r=et();No(r,d.width/d.height,Qe);let c=rt(r,-1),s=Math.min(rt(r,1),r.distance*3.2),f=Math.max(s,c*1.6,r.distance*1.4),x=f+(c*1.8-f)*t.fog,C=x*.7+(c*.7-x*.7)*t.fog,v=lo(r,t,x),T=`${d.width}x${d.height}@${d.ratio}|${Math.round(o.tilt/4)}|${Math.round(o.elevation*5)}|${t.fog}`;if(T!==d.cellKey){d.cellKey=T;let w=d.height*d.ratio*.5/lt(d.width/d.height),D=L(14*Math.max(v.near,.5)/w,.02,.4),b=(v.maxX-v.minX)*(v.maxZ-v.minZ)/(D*D);b>ct&&(D*=Math.sqrt(b/ct)),d.cell=D}let R=_o(t.color),P=o.elevation*Se*o.rise,y=Tt(v,d.cell),U=wt(r,t),S=t.markers>=0?Tt(v,Eo):null,H=(o.hit&&t.mouseInteraction?o.presence:0)*(.35+.5*t.mouseStrength),be=t.depthOfField*d.height*.016,M=ne(o.intro/.35),V=o.hit?o.hit.x:0,me=o.hit?o.hit.z:0;if(Te.fill(0),K.forEach((w,D)=>{Te.set([w.x,w.z,w.age*4.2,Math.exp(-w.age*1.1)*ne(w.age/.08)],D*4)}),e.bindVertexArray(yt),W){let w=y.columns+7,D=y.rows+7;ao(w,D),e.bindFramebuffer(e.FRAMEBUFFER,E.framebuffer),e.viewport(0,0,w,D),e.useProgram(W.program);let b=W.uniforms;$(0,B?B[fe].texture:Fe),e.uniform1i(b.uSculpt,0),e.uniform1f(b.uSculptOn,B?1:0),e.uniform1f(b.uFrequency,Ce/o.scale),e.uniform2f(b.uMorph,o.morph*.37,o.morph*.23),e.uniform4fv(b.uPulses,Te),e.uniform2i(b.uBase,y.k0-2+y.camX,y.m0-2+y.camZ),e.uniform1f(b.uCell,y.cell),e.uniform1f(b.uDetail,t.detail),e.disable(e.DEPTH_TEST),e.disable(e.BLEND),e.drawArrays(e.TRIANGLES,0,3)}let Me=(w,D,b,N)=>{e.viewport(0,0,D,b),e.useProgram(ge.program);let h=ge.uniforms;if($(0,W?E.texture:Fe),e.uniform1i(h.uField,0),$(1,W?E.heights:Fe),e.uniform1i(h.uHeightField,1),e.uniform1f(h.uFrequency,Ce/o.scale),e.uniform2f(h.uMorph,o.morph*.37,o.morph*.23),e.uniform4fv(h.uPulses,Te),e.uniform2i(h.uOrigin,y.k0,y.m0),e.uniform2i(h.uCamCell,y.camX,y.camZ),e.uniform2f(h.uCamFrac,y.fracX,y.fracZ),e.uniform1f(h.uCell,y.cell),e.uniform1i(h.uStride,N),e.uniform1f(h.uHeight,P),e.uniform3fv(h.uEye,r.eye),e.uniform3fv(h.uForward,r.f),e.uniform3fv(h.uNear,U),e.uniform1f(h.uRefDepth,r.distance),e.uniformMatrix4fv(h.uViewProj,!1,Qe),e.uniform1f(h.uDetail,t.detail),e.uniform1f(h.uLines,t.lineCount),e.uniform1f(h.uLineWidth,t.lineWidth*w),e.uniform1f(h.uMajor,t.majorLines?1:0),e.uniform3fv(h.uColor,R),e.uniform1f(h.uBrightness,t.brightness),e.uniform2f(h.uFade,C,x),e.uniform3f(h.uFocus,o.focus,be*w,d.height*.03*w),e.uniform4f(h.uHeat,V,me,.9*t.mouseRadius,H),e.uniform4f(h.uLamp,V,o.hit?o.hit.y+1.4:0,me,H),e.uniform4f(h.uTrace,o.level,o.trace,V,me),e.uniform3fv(h.uSun,xo),e.uniform1f(h.uReveal,M),e.uniform1f(h.uLightMode,t.lightMode?1:0),e.uniform1f(h.uOpacity,t.opacity),e.uniform4fv(h.uGlitch,se),e.uniform1f(h.uGlitchSeed,z.seed),e.uniform1f(h.uPixel,w),e.enable(e.DEPTH_TEST),e.depthFunc(e.LESS),e.disable(e.BLEND),e.clearColor(0,0,0,0),e.clearDepth(1),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,2*(Math.ceil(y.columns/N)+1),Math.ceil(y.rows/N)),S){e.useProgram(Ee.program);let g=Ee.uniforms;$(2,B?B[fe].texture:Fe),e.uniform1i(g.uSculpt,2),e.uniform1f(g.uSculptOn,B?1:0),e.uniform1f(g.uFrequency,Ce/o.scale),e.uniform2f(g.uMorph,o.morph*.37,o.morph*.23),e.uniform4fv(g.uPulses,Te),e.uniform3fv(g.uEye,r.eye),e.uniform3fv(g.uForward,r.f),e.uniform3fv(g.uNear,U),e.uniform2i(g.uOrigin,S.k0,S.m0),e.uniform2i(g.uCamCell,S.camX,S.camZ),e.uniform2f(g.uCamFrac,S.fracX,S.fracZ),e.uniform1f(g.uSpacing,S.cell),e.uniform1i(g.uColumns,S.columns+1),e.uniform1f(g.uHeight,P),e.uniformMatrix4fv(g.uViewProj,!1,Qe),e.uniform2f(g.uView,D,b),e.uniform1f(g.uSize,4*w),e.uniform1f(g.uRefDepth,r.distance),e.uniform4f(g.uHeat,V,me,1.2*t.mouseRadius,H),e.uniform1f(g.uTime,o.clock),e.uniform4fv(g.uGlitch,se),e.uniform1f(g.uPixel,w),e.uniform3fv(g.uColor,R),e.uniform2f(g.uFade,C,x),e.uniform1f(g.uReveal,M),e.uniform1f(g.uBrightness,t.brightness),e.uniform1f(g.uLightMode,t.lightMode?1:0),e.uniform1f(g.uOpacity,t.opacity),e.uniform1f(g.uStyle,t.markers),e.depthFunc(e.LEQUAL),e.depthMask(!1),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,(S.columns+1)*(S.rows+1)),e.disable(e.BLEND),e.depthMask(!0)}e.disable(e.DEPTH_TEST)},Ue=t.glow>.001;if(Ue){let w=Math.max(1,Math.round(d.width/2)),D=Math.max(1,Math.round(d.height/2));Ye(Pe,w,D,!0),Ne.forEach((N,h)=>{let g=Math.max(1,Math.round(d.width/2**(h+2))),Nt=Math.max(1,Math.round(d.height/2**(h+2)));Ye(N[0],g,Nt,!1),Ye(N[1],g,Nt,!1)}),e.bindFramebuffer(e.FRAMEBUFFER,Pe.framebuffer),Me(.5,w,D,2);let b=Pe;Ne.forEach(([N,h])=>{e.bindFramebuffer(e.FRAMEBUFFER,N.framebuffer),e.viewport(0,0,N.width,N.height),e.useProgram(oe.program),$(0,b.texture),e.uniform1i(oe.uniforms.uSource,0),e.uniform2f(oe.uniforms.uTarget,N.width,N.height),e.uniform2f(oe.uniforms.uTexel,1/b.width,1/b.height),e.drawArrays(e.TRIANGLES,0,3),e.useProgram(Q.program),e.uniform1i(Q.uniforms.uSource,0),e.uniform2f(Q.uniforms.uTarget,h.width,h.height),e.bindFramebuffer(e.FRAMEBUFFER,h.framebuffer),$(0,N.texture),e.uniform2f(Q.uniforms.uStep,1/N.width,0),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,N.framebuffer),$(0,h.texture),e.uniform2f(Q.uniforms.uStep,0,1/h.height),e.drawArrays(e.TRIANGLES,0,3),b=N})}if(e.bindFramebuffer(e.FRAMEBUFFER,null),Me(d.ratio,_.width,_.height,1),Ue){e.viewport(0,0,_.width,_.height),e.useProgram(ye.program);let w=ye.uniforms;Ne.forEach(([D],b)=>{$(b,D.texture),e.uniform1i(w[`uBloom${b}`],b)}),e.uniform2f(w.uView,_.width,_.height),e.uniform1f(w.uGlow,t.glow*M),e.uniform1f(w.uLightMode,t.lightMode?1:0),e.enable(e.BLEND),t.lightMode?e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA):e.blendFunc(e.ONE,e.ONE),e.drawArrays(e.TRIANGLES,0,3),e.disable(e.BLEND)}for(let w=zt;w>=0;w--)$(w,null)},fo=(t,r)=>{if(!B||!Y)return!1;let c=t.mouseInteraction&&t.hoverEffect==="lift"&&o.presence>.001?o.hit:null,s=o.burst;if(!c&&!s&&o.sculptLife<=0)return!1;let f=o.brushFrom||c,x=B[fe],C=B[1-fe];e.bindFramebuffer(e.FRAMEBUFFER,C.framebuffer),e.viewport(0,0,Ae,Ae),e.useProgram(Y.program);let v=Y.uniforms;if($(0,x.texture),e.uniform1i(v.uPrevious,0),c&&f?e.uniform4f(v.uSegment,f.x,f.z,c.x,c.z):e.uniform4f(v.uSegment,0,0,0,0),e.uniform4f(v.uBrush,1.1*t.mouseRadius,.9*t.mouseStrength,1-Math.exp(-r*7),c?o.presence:0),s){let R=ne(s.age/.7);s.age+=r;let P=(ne(s.age/.7)-R)*.9*Math.max(t.mouseStrength,.3);e.uniform4f(v.uBurst,s.x,s.z,1.6*t.mouseRadius,P),s.age>=.7&&(o.burst=null)}else e.uniform4f(v.uBurst,0,0,1,0);let T=.25+3*t.trail*t.trail;return e.uniform2f(v.uDecay,Math.exp(-r/T),Math.exp(-r/.7)),e.disable(e.BLEND),e.drawArrays(e.TRIANGLES,0,3),fe=1-fe,o.brushFrom=c?{x:c.x,z:c.z}:null,c||s?o.sculptLife=T*6:o.sculptLife-=r,!0},bt=G.current.dpr,nt=()=>{let t=G.current;bt=t.dpr,d.width=Math.max(1,le.clientWidth),d.height=Math.max(1,le.clientHeight),d.ratio=Math.min(t.dpr||window.devicePixelRatio||1,2),_.width=Math.max(1,Math.round(d.width*d.ratio)),_.height=Math.max(1,Math.round(d.height*d.ratio)),it(),ee()},ut=t=>{if(he=0,!Oe||document.hidden)return;if(!ze){if(e.isContextLost())return;if(!dt()){he=requestAnimationFrame(ut);return}if(!vt()){Pt();return}!Y&&B&&(B.forEach(M=>{e.deleteTexture(M.texture),e.deleteFramebuffer(M.framebuffer)}),B=null),ze=!0,it()}let r=G.current;r.dpr!==bt&&nt();let c=Be?L((t-Be)/1e3,0,1/20):1/60;Be=t,!r.intro||J?o.intro=1:o.intro<1&&(o.intro=Math.min(1,o.intro+c/vo)),o.rise=ne(o.intro);let s=J?1:1-Math.exp(-c/.4);o.tilt+=(r.tilt-o.tilt)*s,o.elevation+=(r.elevation-o.elevation)*s,o.scale=r.scale,o.clock+=c;let f=J?0:r.glitch;if(f>0)if(o.clock>=z.next&&o.clock>=z.until&&(z.until=o.clock+.1+j()*.22*(.5+f),z.next=z.until+(9-7.4*f)*(.45+j()*1.1),z.roll=0),o.clock<z.until){if(o.clock>=z.roll){se.fill(0);let M=1+Math.floor(j()*3);for(let V=0;V<M;V++){let me=3+j()*j()*d.height*.14,Me=j()*d.height,Ue=(j()-.5)*2*(10+46*f);se.set([Me,Me+me,Ue,1+j()*3*f],V*4)}z.seed=j(),z.roll=o.clock+.04+j()*.05}}else se.fill(0);else se.fill(0);J||(o.travelX+=r.direction[0]*r.speed*.8*c,o.travelZ+=r.direction[1]*r.speed*.8*c,o.morph+=r.morph*.12*c);let x=k.inside&&r.mouseInteraction;o.presence+=((x?1:0)-o.presence)*(1-Math.exp(-c/(x?.18:.45)));let C=k.x/d.width*2-1,v=1-k.y/d.height*2,T=J||!x?0:r.parallax,R=C*T*.09,P=-v*T*.045;o.yawVelocity+=(38*(R-o.yaw)-11*o.yawVelocity)*c,o.pitchVelocity+=(38*(P-o.pitch)-11*o.pitchVelocity)*c,o.yaw+=o.yawVelocity*c,o.pitch+=o.pitchVelocity*c;let y=et();x?(o.hit=Ft(y,r,C,v),o.hit&&o.brushFrom&&Math.hypot(o.hit.x-o.brushFrom.x,o.hit.z-o.brushFrom.z)>3*r.mouseRadius&&(o.brushFrom=null)):o.presence<.002&&(o.hit=null,o.brushFrom=null);let U=o.hit&&r.mouseInteraction&&r.hoverEffect==="trace"?o.presence:0;if(o.hit){let M=Ce/o.scale,V=Ut(o.hit.x,o.hit.z,M,o.morph*.37,o.morph*.23)+r.detail*.1*Do(o.hit.x,o.hit.z,M);o.level=o.trace<.01?V:o.level+(V-o.level)*(1-Math.exp(-c/.09))}o.trace+=(U-o.trace)*(1-Math.exp(-c/.2));let S=o.hit&&r.depthOfField>0?o.hit.depth:y.distance;o.focus+=(S-o.focus)*(1-Math.exp(-c/.35));for(let M=K.length-1;M>=0;M--)K[M].age+=c,K[M].age>4&&K.splice(M,1);let re=fo(r,c);it();let H=Math.abs(r.tilt-o.tilt)>.01||Math.abs(r.elevation-o.elevation)>1e-4||Math.abs(o.yaw-R)>1e-4||Math.abs(o.pitch-P)>1e-4||Math.abs(o.yawVelocity)>1e-4||Math.abs(o.pitchVelocity)>1e-4||Math.abs(S-o.focus)>.001||Math.abs(U-o.trace)>.001;Ie=!J&&(r.speed!==0||r.morph!==0||r.glitch>0||r.markers>=0)||o.intro<1||K.length>0||re||H||o.presence>.001&&o.presence<.999?0:Ie+c,Ie<.5&&(he=requestAnimationFrame(ut))};function ee(){Ie=0,!he&&Oe&&!document.hidden&&(Be=0,he=requestAnimationFrame(ut))}let Mt=t=>{let r=le.getBoundingClientRect(),c=t.clientX-r.left,s=t.clientY-r.top;return{x:c,y:s,inside:c>=0&&s>=0&&c<=r.width&&s<=r.height}},Rt=t=>{let{x:r,y:c,inside:s}=Mt(t),f=k.inside;k.inside=s,s&&(k.x=r,k.y=c),(s||f)&&ee()},St=t=>{let r=G.current,{x:c,y:s,inside:f}=Mt(t);if(!f||(k.x=c,k.y=s,k.inside=!0,ee(),r.glitch>0&&!J&&(z.until=o.clock+.16,z.roll=0),!r.mouseInteraction||r.clickEffect!=="pulse"&&r.clickEffect!=="peak"))return;let x=Ft(et(),r,c/d.width*2-1,1-s/d.height*2);x&&(r.clickEffect==="peak"&&B?o.burst={x:x.x,z:x.z,age:0}:r.clickEffect==="pulse"&&(K.length>=qe&&K.shift(),K.push({x:x.x,z:x.z,age:0})))},ke=t=>{t.pointerType==="touch"&&(k.inside=!1,ee())},Ct=()=>{k.inside=!1,ee()},Lt=()=>ee(),At=new ResizeObserver(nt);At.observe(le);let Dt=new IntersectionObserver(t=>{Oe=t.some(r=>r.isIntersecting),Oe&&ee()});Dt.observe(le),window.addEventListener("pointermove",Rt,{passive:!0}),window.addEventListener("pointerdown",St,{passive:!0}),window.addEventListener("pointerup",ke,{passive:!0}),window.addEventListener("pointercancel",ke,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ct),document.addEventListener("visibilitychange",Lt);let _t=()=>{if(!e.isContextLost()){if(!ze&&!dt()){requestAnimationFrame(_t);return}Ke().forEach(t=>e.deleteProgram(t.program))}},Pt=()=>{Et||(Et=!0,cancelAnimationFrame(he),je.current=null,At.disconnect(),Dt.disconnect(),window.removeEventListener("pointermove",Rt),window.removeEventListener("pointerdown",St),window.removeEventListener("pointerup",ke),window.removeEventListener("pointercancel",ke),document.documentElement.removeEventListener("pointerleave",Ct),document.removeEventListener("visibilitychange",Lt),_.removeEventListener("webglcontextlost",xt),_.removeEventListener("webglcontextrestored",gt),[Pe,...Ne.flat()].forEach(t=>{t.texture&&e.deleteTexture(t.texture),t.depth&&e.deleteRenderbuffer(t.depth),e.deleteFramebuffer(t.framebuffer)}),B?.forEach(t=>{e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer)}),e.deleteTexture(Fe),e.deleteVertexArray(yt),E.texture&&e.deleteTexture(E.texture),E.heights&&e.deleteTexture(E.heights),e.deleteFramebuffer(E.framebuffer),_t())};return nt(),je.current=ee,()=>{Pt();let t=()=>{De.current=0,!_.isConnected&&!e.isContextLost()&&e.getExtension("WEBGL_lose_context")?.loseContext()};_.isConnected?De.current=requestAnimationFrame(t):t()}},[ro]),He(()=>{je.current?.()}),pe("div",{ref:st,className:`topography-container ${to}`.trim(),style:oo},pe("canvas",{ref:ht,className:"topography-canvas","aria-hidden":"true"}))},Gt=Bo;Ot("topography",Gt);})();
