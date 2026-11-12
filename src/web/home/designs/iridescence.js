/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var j=null,D=Symbol("Fragment");function We(s,a,r){if(a==="ref"){typeof r=="function"?r(s):r&&(r.current=s);return}if(!(a==="children"||r==null||r===!1)){if(a==="className"){s.setAttribute("class",r);return}if(a==="style"){for(let n in r){let v=r[n];v==null||v===!1||(n.startsWith("--")?s.style.setProperty(n,String(v)):s.style[n]=typeof v=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(n)?v+"px":v)}return}if(/^on[A-Z]/.test(a)&&typeof r=="function"){s.addEventListener(a.slice(2).toLowerCase(),r);return}if(a==="htmlFor"){s.setAttribute("for",r);return}s.setAttribute(a,r===!0?"":String(r))}}function Ce(s,a){for(let r of a)r==null||r===!1||r===!0||(Array.isArray(r)?Ce(s,r):r instanceof Node?s.appendChild(r):s.appendChild(document.createTextNode(String(r))))}function I(s,a,...r){if(typeof s=="function")return s({...a,children:r});let n=s===D?document.createDocumentFragment():document.createElement(s);if(s!==D)for(let v in a||{})We(n,v,a[v]);return Ce(n,r),n}var He=(s,a)=>s&&a&&s.length===a.length&&s.every((r,n)=>Object.is(r,a[n]));function k(s){let a=j,r=a.i++;return a.hooks[r]||(a.hooks[r]={current:s})}function V(s,a){let r=j,n=r.i++;r.effects.push([n,s,a])}function qe(s,a,r){let n={hooks:[],effects:[],i:0,cleanups:[],props:a,dead:!1,queued:!1,tree:null},v=()=>{let l=n.effects;n.effects=[];for(let[x,M,y]of l){let T=n.cleanups[x];if(T&&y&&He(T.deps,y))continue;if(T&&T.fn)try{T.fn()}catch{}let F;try{F=M()}catch{F=null}n.cleanups[x]={deps:y,fn:typeof F=="function"?F:null}}},X=l=>{j=n,n.i=0,n.effects=[];let x;try{x=s(n.props)}finally{j=null}l&&(n.tree=x,x instanceof Node&&r.appendChild(x)),v()};n.queue=()=>{n.queued||n.dead||(n.queued=!0,Promise.resolve().then(()=>{n.queued=!1,n.dead||X(!1)}))},X(!0);let G=n.tree instanceof Node?n.tree:r,$=["pointermove","mousemove"],Z=["clientX","clientY","screenX","screenY","button","buttons","ctrlKey","shiftKey","altKey","metaKey","pointerId","pointerType","isPrimary","width","height","pressure","movementX","movementY"],B=l=>{if(n.dead||l.__hubFwd||l.target instanceof Element&&l.target.closest("input,textarea,select"))return;let x={bubbles:!1,cancelable:!1};for(let y of Z)y in l&&(x[y]=l[y]);let M;try{M=new l.constructor(l.type,x)}catch{return}M.__hubFwd=!0,G.dispatchEvent(M)},W=$.filter(()=>matchMedia("(pointer: fine)").matches);return W.forEach(l=>window.addEventListener(l,B,{passive:!0})),{update(l){n.props={...n.props,...l},X(!1)},destroy(){n.dead=!0,W.forEach(l=>window.removeEventListener(l,B));for(let l of n.cleanups)if(l&&l.fn)try{l.fn()}catch{}n.cleanups=[],n.tree instanceof Node&&n.tree.parentNode&&n.tree.parentNode.removeChild(n.tree)},root:G}}function Le(s,a){(window.HubDesigns=window.HubDesigns||{})[s]={start:(r,n)=>qe(a,n||{},r)}}var ze=`#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ye=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uScale;
uniform float uRotation;
uniform int uDetail;
uniform float uWarp;
uniform float uHue;
uniform float uSaturation;
uniform float uBrightness;
uniform float uContrast;
uniform float uGrain;
uniform float uSeed;
uniform float uFade;
uniform float uOpacity;
uniform sampler2D uField;
uniform float uStir;
uniform vec3 uPointer;
uniform float uSheen;
uniform vec4 uSwirls[6];
in vec2 vUv;
out vec4 outColor;

vec3 hueRotate(vec3 c, float angle) {
  const vec3 k = vec3(0.57735027);
  float ca = cos(angle);
  return c * ca + cross(k, c) * sin(angle) + k * dot(k, c) * (1.0 - ca);
}

float smootherstep(float edge, float x) {
  float t = clamp(x / edge, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 aspect = uResolution / mr;
  vec2 st = vUv - texture(uField, vUv).rg * uStir;

  for (int k = 0; k < 6; k++) {
    vec4 swirl = uSwirls[k];
    if (swirl.w == 0.0) continue;
    vec2 delta = (st - swirl.xy) * aspect;
    float angle = swirl.w * exp(-dot(delta, delta) / (swirl.z * swirl.z));
    float ca = cos(angle);
    float sa = sin(angle);
    st = swirl.xy + vec2(ca * delta.x - sa * delta.y, sa * delta.x + ca * delta.y) / aspect;
  }

  vec2 uv = (st * 2.0 - 1.0) * aspect;
  float c = cos(uRotation);
  float s = sin(uRotation);
  uv = mat2(c, -s, s, c) * uv / uScale;
  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5;
  float a = 0.0;
  for (int i = 0; i < 24; i++) {
    if (i >= uDetail) break;
    float fi = float(i);
    a += cos(fi - d - a * uv.x * uWarp);
    d += sin(uv.y * fi + a);
  }
  d += uTime * 0.5;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;

  vec2 toPointer = (vUv - uPointer.xy) * aspect;
  col += col * uPointer.z * uSheen * 0.8 * exp(-dot(toPointer, toPointer) / 0.09);

  col = hueRotate(col, uHue);
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSaturation);
  col = (col - 0.5) * uContrast + 0.5;
  col *= uBrightness;
  col += (hash(gl_FragCoord.xy + uSeed) - 0.5) * uGrain * 0.12;
  col = clamp(col, 0.0, 1.0);

  float alpha = uOpacity;
  if (uFade > 0.0) {
    vec2 px = vUv * uResolution;
    float edge = uFade * mr * 0.5;
    alpha *= smootherstep(edge, px.x) * smootherstep(edge, uResolution.x - px.x);
    alpha *= smootherstep(edge, px.y) * smootherstep(edge, uResolution.y - px.y);
  }
  outColor = vec4(col * alpha, alpha);
}`,je=48,Ue=6,de=3.2,b=(s,a,r)=>Math.min(r,Math.max(a,s)),De=(s,a,r)=>{let n=s.createShader(a);return n?(s.shaderSource(n,r),s.compileShader(n),s.getShaderParameter(n,s.COMPILE_STATUS)?n:(s.deleteShader(n),null)):null},Ve=({color:s=[1,1,1],speed:a=1,amplitude:r=.1,mouseReact:n=!0,scale:v=1,detail:X=8,rotation:G=0,warp:$=1,hueShift:Z=0,saturation:B=1,brightness:W=1.5,contrast:l=1,stir:x=.5,sheen:M=.3,clickSwirl:y=!0,grain:T=0,fade:F=0,opacity:J=1,resolution:ke=1,paused:Xe=!1,className:me="",style:Ne})=>{let he=k(null),pe=k(null),Q=k(null),ve={colorKey:Array.isArray(s)?s.join(","):String(s),color:s,speed:a,amplitude:r,mouseReact:n,scale:Math.max(.05,v),detail:b(Math.round(X),1,24),rotation:G,warp:$,hueShift:Z,saturation:Math.max(0,B),brightness:Math.max(0,W),contrast:Math.max(0,l),stir:Math.max(0,x),sheen:Math.max(0,M),clickSwirl:y,grain:b(T,0,1),fade:b(F,0,1),opacity:b(J,0,1),resolution:b(ke,.1,2),paused:Xe},S=k(ve);return S.current=ve,V(()=>{let P=he.current,A=pe.current,e=A?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!P||!A||!e)return;let ee=De(e,e.VERTEX_SHADER,ze),te=De(e,e.FRAGMENT_SHADER,Ye),E=e.createProgram();if(!ee||!te||!E||(e.attachShader(E,ee),e.attachShader(E,te),e.linkProgram(E),!e.getProgramParameter(E,e.LINK_STATUS)))return;e.useProgram(E);let xe=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,xe),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);let we=e.getAttribLocation(E,"aPosition");e.enableVertexAttribArray(we),e.vertexAttribPointer(we,2,e.FLOAT,!1,0,0);let f={};for(let o of["uResolution","uTime","uColor","uMouse","uAmplitude","uScale","uRotation","uDetail","uWarp","uHue","uSaturation","uBrightness","uContrast","uGrain","uSeed","uFade","uOpacity","uField","uStir","uPointer","uSheen","uSwirls"])f[o]=e.getUniformLocation(E,o);let H=e.createTexture();e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,H),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.uniform1i(f.uField,0);let oe=document.createElement("canvas");oe.width=1,oe.height=1;let _=oe.getContext("2d",{willReadFrequently:!0}),ne=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,h={x:.5,y:.5,px:0,py:0,inside:!1,tracked:!1},t={width:1,height:1,phase:0,mouse:[.5,.5],presence:0,color:[1,1,1],colorKey:"",cols:0,rows:0,field:new Float32Array(0),scratch:new Float32Array(0),fieldActive:!1,swirls:[],seed:0},re=new Float32Array(Ue*4),C=0,N=0,q=!0,ie=!0,Oe=o=>{if(o.colorKey===t.colorKey)return;if(t.colorKey=o.colorKey,Array.isArray(o.color)){t.color=[0,1,2].map(d=>b(Number(o.color[d]??1),0,1));return}if(!_)return;_.clearRect(0,0,1,1),_.fillStyle="#ffffff",_.fillStyle=String(o.color),_.fillRect(0,0,1,1);let[i,u,c]=_.getImageData(0,0,1,1).data;t.color=[i/255,u/255,c/255]},Ke=()=>{let o=je,i=b(Math.round(o*t.height/t.width),6,96);o===t.cols&&i===t.rows||(t.cols=o,t.rows=i,t.field=new Float32Array(o*i*2),t.scratch=new Float32Array(o*i*2),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,H),e.texImage2D(e.TEXTURE_2D,0,e.RG16F,o,i,0,e.RG,e.FLOAT,t.field))},Ge=(o,i,u,c)=>{let{cols:d,rows:w,field:R}=t,m=.22,g=t.width/t.height,O=Math.max(0,Math.floor((o-m/g)*d)),ce=Math.min(d-1,Math.ceil((o+m/g)*d)),ue=Math.max(0,Math.floor((i-m)*w)),le=Math.min(w-1,Math.ceil((i+m)*w));for(let U=ue;U<=le;U++)for(let p=O;p<=ce;p++){let z=((p+.5)/d-o)*g,Ae=(U+.5)/w-i,K=1-(z*z+Ae*Ae)/(m*m);if(K<=0)continue;let Y=(U*d+p)*2,be=R[Y]+u*K*K*3.2,Fe=R[Y+1]+c*K*K*3.2,fe=Math.hypot(be,Fe),Pe=.4,_e=fe>0?Pe*Math.tanh(fe/Pe)/fe:0;R[Y]=be*_e,R[Y+1]=Fe*_e}t.fieldActive=!0},Be=o=>{let{cols:i,rows:u,field:c,scratch:d}=t,w=Math.exp(-o*1.4),R=0;for(let m=0;m<u;m++)for(let g=0;g<i;g++){let O=(m*i+g)*2,ce=(m*i+Math.max(0,g-1))*2,ue=(m*i+Math.min(i-1,g+1))*2,le=(Math.max(0,m-1)*i+g)*2,U=(Math.min(u-1,m+1)*i+g)*2;for(let p=0;p<2;p++){let z=(c[O+p]*12+c[ce+p]+c[ue+p]+c[le+p]+c[U+p])/16;d[O+p]=z*w,R=Math.max(R,Math.abs(d[O+p]))}}c.set(d),R<4e-4&&(c.fill(0),t.fieldActive=!1)},se=()=>{let o=S.current;Oe(o),Ke(),e.viewport(0,0,A.width,A.height),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,H),e.texSubImage2D(e.TEXTURE_2D,0,0,0,t.cols,t.rows,e.RG,e.FLOAT,t.field),re.fill(0),t.swirls.forEach((i,u)=>{let c=.21*(1+.4*i.age),d=Math.exp(-i.age*1.35)-Math.exp(-i.age*10),w=Math.min(1,(de-i.age)/.8);re.set([i.x,i.y,c,3*d*w*(.21/c)**2],u*4)}),e.uniform2f(f.uResolution,t.width,t.height),e.uniform1f(f.uTime,t.phase),e.uniform3f(f.uColor,t.color[0],t.color[1],t.color[2]),e.uniform2f(f.uMouse,t.mouse[0],t.mouse[1]),e.uniform1f(f.uAmplitude,o.amplitude),e.uniform1f(f.uScale,o.scale),e.uniform1f(f.uRotation,o.rotation*Math.PI/180),e.uniform1i(f.uDetail,o.detail),e.uniform1f(f.uWarp,o.warp),e.uniform1f(f.uHue,o.hueShift*Math.PI/180),e.uniform1f(f.uSaturation,o.saturation),e.uniform1f(f.uBrightness,o.brightness),e.uniform1f(f.uContrast,o.contrast),e.uniform1f(f.uGrain,o.grain),e.uniform1f(f.uSeed,t.seed),e.uniform1f(f.uFade,o.fade),e.uniform1f(f.uOpacity,o.opacity),e.uniform1f(f.uStir,o.mouseReact?o.stir:0),e.uniform3f(f.uPointer,h.x,h.y,o.mouseReact?t.presence:0),e.uniform1f(f.uSheen,o.sheen),e.uniform4fv(f.uSwirls,re),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.TRIANGLES,0,3)},ge=o=>{if(C=0,!ie||!q)return;let i=S.current,u=N?Math.min(.05,(o-N)/1e3):1/60;N=o;let c=!i.paused&&!ne;c&&(t.phase+=u*i.speed);let d=i.mouseReact&&h.tracked?[h.x,h.y]:[.5,.5],w=1-Math.exp(-u*5);t.mouse[0]+=(d[0]-t.mouse[0])*w,t.mouse[1]+=(d[1]-t.mouse[1])*w,t.presence+=((h.inside?1:0)-t.presence)*(1-Math.exp(-u*4)),t.fieldActive&&Be(u),t.swirls=t.swirls.filter(m=>(m.age+=u)<de),i.grain>0&&c&&(t.seed=Math.floor(o/42)%997),se();let R=Math.abs(d[0]-t.mouse[0])>5e-4||Math.abs(d[1]-t.mouse[1])>5e-4||Math.abs((h.inside?1:0)-t.presence)>.002;c||R||t.fieldActive||t.swirls.length?C=requestAnimationFrame(ge):N=0},L=()=>{C||!ie||!q||(C=requestAnimationFrame(ge))},ye=o=>{let i=P.getBoundingClientRect();return{x:(o.clientX-i.left)/Math.max(1,i.width),y:1-(o.clientY-i.top)/Math.max(1,i.height)}},Re=o=>{let i=S.current,{x:u,y:c}=ye(o),d=u>=0&&u<=1&&c>=0&&c<=1;d&&i.mouseReact&&!ne&&h.inside&&i.stir>0&&Ge(u,c,u-h.x,c-h.y),h.x=u,h.y=c,h.inside=d,d&&(h.tracked=!0),L()},Ee=()=>{h.inside=!1,L()},Me=o=>{if(!S.current.clickSwirl||ne)return;let{x:u,y:c}=ye(o);if(!(u<0||u>1||c<0||c>1)){if(t.swirls.length>=Ue){if(t.swirls[0].age<de-.4)return;t.swirls.shift()}t.swirls.push({x:u,y:c,age:0}),L()}},ae=()=>{let o=S.current,i=Math.min(window.devicePixelRatio||1,2)*o.resolution;t.width=Math.max(1,P.clientWidth),t.height=Math.max(1,P.clientHeight),A.width=Math.max(1,Math.round(t.width*i)),A.height=Math.max(1,Math.round(t.height*i)),se(),L()};Q.current=()=>{let o=Math.min(window.devicePixelRatio||1,2)*S.current.resolution;A.width!==Math.max(1,Math.round(t.width*o))?ae():C||se(),L()};let Te=new ResizeObserver(ae);Te.observe(P);let Se=new IntersectionObserver(o=>{q=o.some(i=>i.isIntersecting),q&&(N=0,L())});return Se.observe(P),window.addEventListener("pointermove",Re,{passive:!0}),window.addEventListener("pointerdown",Me,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ee),ae(),()=>{ie=!1,cancelAnimationFrame(C),Q.current=null,Te.disconnect(),Se.disconnect(),window.removeEventListener("pointermove",Re),window.removeEventListener("pointerdown",Me),document.documentElement.removeEventListener("pointerleave",Ee),e.deleteTexture(H),e.deleteBuffer(xe),e.deleteProgram(E),e.deleteShader(ee),e.deleteShader(te)}},[]),V(()=>{Q.current?.()}),I("div",{ref:he,className:`iridescence-container${me?` ${me}`:""}`,style:Ne},I("canvas",{ref:pe,className:"iridescence-canvas","aria-hidden":"true"}))},Ie=Ve;Le("iridescence",Ie);})();
