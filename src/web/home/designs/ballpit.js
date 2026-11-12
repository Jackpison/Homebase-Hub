/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var xe=null,Dt=Symbol("Fragment");function Eo(s,x,f){if(x==="ref"){typeof f=="function"?f(s):f&&(f.current=s);return}if(!(x==="children"||f==null||f===!1)){if(x==="className"){s.setAttribute("class",f);return}if(x==="style"){for(let c in f){let _=f[c];_==null||_===!1||(c.startsWith("--")?s.style.setProperty(c,String(_)):s.style[c]=typeof _=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(c)?_+"px":_)}return}if(/^on[A-Z]/.test(x)&&typeof f=="function"){s.addEventListener(x.slice(2).toLowerCase(),f);return}if(x==="htmlFor"){s.setAttribute("for",f);return}s.setAttribute(x,f===!0?"":String(f))}}function Je(s,x){for(let f of x)f==null||f===!1||f===!0||(Array.isArray(f)?Je(s,f):f instanceof Node?s.appendChild(f):s.appendChild(document.createTextNode(String(f))))}function qt(s,x,...f){if(typeof s=="function")return s({...x,children:f});let c=s===Dt?document.createDocumentFragment():document.createElement(s);if(s!==Dt)for(let _ in x||{})Eo(c,_,x[_]);return Je(c,f),c}var Lo=(s,x)=>s&&x&&s.length===x.length&&s.every((f,c)=>Object.is(f,x[c]));function Et(s){let x=xe,f=x.i++;return x.hooks[f]||(x.hooks[f]={current:s})}function ve(s,x){let f=xe,c=f.i++;f.effects.push([c,s,x])}function Po(s,x,f){let c={hooks:[],effects:[],i:0,cleanups:[],props:x,dead:!1,queued:!1,tree:null},_=()=>{let P=c.effects;c.effects=[];for(let[O,gt,ot]of P){let At=c.cleanups[O];if(At&&ot&&Lo(At.deps,ot))continue;if(At&&At.fn)try{At.fn()}catch{}let ht;try{ht=gt()}catch{ht=null}c.cleanups[O]={deps:ot,fn:typeof ht=="function"?ht:null}}},wt=P=>{xe=c,c.i=0,c.effects=[];let O;try{O=s(c.props)}finally{xe=null}P&&(c.tree=O,O instanceof Node&&f.appendChild(O)),_()};c.queue=()=>{c.queued||c.dead||(c.queued=!0,Promise.resolve().then(()=>{c.queued=!1,c.dead||wt(!1)}))},wt(!0);let ut=c.tree instanceof Node?c.tree:f,Mt=["pointermove","mousemove"],ye=["clientX","clientY","screenX","screenY","button","buttons","ctrlKey","shiftKey","altKey","metaKey","pointerId","pointerType","isPrimary","width","height","pressure","movementX","movementY"],Gt=P=>{if(c.dead||P.__hubFwd||P.target instanceof Element&&P.target.closest("input,textarea,select"))return;let O={bubbles:!1,cancelable:!1};for(let ot of ye)ot in P&&(O[ot]=P[ot]);let gt;try{gt=new P.constructor(P.type,O)}catch{return}gt.__hubFwd=!0,ut.dispatchEvent(gt)},$t=Mt.filter(()=>matchMedia("(pointer: fine)").matches);return $t.forEach(P=>window.addEventListener(P,Gt,{passive:!0})),{update(P){c.props={...c.props,...P},wt(!1)},destroy(){c.dead=!0,$t.forEach(P=>window.removeEventListener(P,Gt));for(let P of c.cleanups)if(P&&P.fn)try{P.fn()}catch{}c.cleanups=[],c.tree instanceof Node&&c.tree.parentNode&&c.tree.parentNode.removeChild(c.tree)},root:ut}}function to(s,x){(window.HubDesigns=window.HubDesigns||{})[s]={start:(f,c)=>Po(x,c||{},f)}}var eo=50,Lt=20,Ee=1.5,Pt=16,Kt=12,oo=.01,no={satin:{roughness:.42,metalness:0,coat:.35,coatRoughness:.22,scatter:1,frost:0},matte:{roughness:.92,metalness:0,coat:0,coatRoughness:.5,scatter:.5,frost:0},gloss:{roughness:.2,metalness:0,coat:1,coatRoughness:.08,scatter:1,frost:0},frosted:{roughness:.55,metalness:0,coat:.6,coatRoughness:.18,scatter:1.5,frost:1},metal:{roughness:.3,metalness:1,coat:0,coatRoughness:.2,scatter:0,frost:0}},Co=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aSphere;
layout(location = 2) in vec4 aColor;
layout(location = 3) in vec4 aShade;
uniform mat4 uProj;
uniform float uCameraZ;
uniform float uPixel;
out vec3 vPoint;
flat out vec3 vCenter;
flat out float vRadius;
flat out vec4 vColor;
flat out vec4 vShade;
void main() {
  vec3 c = vec3(aSphere.xy, aSphere.z - uCameraZ);
  float r = aSphere.w;
  float d = length(c);
  vec3 toCamera = -c / d;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
  vec3 up = cross(toCamera, right);
  float reach = r * d / sqrt(max(d * d - r * r, 1e-4)) + uPixel * d * 2.0;
  vec3 p = c + (right * aCorner.x + up * aCorner.y) * reach;
  vPoint = p;
  vCenter = c;
  vRadius = r;
  vColor = aColor;
  vShade = aShade;
  gl_Position = uProj * vec4(p, 1.0);
}`,No=`#version 300 es
precision highp float;
in vec3 vPoint;
flat in vec3 vCenter;
flat in float vRadius;
flat in vec4 vColor;
flat in vec4 vShade;
uniform mat4 uProj;
uniform vec3 uLightPos;
uniform vec3 uLight;
uniform float uExposure;
uniform float uShadow;
uniform vec4 uSurface;
uniform vec2 uExtra;
out vec4 outColor;

