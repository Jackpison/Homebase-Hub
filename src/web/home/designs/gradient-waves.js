/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var B=null,q=Symbol("Fragment");function Ue(r,s,i){if(s==="ref"){typeof i=="function"?i(r):i&&(i.current=r);return}if(!(s==="children"||i==null||i===!1)){if(s==="className"){r.setAttribute("class",i);return}if(s==="style"){for(let t in i){let u=i[t];u==null||u===!1||(t.startsWith("--")?r.style.setProperty(t,String(u)):r.style[t]=typeof u=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(t)?u+"px":u)}return}if(/^on[A-Z]/.test(s)&&typeof i=="function"){r.addEventListener(s.slice(2).toLowerCase(),i);return}if(s==="htmlFor"){r.setAttribute("for",i);return}r.setAttribute(s,i===!0?"":String(i))}}function ye(r,s){for(let i of s)i==null||i===!1||i===!0||(Array.isArray(i)?ye(r,i):i instanceof Node?r.appendChild(i):r.appendChild(document.createTextNode(String(i))))}function D(r,s,...i){if(typeof r=="function")return r({...s,children:i});let t=r===q?document.createDocumentFragment():document.createElement(r);if(r!==q)for(let u in s||{})Ue(t,u,s[u]);return ye(t,i),t}var we=(r,s)=>r&&s&&r.length===s.length&&r.every((i,t)=>Object.is(i,s[t]));function Y(r){let s=B,i=s.i++;return s.hooks[i]||(s.hooks[i]={current:r})}function H(r,s){let i=B,t=i.i++,u=i.hooks[t];return u&&we(u.deps,s)?u.value:(i.hooks[t]={deps:s,value:r()}).value}function X(r,s){let i=B,t=i.i++;i.effects.push([t,r,s])}function Ve(r,s,i){let t={hooks:[],effects:[],i:0,cleanups:[],props:s,dead:!1,queued:!1,tree:null},u=()=>{let l=t.effects;t.effects=[];for(let[m,g,p]of l){let x=t.cleanups[m];if(x&&p&&we(x.deps,p))continue;if(x&&x.fn)try{x.fn()}catch{}let S;try{S=g()}catch{S=null}t.cleanups[m]={deps:p,fn:typeof S=="function"?S:null}}},v=l=>{B=t,t.i=0,t.effects=[];let m;try{m=r(t.props)}finally{B=null}l&&(t.tree=m,m instanceof Node&&i.appendChild(m)),u()};t.queue=()=>{t.queued||t.dead||(t.queued=!0,Promise.resolve().then(()=>{t.queued=!1,t.dead||v(!1)}))},v(!0);let E=t.tree instanceof Node?t.tree:i,w=["pointermove","mousemove"],k=["clientX","clientY","screenX","screenY","button","buttons","ctrlKey","shiftKey","altKey","metaKey","pointerId","pointerType","isPrimary","width","height","pressure","movementX","movementY"],f=l=>{if(t.dead||l.__hubFwd||l.target instanceof Element&&l.target.closest("input,textarea,select"))return;let m={bubbles:!1,cancelable:!1};for(let p of k)p in l&&(m[p]=l[p]);let g;try{g=new l.constructor(l.type,m)}catch{return}g.__hubFwd=!0,E.dispatchEvent(g)},A=w.filter(()=>matchMedia("(pointer: fine)").matches);return A.forEach(l=>window.addEventListener(l,f,{passive:!0})),{update(l){t.props={...t.props,...l},v(!1)},destroy(){t.dead=!0,A.forEach(l=>window.removeEventListener(l,f));for(let l of t.cleanups)if(l&&l.fn)try{l.fn()}catch{}t.cleanups=[],t.tree instanceof Node&&t.tree.parentNode&&t.tree.parentNode.removeChild(t.tree)},root:E}}function Se(r,s){(window.HubDesigns=window.HubDesigns||{})[r]={start:(i,t)=>Ve(s,t||{},i)}}var Ze="gradient-waves-container",$e="gradient-waves-canvas",U=4,be=3.2,je=2.8,Me=8,Qe=2.6,ke=30,Ae={low:56,medium:84,high:120},Je=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,et=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uClock;
uniform float uAmplitude;
uniform float uWaveScale;
uniform float uWaveRatio;
uniform float uSwell;
uniform float uTurbulence;
uniform float uHeight;
uniform float uTilt;
uniform float uZoom;
uniform vec2 uLook;
uniform float uFogDepth;
uniform float uBrightness;
uniform float uOpacity;
uniform float uGrain;
uniform vec3 uHorizon;
uniform vec3 uWave;
uniform vec3 uCrest;
uniform vec3 uBackground;
uniform float uOpaque;
uniform float uLight;
uniform vec3 uSun;
uniform float uRelief;
uniform float uSheen;
uniform float uSteps;
uniform float uStride;
uniform vec3 uIntro;
uniform vec3 uSwells[${U}];
uniform float uSwellWidth;
out vec4 outColor;

