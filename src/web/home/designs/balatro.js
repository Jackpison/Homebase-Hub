/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var V=null,z=Symbol("Fragment");function et(t,n,o){if(n==="ref"){typeof o=="function"?o(t):o&&(o.current=t);return}if(!(n==="children"||o==null||o===!1)){if(n==="className"){t.setAttribute("class",o);return}if(n==="style"){for(let r in o){let a=o[r];a==null||a===!1||(r.startsWith("--")?t.style.setProperty(r,String(a)):t.style[r]=typeof a=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(r)?a+"px":a)}return}if(/^on[A-Z]/.test(n)&&typeof o=="function"){t.addEventListener(n.slice(2).toLowerCase(),o);return}if(n==="htmlFor"){t.setAttribute("for",o);return}t.setAttribute(n,o===!0?"":String(o))}}function ke(t,n){for(let o of n)o==null||o===!1||o===!0||(Array.isArray(o)?ke(t,o):o instanceof Node?t.appendChild(o):t.appendChild(document.createTextNode(String(o))))}function k(t,n,...o){if(typeof t=="function")return t({...n,children:o});let r=t===z?document.createDocumentFragment():document.createElement(t);if(t!==z)for(let a in n||{})et(r,a,n[a]);return ke(r,o),r}var tt=(t,n)=>t&&n&&t.length===n.length&&t.every((o,r)=>Object.is(o,n[r]));function G(t){let n=V,o=n.i++;return n.hooks[o]||(n.hooks[o]={current:t})}function se(t,n){let o=V,r=o.i++;o.effects.push([r,t,n])}function Ee(t){let n=V,o=n.i++;return n.hooks[o]||(n.hooks[o]={value:typeof t=="function"?t():t,set:r=>{let a=n.hooks[o],v=typeof r=="function"?r(a.value):r;Object.is(v,a.value)||(a.value=v,n.queue())}}),[n.hooks[o].value,n.hooks[o].set]}function rt(t,n,o){let r={hooks:[],effects:[],i:0,cleanups:[],props:n,dead:!1,queued:!1,tree:null},a=()=>{let d=r.effects;r.effects=[];for(let[T,j,H]of d){let L=r.cleanups[T];if(L&&H&&tt(L.deps,H))continue;if(L&&L.fn)try{L.fn()}catch{}let I;try{I=j()}catch{I=null}r.cleanups[T]={deps:H,fn:typeof I=="function"?I:null}}},v=d=>{V=r,r.i=0,r.effects=[];let T;try{T=t(r.props)}finally{V=null}d&&(r.tree=T,T instanceof Node&&o.appendChild(T)),a()};r.queue=()=>{r.queued||r.dead||(r.queued=!0,Promise.resolve().then(()=>{r.queued=!1,r.dead||v(!1)}))},v(!0);let X=r.tree instanceof Node?r.tree:o,M=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],A=d=>{if(r.dead||d.__hubFwd||d.target instanceof Element&&d.target.closest("input,textarea,select"))return;let T;try{T=new d.constructor(d.type,d)}catch{return}T.__hubFwd=!0,X.dispatchEvent(T)},$=M.filter(()=>matchMedia("(pointer: fine)").matches);return $.forEach(d=>window.addEventListener(d,A,{passive:!0})),{update(d){r.props={...r.props,...d},v(!1)},destroy(){r.dead=!0,$.forEach(d=>window.removeEventListener(d,A));for(let d of r.cleanups)if(d&&d.fn)try{d.fn()}catch{}r.cleanups=[],r.tree instanceof Node&&r.tree.parentNode&&r.tree.parentNode.removeChild(r.tree)},root:X}}function Ge(t,n){(window.HubDesigns=window.HubDesigns||{})[t]={start:(o,r)=>rt(n,r||{},o)}}var ot=24e5,ce=4,He=8,We=90,nt=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,it=`#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uSize;
uniform vec2 uCss;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uPush;
uniform float uRadius;
uniform float uDecay;
out vec4 fragColor;

void main() {
  vec2 cell = gl_FragCoord.xy / uSize;
  vec2 p = vec2(cell.x, 1.0 - cell.y) * uCss;
  vec2 seg = uTo - uFrom;
  float len2 = max(dot(seg, seg), 1e-6);
  float h = clamp(dot(p - uFrom, seg) / len2, 0.0, 1.0);
  vec2 gap = p - uFrom - seg * h;
  vec2 delta = uPush * exp(-dot(gap, gap) / (uRadius * uRadius));
  vec2 src = p - delta;
  vec2 prev = texture(uPrev, vec2(src.x / uCss.x, 1.0 - src.y / uCss.y)).xy;
  fragColor = vec4((prev + delta) * uDecay, 0.0, 1.0);
}`,st=`#version 300 es
precision highp float;
uniform vec2 uCss;
uniform vec2 uCanvas;
uniform float uBlock;
uniform float uFlow;
uniform float uSpin;
uniform vec2 uOffset;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSwirl;
uniform float uScale;
uniform int uDetail;
uniform sampler2D uField;
uniform float uFieldOn;
uniform vec4 uTwirls[${ce}];
uniform float uReveal;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

vec3 paint(vec2 screenSize, vec2 coords) {
  vec2 uv = (coords - 0.5 * screenSize) / length(screenSize) - uOffset;
  float radius = length(uv);
  float speed = uSpin + 302.2;
  float angle = atan(uv.y, uv.x) + speed - 20.0 * (uSwirl * radius + (1.0 - uSwirl));
  vec2 mid = (screenSize / length(screenSize)) / 2.0;
  uv = vec2(radius * cos(angle) + mid.x, radius * sin(angle) + mid.y) - mid;

  uv *= 30.0 / uScale;
  speed = uFlow;
  vec2 uv2 = vec2(uv.x + uv.y);
  for (int i = 0; i < 8; i++) {
    if (i >= uDetail) break;
    uv2 += sin(max(uv.x, uv.y)) + uv;
    uv += 0.5 * vec2(cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121), sin(uv2.x - 0.113 * speed));
    uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
  }

  float contrastMod = 0.25 * uContrast + 0.5 * uSwirl + 1.2;
  float amount = min(2.0, max(0.0, length(uv) * 0.035 * contrastMod));
  float c1 = max(0.0, 1.0 - contrastMod * abs(1.0 - amount));
  float c2 = max(0.0, 1.0 - contrastMod * abs(amount));
  float c3 = 1.0 - min(1.0, c1 + c2);
  float light = (uLighting - 0.2) * max(c1 * 5.0 - 4.0, 0.0) + uLighting * max(c2 * 5.0 - 4.0, 0.0);
  vec3 gap = uLight > 0.5 ? mix(uColor3, vec3(1.0), 0.9) : uColor3;
  float base = 0.3 / uContrast;
  vec3 color = base * uColor1 + (1.0 - base) * (uColor1 * c1 + uColor2 * c2 + gap * c3) + light;
  return mix(gap, color, uReveal);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy) + 0.5;
  vec2 p = vec2(cell.x, uCanvas.y - cell.y) * uBlock;
  if (uFieldOn > 0.5) {
    p -= texture(uField, vec2(p.x / uCss.x, 1.0 - p.y / uCss.y)).xy;
  }
  for (int i = 0; i < ${ce}; i++) {
    vec4 twirl = uTwirls[i];
    if (twirl.w <= 0.0) continue;
    vec2 rel = p - twirl.xy;
    float turn = twirl.z * exp(-dot(rel, rel) / (twirl.w * twirl.w));
    float c = cos(turn);
    float s = sin(turn);
    p = twirl.xy + vec2(c * rel.x - s * rel.y, s * rel.x + c * rel.y);
  }
  vec3 color = paint(uCss, vec2(p.x, uCss.y - p.y));
  float grain = (fract(52.9829189 * fract(dot(cell, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  color = clamp(color + grain, 0.0, 1.0);
  fragColor = vec4(color * uOpacity, uOpacity);
}`,at=`#version 300 es
precision highp float;
uniform sampler2D uPaint;
uniform vec2 uCanvas;
uniform vec2 uSource;
uniform float uDevice;
uniform float uCrt;
out vec4 fragColor;

float smoother(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 device = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y);
  vec2 cell = floor(device / uDevice);
  vec4 texel = texture(uPaint, vec2((cell.x + 0.5) / uSource.x, 1.0 - (cell.y + 0.5) / uSource.y));
  vec3 color = texel.rgb;
  float glow = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float period = max(uDevice, 3.0);
  float row = fract(device.y / period);
  float line = smoother(0.5, 0.92, row) * (1.0 - smoother(0.92, 1.0, row));
  color *= 1.0 - uCrt * 0.34 * line * (1.0 - 0.7 * glow);
  vec2 screen = gl_FragCoord.xy / uCanvas;
  float edge = smoother(0.0, 0.18, screen.x) * smoother(0.0, 0.18, 1.0 - screen.x);
  edge *= smoother(0.0, 0.24, screen.y) * smoother(0.0, 0.24, 1.0 - screen.y);
  color *= mix(1.0, 0.78 + 0.22 * edge, uCrt);
  color *= 1.0 + uCrt * 0.1;
  fragColor = vec4(min(color, vec3(texel.a)), texel.a);
}`,E=(t,n,o)=>Math.min(o,Math.max(n,t)),xe=t=>{let n=String(t||"").trim(),o=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(n);if(o){let a=o[1].length===3?o[1].replace(/./g,v=>v+v):o[1];return[0,2,4].map(v=>parseInt(a.slice(v,v+2),16)/255)}let r=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(n);return r?[r[1],r[2],r[3]].map(a=>E(parseFloat(a)/255,0,1)):null},Ye=(t,n,o)=>{let r=t.createShader(n);return r?(t.shaderSource(r,o),t.compileShader(r),t.getShaderParameter(r,t.COMPILE_STATUS)?r:(console.error(t.getShaderInfoLog(r)),t.deleteShader(r),null)):null},Te=(t,n)=>{let o=Ye(t,t.VERTEX_SHADER,nt),r=Ye(t,t.FRAGMENT_SHADER,n),a=o&&r?t.createProgram():null;if(!o||!r||!a)return o&&t.deleteShader(o),r&&t.deleteShader(r),null;if(t.attachShader(a,o),t.attachShader(a,r),t.linkProgram(a),t.deleteShader(o),t.deleteShader(r),!t.getProgramParameter(a,t.LINK_STATUS))return console.error(t.getProgramInfoLog(a)),t.deleteProgram(a),null;let v={},X=t.getProgramParameter(a,t.ACTIVE_UNIFORMS);for(let M=0;M<X;M++){let A=t.getActiveUniform(a,M);A&&(v[A.name.replace(/\[0\]$/,"")]=t.getUniformLocation(a,A.name))}return{program:a,uniforms:v}},ae=t=>{let n=E(t,0,1);return n*n*n*(n*(n*6-15)+10)},ct=({color1:t="#DE443B",color2:n="#006BB4",color3:o="#162325",contrast:r=3.5,lighting:a=.4,swirl:v=.25,speed:X=1,rotationSpeed:M=0,scale:A=1,detail:$=5,offset:d=[0,0],pixelSize:T=1.5,crt:j=0,mouseInteraction:H=!0,mouseStrength:L=1,clickSwirl:I=!0,intro:ue=!0,lightMode:Ve=!1,opacity:$e=1,maxDevicePixelRatio:je=2,className:ye="",style:Ke})=>{let we=G(null),Re=G(null),le=G(null),[be,Ze]=Ee(0),Fe={color1:xe(t)||[.871,.267,.231],color2:xe(n)||[0,.42,.706],color3:xe(o)||[.086,.137,.145],contrast:E(r,.5,10),lighting:E(a,0,1.5),swirl:E(v,0,1),speed:Math.max(0,X),rotation:E(M,-10,10),scale:E(A,.2,5),detail:E(Math.round($),1,8),offset:Array.isArray(d)?[Number(d[0])||0,Number(d[1])||0]:[0,0],pixelSize:E(T,0,24),crt:E(j,0,1),mouse:H,strength:E(L,0,3),clickSwirl:I,intro:ue,light:Ve,opacity:E($e,0,1),maxRatio:E(je,.5,3)},W=G(Fe);return W.current=Fe,se(()=>{le.current?.()}),se(()=>{let Y=we.current,p=Re.current;if(!Y||!p)return;let e=p.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),K=e?Te(e,st):null,Z=e?Te(e,at):null;if(!e||!K||!Z)return;let P=!!(e.getExtension("EXT_color_buffer_float")||e.getExtension("EXT_color_buffer_half_float"))?Te(e,it):null,J=window.matchMedia("(prefers-reduced-motion: reduce)").matches,_e=e.createVertexArray(),m={cssWidth:1,cssHeight:1,block:1,device:1,width:1,height:1,crt:!1},_={texture:e.createTexture(),framebuffer:e.createFramebuffer(),width:0,height:0},u={width:0,height:0,targets:[],energy:0},l={x:0,y:0,lastX:0,lastY:0,vx:0,inside:!1,ready:!1},Q={value:0},C=[],O=new Float32Array(ce*4),Ce=14,Se=0,N=W.current.intro&&!J&&be===0?0:1,D=0,ee=0,fe=!0,de=document.visibilityState!=="hidden",me=!1,Ae=(s,i)=>{let h=e.createTexture();e.bindTexture(e.TEXTURE_2D,h),e.texImage2D(e.TEXTURE_2D,0,e.RG16F,s,i,0,e.RG,e.HALF_FLOAT,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let b=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,b),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,h,0),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.bindFramebuffer(e.FRAMEBUFFER,null),{texture:h,framebuffer:b}},Me=()=>{u.targets.forEach(s=>{e.deleteTexture(s.texture),e.deleteFramebuffer(s.framebuffer)}),u.targets=[],u.width=0,u.height=0,u.energy=0},he=!1,Je=()=>{let s=W.current,i=Y.getBoundingClientRect(),h=Math.max(1,i.width),b=Math.max(1,i.height),w=Math.min(window.devicePixelRatio||1,s.maxRatio),B=Math.ceil(Math.sqrt(h*b*w*w/ot)-.05),F=Math.max(s.pixelSize>0?Math.round(s.pixelSize*w):1,B,1),y=Math.max(1,Math.ceil(h*w/F)),c=Math.max(1,Math.ceil(b*w/F)),g=s.crt>0,ge=g?y*F:y,f=g?c*F:c;if((p.width!==ge||p.height!==f)&&(p.width=ge,p.height=f),p.style.width=`${y*F/w}px`,p.style.height=`${c*F/w}px`,p.style.imageRendering=!g&&s.pixelSize>0&&F>=2?"pixelated":"auto",g&&(_.width!==y||_.height!==c)&&(e.bindTexture(e.TEXTURE_2D,_.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,y,c,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,_.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,_.texture,0),e.bindFramebuffer(e.FRAMEBUFFER,null),_.width=y,_.height=c),m.cssWidth=h,m.cssHeight=b,m.block=F/w,m.device=F,m.width=y,m.height=c,m.crt=g,!P)return;let x=E(Math.ceil(h/He),8,320),R=E(Math.ceil(b/He),8,320);x===u.width&&R===u.height||(Me(),u.width=x,u.height=R,u.targets=[Ae(x,R),Ae(x,R)])},ve=()=>{he=!0,S()},Qe=(s,i,h,b,w,B,F)=>{if(!P)return;let[y,c]=u.targets;e.bindFramebuffer(e.FRAMEBUFFER,c.framebuffer),e.viewport(0,0,u.width,u.height),e.useProgram(P.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,y.texture);let g=P.uniforms;e.uniform1i(g.uPrev,0),e.uniform2f(g.uSize,u.width,u.height),e.uniform2f(g.uCss,m.cssWidth,m.cssHeight),e.uniform2f(g.uFrom,s,i),e.uniform2f(g.uTo,h,b),e.uniform2f(g.uPush,w,B),e.uniform1f(g.uRadius,We),e.uniform1f(g.uDecay,F),e.drawArrays(e.TRIANGLES,0,3),u.targets=[c,y]},Le=s=>{if(D=0,he&&(he=!1,Je()),me)return;let i=W.current,h=E((s-ee)/1e3||0,0,.05);ee=Math.max(ee,s);let b=J?.2:1;Ce+=h*i.speed*7*b,Se+=h*i.rotation*.2*b,N<1&&(N=Math.min(1,N+h/2.2));let w=i.mouse&&l.inside,B=w?(l.x/m.cssWidth-.5)*.35*i.strength:0;if(Q.value+=(B-Q.value)*(1-Math.exp(-h/.8)),e.bindVertexArray(_e),P&&u.targets.length){let f=l.x-l.lastX,x=l.y-l.lastY,R=w&&l.ready&&(f!==0||x!==0),re=Math.exp(-h/1.6);if(R||u.energy>.05){let q=.85*i.strength*(J?.4:1),ze=R?Math.hypot(f,x)*q:0,oe=Math.max(1,Math.ceil(ze/(We*.3)));for(let U=0;U<oe;U++){let ne=U/oe,ie=(U+1)/oe;Qe(l.lastX+f*ne,l.lastY+x*ne,l.lastX+f*ie,l.lastY+x*ie,R?f*(ie-ne)*q:0,R?x*(ie-ne)*q:0,U===oe-1?re:1)}u.energy=u.energy*re+ze,u.energy<=.05&&u.targets.forEach(U=>{e.bindFramebuffer(e.FRAMEBUFFER,U.framebuffer),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT)})}}l.lastX=l.x,l.lastY=l.y;for(let f=C.length-1;f>=0;f--)C[f].age+=h,C[f].age>=3.2&&C.splice(f,1);O.fill(0),C.forEach((f,x)=>{let R=f.age,re=ae(R/.25),q=1-ae((R-.25)/2.95);O[x*4]=f.x,O[x*4+1]=f.y,O[x*4+2]=f.direction*1.9*re*q,O[x*4+3]=150*(1+.6*ae(R/3.2))});let y=1-(1-Math.pow(1-N,3));e.bindFramebuffer(e.FRAMEBUFFER,m.crt?_.framebuffer:null),e.viewport(0,0,m.width,m.height),e.useProgram(K.program);let c=K.uniforms;if(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,u.targets.length?u.targets[0].texture:null),e.uniform1i(c.uField,0),e.uniform1f(c.uFieldOn,u.targets.length&&u.energy>.05?1:0),e.uniform2f(c.uCss,m.cssWidth,m.cssHeight),e.uniform2f(c.uCanvas,m.width,m.height),e.uniform1f(c.uBlock,m.block),e.uniform1f(c.uFlow,Ce),e.uniform1f(c.uSpin,-.4+Se+Q.value+2.6*y*y),e.uniform2f(c.uOffset,i.offset[0],i.offset[1]),e.uniform3f(c.uColor1,i.color1[0],i.color1[1],i.color1[2]),e.uniform3f(c.uColor2,i.color2[0],i.color2[1],i.color2[2]),e.uniform3f(c.uColor3,i.color3[0],i.color3[1],i.color3[2]),e.uniform1f(c.uContrast,i.contrast),e.uniform1f(c.uLighting,i.lighting),e.uniform1f(c.uSwirl,Math.min(1,i.swirl+.55*y)),e.uniform1f(c.uScale,i.scale),e.uniform1i(c.uDetail,i.detail),e.uniform4fv(c.uTwirls,O),e.uniform1f(c.uReveal,ae(N/.45)),e.uniform1f(c.uLight,i.light?1:0),e.uniform1f(c.uOpacity,i.opacity),e.drawArrays(e.TRIANGLES,0,3),m.crt){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,p.width,p.height),e.useProgram(Z.program);let f=Z.uniforms;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,_.texture),e.uniform1i(f.uPaint,0),e.uniform2f(f.uCanvas,p.width,p.height),e.uniform2f(f.uSource,m.width,m.height),e.uniform1f(f.uDevice,m.device),e.uniform1f(f.uCrt,i.crt),e.drawArrays(e.TRIANGLES,0,3)}let g=Math.abs(B-Q.value)>5e-4||u.energy>.05||C.length>0;(i.speed>0||i.rotation!==0||N<1||g)&&fe&&de&&(D=requestAnimationFrame(Le))},S=()=>{D||me||!fe||!de||(ee=performance.now(),D=requestAnimationFrame(Le))};le.current=()=>{ve(),S()};let Pe=s=>{let i=Y.getBoundingClientRect();return{x:s.clientX-i.left,y:s.clientY-i.top,inside:s.clientX>=i.left&&s.clientX<=i.right&&s.clientY>=i.top&&s.clientY<=i.bottom}},De=s=>{let i=Pe(s);(!l.ready||!l.inside)&&(l.lastX=i.x,l.lastY=i.y),l.vx=i.x-l.x,l.x=i.x,l.y=i.y,l.inside=i.inside,l.ready=!0,S()},Ue=s=>{let i=W.current,h=Pe(s);!h.inside||!i.clickSwirl||J||(C.push({x:h.x,y:h.y,age:0,direction:l.vx<0?1:-1}),C.length>ce&&C.shift(),S())},pe=()=>{l.inside=!1,S()},te=s=>{s.pointerType!=="mouse"&&pe()};window.addEventListener("pointermove",De,{passive:!0}),window.addEventListener("pointerdown",Ue,{passive:!0}),window.addEventListener("pointerup",te,{passive:!0}),window.addEventListener("pointercancel",te,{passive:!0}),document.documentElement.addEventListener("pointerleave",pe);let Xe=s=>{s.preventDefault(),me=!0,cancelAnimationFrame(D),D=0},Ie=()=>Ze(s=>s+1);p.addEventListener("webglcontextlost",Xe),p.addEventListener("webglcontextrestored",Ie);let Oe=new ResizeObserver(()=>{ve(),S()});Oe.observe(Y);let Ne=new IntersectionObserver(s=>{fe=s.some(i=>i.isIntersecting),S()});Ne.observe(Y);let Be=()=>{de=document.visibilityState!=="hidden",S()};return document.addEventListener("visibilitychange",Be),ve(),S(),()=>{cancelAnimationFrame(D),le.current=null,Oe.disconnect(),Ne.disconnect(),window.removeEventListener("pointermove",De),window.removeEventListener("pointerdown",Ue),window.removeEventListener("pointerup",te),window.removeEventListener("pointercancel",te),document.documentElement.removeEventListener("pointerleave",pe),document.removeEventListener("visibilitychange",Be),p.removeEventListener("webglcontextlost",Xe),p.removeEventListener("webglcontextrestored",Ie),e.isContextLost()||(Me(),e.deleteTexture(_.texture),e.deleteFramebuffer(_.framebuffer),e.deleteVertexArray(_e),e.deleteProgram(K.program),e.deleteProgram(Z.program),P&&e.deleteProgram(P.program))}},[be]),k("div",{ref:we,className:`balatro${ye?` ${ye}`:""}`,style:Ke},k("canvas",{ref:Re,className:"balatro__canvas","aria-hidden":"true"}))},qe=ct;Ge("balatro",qe);})();