const float PI = 3.14159265;

float lobe(vec3 d, vec3 axis, float sharp) {
  return pow(max(dot(d, axis), 0.0), sharp) * (sharp + 1.0) * 0.16;
}

vec3 studio(vec3 d, float rough) {
  float r = clamp(rough, 0.0, 1.0);
  float sharp = mix(60.0, 1.2, sqrt(r));
  vec3 col = mix(vec3(0.085, 0.085, 0.09), vec3(0.38, 0.38, 0.39), smoothstep(-0.7, 0.9, d.y));
  col += vec3(1.0, 0.99, 0.97) * 2.6 * lobe(d, normalize(vec3(-0.42, 0.78, 0.47)), sharp);
  col += vec3(0.97, 0.98, 1.0) * 1.1 * lobe(d, normalize(vec3(0.78, 0.22, 0.58)), sharp * 0.7);
  col += vec3(1.0) * 1.3 * lobe(d, normalize(vec3(0.15, 0.55, -0.82)), sharp * 0.8);
  return col;
}

vec2 envBRDF(float NoV, float rough) {
  vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
  vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
  vec4 r = rough * c0 + c1;
  float a = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
  return vec2(-1.04, 1.04) * a + r.zw;
}

float ggx(float NoH, float a) {
  float a2 = a * a;
  float d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d);
}