const float FAR = 4000.0;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 surface(vec2 xy) {
  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
  vec4 tc = vec4(uTime / 0.130, uTime / 0.810, uTime / 0.200, uTime / 0.710);
  float a = xy.x + tc.x;
  float swellPhase = (xy.y + a) / 20.0 + tc.y;
  float bend = uSwell * cos(swellPhase) / 20.0;
  float mx = a + uSwell * sin(swellPhase);
  float crossPhase = xy.x / 23.0 + tc.w;
  float my = xy.y - tc.z + uTurbulence * cos(crossPhase);
  float twist = -uTurbulence * sin(crossPhase) / 23.0;
  float cx = cos(mx * freq.x);
  float cy = cos(my * freq.y);
  float rise = 1.0;
  if (uIntro.z > 0.0) rise = mix(1.0, smoothstep(uIntro.y * 0.45, uIntro.y * 1.6, xy.x), uIntro.z);
  float amp = uAmplitude * rise;
  float h = (sin(mx * freq.x) + sin(my * freq.y)) * amp + uHeight;
  float dx = amp * (freq.x * cx * (1.0 + bend) + freq.y * cy * twist);
  float dy = amp * (freq.x * cx * bend + freq.y * cy);
  for (int k = 0; k < ${U}; k++) {
    vec3 sw = uSwells[k];
    if (sw.z <= 0.0) continue;
    float u = (xy.x - sw.x) / uSwellWidth;
    float v = (xy.y - sw.y) / (uSwellWidth * 3.5);
    float bump = sw.z * exp(-u * u - v * v);
    h += bump;
    dx += bump * (-2.0 * u / uSwellWidth);
    dy += bump * (-2.0 * v / (uSwellWidth * 3.5));
  }
  return vec3(h, dx, dy);
}

float march(vec3 origin, vec3 dir) {
  float dist = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= uSteps) break;
    float gap = origin.z + dist * dir.z - surface(origin.xy + dist * dir.xy).x;
    if (abs(gap) < 0.002 * dist + 0.01) break;
    dist += uStride * gap;
    if (!(abs(dist) < FAR)) return FAR;
  }
  return dist;
}

