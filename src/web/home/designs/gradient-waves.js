/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var B=null,q=Symbol("Fragment");function Ve(r,s,i){if(s==="ref"){typeof i=="function"?i(r):i&&(i.current=r);return}if(!(s==="children"||i==null||i===!1)){if(s==="className"){r.setAttribute("class",i);return}if(s==="style"){for(let t in i){let u=i[t];u==null||u===!1||(t.startsWith("--")?r.style.setProperty(t,String(u)):r.style[t]=typeof u=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(t)?u+"px":u)}return}if(/^on[A-Z]/.test(s)&&typeof i=="function"){r.addEventListener(s.slice(2).toLowerCase(),i);return}if(s==="htmlFor"){r.setAttribute("for",i);return}r.setAttribute(s,i===!0?"":String(i))}}function xe(r,s){for(let i of s)i==null||i===!1||i===!0||(Array.isArray(i)?xe(r,i):i instanceof Node?r.appendChild(i):r.appendChild(document.createTextNode(String(i))))}function D(r,s,...i){if(typeof r=="function")return r({...s,children:i});let t=r===q?document.createDocumentFragment():document.createElement(r);if(r!==q)for(let u in s||{})Ve(t,u,s[u]);return xe(t,i),t}var we=(r,s)=>r&&s&&r.length===s.length&&r.every((i,t)=>Object.is(i,s[t]));function G(r){let s=B,i=s.i++;return s.hooks[i]||(s.hooks[i]={current:r})}function H(r,s){let i=B,t=i.i++,u=i.hooks[t];return u&&we(u.deps,s)?u.value:(i.hooks[t]={deps:s,value:r()}).value}function Y(r,s){let i=B,t=i.i++;i.effects.push([t,r,s])}function Ze(r,s,i){let t={hooks:[],effects:[],i:0,cleanups:[],props:s,dead:!1,queued:!1,tree:null},u=()=>{let l=t.effects;t.effects=[];for(let[m,A,S]of l){let v=t.cleanups[m];if(v&&S&&we(v.deps,S))continue;if(v&&v.fn)try{v.fn()}catch{}let w;try{w=A()}catch{w=null}t.cleanups[m]={deps:S,fn:typeof w=="function"?w:null}}},p=l=>{B=t,t.i=0,t.effects=[];let m;try{m=r(t.props)}finally{B=null}l&&(t.tree=m,m instanceof Node&&i.appendChild(m)),u()};t.queue=()=>{t.queued||t.dead||(t.queued=!0,Promise.resolve().then(()=>{t.queued=!1,t.dead||p(!1)}))},p(!0);let E=t.tree instanceof Node?t.tree:i,x=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],M=l=>{if(t.dead||l.__hubFwd||l.target instanceof Element&&l.target.closest("input,textarea,select"))return;let m;try{m=new l.constructor(l.type,l)}catch{return}m.__hubFwd=!0,E.dispatchEvent(m)},f=x.filter(()=>matchMedia("(pointer: fine)").matches);return f.forEach(l=>window.addEventListener(l,M,{passive:!0})),{update(l){t.props={...t.props,...l},p(!1)},destroy(){t.dead=!0,f.forEach(l=>window.removeEventListener(l,M));for(let l of t.cleanups)if(l&&l.fn)try{l.fn()}catch{}t.cleanups=[],t.tree instanceof Node&&t.tree.parentNode&&t.tree.parentNode.removeChild(t.tree)},root:E}}function ye(r,s){(window.HubDesigns=window.HubDesigns||{})[r]={start:(i,t)=>Ze(s,t||{},i)}}var $e="gradient-waves-container",je="gradient-waves-canvas",V=4,Se=3.2,Ke=2.8,be=8,Qe=2.6,Ee=30,Me={low:56,medium:84,high:120},Je=`#version 300 es
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
uniform vec3 uSwells[${V}];
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
  for (int k = 0; k < ${V}; k++) {
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
  vec3 cam = vec3(0.0, 0.0, ${Ee.toFixed(1)});
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
}`,_=(r,s,i)=>Math.min(i,Math.max(s,r)),tt=r=>r<.5?2*r*r:1-Math.pow(-2*r+2,2)/2,N=null,U=(r,s)=>{if(r==="transparent")return null;if(typeof document>"u"||(N||(N=document.createElement("canvas").getContext("2d")),!N))return s;N.fillStyle="#000000",N.fillStyle=r;let i=N.fillStyle;if(i.startsWith("#")){let u=parseInt(i.slice(1),16);return[(u>>16&255)/255,(u>>8&255)/255,(u&255)/255]}let t=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(i);return t?t[4]!==void 0&&Number(t[4])===0?null:[Number(t[1])/255,Number(t[2])/255,Number(t[3])/255]:s},Ae=(r,s,i)=>{let t=r.createShader(s);return t?(r.shaderSource(t,i),r.compileShader(t),r.getShaderParameter(t,r.COMPILE_STATUS)?t:(console.error(r.getShaderInfoLog(t)),r.deleteShader(t),null)):null},ot=(r,s,i,t)=>{let u=(r[0]-.5)*s,p=r[1]-.5,E=Math.PI/2.3/Math.max(i.zoom,.05),x=Math.hypot(u,p),M=E*x,f=[0,-Math.sin(M),-Math.cos(M)],l=x>1e-5?u/x:1,m=x>1e-5?p/x:0;f=[l*f[0]+m*f[1],-m*f[0]+l*f[1],f[2]];let A=i.tilt+t[1],S=Math.cos(A),v=Math.sin(A);f=[S*f[0]-v*f[2],f[1],v*f[0]+S*f[2]];let w=Math.cos(t[0]),k=Math.sin(t[0]);return f=[w*f[0]-k*f[1],k*f[0]+w*f[1],f[2]],f},nt=(r,s,i,t)=>{let u=ot(r,s,i,t);if(u[2]>-.02)return null;let p=(Ee-i.height)/-u[2];return[u[0]*p,u[1]*p]},Re=()=>typeof window<"u"&&(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1);function ie({horizonColor:r="#5227FF",waveColor:s="#FF9FFC",crestColor:i="#FFFFFF",backgroundColor:t="transparent",lightMode:u=!1,speed:p=.4,amplitude:E=2.5,waveScale:x=.6,waveRatio:M=.9,swell:f=35,turbulence:l=20,tilt:m=64,zoom:A=1,height:S=5.5,fogDepth:v=15,relief:w=1,lightAngle:k=120,sheen:ke=0,brightness:Fe=1,opacity:Le=1,grain:Z=.2,quality:Te="medium",intro:We=!0,mouseInteraction:Ce=!0,parallaxStrength:ze=.5,mouseStrength:Pe=.6,swellOnClick:Ie=!0,paused:qe=!1,dpr:He=2,className:_e="",style:Ne}){let re=G(null),Oe=H(()=>U(r,[.32,.15,1])??[.32,.15,1],[r]),Be=H(()=>U(s,[1,.62,.99])??[1,.62,.99],[s]),De=H(()=>U(i,[1,1,1])??[1,1,1],[i]),Ge=H(()=>U(t,null),[t]),se={horizon:Oe,wave:Be,crest:De,paper:Ge,lightMode:u,speed:p,amplitude:Math.max(0,E),waveScale:Math.max(.01,x),waveRatio:Math.max(.01,M),swell:f,turbulence:l,tilt:_(m,10,85)*Math.PI/180,zoom:Math.max(.05,A),height:S,fogDepth:Math.max(.5,v),relief:_(w,0,1),lightAngle:k*Math.PI/180,sheen:Math.max(0,ke),brightness:Math.max(0,Fe),opacity:_(Le,0,1),grain:typeof Z=="number"?Math.max(0,Z):Z?.05:0,steps:Me[Te]??Me.medium,intro:We,mouseInteraction:Ce,parallaxStrength:Math.max(0,ze),mouseStrength:_(Pe,0,1),swellOnClick:Ie,paused:qe,dpr:Math.max(.5,He)},F=G(se);F.current=se;let $=G(null);return Y(()=>{$.current?.()}),Y(()=>{let R=re.current;if(!R)return;let y=document.createElement("canvas");y.className=je,R.appendChild(y);let o=y.getContext("webgl2",{alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,powerPreference:"high-performance"});if(!o){y.remove();return}let j=Ae(o,o.VERTEX_SHADER,Je),K=Ae(o,o.FRAGMENT_SHADER,et),g=o.createProgram();if(!j||!K||!g){y.remove();return}if(o.attachShader(g,j),o.attachShader(g,K),o.bindAttribLocation(g,0,"aPosition"),o.linkProgram(g),o.deleteShader(j),o.deleteShader(K),!o.getProgramParameter(g,o.LINK_STATUS)){o.deleteProgram(g),y.remove();return}let Xe=["uResolution","uTime","uClock","uAmplitude","uWaveScale","uWaveRatio","uSwell","uTurbulence","uHeight","uTilt","uZoom","uLook","uFogDepth","uBrightness","uOpacity","uGrain","uHorizon","uWave","uCrest","uBackground","uOpaque","uLight","uSun","uRelief","uSheen","uSteps","uStride","uIntro","uSwells","uSwellWidth"],a={};Xe.forEach(c=>{a[c]=o.getUniformLocation(g,c)});let ae=o.createVertexArray();o.bindVertexArray(ae);let ue=o.createBuffer();o.bindBuffer(o.ARRAY_BUFFER,ue),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),o.STATIC_DRAW),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0),o.useProgram(g);let Q=new Float32Array(V*3),e={width:1,height:1,cssWidth:0,cssHeight:0,time:0,clock:0,last:0,raf:0,visible:!1,introAt:-1,pointer:[.5,.5],inside:!1,look:[0,0],steer:[0,0],swells:[],quiet:0,seen:null},Ye=()=>{let c=F.current,n=Math.min(window.devicePixelRatio||1,c.dpr),d=Math.max(1,Math.round(e.cssWidth*n)),h=Math.max(1,Math.round(e.cssHeight*n));d===e.width&&h===e.height||(e.quiet=0,e.width=d,e.height=h,y.width=d,y.height=h)},ce=()=>{e.cssWidth=R.clientWidth,e.cssHeight=R.clientHeight,e.quiet=0,b()},le=(c,n)=>!c.intro||n||e.introAt<0?1:_((e.clock-e.introAt)/Qe,0,1),Ue=c=>{let n=F.current;o.viewport(0,0,e.width,e.height),o.uniform2f(a.uResolution,e.width,e.height),o.uniform1f(a.uTime,e.time),o.uniform1f(a.uClock,e.clock),o.uniform1f(a.uAmplitude,n.amplitude),o.uniform1f(a.uWaveScale,n.waveScale),o.uniform1f(a.uWaveRatio,n.waveRatio),o.uniform1f(a.uSwell,n.swell),o.uniform1f(a.uTurbulence,n.turbulence),o.uniform1f(a.uHeight,n.height),o.uniform1f(a.uTilt,n.tilt),o.uniform1f(a.uZoom,n.zoom),o.uniform2f(a.uLook,e.look[0],e.look[1]),o.uniform1f(a.uFogDepth,n.fogDepth),o.uniform1f(a.uBrightness,n.brightness),o.uniform1f(a.uOpacity,n.opacity),o.uniform1f(a.uGrain,n.grain),o.uniform3fv(a.uHorizon,n.horizon),o.uniform3fv(a.uWave,n.wave),o.uniform3fv(a.uCrest,n.crest);let d=n.paper??[0,0,0];o.uniform3f(a.uBackground,d[0],d[1],d[2]),o.uniform1f(a.uOpaque,n.paper?1:0),o.uniform1f(a.uLight,n.lightMode?1:0);let h=.52,L=n.lightAngle+e.steer[0]*n.mouseStrength*2,T=h-e.steer[1]*n.mouseStrength*.7;o.uniform3f(a.uSun,Math.cos(T)*Math.cos(L),Math.cos(T)*Math.sin(L),Math.sin(T)),o.uniform1f(a.uRelief,n.relief),o.uniform1f(a.uSheen,n.sheen),o.uniform1f(a.uSteps,n.steps);let X=n.amplitude*(n.waveScale/7*(1+Math.abs(n.swell)/20)+n.waveScale*n.waveRatio/3*(1+Math.abs(n.turbulence)/23)),W=le(n,c),C=Math.min(1,W/.22),ee=160*Math.pow(3/160,tt(Math.max(0,(W-.1)/.9))),z=_((W-.75)/.25,0,1);o.uniform3f(a.uIntro,C*C*(3-2*C),ee,1-z*z*(3-2*z)),Q.fill(0);let P=0;e.swells.forEach((I,te)=>{let O=e.clock-I.at,oe=O/Se,ne=(1-Math.exp(-O/.25))*Math.pow(1-oe,1.6),ge=n.amplitude*Ke*ne;Q.set([I.x-O*12,I.y,ge],te*3),P=Math.max(P,ge)}),o.uniform3fv(a.uSwells,Q),o.uniform1f(a.uSwellWidth,be),o.uniform1f(a.uStride,.9/Math.max(1,(X+P*.86/be)/1.5)),o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),o.drawArrays(o.TRIANGLES,0,3)},J=c=>{if(e.raf=0,!e.visible||document.hidden)return;let n=F.current,d=e.last?Math.min((c-e.last)/1e3,.1):0;e.last=c;let h=Re();e.clock+=d,e.introAt<0&&(e.introAt=e.clock),!n.paused&&!h&&(e.time+=d*n.speed);let L=n.mouseInteraction&&e.inside&&!h,T=L?e.pointer:[.5,.5],X=1-Math.exp(-d/.45),W=(T[0]-.5)*n.parallaxStrength*.35,C=(T[1]-.5)*n.parallaxStrength*.18;e.look[0]+=(W-e.look[0])*X,e.look[1]+=(C-e.look[1])*X;let ee=Math.abs(W-e.look[0])+Math.abs(C-e.look[1])>2e-4,z=1-Math.exp(-d/.6),P=L?e.pointer[0]-.5:0,I=L?.5-e.pointer[1]:0;e.steer[0]+=(P-e.steer[0])*z,e.steer[1]+=(I-e.steer[1])*z;let te=Math.abs(P-e.steer[0])+Math.abs(I-e.steer[1])>5e-4;e.swells=e.swells.filter(ne=>e.clock-ne.at<Se);let O=n.paused||h,oe=ee||te||e.swells.length>0||le(n,h)<1;e.seen!==n||oe||!O?e.quiet=0:e.quiet+=1,e.seen=n,!(e.quiet>3)&&(e.raf=requestAnimationFrame(J),Ye(),Ue(h))},b=()=>{e.raf||!e.visible||document.hidden||(e.last=0,e.raf=requestAnimationFrame(J))};$.current=b;let fe=c=>{let n=R.getBoundingClientRect();return{x:(c.clientX-n.left)/Math.max(n.width,1),y:(c.clientY-n.top)/Math.max(n.height,1),inside:c.clientX>=n.left&&c.clientX<=n.right&&c.clientY>=n.top&&c.clientY<=n.bottom}},de=c=>{let n=fe(c),d=e.inside;e.inside=n.inside,n.inside&&(e.pointer=[n.x,n.y]),(n.inside||d)&&F.current.mouseInteraction&&b()},me=()=>{e.inside=!1,b()},he=c=>{let n=F.current;if(!n.swellOnClick||c.button!==0||Re()||c.target instanceof Element&&c.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;let d=fe(c);if(!d.inside)return;let h=nt([d.x,d.y],e.width/Math.max(e.height,1),n,e.look);h&&(e.swells.push({x:h[0],y:h[1],at:e.clock}),e.swells.length>V&&e.swells.shift(),b())},pe=new IntersectionObserver(c=>{e.visible=c.some(n=>n.isIntersecting),b()});pe.observe(R);let ve=new ResizeObserver(ce);return ve.observe(R),ce(),document.addEventListener("visibilitychange",b),window.addEventListener("pointermove",de,{passive:!0}),window.addEventListener("pointerdown",he),document.documentElement.addEventListener("pointerleave",me),e.raf=requestAnimationFrame(J),()=>{cancelAnimationFrame(e.raf),$.current=null,document.removeEventListener("visibilitychange",b),pe.disconnect(),ve.disconnect(),window.removeEventListener("pointermove",de),window.removeEventListener("pointerdown",he),document.documentElement.removeEventListener("pointerleave",me),o.deleteProgram(g),o.deleteBuffer(ue),o.deleteVertexArray(ae),o.getExtension("WEBGL_lose_context")?.loseContext(),y.remove()}},[]),D("div",{ref:re,className:[$e,_e].filter(Boolean).join(" "),style:Ne})}ye("gradient-waves",ie);})();
