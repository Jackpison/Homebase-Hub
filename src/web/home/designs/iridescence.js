/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var V=null,L=Symbol("Fragment");function He(a,s,n){if(s==="ref"){typeof n=="function"?n(a):n&&(n.current=a);return}if(!(s==="children"||n==null||n===!1)){if(s==="className"){a.setAttribute("class",n);return}if(s==="style"){for(let r in n){let x=n[r];x==null||x===!1||(r.startsWith("--")?a.style.setProperty(r,String(x)):a.style[r]=typeof x=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(r)?x+"px":x)}return}if(/^on[A-Z]/.test(s)&&typeof n=="function"){a.addEventListener(s.slice(2).toLowerCase(),n);return}if(s==="htmlFor"){a.setAttribute("for",n);return}a.setAttribute(s,n===!0?"":String(n))}}function _e(a,s){for(let n of s)n==null||n===!1||n===!0||(Array.isArray(n)?_e(a,n):n instanceof Node?a.appendChild(n):a.appendChild(document.createTextNode(String(n))))}function U(a,s,...n){if(typeof a=="function")return a({...s,children:n});let r=a===L?document.createDocumentFragment():document.createElement(a);if(a!==L)for(let x in s||{})He(r,x,s[x]);return _e(r,n),r}var qe=(a,s)=>a&&s&&a.length===s.length&&a.every((n,r)=>Object.is(n,s[r]));function D(a){let s=V,n=s.i++;return s.hooks[n]||(s.hooks[n]={current:a})}function Y(a,s){let n=V,r=n.i++;n.effects.push([r,a,s])}function Ke(a,s,n){let r={hooks:[],effects:[],i:0,cleanups:[],props:s,dead:!1,queued:!1,tree:null},x=()=>{let f=r.effects;r.effects=[];for(let[p,H,k]of f){let E=r.cleanups[p];if(E&&k&&qe(E.deps,k))continue;if(E&&E.fn)try{E.fn()}catch{}let A;try{A=H()}catch{A=null}r.cleanups[p]={deps:k,fn:typeof A=="function"?A:null}}},I=f=>{V=r,r.i=0,r.effects=[];let p;try{p=a(r.props)}finally{V=null}f&&(r.tree=p,p instanceof Node&&n.appendChild(p)),x()};r.queue=()=>{r.queued||r.dead||(r.queued=!0,Promise.resolve().then(()=>{r.queued=!1,r.dead||I(!1)}))},I(!0);let G=r.tree instanceof Node?r.tree:n,$=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],B=f=>{if(r.dead||f.__hubFwd||f.target instanceof Element&&f.target.closest("input,textarea,select"))return;let p;try{p=new f.constructor(f.type,f)}catch{return}p.__hubFwd=!0,G.dispatchEvent(p)},W=$.filter(()=>matchMedia("(pointer: fine)").matches);return W.forEach(f=>window.addEventListener(f,B,{passive:!0})),{update(f){r.props={...r.props,...f},I(!1)},destroy(){r.dead=!0,W.forEach(f=>window.removeEventListener(f,B));for(let f of r.cleanups)if(f&&f.fn)try{f.fn()}catch{}r.cleanups=[],r.tree instanceof Node&&r.tree.parentNode&&r.tree.parentNode.removeChild(r.tree)},root:G}}function Ce(a,s){(window.HubDesigns=window.HubDesigns||{})[a]={start:(n,r)=>Ke(s,r||{},n)}}var ze=`#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,je=`#version 300 es
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
}`,Ve=48,Le=6,fe=3.2,S=(a,s,n)=>Math.min(n,Math.max(s,a)),Ue=(a,s,n)=>{let r=a.createShader(s);return r?(a.shaderSource(r,n),a.compileShader(r),a.getShaderParameter(r,a.COMPILE_STATUS)?r:(a.deleteShader(r),null)):null},Ye=({color:a=[1,1,1],speed:s=1,amplitude:n=.1,mouseReact:r=!0,scale:x=1,detail:I=8,rotation:G=0,warp:$=1,hueShift:B=0,saturation:W=1,brightness:f=1.5,contrast:p=1,stir:H=.5,sheen:k=.3,clickSwirl:E=!0,grain:A=0,fade:Z=0,opacity:Ie=1,resolution:ke=1,paused:Xe=!1,className:de="",style:Ne})=>{let me=D(null),he=D(null),J=D(null),pe={colorKey:Array.isArray(a)?a.join(","):String(a),color:a,speed:s,amplitude:n,mouseReact:r,scale:Math.max(.05,x),detail:S(Math.round(I),1,24),rotation:G,warp:$,hueShift:B,saturation:Math.max(0,W),brightness:Math.max(0,f),contrast:Math.max(0,p),stir:Math.max(0,H),sheen:Math.max(0,k),clickSwirl:E,grain:S(A,0,1),fade:S(Z,0,1),opacity:S(Ie,0,1),resolution:S(ke,.1,2),paused:Xe},M=D(pe);return M.current=pe,Y(()=>{let F=me.current,T=he.current,e=T?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!F||!T||!e)return;let Q=Ue(e,e.VERTEX_SHADER,ze),ee=Ue(e,e.FRAGMENT_SHADER,je),R=e.createProgram();if(!Q||!ee||!R||(e.attachShader(R,Q),e.attachShader(R,ee),e.linkProgram(R),!e.getProgramParameter(R,e.LINK_STATUS)))return;e.useProgram(R);let ve=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ve),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);let xe=e.getAttribLocation(R,"aPosition");e.enableVertexAttribArray(xe),e.vertexAttribPointer(xe,2,e.FLOAT,!1,0,0);let l={};for(let o of["uResolution","uTime","uColor","uMouse","uAmplitude","uScale","uRotation","uDetail","uWarp","uHue","uSaturation","uBrightness","uContrast","uGrain","uSeed","uFade","uOpacity","uField","uStir","uPointer","uSheen","uSwirls"])l[o]=e.getUniformLocation(R,o);let q=e.createTexture();e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,q),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.uniform1i(l.uField,0);let te=document.createElement("canvas");te.width=1,te.height=1;let b=te.getContext("2d",{willReadFrequently:!0}),oe=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,h={x:.5,y:.5,px:0,py:0,inside:!1,tracked:!1},t={width:1,height:1,phase:0,mouse:[.5,.5],presence:0,color:[1,1,1],colorKey:"",cols:0,rows:0,field:new Float32Array(0),scratch:new Float32Array(0),fieldActive:!1,swirls:[],seed:0},re=new Float32Array(Le*4),P=0,X=0,K=!0,ne=!0,Oe=o=>{if(o.colorKey===t.colorKey)return;if(t.colorKey=o.colorKey,Array.isArray(o.color)){t.color=[0,1,2].map(d=>S(Number(o.color[d]??1),0,1));return}if(!b)return;b.clearRect(0,0,1,1),b.fillStyle="#ffffff",b.fillStyle=String(o.color),b.fillRect(0,0,1,1);let[i,u,c]=b.getImageData(0,0,1,1).data;t.color=[i/255,u/255,c/255]},Ge=()=>{let o=Ve,i=S(Math.round(o*t.height/t.width),6,96);o===t.cols&&i===t.rows||(t.cols=o,t.rows=i,t.field=new Float32Array(o*i*2),t.scratch=new Float32Array(o*i*2),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,q),e.texImage2D(e.TEXTURE_2D,0,e.RG16F,o,i,0,e.RG,e.FLOAT,t.field))},Be=(o,i,u,c)=>{let{cols:d,rows:w,field:y}=t,m=.22,g=t.width/t.height,N=Math.max(0,Math.floor((o-m/g)*d)),se=Math.min(d-1,Math.ceil((o+m/g)*d)),ce=Math.max(0,Math.floor((i-m)*w)),ue=Math.min(w-1,Math.ceil((i+m)*w));for(let C=ce;C<=ue;C++)for(let v=N;v<=se;v++){let z=((v+.5)/d-o)*g,Se=(C+.5)/w-i,O=1-(z*z+Se*Se)/(m*m);if(O<=0)continue;let j=(C*d+v)*2,Ae=y[j]+u*O*O*3.2,Fe=y[j+1]+c*O*O*3.2,le=Math.hypot(Ae,Fe),be=.4,Pe=le>0?be*Math.tanh(le/be)/le:0;y[j]=Ae*Pe,y[j+1]=Fe*Pe}t.fieldActive=!0},We=o=>{let{cols:i,rows:u,field:c,scratch:d}=t,w=Math.exp(-o*1.4),y=0;for(let m=0;m<u;m++)for(let g=0;g<i;g++){let N=(m*i+g)*2,se=(m*i+Math.max(0,g-1))*2,ce=(m*i+Math.min(i-1,g+1))*2,ue=(Math.max(0,m-1)*i+g)*2,C=(Math.min(u-1,m+1)*i+g)*2;for(let v=0;v<2;v++){let z=(c[N+v]*12+c[se+v]+c[ce+v]+c[ue+v]+c[C+v])/16;d[N+v]=z*w,y=Math.max(y,Math.abs(d[N+v]))}}c.set(d),y<4e-4&&(c.fill(0),t.fieldActive=!1)},ie=()=>{let o=M.current;Oe(o),Ge(),e.viewport(0,0,T.width,T.height),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,q),e.texSubImage2D(e.TEXTURE_2D,0,0,0,t.cols,t.rows,e.RG,e.FLOAT,t.field),re.fill(0),t.swirls.forEach((i,u)=>{let c=.21*(1+.4*i.age),d=Math.exp(-i.age*1.35)-Math.exp(-i.age*10),w=Math.min(1,(fe-i.age)/.8);re.set([i.x,i.y,c,3*d*w*(.21/c)**2],u*4)}),e.uniform2f(l.uResolution,t.width,t.height),e.uniform1f(l.uTime,t.phase),e.uniform3f(l.uColor,t.color[0],t.color[1],t.color[2]),e.uniform2f(l.uMouse,t.mouse[0],t.mouse[1]),e.uniform1f(l.uAmplitude,o.amplitude),e.uniform1f(l.uScale,o.scale),e.uniform1f(l.uRotation,o.rotation*Math.PI/180),e.uniform1i(l.uDetail,o.detail),e.uniform1f(l.uWarp,o.warp),e.uniform1f(l.uHue,o.hueShift*Math.PI/180),e.uniform1f(l.uSaturation,o.saturation),e.uniform1f(l.uBrightness,o.brightness),e.uniform1f(l.uContrast,o.contrast),e.uniform1f(l.uGrain,o.grain),e.uniform1f(l.uSeed,t.seed),e.uniform1f(l.uFade,o.fade),e.uniform1f(l.uOpacity,o.opacity),e.uniform1f(l.uStir,o.mouseReact?o.stir:0),e.uniform3f(l.uPointer,h.x,h.y,o.mouseReact?t.presence:0),e.uniform1f(l.uSheen,o.sheen),e.uniform4fv(l.uSwirls,re),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.TRIANGLES,0,3)},we=o=>{if(P=0,!ne||!K)return;let i=M.current,u=X?Math.min(.05,(o-X)/1e3):1/60;X=o;let c=!i.paused&&!oe;c&&(t.phase+=u*i.speed);let d=i.mouseReact&&h.tracked?[h.x,h.y]:[.5,.5],w=1-Math.exp(-u*5);t.mouse[0]+=(d[0]-t.mouse[0])*w,t.mouse[1]+=(d[1]-t.mouse[1])*w,t.presence+=((h.inside?1:0)-t.presence)*(1-Math.exp(-u*4)),t.fieldActive&&We(u),t.swirls=t.swirls.filter(m=>(m.age+=u)<fe),i.grain>0&&c&&(t.seed=Math.floor(o/42)%997),ie();let y=Math.abs(d[0]-t.mouse[0])>5e-4||Math.abs(d[1]-t.mouse[1])>5e-4||Math.abs((h.inside?1:0)-t.presence)>.002;c||y||t.fieldActive||t.swirls.length?P=requestAnimationFrame(we):X=0},_=()=>{P||!ne||!K||(P=requestAnimationFrame(we))},ge=o=>{let i=F.getBoundingClientRect();return{x:(o.clientX-i.left)/Math.max(1,i.width),y:1-(o.clientY-i.top)/Math.max(1,i.height)}},ye=o=>{let i=M.current,{x:u,y:c}=ge(o),d=u>=0&&u<=1&&c>=0&&c<=1;d&&i.mouseReact&&!oe&&h.inside&&i.stir>0&&Be(u,c,u-h.x,c-h.y),h.x=u,h.y=c,h.inside=d,d&&(h.tracked=!0),_()},Re=()=>{h.inside=!1,_()},Ee=o=>{if(!M.current.clickSwirl||oe)return;let{x:u,y:c}=ge(o);if(!(u<0||u>1||c<0||c>1)){if(t.swirls.length>=Le){if(t.swirls[0].age<fe-.4)return;t.swirls.shift()}t.swirls.push({x:u,y:c,age:0}),_()}},ae=()=>{let o=M.current,i=Math.min(window.devicePixelRatio||1,2)*o.resolution;t.width=Math.max(1,F.clientWidth),t.height=Math.max(1,F.clientHeight),T.width=Math.max(1,Math.round(t.width*i)),T.height=Math.max(1,Math.round(t.height*i)),ie(),_()};J.current=()=>{let o=Math.min(window.devicePixelRatio||1,2)*M.current.resolution;T.width!==Math.max(1,Math.round(t.width*o))?ae():P||ie(),_()};let Me=new ResizeObserver(ae);Me.observe(F);let Te=new IntersectionObserver(o=>{K=o.some(i=>i.isIntersecting),K&&(X=0,_())});return Te.observe(F),window.addEventListener("pointermove",ye,{passive:!0}),window.addEventListener("pointerdown",Ee,{passive:!0}),document.documentElement.addEventListener("pointerleave",Re),ae(),()=>{ne=!1,cancelAnimationFrame(P),J.current=null,Me.disconnect(),Te.disconnect(),window.removeEventListener("pointermove",ye),window.removeEventListener("pointerdown",Ee),document.documentElement.removeEventListener("pointerleave",Re),e.deleteTexture(q),e.deleteBuffer(ve),e.deleteProgram(R),e.deleteShader(Q),e.deleteShader(ee)}},[]),Y(()=>{J.current?.()}),U("div",{ref:me,className:`iridescence-container${de?` ${de}`:""}`,style:Ne},U("canvas",{ref:he,className:"iridescence-canvas","aria-hidden":"true"}))},De=Ye;Ce("iridescence",De);})();