float smith(float NoV, float NoL, float a) {
  float k = a * 0.5;
  return 0.25 / max((NoV * (1.0 - k) + k) * (NoL * (1.0 - k) + k), 1e-4);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 rd = normalize(vPoint);
  float b = dot(vCenter, rd);
  float h = length(vCenter - rd * b);
  float r = vRadius;
  float aa = max(fwidth(h), 1e-5);
  float cover = clamp((r - h) / aa + 0.5, 0.0, 1.0);
  if (cover <= 0.002) discard;
  float hc = min(h, r * 0.9995);
  float t = b - sqrt(r * r - hc * hc);
  vec3 pos = rd * t;
  vec3 n = normalize(pos - vCenter);
  vec4 clip = uProj * vec4(pos, 1.0);
  gl_FragDepth = clamp(clip.z / clip.w * 0.5 + 0.5, 0.0, 1.0);

  vec3 v = -rd;
  vec3 albedo = vColor.rgb;
  bool lamp = vColor.a > 0.5;
  vec3 dn = fwidth(n);
  float rough = sqrt(min(uSurface.x * uSurface.x + dot(dn, dn) * 0.6, 1.0));
  float metal = uSurface.y;
  float coat = uSurface.z;
  float coatRough = sqrt(min(uSurface.w * uSurface.w + dot(dn, dn) * 0.6, 1.0));
  float NoV = clamp(dot(n, v), 1e-4, 1.0);
  vec3 R = reflect(-v, n);

  float occlusion = vShade.w * smoothstep(-0.15, 0.9, dot(n, vShade.xyz));
  float ao = 1.0 - uShadow * occlusion;
  float specAo = 1.0 - uShadow * occlusion * 0.7;

  vec3 L = uLightPos - pos;
  float dist2 = dot(L, L);
  L *= inversesqrt(dist2);
  vec3 radiance = lamp ? vec3(0.0) : uLight / (dist2 + 1.0);
  float NoL = clamp(dot(n, L), 0.0, 1.0);
  vec3 H = normalize(L + v);
  float NoH = clamp(dot(n, H), 0.0, 1.0);
  float VoH = clamp(dot(v, H), 0.0, 1.0);

  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec2 ab = envBRDF(NoV, rough);
  vec3 Fr = max(vec3(1.0 - rough), F0) - F0;
  vec3 kS = F0 + Fr * pow(1.0 - NoV, 5.0);
  vec3 diffuseColor = albedo * (1.0 - metal);
  vec3 irradiance = studio(n, 1.0) * 1.15;
  vec3 envSpec = studio(R, rough) * (F0 * ab.x + ab.y);
  vec3 col = diffuseColor * irradiance * (1.0 - kS) * ao + envSpec * specAo;
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);
  float a = max(rough * rough, 0.06);
  vec3 spec = ggx(NoH, a) * smith(NoV, NoL, a) * F;
  float wrap = clamp((dot(n, L) + 0.3) / 1.3, 0.0, 1.0);
  col += (diffuseColor * (1.0 - F) / PI * wrap + spec * NoL) * radiance;
  vec3 sh = normalize(L + n * 0.1);
  float scatter = pow(clamp(dot(v, -sh), 0.0, 1.0), 2.0) * 10.0 + 0.04;
  col += scatter * albedo * radiance * 0.03 * uExtra.x;
  float alpha = 1.0;
  if (uExtra.y > 0.5) {
    float rim = pow(1.0 - NoV, 2.5);
    col += albedo * (studio(-R, 1.0) * 0.35 + 0.06) * (1.0 - rim);
    col += radiance * albedo * pow(max(dot(-v, L), 0.0), 3.0) * 0.08;
    alpha = mix(0.5, 0.96, rim);
  }
  if (coat > 0.0) {
    float Fc = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
    float ca = max(coatRough * coatRough, 0.03);
    vec3 coatEnv = studio(R, coatRough) * Fc;
    float coatSpec = ggx(NoH, ca) * smith(NoV, NoL, ca) * (0.04 + 0.96 * pow(1.0 - VoH, 5.0)) * NoL;
    col = col * (1.0 - Fc * coat) + (coatEnv * specAo + radiance * coatSpec) * coat;
    alpha = mix(alpha, 1.0, Fc * coat);
  }
  if (lamp) col += uLight * 0.0025 * (0.4 + 0.6 * albedo);
  col = aces(col * uExposure);
  col = pow(col, vec3(1.0 / 2.2));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  float a2 = alpha * cover;
  outColor = vec4(col * a2, a2);
}`,K=(s,x,f)=>Math.min(f,Math.max(x,s)),ro=(s,x,f)=>{let c=s.createShader(x);return c?(s.shaderSource(c,f),s.compileShader(c),s.getShaderParameter(c,s.COMPILE_STATUS)?c:(s.deleteShader(c),null)):null},Io=s=>{let x=ro(s,s.VERTEX_SHADER,Co),f=ro(s,s.FRAGMENT_SHADER,No),c=s.createProgram();if(!x||!f||!c)return null;if(s.attachShader(c,x),s.attachShader(c,f),s.linkProgram(c),s.deleteShader(x),s.deleteShader(f),!s.getProgramParameter(c,s.LINK_STATUS))return s.deleteProgram(c),null;let _={},wt=s.getProgramParameter(c,s.ACTIVE_UNIFORMS);for(let ut=0;ut<wt;ut++){let Mt=s.getActiveUniform(c,ut);Mt&&(_[Mt.name]=s.getUniformLocation(c,Mt.name))}return{program:c,uniforms:_}},ao=s=>{let x;if(typeof s=="number")x=[(s>>16&255)/255,(s>>8&255)/255,(s&255)/255];else{let f=String(s||"#ffffff").replace("#","").trim();(f.length===3||f.length===4)&&(f=f.slice(0,3).split("").map(_=>_+_).join(""));let c=parseInt(f.slice(0,6),16);x=Number.isNaN(c)?[1,1,1]:[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255]}return x.map(f=>Math.pow(f,2.2))},Ho=({count:s=200,colors:x=["#ffffff"],material:f="satin",minSize:c=.5,maxSize:_=1,gravity:wt=.5,friction:ut=.9975,wallBounce:Mt=.95,bounce:ye=.85,depth:Gt=2,drift:$t=0,followCursor:P=!0,cursorSize:O=1,grab:gt=!0,clickEffect:ot="burst",lightColor:At="#ffffff",lightIntensity:ht=1,exposure:we=1,shadows:so=.6,intro:io=!0,dpr:lo,className:fo="",style:uo})=>{let Le=Et(null),Pe=Et(null),Me=Et(null),Ce=Et(0),Ne={count:Math.round(K(s,1,4e3)),colors:Array.isArray(x)&&x.length?x:["#ffffff"],material:no[f]?f:"satin",minSize:Math.max(.05,Math.min(c,_)),maxSize:Math.max(.05,Math.max(c,_)),gravity:wt,friction:K(ut,.5,1),wallBounce:K(Mt,0,1),bounce:K(ye,0,1),depth:Math.max(0,Gt),drift:Math.max(0,$t),followCursor:P,cursorSize:Math.max(0,O),grab:gt,clickEffect:ot,lightColor:At,lightIntensity:ht>20?ht/200:Math.max(0,ht),exposure:Math.max(0,we),shadows:K(so,0,1),intro:io,dpr:lo},dt=Et(Ne);return dt.current=Ne,ve(()=>{window.clearTimeout(Ce.current);let bt=Le.current,zt=Pe.current,i=zt?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!0,stencil:!1,powerPreference:"high-performance"});if(!bt||!zt||!i)return;let Qt=Io(i);if(!Qt)return;let ct=Qt.uniforms,Jt=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,d={width:1,height:1,ratio:1,halfW:9,halfH:9,fit:1,tan:Math.tan(eo*Math.PI/360)},Ft=new Float32Array(16),ge=i.createVertexArray();i.bindVertexArray(ge);let Ie=i.createBuffer();i.bindBuffer(i.ARRAY_BUFFER,Ie),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),i.STATIC_DRAW),i.enableVertexAttribArray(0),i.vertexAttribPointer(0,2,i.FLOAT,!1,0,0);let te=i.createBuffer();i.bindBuffer(i.ARRAY_BUFFER,te);for(let t=0;t<3;t++)i.enableVertexAttribArray(1+t),i.vertexAttribPointer(1+t,4,i.FLOAT,!1,Kt*4,t*16),i.vertexAttribDivisor(1+t,1);i.bindVertexArray(null);let Ae=0,S=0,N=new Float32Array(0),L=new Float32Array(0),C=new Float32Array(0),A=new Float32Array(0),b=new Float32Array(0),R=new Float32Array(0),T=new Float32Array(0),Ct=new Float32Array(0),Ut=new Float32Array(0),ee=new Float32Array(0),W=new Float32Array(0),mt=new Float32Array(0),Xt=new Uint16Array(0),st=new Uint8Array(0),oe=new Int32Array(0),be=new Int32Array(0),it=new Int32Array(1),z=new Float32Array(Kt),pt=new Int32Array(2),ze=new Int32Array(2),ne=[],He="",Ve="",ho=t=>{let o=(e,l=1)=>{let v=new Float32Array(t*l);return v.set(e.subarray(0,Math.min(e.length,v.length))),v},r=e=>{let l=new Uint8Array(t);return l.set(e.subarray(0,Math.min(e.length,l.length))),l};N=o(N),L=o(L),C=o(C),A=o(A),b=o(b),R=o(R),T=o(T),Ct=o(Ct),Ut=o(Ut),ee=o(ee),W=o(W,4),mt=o(mt,3);let n=new Uint16Array(t);n.set(Xt.subarray(0,Math.min(Xt.length,t))),Xt=n,st=r(st),oe=new Int32Array(t),be=new Int32Array(t),it=new Int32Array(t+1),z=new Float32Array((t+1)*Kt),Ae=t,i.bindBuffer(i.ARRAY_BUFFER,te),i.bufferData(i.ARRAY_BUFFER,z.byteLength,i.DYNAMIC_DRAW)},H={x:0,y:0,inside:!1,down:!1,downX:0,downY:0,downAt:0,moved:!1},p={x:0,y:0,z:0,r:0,tx:0,ty:0,vx:0,vy:0},B={x:0,y:5,z:6,flash:0},y={index:-1,ox:0,oy:0,tx:0,ty:0,vx:0,vy:0},re=0,Ot=0,Wt=0,ae=0,ce=!0,se=0,mo=(t,o,r)=>{let n=T[t],e=Math.max(o.depth-n,0);if(st[t]=1,r&&o.gravity>.05)N[t]=(Math.random()*2-1)*Math.max(d.halfW-n,.01),L[t]=d.halfH+n+Math.random()*d.halfH*2.2,C[t]=(Math.random()*2-1)*e,A[t]=(Math.random()-.5)*2,b[t]=-(4+Math.random()*5),R[t]=0,st[t]=0;else if(r){let l=(Math.random()*2-1)*Math.max(d.halfW-n,.01),v=(Math.random()*2-1)*Math.max(d.halfH-n,.01),m=(Math.random()*2-1)*e;N[t]=(Math.random()*2-1)*.6,L[t]=(Math.random()*2-1)*.6,C[t]=(Math.random()*2-1)*Math.min(e,.3),A[t]=(l-N[t])*2.2,b[t]=(v-L[t])*2.2,R[t]=(m-C[t])*2.2,Ot=1}else N[t]=(Math.random()*2-1)*Math.max(d.halfW-n,.01),L[t]=(Math.random()*2-1)*Math.max(d.halfH-n,.01),C[t]=(Math.random()*2-1)*e,A[t]=0,b[t]=0,R[t]=0},po=t=>{for(let o=0;o<S;o++)T[o]=(t.minSize+Ut[o]*(t.maxSize-t.minSize))*d.fit,Ct[o]=1/(T[o]*T[o]*T[o])},xo=t=>{ne=t.colors.map(ao),He=t.colors.join("|")},_e=(t,o)=>{let r=`${t.minSize}:${t.maxSize}:${d.fit}`;if(t.count!==S){t.count>Ae&&ho(Math.max(t.count,Math.ceil(Ae*1.5)));let n=S;S=t.count;for(let e=n;e<S;e++)Ut[e]=Math.random(),Xt[e]=e,ee[e]=Math.random()*Math.PI*2,T[e]=(t.minSize+Ut[e]*(t.maxSize-t.minSize))*d.fit,Ct[e]=1/(T[e]*T[e]*T[e]),mo(e,t,(o?t.intro:!0)&&!Jt);for(let e=0;e<=S;e++)it[e]=e}r!==Ve&&(Ve=r,po(t)),t.colors.join("|")!==He&&xo(t)},xt=0,G=0,Nt=new Int32Array(0),It=new Float32Array(0),ie=new Float64Array(0),le=new Float32Array(0),E={scale:1,x0:0,y0:0,z0:0,nx:1,ny:1,nz:1},vo=(t,o)=>{E.scale=1/t,E.x0=-d.halfW-t,E.y0=-d.halfH-t,E.z0=-Math.max(o.depth,o.maxSize)-t,E.nx=Math.max(1,Math.ceil((d.halfW*2+t*2)*E.scale)+1),E.ny=Math.max(1,Math.ceil((d.halfH*2+t*2)*E.scale)+1),E.nz=Math.max(1,Math.ceil((Math.max(o.depth,o.maxSize)*2+t*2)*E.scale)+1);let r=E.nx*E.ny*E.nz;pt.length<r+1&&(pt=new Int32Array(r+1),ze=new Int32Array(r+1)),pt.fill(0,0,r+1);for(let n=0;n<S;n++){let e=K(Math.floor((N[n]-E.x0)*E.scale),0,E.nx-1),l=K(Math.floor((L[n]-E.y0)*E.scale),0,E.ny-1),m=(K(Math.floor((C[n]-E.z0)*E.scale),0,E.nz-1)*E.ny+l)*E.nx+e;oe[n]=m,pt[m+1]++}for(let n=1;n<=r;n++)pt[n]+=pt[n-1];ze.set(pt.subarray(0,r+1));for(let n=0;n<S;n++)be[ze[oe[n]]++]=n},Ht=(t,o,r,n,e,l,v,m)=>{if(o>=v||G>=xt)return;let a=A[t]*r+b[t]*n+R[t]*e,h=G,g=Math.fround(o);Nt[h*2]=t,Nt[h*2+1]=-2,It[h*3]=r,It[h*3+1]=n,It[h*3+2]=e,ie[h]=g>0?-g/m:Math.fround(a<-1.5?-l*a:0),le[h]=0,G++},yo=(t,o,r,n)=>{let e=y.index,{nx:l,ny:v,nz:m}=E,a=N,h=L,g=C,I=A,D=b,U=R,M=T,u=W,F=oe,V=pt,j=be,q=Nt,$=It,Q=ie,J=le,nt=xt,tt=t.bounce;G=0;for(let w=0;w<S;w++){let rt=F[w],Y=rt%l,lt=Math.floor(rt/l)%v,ft=Math.floor(rt/(l*v)),et=a[w],ue=h[w],he=g[w],Re=M[w],So=Y>0?Y-1:Y,Ro=Y<l-1?Y+2:Y+1;for(let Z=ft>0?-1:0;Z<=(ft<m-1?1:0);Z++)for(let at=lt>0?-1:0;at<=(lt<v-1?1:0);at++){let Vt=((ft+Z)*v+lt+at)*l,jt=V[Vt+Ro];for(let St=V[Vt+So];St<jt;St++){let k=j[St];if(k<=w)continue;let _t=a[k]-et,Bt=h[k]-ue,Tt=g[k]-he,kt=_t*_t+Bt*Bt+Tt*Tt,X=Re+M[k],Zt=Math.max(X+n,r?X*1.4:0);if(kt>=Zt*Zt||kt<1e-12)continue;let Yt=Math.sqrt(kt),de=_t/Yt,me=Bt/Yt,pe=Tt/Yt;if(r){let yt=K(1-(Yt-X)/(X*.4),0,1);u[w*4]+=de*yt,u[w*4+1]+=me*yt,u[w*4+2]+=pe*yt,u[w*4+3]+=yt,u[k*4]-=de*yt,u[k*4+1]-=me*yt,u[k*4+2]-=pe*yt,u[k*4+3]+=yt}if(Yt>=X+n||G>=nt||w===e&&k===e)continue;let $e=(I[k]-I[w])*de+(D[k]-D[w])*me+(U[k]-U[w])*pe,Rt=G,Qe=Math.fround(Yt-X);q[Rt*2]=w,q[Rt*2+1]=k,$[Rt*3]=de,$[Rt*3+1]=me,$[Rt*3+2]=pe,Q[Rt]=Qe>0?-Qe/o:Math.fround($e<-1.5?-tt*$e:0),J[Rt]=0,G++}}if(w!==e){let Z=Re,at=Math.max(t.depth-Z,0);Ht(w,et+d.halfW-Z,1,0,0,t.wallBounce,n,o),Ht(w,d.halfW-Z-et,-1,0,0,t.wallBounce,n,o),Ht(w,ue+d.halfH-Z,0,1,0,t.wallBounce,n,o),st[w]&&Ht(w,d.halfH-Z-ue,0,-1,0,t.wallBounce,n,o),Ht(w,he+at,0,0,1,t.wallBounce,n,o),Ht(w,at-he,0,0,-1,t.wallBounce,n,o)}if(p.r>.01&&w!==e&&G<nt){let Z=et-p.x,at=ue-p.y,Vt=he-p.z,jt=Re+p.r,St=Z*Z+at*at+Vt*Vt;if(St<(jt+n)*(jt+n)&&St>1e-12){let k=Math.sqrt(St),_t=Z/k,Bt=at/k,Tt=Vt/k,kt=(I[w]-p.vx)*_t+(D[w]-p.vy)*Bt+U[w]*Tt,X=G,Zt=Math.fround(k-jt);q[X*2]=w,q[X*2+1]=-1,$[X*3]=_t,$[X*3+1]=Bt,$[X*3+2]=Tt,Q[X]=Zt>0?-Zt/o:Math.fround(kt<-1.5?-tt*kt:0),J[X]=0,G++}}}},wo=()=>{let t=y.index,o=S>800?5:8,r=A,n=b,e=R,l=Ct,v=Nt,m=It,a=ie,h=le,g=G,I=p.vx,D=p.vy;for(let U=0;U<o;U++)for(let M=0;M<g;M++){let u=v[M*2],F=v[M*2+1],V=m[M*3],j=m[M*3+1],q=m[M*3+2],$=a[M],Q=h[M];if(F<0){let lt=F===-1?(r[u]-I)*V+(n[u]-D)*j+e[u]*q:r[u]*V+n[u]*j+e[u]*q,ft=Math.max(Q+$-lt,0),et=ft-Q;h[M]=ft,r[u]+=et*V,n[u]+=et*j,e[u]+=et*q;continue}let J=u===t?0:l[u],nt=F===t?0:l[F],tt=J+nt;if(tt<=0)continue;let w=(r[F]-r[u])*V+(n[F]-n[u])*j+(e[F]-e[u])*q,rt=Math.max(Q+($-w)/tt,0),Y=rt-Q;h[M]=rt,r[u]-=Y*J*V,n[u]-=Y*J*j,e[u]-=Y*J*q,r[F]+=Y*nt*V,n[F]+=Y*nt*j,e[F]+=Y*nt*q}},Mo=()=>{let t=y.index,o=N,r=L,n=C,e=T,l=Ct,v=Nt,m=G,a=p.x,h=p.y,g=p.z,I=p.r;for(let D=0;D<2;D++)for(let U=0;U<m;U++){let M=v[U*2],u=v[U*2+1];if(u===-2)continue;if(u<0){let w=o[M]-a,rt=r[M]-h,Y=n[M]-g,lt=Math.sqrt(w*w+rt*rt+Y*Y),ft=e[M]+I-lt-oo;if(ft<=0||lt<1e-6)continue;let et=ft*.5/lt;o[M]+=w*et,r[M]+=rt*et,n[M]+=Y*et;continue}let F=o[u]-o[M],V=r[u]-r[M],j=n[u]-n[M],q=Math.sqrt(F*F+V*V+j*j),$=e[M]+e[u]-q-oo;if($<=0||q<1e-6)continue;let Q=M===t?0:l[M],J=u===t?0:l[u],nt=Q+J;if(nt<=0)continue;let tt=$*.3/(q*nt);o[M]-=F*tt*Q,r[M]-=V*tt*Q,n[M]-=j*tt*Q,o[u]+=F*tt*J,r[u]+=V*tt*J,n[u]+=j*tt*J}},go=t=>{let o=d.halfW,r=d.halfH,n=t.wallBounce;for(let e=0;e<S;e++){let l=T[e];N[e]<-o+l?(N[e]=-o+l,A[e]<0&&(A[e]=A[e]<-1.5?-A[e]*n:0)):N[e]>o-l&&(N[e]=o-l,A[e]>0&&(A[e]=A[e]>1.5?-A[e]*n:0)),L[e]<-r+l?(L[e]=-r+l,b[e]<0&&(b[e]=b[e]<-1.5?-b[e]*n:0),A[e]*=.995,R[e]*=.995):st[e]&&L[e]>r-l&&(L[e]=r-l,b[e]>0&&(b[e]=b[e]>1.5?-b[e]*n:0)),!st[e]&&L[e]<r-l&&(st[e]=1);let v=Math.max(t.depth-l,0);C[e]<-v?(C[e]=-v,R[e]<0&&(R[e]=R[e]<-1.5?-R[e]*n:0)):C[e]>v&&(C[e]=v,R[e]>0&&(R[e]=R[e]>1.5?-R[e]*n:0))}},Ao=(t,o,r)=>{let n=t.gravity*45,e=Math.pow(t.friction,o*60)*(Ot>0?Math.exp(-2.2*o):1),l=Jt?0:t.drift*2.2,v=t.maxSize*d.fit,m=v*.3;xt<S*12&&(xt=S*12,Nt=new Int32Array(xt*2),It=new Float32Array(xt*3),ie=new Float64Array(xt),le=new Float32Array(xt));for(let a=0;a<S;a++){if(a===y.index){let g=1-Math.exp(-o/.02);A[a]=(y.tx-N[a])*g/o,b[a]=(y.ty-L[a])*g/o,R[a]=0;continue}if(b[a]-=n*o,l){let g=ee[a];A[a]+=Math.sin(re*.63+g)*l*o,b[a]+=Math.cos(re*.47+g*1.7)*l*o,R[a]+=Math.sin(re*.41+g*2.3)*l*o*.5}A[a]*=e,b[a]*=e,R[a]*=e;let h=A[a]*A[a]+b[a]*b[a]+R[a]*R[a];if(h>Pt*Pt){let g=Pt/Math.sqrt(h);A[a]*=g,b[a]*=g,R[a]*=g}}vo(v*(r?2.8:2.3),t),r&&W.fill(0,0,S*4),yo(t,o,r,m),wo();for(let a=0;a<S;a++)N[a]+=A[a]*o,L[a]+=b[a]*o,C[a]+=R[a]*o;if(Mo(),go(t),r)for(let a=0;a<S;a++){let h=L[a]-T[a]+d.halfH,g=T[a]*.5;if(h>=g)continue;let I=1-Math.max(h,0)/g;W[a*4+1]-=I,W[a*4+3]+=I}if(y.index>=0){let a=y.index;y.vx+=(A[a]-y.vx)*(1-Math.exp(-o/.05)),y.vy+=(b[a]-y.vy)*(1-Math.exp(-o/.05))}},Be=(t,o)=>{let r=bt.getBoundingClientRect(),n=(t-r.left)/Math.max(r.width,1)*2-1,e=1-(o-r.top)/Math.max(r.height,1)*2;return[n*d.tan*(d.width/d.height),e*d.tan,-1]},fe=(t,o)=>{let r=(o-Lt)/t[2];return[t[0]*r,t[1]*r]},bo=t=>{let o=Math.hypot(t[0],t[1],t[2]),r=t[0]/o,n=t[1]/o,e=t[2]/o,l=-1,v=1/0;for(let m=0;m<S;m++){let a=-N[m],h=-L[m],g=Lt-C[m],I=a*r+h*n+g*e,D=T[m]*1.15,U=a*a+h*h+g*g-D*D,M=I*I-U;if(M<0)continue;let u=-I-Math.sqrt(M);u>0&&u<v&&(v=u,l=m)}return l},zo=(t,o)=>{let r=dt.current,n=d.halfH*.7;for(let e=0;e<S;e++){let l=N[e]-t,v=L[e]-o,m=C[e],a=Math.hypot(l,v,m);if(a>=n||a<1e-4)continue;let h=Math.pow(1-a/n,2)*26*(1+.6/(T[e]+.4));A[e]+=l/a*h,b[e]+=v/a*h+h*.25,R[e]+=m/a*h*.5}B.x=t,B.y=o,B.z=Math.max(r.depth,1)+1.5,B.flash=1},Te=dt.current.dpr,Fe=()=>{let t=dt.current;Te=t.dpr,d.width=Math.max(1,bt.clientWidth),d.height=Math.max(1,bt.clientHeight),d.ratio=Math.min(t.dpr||window.devicePixelRatio||1,2),zt.width=Math.max(1,Math.round(d.width*d.ratio)),zt.height=Math.max(1,Math.round(d.height*d.ratio));let o=d.width/d.height,r=Math.tan(eo*Math.PI/360);d.tan=o>Ee?r*Ee/o:r,d.halfH=d.tan*Lt,d.halfW=d.halfH*o,d.fit=K(Math.sqrt(d.halfW*d.halfH/(r*r*Lt*Lt*Ee)),.4,1);let n=1/d.tan,e=1,l=80;Ft.fill(0),Ft[0]=n/o,Ft[5]=n,Ft[10]=(l+e)/(e-l),Ft[11]=-1,Ft[14]=2*l*e/(e-l),S||_e(t,!0),ke(),vt()},ke=()=>{let t=dt.current,o=no[t.material],r=0,n=S+1;for(let v=1;v<n;v++){let m=it[v],a=m===S?p.z:C[m],h=v-1;for(;h>=0&&(it[h]===S?p.z:C[it[h]])>a;)it[h+1]=it[h],h--;it[h+1]=m}for(let v=0;v<n;v++){let m=it[v],a=r*Kt;if(m===S){if(p.r<.01||!t.followCursor)continue;let h=ne[0]||[1,1,1];z[a]=p.x,z[a+1]=p.y,z[a+2]=p.z,z[a+3]=p.r,z[a+4]=h[0],z[a+5]=h[1],z[a+6]=h[2],z[a+7]=1,z[a+8]=0,z[a+9]=0,z[a+10]=0,z[a+11]=0}else{let h=ne[Xt[m]%ne.length];z[a]=N[m],z[a+1]=L[m],z[a+2]=C[m],z[a+3]=T[m],z[a+4]=h[0],z[a+5]=h[1],z[a+6]=h[2],z[a+7]=0;let g=W[m*4+3],I=Math.hypot(W[m*4],W[m*4+1],W[m*4+2])||1;z[a+8]=W[m*4]/I,z[a+9]=W[m*4+1]/I,z[a+10]=W[m*4+2]/I,z[a+11]=Math.min(g*.55,1)}r++}if(i.viewport(0,0,zt.width,zt.height),i.clearColor(0,0,0,0),i.clearDepth(1),i.clear(i.COLOR_BUFFER_BIT|i.DEPTH_BUFFER_BIT),!r)return;i.enable(i.DEPTH_TEST),i.depthFunc(i.LEQUAL),i.enable(i.BLEND),i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA),i.useProgram(Qt.program),i.uniformMatrix4fv(ct.uProj,!1,Ft),i.uniform1f(ct.uCameraZ,Lt),i.uniform1f(ct.uPixel,2*d.tan/zt.height);let e=ao(t.lightColor),l=t.lightIntensity*60*(1+B.flash*3);i.uniform3f(ct.uLight,e[0]*l,e[1]*l,e[2]*l),i.uniform3f(ct.uLightPos,B.x,B.y,B.z-Lt),i.uniform1f(ct.uExposure,t.exposure),i.uniform1f(ct.uShadow,t.shadows),i.uniform4f(ct.uSurface,o.roughness,o.metalness,o.coat,o.coatRoughness),i.uniform2f(ct.uExtra,o.scatter,o.frost),i.bindBuffer(i.ARRAY_BUFFER,te),i.bufferSubData(i.ARRAY_BUFFER,0,z,0,r*Kt),i.bindVertexArray(ge),i.drawArraysInstanced(i.TRIANGLE_STRIP,0,4,r),i.bindVertexArray(null)},Ye=t=>{if(Wt=0,!ce||document.hidden)return;let o=dt.current;o.dpr!==Te&&Fe();let r=ae?K((t-ae)/1e3,0,1/20):1/60;ae=t,re+=r,Ot=Math.max(0,Ot-r),_e(o,!1);let n=o.followCursor&&H.inside&&y.index<0?o.cursorSize*d.fit:0;p.r+=(n-p.r)*(1-Math.exp(-r/.12));let e=1-Math.exp(-r/.06),l=p.x,v=p.y;p.x+=(p.tx-p.x)*e,p.y+=(p.ty-p.y)*e,p.vx=K((p.x-l)/Math.max(r,.001),-Pt,Pt),p.vy=K((p.y-v)/Math.max(r,.001),-Pt,Pt);let m=0,a=d.halfH*.75,h=o.depth+4,g=H.inside?[p.x,p.y,o.followCursor?p.z:1.5]:B.flash>.05?[B.x,B.y,B.z]:[m,a,h],I=1-Math.exp(-r/.08);if(B.x+=(g[0]-B.x)*I,B.y+=(g[1]-B.y)*I,B.z+=(g[2]-B.z)*I,B.flash*=Math.exp(-r/.3),r>1e-4){let u=Math.min(6,Math.max(1,Math.ceil(r/.005555555555555556))),F=r/u;for(let V=0;V<u;V++)Ao(o,F,V===u-1)}ke();let D=0;for(let u=0;u<S;u++){let F=u*3,V=Math.abs(N[u]-mt[F])+Math.abs(L[u]-mt[F+1])+Math.abs(C[u]-mt[F+2]);V>D&&(D=V),mt[F]=N[u],mt[F+1]=L[u],mt[F+2]=C[u]}se=D/Math.max(r,.001)>.6||H.inside||y.index>=0||B.flash>.01||Ot>0||p.r>.01||o.drift>0&&!Jt?0:se+r,se<.8&&(Wt=requestAnimationFrame(Ye))};function vt(){se=0,!Wt&&ce&&!document.hidden&&(ae=0,Wt=requestAnimationFrame(Ye))}let Se=t=>{let o=bt.getBoundingClientRect(),r=t.clientX-o.left,n=t.clientY-o.top;return r>=0&&n>=0&&r<=o.width&&n<=o.height},De=t=>{let o=Be(t.clientX,t.clientY),[r,n]=fe(o,p.z);if(p.tx=r,p.ty=n,y.index>=0){let[e,l]=fe(o,C[y.index]);y.tx=e-y.ox,y.ty=l-y.oy}return o},qe=t=>{let o=H.inside;H.inside=Se(t)||y.index>=0,H.inside&&(De(t),o||(p.x=p.tx,p.y=p.ty),H.down&&Math.hypot(t.clientX-H.downX,t.clientY-H.downY)>6&&(H.moved=!0)),(H.inside||o)&&vt()},Fo=t=>t instanceof Element&&t.closest('a, button, input, textarea, select, label, [role="button"]'),Ue=t=>{if(t.button!==0||!Se(t)||Fo(t.target))return;let o=dt.current;H.down=!0,H.moved=!1,H.downX=t.clientX,H.downY=t.clientY,H.downAt=performance.now();let r=De(t);if(o.grab){let n=bo(r);if(n>=0){let[e,l]=fe(r,C[n]);y.index=n,y.ox=e-N[n],y.oy=l-L[n],y.tx=N[n],y.ty=L[n],y.vx=0,y.vy=0,t.pointerType==="mouse"&&t.preventDefault()}}vt()},Xe=t=>{let o=dt.current;if(y.index>=0){let r=y.index,n=Math.hypot(y.vx,y.vy),e=n>22?22/n:1;A[r]=y.vx*e,b[r]=y.vy*e,y.index=-1,st[r]=1}else if(t&&H.down&&!H.moved&&performance.now()-H.downAt<400&&o.clickEffect==="burst"&&!Jt&&Se(t)){let[r,n]=fe(Be(t.clientX,t.clientY),0);zo(r,n)}H.down=!1,vt()},Oe=t=>Xe(t),We=()=>Xe(null),je=()=>{H.inside=y.index>=0,vt()},Ze=()=>vt(),Ke=new ResizeObserver(Fe);Ke.observe(bt);let Ge=new IntersectionObserver(t=>{ce=t.some(o=>o.isIntersecting),ce&&vt()});return Ge.observe(bt),window.addEventListener("pointermove",qe,{passive:!0}),window.addEventListener("pointerdown",Ue),window.addEventListener("pointerup",Oe,{passive:!0}),window.addEventListener("pointercancel",We,{passive:!0}),document.documentElement.addEventListener("pointerleave",je),document.addEventListener("visibilitychange",Ze),Fe(),Me.current=vt,()=>{cancelAnimationFrame(Wt),Me.current=null,Ke.disconnect(),Ge.disconnect(),window.removeEventListener("pointermove",qe),window.removeEventListener("pointerdown",Ue),window.removeEventListener("pointerup",Oe),window.removeEventListener("pointercancel",We),document.documentElement.removeEventListener("pointerleave",je),document.removeEventListener("visibilitychange",Ze),i.deleteBuffer(Ie),i.deleteBuffer(te),i.deleteVertexArray(ge),i.deleteProgram(Qt.program),Ce.current=window.setTimeout(()=>i.getExtension("WEBGL_lose_context")?.loseContext(),0)}},[]),ve(()=>{Me.current?.()}),qt("div",{ref:Le,className:fo,style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",...uo}},qt("canvas",{ref:Pe,style:{display:"block",width:"100%",height:"100%"},"aria-hidden":"true"}))},co=Ho;to("ballpit",co);})();