void main() {
  float c;
  float s;
  float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
  vec3 cam = vec3(0.0, 0.0, ${ke.toFixed(1)});
  vec2 uv = gl_FragCoord.xy / uResolution - 0.5;
  uv.x *= uResolution.x / uResolution.y;
  uv.y *= -1.0;

  vec3 dir = vec3(0.0, 0.0, -1.0);
  float ulen = length(uv);
  float xrot = vfov * ulen;
  c = cos(xrot);
  s = sin(xrot);
  dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
  dir = mat3(nuv.x, -nuv.y, 0.0, nuv.y, nuv.x, 0.0, 0.0, 0.0, 1.0) * dir;
  c = cos(uTilt + uLook.y);
  s = sin(uTilt + uLook.y);
  dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;
  c = cos(uLook.x);
  s = sin(uLook.x);
  dir = mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0) * dir;

  float dist = march(cam, dir);
  vec3 pos = cam + dist * dir;
  vec3 field = surface(pos.xy);
  vec3 view = -dir;

  float crest = clamp((field.x - uHeight) / max(2.0 * uAmplitude, 0.001) * 0.5 + 0.5, 0.0, 1.0);
  vec3 body = mix(uWave, uCrest, smoothstep(0.45, 1.0, crest) * 0.5);
  vec3 normal = normalize(vec3(-field.yz * (1.0 + 1.5 * uRelief), 1.0));
  float diffuse = clamp(dot(normal, uSun) * 0.5 + 0.5, 0.0, 1.0);
  float lightness = mix(1.0, diffuse * diffuse * (3.0 - 2.0 * diffuse), uRelief);
  float sheen = pow(clamp(dot(normal, normalize(uSun + view)), 0.0, 1.0), 14.0) * uSheen * (0.4 + 0.6 * uRelief);
  float rim = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 3.0);

  vec3 col;
  float alpha;
  float haze = 1.0 - exp(-dist / (uFogDepth * 5.0));
  float fade = 1.0 - smoothstep(0.35, 1.0, haze);
  if (uLight < 0.5) {
    vec3 lit = mix(uHorizon * 0.18, body, lightness) + uCrest * sheen;
    lit = mix(lit, uHorizon, rim * 0.15 * uRelief);
    col = mix(lit, uHorizon, smoothstep(0.0, 1.0, haze)) * 0.85 * uBrightness;
    alpha = fade;
  } else {
    vec3 hue = mix(uHorizon, body, 0.35 + 0.65 * lightness);
    float density = mix(0.16, 0.9, 1.0 - lightness);
    density *= 1.0 - clamp(sheen, 0.0, 1.0) * 0.85;
    density *= 1.0 - 0.5 * smoothstep(0.0, 1.0, haze);
    col = hue;
    alpha = fade * clamp(density * uBrightness, 0.0, 1.0);
  }

  float reveal = uIntro.x;
  col = clamp(col, 0.0, 1.0);
  float grain = (hash(gl_FragCoord.xy + fract(uClock) * 64.0) - 0.5) * uGrain;
  alpha = clamp(alpha * (1.0 + grain), 0.0, 1.0) * reveal * uOpacity;
  if (uOpaque > 0.5) {
    outColor = vec4(mix(uBackground, col, alpha), 1.0);
  } else {
    outColor = vec4(col * alpha, alpha);
  }
}`,_=(r,s,i)=>Math.min(i,Math.max(s,r)),tt=r=>r<.5?2*r*r:1-Math.pow(-2*r+2,2)/2,N=null,K=(r,s)=>{if(r==="transparent")return null;if(typeof document>"u"||(N||(N=document.createElement("canvas").getContext("2d")),!N))return s;N.fillStyle="#000000",N.fillStyle=r;let i=N.fillStyle;if(i.startsWith("#")){let u=parseInt(i.slice(1),16);return[(u>>16&255)/255,(u>>8&255)/255,(u&255)/255]}let t=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(i);return t?t[4]!==void 0&&Number(t[4])===0?null:[Number(t[1])/255,Number(t[2])/255,Number(t[3])/255]:s},Re=(r,s,i)=>{let t=r.createShader(s);return t?(r.shaderSource(t,i),r.compileShader(t),r.getShaderParameter(t,r.COMPILE_STATUS)?t:(console.error(r.getShaderInfoLog(t)),r.deleteShader(t),null)):null},ot=(r,s,i,t)=>{let u=(r[0]-.5)*s,v=r[1]-.5,E=Math.PI/2.3/Math.max(i.zoom,.05),w=Math.hypot(u,v),k=E*w,f=[0,-Math.sin(k),-Math.cos(k)],A=w>1e-5?u/w:1,l=w>1e-5?v/w:0;f=[A*f[0]+l*f[1],-l*f[0]+A*f[1],f[2]];let m=i.tilt+t[1],g=Math.cos(m),p=Math.sin(m);f=[g*f[0]-p*f[2],f[1],p*f[0]+g*f[2]];let x=Math.cos(t[0]),S=Math.sin(t[0]);return f=[x*f[0]-S*f[1],S*f[0]+x*f[1],f[2]],f},nt=(r,s,i,t)=>{let u=ot(r,s,i,t);if(u[2]>-.02)return null;let v=(ke-i.height)/-u[2];return[u[0]*v,u[1]*v]},Ee=()=>typeof window<"u"&&(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1);function re({horizonColor:r="#5227FF",waveColor:s="#FF9FFC",crestColor:i="#FFFFFF",backgroundColor:t="transparent",lightMode:u=!1,speed:v=.4,amplitude:E=2.5,waveScale:w=.6,waveRatio:k=.9,swell:f=35,turbulence:A=20,tilt:l=64,zoom:m=1,height:g=5.5,fogDepth:p=15,relief:x=1,lightAngle:S=120,sheen:V=0,brightness:Fe=1,opacity:Le=1,grain:Z=.2,quality:Te="medium",intro:We=!0,mouseInteraction:Ce=!0,parallaxStrength:ze=.5,mouseStrength:Pe=.6,swellOnClick:Ie=!0,paused:qe=!1,dpr:He=2,className:_e="",style:Ne}){let se=Y(null),Oe=H(()=>K(r,[.32,.15,1])??[.32,.15,1],[r]),Be=H(()=>K(s,[1,.62,.99])??[1,.62,.99],[s]),De=H(()=>K(i,[1,1,1])??[1,1,1],[i]),Ye=H(()=>K(t,null),[t]),ae={horizon:Oe,wave:Be,crest:De,paper:Ye,lightMode:u,speed:v,amplitude:Math.max(0,E),waveScale:Math.max(.01,w),waveRatio:Math.max(.01,k),swell:f,turbulence:A,tilt:_(l,10,85)*Math.PI/180,zoom:Math.max(.05,m),height:g,fogDepth:Math.max(.5,p),relief:_(x,0,1),lightAngle:S*Math.PI/180,sheen:Math.max(0,V),brightness:Math.max(0,Fe),opacity:_(Le,0,1),grain:typeof Z=="number"?Math.max(0,Z):Z?.05:0,steps:Ae[Te]??Ae.medium,intro:We,mouseInteraction:Ce,parallaxStrength:Math.max(0,ze),mouseStrength:_(Pe,0,1),swellOnClick:Ie,paused:qe,dpr:Math.max(.5,He)},F=Y(ae);F.current=ae;let $=Y(null);return X(()=>{$.current?.()}),X(()=>{let R=se.current;if(!R)return;let b=document.createElement("canvas");b.className=$e,R.appendChild(b);let o=b.getContext("webgl2",{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,powerPreference:"high-performance"});if(!o){b.remove();return}let j=Re(o,o.VERTEX_SHADER,Je),Q=Re(o,o.FRAGMENT_SHADER,et),y=o.createProgram();if(!j||!Q||!y){b.remove();return}if(o.attachShader(y,j),o.attachShader(y,Q),o.bindAttribLocation(y,0,"aPosition"),o.linkProgram(y),o.deleteShader(j),o.deleteShader(Q),!o.getProgramParameter(y,o.LINK_STATUS)){o.deleteProgram(y),b.remove();return}let Ge=["uResolution","uTime","uClock","uAmplitude","uWaveScale","uWaveRatio","uSwell","uTurbulence","uHeight","uTilt","uZoom","uLook","uFogDepth","uBrightness","uOpacity","uGrain","uHorizon","uWave","uCrest","uBackground","uOpaque","uLight","uSun","uRelief","uSheen","uSteps","uStride","uIntro","uSwells","uSwellWidth"],a={};Ge.forEach(c=>{a[c]=o.getUniformLocation(y,c)});let ue=o.createVertexArray();o.bindVertexArray(ue);let ce=o.createBuffer();o.bindBuffer(o.ARRAY_BUFFER,ce),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),o.STATIC_DRAW),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0),o.useProgram(y);let J=new Float32Array(U*3),e={width:1,height:1,cssWidth:0,cssHeight:0,time:0,clock:0,last:0,raf:0,visible:!1,introAt:-1,pointer:[.5,.5],inside:!1,look:[0,0],steer:[0,0],swells:[],quiet:0,seen:null},Xe=()=>{let c=F.current,n=Math.min(window.devicePixelRatio||1,c.dpr),d=Math.max(1,Math.round(e.cssWidth*n)),h=Math.max(1,Math.round(e.cssHeight*n));d===e.width&&h===e.height||(e.quiet=0,e.width=d,e.height=h,b.width=d,b.height=h)},le=()=>{e.cssWidth=R.clientWidth,e.cssHeight=R.clientHeight,e.quiet=0,M()},fe=(c,n)=>!c.intro||n||e.introAt<0?1:_((e.clock-e.introAt)/Qe,0,1),Ke=c=>{let n=F.current;o.viewport(0,0,e.width,e.height),o.uniform2f(a.uResolution,e.width,e.height),o.uniform1f(a.uTime,e.time),o.uniform1f(a.uClock,e.clock),o.uniform1f(a.uAmplitude,n.amplitude),o.uniform1f(a.uWaveScale,n.waveScale),o.uniform1f(a.uWaveRatio,n.waveRatio),o.uniform1f(a.uSwell,n.swell),o.uniform1f(a.uTurbulence,n.turbulence),o.uniform1f(a.uHeight,n.height),o.uniform1f(a.uTilt,n.tilt),o.uniform1f(a.uZoom,n.zoom),o.uniform2f(a.uLook,e.look[0],e.look[1]),o.uniform1f(a.uFogDepth,n.fogDepth),o.uniform1f(a.uBrightness,n.brightness),o.uniform1f(a.uOpacity,n.opacity),o.uniform1f(a.uGrain,n.grain),o.uniform3fv(a.uHorizon,n.horizon),o.uniform3fv(a.uWave,n.wave),o.uniform3fv(a.uCrest,n.crest);let d=n.paper??[0,0,0];o.uniform3f(a.uBackground,d[0],d[1],d[2]),o.uniform1f(a.uOpaque,n.paper?1:0),o.uniform1f(a.uLight,n.lightMode?1:0);let h=.52,L=n.lightAngle+e.steer[0]*n.mouseStrength*2,T=h-e.steer[1]*n.mouseStrength*.7;o.uniform3f(a.uSun,Math.cos(T)*Math.cos(L),Math.cos(T)*Math.sin(L),Math.sin(T)),o.uniform1f(a.uRelief,n.relief),o.uniform1f(a.uSheen,n.sheen),o.uniform1f(a.uSteps,n.steps);let G=n.amplitude*(n.waveScale/7*(1+Math.abs(n.swell)/20)+n.waveScale*n.waveRatio/3*(1+Math.abs(n.turbulence)/23)),W=fe(n,c),C=Math.min(1,W/.22),te=160*Math.pow(3/160,tt(Math.max(0,(W-.1)/.9))),z=_((W-.75)/.25,0,1);o.uniform3f(a.uIntro,C*C*(3-2*C),te,1-z*z*(3-2*z)),J.fill(0);let P=0;e.swells.forEach((I,oe)=>{let O=e.clock-I.at,ne=O/be,ie=(1-Math.exp(-O/.25))*Math.pow(1-ne,1.6),xe=n.amplitude*je*ie;J.set([I.x-O*12,I.y,xe],oe*3),P=Math.max(P,xe)}),o.uniform3fv(a.uSwells,J),o.uniform1f(a.uSwellWidth,Me),o.uniform1f(a.uStride,.9/Math.max(1,(G+P*.86/Me)/1.5)),o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),o.drawArrays(o.TRIANGLES,0,3)},ee=c=>{if(e.raf=0,!e.visible||document.hidden)return;let n=F.current,d=e.last?Math.min((c-e.last)/1e3,.1):0;e.last=c;let h=Ee();e.clock+=d,e.introAt<0&&(e.introAt=e.clock),!n.paused&&!h&&(e.time+=d*n.speed);let L=n.mouseInteraction&&e.inside&&!h,T=L?e.pointer:[.5,.5],G=1-Math.exp(-d/.45),W=(T[0]-.5)*n.parallaxStrength*.35,C=(T[1]-.5)*n.parallaxStrength*.18;e.look[0]+=(W-e.look[0])*G,e.look[1]+=(C-e.look[1])*G;let te=Math.abs(W-e.look[0])+Math.abs(C-e.look[1])>2e-4,z=1-Math.exp(-d/.6),P=L?e.pointer[0]-.5:0,I=L?.5-e.pointer[1]:0;e.steer[0]+=(P-e.steer[0])*z,e.steer[1]+=(I-e.steer[1])*z;let oe=Math.abs(P-e.steer[0])+Math.abs(I-e.steer[1])>5e-4;e.swells=e.swells.filter(ie=>e.clock-ie.at<be);let O=n.paused||h,ne=te||oe||e.swells.length>0||fe(n,h)<1;e.seen!==n||ne||!O?e.quiet=0:e.quiet+=1,e.seen=n,!(e.quiet>3)&&(e.raf=requestAnimationFrame(ee),Xe(),Ke(h))},M=()=>{e.raf||!e.visible||document.hidden||(e.last=0,e.raf=requestAnimationFrame(ee))};$.current=M;let de=c=>{let n=R.getBoundingClientRect();return{x:(c.clientX-n.left)/Math.max(n.width,1),y:(c.clientY-n.top)/Math.max(n.height,1),inside:c.clientX>=n.left&&c.clientX<=n.right&&c.clientY>=n.top&&c.clientY<=n.bottom}},me=c=>{let n=de(c),d=e.inside;e.inside=n.inside,n.inside&&(e.pointer=[n.x,n.y]),(n.inside||d)&&F.current.mouseInteraction&&M()},he=()=>{e.inside=!1,M()},pe=c=>{let n=F.current;if(!n.swellOnClick||c.button!==0||Ee()||c.target instanceof Element&&c.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;let d=de(c);if(!d.inside)return;let h=nt([d.x,d.y],e.width/Math.max(e.height,1),n,e.look);h&&(e.swells.push({x:h[0],y:h[1],at:e.clock}),e.swells.length>U&&e.swells.shift(),M())},ve=new IntersectionObserver(c=>{e.visible=c.some(n=>n.isIntersecting),M()});ve.observe(R);let ge=new ResizeObserver(le);return ge.observe(R),le(),document.addEventListener("visibilitychange",M),window.addEventListener("pointermove",me,{passive:!0}),window.addEventListener("pointerdown",pe),document.documentElement.addEventListener("pointerleave",he),e.raf=requestAnimationFrame(ee),()=>{cancelAnimationFrame(e.raf),$.current=null,document.removeEventListener("visibilitychange",M),ve.disconnect(),ge.disconnect(),window.removeEventListener("pointermove",me),window.removeEventListener("pointerdown",pe),document.documentElement.removeEventListener("pointerleave",he),o.deleteProgram(y),o.deleteBuffer(ce),o.deleteVertexArray(ue),o.getExtension("WEBGL_lose_context")?.loseContext(),b.remove()}},[]),D("div",{ref:se,className:[Ze,_e].filter(Boolean).join(" "),style:Ne})}Se("gradient-waves",re);})();
