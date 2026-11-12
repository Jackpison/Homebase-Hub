/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var K=null,H=Symbol("Fragment");function et(t,n,o){if(n==="ref"){typeof o=="function"?o(t):o&&(o.current=t);return}if(!(n==="children"||o==null||o===!1)){if(n==="className"){t.setAttribute("class",o);return}if(n==="style"){for(let r in o){let a=o[r];a==null||a===!1||(r.startsWith("--")?t.style.setProperty(r,String(a)):t.style[r]=typeof a=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(r)?a+"px":a)}return}if(/^on[A-Z]/.test(n)&&typeof o=="function"){t.addEventListener(n.slice(2).toLowerCase(),o);return}if(n==="htmlFor"){t.setAttribute("for",o);return}t.setAttribute(n,o===!0?"":String(o))}}function Ge(t,n){for(let o of n)o==null||o===!1||o===!0||(Array.isArray(o)?Ge(t,o):o instanceof Node?t.appendChild(o):t.appendChild(document.createTextNode(String(o))))}function W(t,n,...o){if(typeof t=="function")return t({...n,children:o});let r=t===H?document.createDocumentFragment():document.createElement(t);if(t!==H)for(let a in n||{})et(r,a,n[a]);return Ge(r,o),r}var tt=(t,n)=>t&&n&&t.length===n.length&&t.every((o,r)=>Object.is(o,n[r]));function Y(t){let n=K,o=n.i++;return n.hooks[o]||(n.hooks[o]={current:t})}function ae(t,n){let o=K,r=o.i++;o.effects.push([r,t,n])}function xe(t){let n=K,o=n.i++;return n.hooks[o]||(n.hooks[o]={value:typeof t=="function"?t():t,set:r=>{let a=n.hooks[o],v=typeof r=="function"?r(a.value):r;Object.is(v,a.value)||(a.value=v,n.queue())}}),[n.hooks[o].value,n.hooks[o].set]}function rt(t,n,o){let r={hooks:[],effects:[],i:0,cleanups:[],props:n,dead:!1,queued:!1,tree:null},a=()=>{let d=r.effects;r.effects=[];for(let[y,P,C]of d){let D=r.cleanups[y];if(D&&C&&tt(D.deps,C))continue;if(D&&D.fn)try{D.fn()}catch{}let B;try{B=P()}catch{B=null}r.cleanups[y]={deps:C,fn:typeof B=="function"?B:null}}},v=d=>{K=r,r.i=0,r.effects=[];let y;try{y=t(r.props)}finally{K=null}d&&(r.tree=y,y instanceof Node&&o.appendChild(y)),a()};r.queue=()=>{r.queued||r.dead||(r.queued=!0,Promise.resolve().then(()=>{r.queued=!1,r.dead||v(!1)}))},v(!0);let O=r.tree instanceof Node?r.tree:o,M=["pointermove","mousemove"],L=["clientX","clientY","screenX","screenY","button","buttons","ctrlKey","shiftKey","altKey","metaKey","pointerId","pointerType","isPrimary","width","height","pressure","movementX","movementY"],j=d=>{if(r.dead||d.__hubFwd||d.target instanceof Element&&d.target.closest("input,textarea,select"))return;let y={bubbles:!1,cancelable:!1};for(let C of L)C in d&&(y[C]=d[C]);let P;try{P=new d.constructor(d.type,y)}catch{return}P.__hubFwd=!0,O.dispatchEvent(P)},N=M.filter(()=>matchMedia("(pointer: fine)").matches);return N.forEach(d=>window.addEventListener(d,j,{passive:!0})),{update(d){r.props={...r.props,...d},v(!1)},destroy(){r.dead=!0,N.forEach(d=>window.removeEventListener(d,j));for(let d of r.cleanups)if(d&&d.fn)try{d.fn()}catch{}r.cleanups=[],r.tree instanceof Node&&r.tree.parentNode&&r.tree.parentNode.removeChild(r.tree)},root:O}}function He(t,n){(window.HubDesigns=window.HubDesigns||{})[t]={start:(o,r)=>rt(n,r||{},o)}}var ot=24e5,ue=4,We=8,Ye=90,nt=`#version 300 es
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
uniform vec4 uTwirls[${ue}];
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
  for (int i = 0; i < ${ue}; i++) {
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
}`,E=(t,n,o)=>Math.min(o,Math.max(n,t)),Te=t=>{let n=String(t||"").trim(),o=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(n);if(o){let a=o[1].length===3?o[1].replace(/./g,v=>v+v):o[1];return[0,2,4].map(v=>parseInt(a.slice(v,v+2),16)/255)}let r=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(n);return r?[r[1],r[2],r[3]].map(a=>E(parseFloat(a)/255,0,1)):null},qe=(t,n,o)=>{let r=t.createShader(n);return r?(t.shaderSource(r,o),t.compileShader(r),t.getShaderParameter(r,t.COMPILE_STATUS)?r:(console.error(t.getShaderInfoLog(r)),t.deleteShader(r),null)):null},ye=(t,n)=>{let o=qe(t,t.VERTEX_SHADER,nt),r=qe(t,t.FRAGMENT_SHADER,n),a=o&&r?t.createProgram():null;if(!o||!r||!a)return o&&t.deleteShader(o),r&&t.deleteShader(r),null;if(t.attachShader(a,o),t.attachShader(a,r),t.linkProgram(a),t.deleteShader(o),t.deleteShader(r),!t.getProgramParameter(a,t.LINK_STATUS))return console.error(t.getProgramInfoLog(a)),t.deleteProgram(a),null;let v={},O=t.getProgramParameter(a,t.ACTIVE_UNIFORMS);for(let M=0;M<O;M++){let L=t.getActiveUniform(a,M);L&&(v[L.name.replace(/\[0\]$/,"")]=t.getUniformLocation(a,L.name))}return{program:a,uniforms:v}},ce=t=>{let n=E(t,0,1);return n*n*n*(n*(n*6-15)+10)},ct=({color1:t="#DE443B",color2:n="#006BB4",color3:o="#162325",contrast:r=3.5,lighting:a=.4,swirl:v=.25,speed:O=1,rotationSpeed:M=0,scale:L=1,detail:j=5,offset:N=[0,0],pixelSize:d=1.5,crt:y=0,mouseInteraction:P=!0,mouseStrength:C=1,clickSwirl:D=!0,intro:B=!0,lightMode:le=!1,opacity:$e=1,maxDevicePixelRatio:Ke=2,className:we="",style:je})=>{let Re=Y(null),be=Y(null),fe=Y(null),[Fe,Ze]=xe(0),_e={color1:Te(t)||[.871,.267,.231],color2:Te(n)||[0,.42,.706],color3:Te(o)||[.086,.137,.145],contrast:E(r,.5,10),lighting:E(a,0,1.5),swirl:E(v,0,1),speed:Math.max(0,O),rotation:E(M,-10,10),scale:E(L,.2,5),detail:E(Math.round(j),1,8),offset:Array.isArray(N)?[Number(N[0])||0,Number(N[1])||0]:[0,0],pixelSize:E(d,0,24),crt:E(y,0,1),mouse:P,strength:E(C,0,3),clickSwirl:D,intro:B,light:le,opacity:E($e,0,1),maxRatio:E(Ke,.5,3)},q=Y(_e);return q.current=_e,ae(()=>{fe.current?.()}),ae(()=>{let V=Re.current,p=be.current;if(!V||!p)return;let e=p.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),Z=e?ye(e,st):null,J=e?ye(e,at):null;if(!e||!Z||!J)return;let U=!!(e.getExtension("EXT_color_buffer_float")||e.getExtension("EXT_color_buffer_half_float"))?ye(e,it):null,Q=window.matchMedia("(prefers-reduced-motion: reduce)").matches,Ce=e.createVertexArray(),m={cssWidth:1,cssHeight:1,block:1,device:1,width:1,height:1,crt:!1},_={texture:e.createTexture(),framebuffer:e.createFramebuffer(),width:0,height:0},u={width:0,height:0,targets:[],energy:0},l={x:0,y:0,lastX:0,lastY:0,vx:0,inside:!1,ready:!1},ee={value:0},S=[],z=new Float32Array(ue*4),Se=14,Ae=0,k=q.current.intro&&!Q&&Fe===0?0:1,X=0,te=0,de=!0,me=document.visibilityState!=="hidden",he=!1,Me=(s,i)=>{let h=e.createTexture();e.bindTexture(e.TEXTURE_2D,h),e.texImage2D(e.TEXTURE_2D,0,e.RG16F,s,i,0,e.RG,e.HALF_FLOAT,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let b=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,b),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,h,0),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.bindFramebuffer(e.FRAMEBUFFER,null),{texture:h,framebuffer:b}},Le=()=>{u.targets.forEach(s=>{e.deleteTexture(s.texture),e.deleteFramebuffer(s.framebuffer)}),u.targets=[],u.width=0,u.height=0,u.energy=0},ve=!1,Je=()=>{let s=q.current,i=V.getBoundingClientRect(),h=Math.max(1,i.width),b=Math.max(1,i.height),w=Math.min(window.devicePixelRatio||1,s.maxRatio),G=Math.ceil(Math.sqrt(h*b*w*w/ot)-.05),F=Math.max(s.pixelSize>0?Math.round(s.pixelSize*w):1,G,1),T=Math.max(1,Math.ceil(h*w/F)),c=Math.max(1,Math.ceil(b*w/F)),g=s.crt>0,Ee=g?T*F:T,f=g?c*F:c;if((p.width!==Ee||p.height!==f)&&(p.width=Ee,p.height=f),p.style.width=`${T*F/w}px`,p.style.height=`${c*F/w}px`,p.style.imageRendering=!g&&s.pixelSize>0&&F>=2?"pixelated":"auto",g&&(_.width!==T||_.height!==c)&&(e.bindTexture(e.TEXTURE_2D,_.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,T,c,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,_.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,_.texture,0),e.bindFramebuffer(e.FRAMEBUFFER,null),_.width=T,_.height=c),m.cssWidth=h,m.cssHeight=b,m.block=F/w,m.device=F,m.width=T,m.height=c,m.crt=g,!U)return;let x=E(Math.ceil(h/We),8,320),R=E(Math.ceil(b/We),8,320);x===u.width&&R===u.height||(Le(),u.width=x,u.height=R,u.targets=[Me(x,R),Me(x,R)])},pe=()=>{ve=!0,A()},Qe=(s,i,h,b,w,G,F)=>{if(!U)return;let[T,c]=u.targets;e.bindFramebuffer(e.FRAMEBUFFER,c.framebuffer),e.viewport(0,0,u.width,u.height),e.useProgram(U.program),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,T.texture);let g=U.uniforms;e.uniform1i(g.uPrev,0),e.uniform2f(g.uSize,u.width,u.height),e.uniform2f(g.uCss,m.cssWidth,m.cssHeight),e.uniform2f(g.uFrom,s,i),e.uniform2f(g.uTo,h,b),e.uniform2f(g.uPush,w,G),e.uniform1f(g.uRadius,Ye),e.uniform1f(g.uDecay,F),e.drawArrays(e.TRIANGLES,0,3),u.targets=[c,T]},Pe=s=>{if(X=0,ve&&(ve=!1,Je()),he)return;let i=q.current,h=E((s-te)/1e3||0,0,.05);te=Math.max(te,s);let b=Q?.2:1;Se+=h*i.speed*7*b,Ae+=h*i.rotation*.2*b,k<1&&(k=Math.min(1,k+h/2.2));let w=i.mouse&&l.inside,G=w?(l.x/m.cssWidth-.5)*.35*i.strength:0;if(ee.value+=(G-ee.value)*(1-Math.exp(-h/.8)),e.bindVertexArray(Ce),U&&u.targets.length){let f=l.x-l.lastX,x=l.y-l.lastY,R=w&&l.ready&&(f!==0||x!==0),oe=Math.exp(-h/1.6);if(R||u.energy>.05){let $=.85*i.strength*(Q?.4:1),ke=R?Math.hypot(f,x)*$:0,ne=Math.max(1,Math.ceil(ke/(Ye*.3)));for(let I=0;I<ne;I++){let ie=I/ne,se=(I+1)/ne;Qe(l.lastX+f*ie,l.lastY+x*ie,l.lastX+f*se,l.lastY+x*se,R?f*(se-ie)*$:0,R?x*(se-ie)*$:0,I===ne-1?oe:1)}u.energy=u.energy*oe+ke,u.energy<=.05&&u.targets.forEach(I=>{e.bindFramebuffer(e.FRAMEBUFFER,I.framebuffer),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT)})}}l.lastX=l.x,l.lastY=l.y;for(let f=S.length-1;f>=0;f--)S[f].age+=h,S[f].age>=3.2&&S.splice(f,1);z.fill(0),S.forEach((f,x)=>{let R=f.age,oe=ce(R/.25),$=1-ce((R-.25)/2.95);z[x*4]=f.x,z[x*4+1]=f.y,z[x*4+2]=f.direction*1.9*oe*$,z[x*4+3]=150*(1+.6*ce(R/3.2))});let T=1-(1-Math.pow(1-k,3));e.bindFramebuffer(e.FRAMEBUFFER,m.crt?_.framebuffer:null),e.viewport(0,0,m.width,m.height),e.useProgram(Z.program);let c=Z.uniforms;if(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,u.targets.length?u.targets[0].texture:null),e.uniform1i(c.uField,0),e.uniform1f(c.uFieldOn,u.targets.length&&u.energy>.05?1:0),e.uniform2f(c.uCss,m.cssWidth,m.cssHeight),e.uniform2f(c.uCanvas,m.width,m.height),e.uniform1f(c.uBlock,m.block),e.uniform1f(c.uFlow,Se),e.uniform1f(c.uSpin,-.4+Ae+ee.value+2.6*T*T),e.uniform2f(c.uOffset,i.offset[0],i.offset[1]),e.uniform3f(c.uColor1,i.color1[0],i.color1[1],i.color1[2]),e.uniform3f(c.uColor2,i.color2[0],i.color2[1],i.color2[2]),e.uniform3f(c.uColor3,i.color3[0],i.color3[1],i.color3[2]),e.uniform1f(c.uContrast,i.contrast),e.uniform1f(c.uLighting,i.lighting),e.uniform1f(c.uSwirl,Math.min(1,i.swirl+.55*T)),e.uniform1f(c.uScale,i.scale),e.uniform1i(c.uDetail,i.detail),e.uniform4fv(c.uTwirls,z),e.uniform1f(c.uReveal,ce(k/.45)),e.uniform1f(c.uLight,i.light?1:0),e.uniform1f(c.uOpacity,i.opacity),e.drawArrays(e.TRIANGLES,0,3),m.crt){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,p.width,p.height),e.useProgram(J.program);let f=J.uniforms;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,_.texture),e.uniform1i(f.uPaint,0),e.uniform2f(f.uCanvas,p.width,p.height),e.uniform2f(f.uSource,m.width,m.height),e.uniform1f(f.uDevice,m.device),e.uniform1f(f.uCrt,i.crt),e.drawArrays(e.TRIANGLES,0,3)}let g=Math.abs(G-ee.value)>5e-4||u.energy>.05||S.length>0;(i.speed>0||i.rotation!==0||k<1||g)&&de&&me&&(X=requestAnimationFrame(Pe))},A=()=>{X||he||!de||!me||(te=performance.now(),X=requestAnimationFrame(Pe))};fe.current=()=>{pe(),A()};let De=s=>{let i=V.getBoundingClientRect();return{x:s.clientX-i.left,y:s.clientY-i.top,inside:s.clientX>=i.left&&s.clientX<=i.right&&s.clientY>=i.top&&s.clientY<=i.bottom}},Ue=s=>{let i=De(s);(!l.ready||!l.inside)&&(l.lastX=i.x,l.lastY=i.y),l.vx=i.x-l.x,l.x=i.x,l.y=i.y,l.inside=i.inside,l.ready=!0,A()},Xe=s=>{let i=q.current,h=De(s);!h.inside||!i.clickSwirl||Q||(S.push({x:h.x,y:h.y,age:0,direction:l.vx<0?1:-1}),S.length>ue&&S.shift(),A())},ge=()=>{l.inside=!1,A()},re=s=>{s.pointerType!=="mouse"&&ge()};window.addEventListener("pointermove",Ue,{passive:!0}),window.addEventListener("pointerdown",Xe,{passive:!0}),window.addEventListener("pointerup",re,{passive:!0}),window.addEventListener("pointercancel",re,{passive:!0}),document.documentElement.addEventListener("pointerleave",ge);let Ie=s=>{s.preventDefault(),he=!0,cancelAnimationFrame(X),X=0},Oe=()=>Ze(s=>s+1);p.addEventListener("webglcontextlost",Ie),p.addEventListener("webglcontextrestored",Oe);let Ne=new ResizeObserver(()=>{pe(),A()});Ne.observe(V);let Be=new IntersectionObserver(s=>{de=s.some(i=>i.isIntersecting),A()});Be.observe(V);let ze=()=>{me=document.visibilityState!=="hidden",A()};return document.addEventListener("visibilitychange",ze),pe(),A(),()=>{cancelAnimationFrame(X),fe.current=null,Ne.disconnect(),Be.disconnect(),window.removeEventListener("pointermove",Ue),window.removeEventListener("pointerdown",Xe),window.removeEventListener("pointerup",re),window.removeEventListener("pointercancel",re),document.documentElement.removeEventListener("pointerleave",ge),document.removeEventListener("visibilitychange",ze),p.removeEventListener("webglcontextlost",Ie),p.removeEventListener("webglcontextrestored",Oe),e.isContextLost()||(Le(),e.deleteTexture(_.texture),e.deleteFramebuffer(_.framebuffer),e.deleteVertexArray(Ce),e.deleteProgram(Z.program),e.deleteProgram(J.program),U&&e.deleteProgram(U.program))}},[Fe]),W("div",{ref:Re,className:`balatro${we?` ${we}`:""}`,style:je},W("canvas",{ref:be,className:"balatro__canvas","aria-hidden":"true"}))},Ve=ct;He("balatro",Ve);})();
