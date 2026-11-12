/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var ve=null,kt=Symbol("Fragment");function Eo(s,x,f){if(x==="ref"){typeof f=="function"?f(s):f&&(f.current=s);return}if(!(x==="children"||f==null||f===!1)){if(x==="className"){s.setAttribute("class",f);return}if(x==="style"){for(let c in f){let _=f[c];_==null||_===!1||(c.startsWith("--")?s.style.setProperty(c,String(_)):s.style[c]=typeof _=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(c)?_+"px":_)}return}if(/^on[A-Z]/.test(x)&&typeof f=="function"){s.addEventListener(x.slice(2).toLowerCase(),f);return}if(x==="htmlFor"){s.setAttribute("for",f);return}s.setAttribute(x,f===!0?"":String(f))}}function Qe(s,x){for(let f of x)f==null||f===!1||f===!0||(Array.isArray(f)?Qe(s,f):f instanceof Node?s.appendChild(f):s.appendChild(document.createTextNode(String(f))))}function Dt(s,x,...f){if(typeof s=="function")return s({...x,children:f});let c=s===kt?document.createDocumentFragment():document.createElement(s);if(s!==kt)for(let _ in x||{})Eo(c,_,x[_]);return Qe(c,f),c}var Lo=(s,x)=>s&&x&&s.length===x.length&&s.every((f,c)=>Object.is(f,x[c]));function Ft(s){let x=ve,f=x.i++;return x.hooks[f]||(x.hooks[f]={current:s})}function ye(s,x){let f=ve,c=f.i++;f.effects.push([c,s,x])}function Po(s,x,f){let c={hooks:[],effects:[],i:0,cleanups:[],props:x,dead:!1,queued:!1,tree:null},_=()=>{let C=c.effects;c.effects=[];for(let[U,Qt,qt]of C){let wt=c.cleanups[U];if(wt&&qt&&Lo(wt.deps,qt))continue;if(wt&&wt.fn)try{wt.fn()}catch{}let Et;try{Et=Qt()}catch{Et=null}c.cleanups[U]={deps:qt,fn:typeof Et=="function"?Et:null}}},vt=C=>{ve=c,c.i=0,c.effects=[];let U;try{U=s(c.props)}finally{ve=null}C&&(c.tree=U,U instanceof Node&&f.appendChild(U)),_()};c.queue=()=>{c.queued||c.dead||(c.queued=!0,Promise.resolve().then(()=>{c.queued=!1,c.dead||vt(!1)}))},vt(!0);let ft=c.tree instanceof Node?c.tree:f,yt=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],$t=C=>{if(c.dead||C.__hubFwd||C.target instanceof Element&&C.target.closest("input,textarea,select"))return;let U;try{U=new C.constructor(C.type,C)}catch{return}U.__hubFwd=!0,ft.dispatchEvent(U)},Kt=yt.filter(()=>matchMedia("(pointer: fine)").matches);return Kt.forEach(C=>window.addEventListener(C,$t,{passive:!0})),{update(C){c.props={...c.props,...C},vt(!1)},destroy(){c.dead=!0,Kt.forEach(C=>window.removeEventListener(C,$t));for(let C of c.cleanups)if(C&&C.fn)try{C.fn()}catch{}c.cleanups=[],c.tree instanceof Node&&c.tree.parentNode&&c.tree.parentNode.removeChild(c.tree)},root:ft}}function Je(s,x){(window.HubDesigns=window.HubDesigns||{})[s]={start:(f,c)=>Po(x,c||{},f)}}var to=50,St=20,Re=1.5,Rt=16,Gt=12,eo=.01,oo={satin:{roughness:.42,metalness:0,coat:.35,coatRoughness:.22,scatter:1,frost:0},matte:{roughness:.92,metalness:0,coat:0,coatRoughness:.5,scatter:.5,frost:0},gloss:{roughness:.2,metalness:0,coat:1,coatRoughness:.08,scatter:1,frost:0},frosted:{roughness:.55,metalness:0,coat:.6,coatRoughness:.18,scatter:1.5,frost:1},metal:{roughness:.3,metalness:1,coat:0,coatRoughness:.2,scatter:0,frost:0}},Co=`#version 300 es
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
}`,G=(s,x,f)=>Math.min(f,Math.max(x,s)),no=(s,x,f)=>{let c=s.createShader(x);return c?(s.shaderSource(c,f),s.compileShader(c),s.getShaderParameter(c,s.COMPILE_STATUS)?c:(s.deleteShader(c),null)):null},Io=s=>{let x=no(s,s.VERTEX_SHADER,Co),f=no(s,s.FRAGMENT_SHADER,No),c=s.createProgram();if(!x||!f||!c)return null;if(s.attachShader(c,x),s.attachShader(c,f),s.linkProgram(c),s.deleteShader(x),s.deleteShader(f),!s.getProgramParameter(c,s.LINK_STATUS))return s.deleteProgram(c),null;let _={},vt=s.getProgramParameter(c,s.ACTIVE_UNIFORMS);for(let ft=0;ft<vt;ft++){let yt=s.getActiveUniform(c,ft);yt&&(_[yt.name]=s.getUniformLocation(c,yt.name))}return{program:c,uniforms:_}},ro=s=>{let x;if(typeof s=="number")x=[(s>>16&255)/255,(s>>8&255)/255,(s&255)/255];else{let f=String(s||"#ffffff").replace("#","").trim();(f.length===3||f.length===4)&&(f=f.slice(0,3).split("").map(_=>_+_).join(""));let c=parseInt(f.slice(0,6),16);x=Number.isNaN(c)?[1,1,1]:[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255]}return x.map(f=>Math.pow(f,2.2))},Ho=({count:s=200,colors:x=["#ffffff"],material:f="satin",minSize:c=.5,maxSize:_=1,gravity:vt=.5,friction:ft=.9975,wallBounce:yt=.95,bounce:$t=.85,depth:Kt=2,drift:C=0,followCursor:U=!0,cursorSize:Qt=1,grab:qt=!0,clickEffect:wt="burst",lightColor:Et="#ffffff",lightIntensity:Yt=1,exposure:co=1,shadows:so=.6,intro:io=!0,dpr:lo,className:fo="",style:uo})=>{let Ee=Ft(null),Le=Ft(null),we=Ft(null),Pe=Ft(0),Ce={count:Math.round(G(s,1,4e3)),colors:Array.isArray(x)&&x.length?x:["#ffffff"],material:oo[f]?f:"satin",minSize:Math.max(.05,Math.min(c,_)),maxSize:Math.max(.05,Math.max(c,_)),gravity:vt,friction:G(ft,.5,1),wallBounce:G(yt,0,1),bounce:G($t,0,1),depth:Math.max(0,Kt),drift:Math.max(0,C),followCursor:U,cursorSize:Math.max(0,Qt),grab:qt,clickEffect:wt,lightColor:Et,lightIntensity:Yt>20?Yt/200:Math.max(0,Yt),exposure:Math.max(0,co),shadows:G(so,0,1),intro:io,dpr:lo},ut=Ft(Ce);return ut.current=Ce,ye(()=>{window.clearTimeout(Pe.current);let Mt=Ee.current,gt=Le.current,i=gt?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!0,stencil:!1,powerPreference:"high-performance"});if(!Mt||!gt||!i)return;let Jt=Io(i);if(!Jt)return;let at=Jt.uniforms,te=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,d={width:1,height:1,ratio:1,halfW:9,halfH:9,fit:1,tan:Math.tan(to*Math.PI/360)},At=new Float32Array(16),Me=i.createVertexArray();i.bindVertexArray(Me);let Ne=i.createBuffer();i.bindBuffer(i.ARRAY_BUFFER,Ne),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),i.STATIC_DRAW),i.enableVertexAttribArray(0),i.vertexAttribPointer(0,2,i.FLOAT,!1,0,0);let ee=i.createBuffer();i.bindBuffer(i.ARRAY_BUFFER,ee);for(let t=0;t<3;t++)i.enableVertexAttribArray(1+t),i.vertexAttribPointer(1+t,4,i.FLOAT,!1,Gt*4,t*16),i.vertexAttribDivisor(1+t,1);i.bindVertexArray(null);let ge=0,S=0,N=new Float32Array(0),L=new Float32Array(0),P=new Float32Array(0),A=new Float32Array(0),b=new Float32Array(0),R=new Float32Array(0),T=new Float32Array(0),Lt=new Float32Array(0),Ut=new Float32Array(0),oe=new Float32Array(0),W=new Float32Array(0),ht=new Float32Array(0),Xt=new Uint16Array(0),ct=new Uint8Array(0),ne=new Int32Array(0),Ae=new Int32Array(0),st=new Int32Array(1),z=new Float32Array(Gt),dt=new Int32Array(2),be=new Int32Array(2),re=[],Ie="",He="",ho=t=>{let o=(e,l=1)=>{let v=new Float32Array(t*l);return v.set(e.subarray(0,Math.min(e.length,v.length))),v},r=e=>{let l=new Uint8Array(t);return l.set(e.subarray(0,Math.min(e.length,l.length))),l};N=o(N),L=o(L),P=o(P),A=o(A),b=o(b),R=o(R),T=o(T),Lt=o(Lt),Ut=o(Ut),oe=o(oe),W=o(W,4),ht=o(ht,3);let n=new Uint16Array(t);n.set(Xt.subarray(0,Math.min(Xt.length,t))),Xt=n,ct=r(ct),ne=new Int32Array(t),Ae=new Int32Array(t),st=new Int32Array(t+1),z=new Float32Array((t+1)*Gt),ge=t,i.bindBuffer(i.ARRAY_BUFFER,ee),i.bufferData(i.ARRAY_BUFFER,z.byteLength,i.DYNAMIC_DRAW)},H={x:0,y:0,inside:!1,down:!1,downX:0,downY:0,downAt:0,moved:!1},p={x:0,y:0,z:0,r:0,tx:0,ty:0,vx:0,vy:0},B={x:0,y:5,z:6,flash:0},y={index:-1,ox:0,oy:0,tx:0,ty:0,vx:0,vy:0},ae=0,Ot=0,Wt=0,ce=0,se=!0,ie=0,mo=(t,o,r)=>{let n=T[t],e=Math.max(o.depth-n,0);if(ct[t]=1,r&&o.gravity>.05)N[t]=(Math.random()*2-1)*Math.max(d.halfW-n,.01),L[t]=d.halfH+n+Math.random()*d.halfH*2.2,P[t]=(Math.random()*2-1)*e,A[t]=(Math.random()-.5)*2,b[t]=-(4+Math.random()*5),R[t]=0,ct[t]=0;else if(r){let l=(Math.random()*2-1)*Math.max(d.halfW-n,.01),v=(Math.random()*2-1)*Math.max(d.halfH-n,.01),m=(Math.random()*2-1)*e;N[t]=(Math.random()*2-1)*.6,L[t]=(Math.random()*2-1)*.6,P[t]=(Math.random()*2-1)*Math.min(e,.3),A[t]=(l-N[t])*2.2,b[t]=(v-L[t])*2.2,R[t]=(m-P[t])*2.2,Ot=1}else N[t]=(Math.random()*2-1)*Math.max(d.halfW-n,.01),L[t]=(Math.random()*2-1)*Math.max(d.halfH-n,.01),P[t]=(Math.random()*2-1)*e,A[t]=0,b[t]=0,R[t]=0},po=t=>{for(let o=0;o<S;o++)T[o]=(t.minSize+Ut[o]*(t.maxSize-t.minSize))*d.fit,Lt[o]=1/(T[o]*T[o]*T[o])},xo=t=>{re=t.colors.map(ro),Ie=t.colors.join("|")},Ve=(t,o)=>{let r=`${t.minSize}:${t.maxSize}:${d.fit}`;if(t.count!==S){t.count>ge&&ho(Math.max(t.count,Math.ceil(ge*1.5)));let n=S;S=t.count;for(let e=n;e<S;e++)Ut[e]=Math.random(),Xt[e]=e,oe[e]=Math.random()*Math.PI*2,T[e]=(t.minSize+Ut[e]*(t.maxSize-t.minSize))*d.fit,Lt[e]=1/(T[e]*T[e]*T[e]),mo(e,t,(o?t.intro:!0)&&!te);for(let e=0;e<=S;e++)st[e]=e}r!==He&&(He=r,po(t)),t.colors.join("|")!==Ie&&xo(t)},mt=0,$=0,Pt=new Int32Array(0),Ct=new Float32Array(0),le=new Float64Array(0),fe=new Float32Array(0),E={scale:1,x0:0,y0:0,z0:0,nx:1,ny:1,nz:1},vo=(t,o)=>{E.scale=1/t,E.x0=-d.halfW-t,E.y0=-d.halfH-t,E.z0=-Math.max(o.depth,o.maxSize)-t,E.nx=Math.max(1,Math.ceil((d.halfW*2+t*2)*E.scale)+1),E.ny=Math.max(1,Math.ceil((d.halfH*2+t*2)*E.scale)+1),E.nz=Math.max(1,Math.ceil((Math.max(o.depth,o.maxSize)*2+t*2)*E.scale)+1);let r=E.nx*E.ny*E.nz;dt.length<r+1&&(dt=new Int32Array(r+1),be=new Int32Array(r+1)),dt.fill(0,0,r+1);for(let n=0;n<S;n++){let e=G(Math.floor((N[n]-E.x0)*E.scale),0,E.nx-1),l=G(Math.floor((L[n]-E.y0)*E.scale),0,E.ny-1),m=(G(Math.floor((P[n]-E.z0)*E.scale),0,E.nz-1)*E.ny+l)*E.nx+e;ne[n]=m,dt[m+1]++}for(let n=1;n<=r;n++)dt[n]+=dt[n-1];be.set(dt.subarray(0,r+1));for(let n=0;n<S;n++)Ae[be[ne[n]]++]=n},Nt=(t,o,r,n,e,l,v,m)=>{if(o>=v||$>=mt)return;let a=A[t]*r+b[t]*n+R[t]*e,h=$,g=Math.fround(o);Pt[h*2]=t,Pt[h*2+1]=-2,Ct[h*3]=r,Ct[h*3+1]=n,Ct[h*3+2]=e,le[h]=g>0?-g/m:Math.fround(a<-1.5?-l*a:0),fe[h]=0,$++},yo=(t,o,r,n)=>{let e=y.index,{nx:l,ny:v,nz:m}=E,a=N,h=L,g=P,I=A,q=b,X=R,M=T,u=W,F=ne,V=dt,j=Ae,Y=Pt,K=Ct,Q=le,J=fe,ot=mt,tt=t.bounce;$=0;for(let w=0;w<S;w++){let nt=F[w],D=nt%l,it=Math.floor(nt/l)%v,lt=Math.floor(nt/(l*v)),et=a[w],he=h[w],de=g[w],Se=M[w],So=D>0?D-1:D,Ro=D<l-1?D+2:D+1;for(let Z=lt>0?-1:0;Z<=(lt<m-1?1:0);Z++)for(let rt=it>0?-1:0;rt<=(it<v-1?1:0);rt++){let It=((lt+Z)*v+it+rt)*l,jt=V[It+Ro];for(let bt=V[It+So];bt<jt;bt++){let k=j[bt];if(k<=w)continue;let Ht=a[k]-et,Vt=h[k]-he,_t=g[k]-de,Bt=Ht*Ht+Vt*Vt+_t*_t,O=Se+M[k],Zt=Math.max(O+n,r?O*1.4:0);if(Bt>=Zt*Zt||Bt<1e-12)continue;let Tt=Math.sqrt(Bt),me=Ht/Tt,pe=Vt/Tt,xe=_t/Tt;if(r){let xt=G(1-(Tt-O)/(O*.4),0,1);u[w*4]+=me*xt,u[w*4+1]+=pe*xt,u[w*4+2]+=xe*xt,u[w*4+3]+=xt,u[k*4]-=me*xt,u[k*4+1]-=pe*xt,u[k*4+2]-=xe*xt,u[k*4+3]+=xt}if(Tt>=O+n||$>=ot||w===e&&k===e)continue;let $e=(I[k]-I[w])*me+(q[k]-q[w])*pe+(X[k]-X[w])*xe,zt=$,Ke=Math.fround(Tt-O);Y[zt*2]=w,Y[zt*2+1]=k,K[zt*3]=me,K[zt*3+1]=pe,K[zt*3+2]=xe,Q[zt]=Ke>0?-Ke/o:Math.fround($e<-1.5?-tt*$e:0),J[zt]=0,$++}}if(w!==e){let Z=Se,rt=Math.max(t.depth-Z,0);Nt(w,et+d.halfW-Z,1,0,0,t.wallBounce,n,o),Nt(w,d.halfW-Z-et,-1,0,0,t.wallBounce,n,o),Nt(w,he+d.halfH-Z,0,1,0,t.wallBounce,n,o),ct[w]&&Nt(w,d.halfH-Z-he,0,-1,0,t.wallBounce,n,o),Nt(w,de+rt,0,0,1,t.wallBounce,n,o),Nt(w,rt-de,0,0,-1,t.wallBounce,n,o)}if(p.r>.01&&w!==e&&$<ot){let Z=et-p.x,rt=he-p.y,It=de-p.z,jt=Se+p.r,bt=Z*Z+rt*rt+It*It;if(bt<(jt+n)*(jt+n)&&bt>1e-12){let k=Math.sqrt(bt),Ht=Z/k,Vt=rt/k,_t=It/k,Bt=(I[w]-p.vx)*Ht+(q[w]-p.vy)*Vt+X[w]*_t,O=$,Zt=Math.fround(k-jt);Y[O*2]=w,Y[O*2+1]=-1,K[O*3]=Ht,K[O*3+1]=Vt,K[O*3+2]=_t,Q[O]=Zt>0?-Zt/o:Math.fround(Bt<-1.5?-tt*Bt:0),J[O]=0,$++}}}},wo=()=>{let t=y.index,o=S>800?5:8,r=A,n=b,e=R,l=Lt,v=Pt,m=Ct,a=le,h=fe,g=$,I=p.vx,q=p.vy;for(let X=0;X<o;X++)for(let M=0;M<g;M++){let u=v[M*2],F=v[M*2+1],V=m[M*3],j=m[M*3+1],Y=m[M*3+2],K=a[M],Q=h[M];if(F<0){let it=F===-1?(r[u]-I)*V+(n[u]-q)*j+e[u]*Y:r[u]*V+n[u]*j+e[u]*Y,lt=Math.max(Q+K-it,0),et=lt-Q;h[M]=lt,r[u]+=et*V,n[u]+=et*j,e[u]+=et*Y;continue}let J=u===t?0:l[u],ot=F===t?0:l[F],tt=J+ot;if(tt<=0)continue;let w=(r[F]-r[u])*V+(n[F]-n[u])*j+(e[F]-e[u])*Y,nt=Math.max(Q+(K-w)/tt,0),D=nt-Q;h[M]=nt,r[u]-=D*J*V,n[u]-=D*J*j,e[u]-=D*J*Y,r[F]+=D*ot*V,n[F]+=D*ot*j,e[F]+=D*ot*Y}},Mo=()=>{let t=y.index,o=N,r=L,n=P,e=T,l=Lt,v=Pt,m=$,a=p.x,h=p.y,g=p.z,I=p.r;for(let q=0;q<2;q++)for(let X=0;X<m;X++){let M=v[X*2],u=v[X*2+1];if(u===-2)continue;if(u<0){let w=o[M]-a,nt=r[M]-h,D=n[M]-g,it=Math.sqrt(w*w+nt*nt+D*D),lt=e[M]+I-it-eo;if(lt<=0||it<1e-6)continue;let et=lt*.5/it;o[M]+=w*et,r[M]+=nt*et,n[M]+=D*et;continue}let F=o[u]-o[M],V=r[u]-r[M],j=n[u]-n[M],Y=Math.sqrt(F*F+V*V+j*j),K=e[M]+e[u]-Y-eo;if(K<=0||Y<1e-6)continue;let Q=M===t?0:l[M],J=u===t?0:l[u],ot=Q+J;if(ot<=0)continue;let tt=K*.3/(Y*ot);o[M]-=F*tt*Q,r[M]-=V*tt*Q,n[M]-=j*tt*Q,o[u]+=F*tt*J,r[u]+=V*tt*J,n[u]+=j*tt*J}},go=t=>{let o=d.halfW,r=d.halfH,n=t.wallBounce;for(let e=0;e<S;e++){let l=T[e];N[e]<-o+l?(N[e]=-o+l,A[e]<0&&(A[e]=A[e]<-1.5?-A[e]*n:0)):N[e]>o-l&&(N[e]=o-l,A[e]>0&&(A[e]=A[e]>1.5?-A[e]*n:0)),L[e]<-r+l?(L[e]=-r+l,b[e]<0&&(b[e]=b[e]<-1.5?-b[e]*n:0),A[e]*=.995,R[e]*=.995):ct[e]&&L[e]>r-l&&(L[e]=r-l,b[e]>0&&(b[e]=b[e]>1.5?-b[e]*n:0)),!ct[e]&&L[e]<r-l&&(ct[e]=1);let v=Math.max(t.depth-l,0);P[e]<-v?(P[e]=-v,R[e]<0&&(R[e]=R[e]<-1.5?-R[e]*n:0)):P[e]>v&&(P[e]=v,R[e]>0&&(R[e]=R[e]>1.5?-R[e]*n:0))}},Ao=(t,o,r)=>{let n=t.gravity*45,e=Math.pow(t.friction,o*60)*(Ot>0?Math.exp(-2.2*o):1),l=te?0:t.drift*2.2,v=t.maxSize*d.fit,m=v*.3;mt<S*12&&(mt=S*12,Pt=new Int32Array(mt*2),Ct=new Float32Array(mt*3),le=new Float64Array(mt),fe=new Float32Array(mt));for(let a=0;a<S;a++){if(a===y.index){let g=1-Math.exp(-o/.02);A[a]=(y.tx-N[a])*g/o,b[a]=(y.ty-L[a])*g/o,R[a]=0;continue}if(b[a]-=n*o,l){let g=oe[a];A[a]+=Math.sin(ae*.63+g)*l*o,b[a]+=Math.cos(ae*.47+g*1.7)*l*o,R[a]+=Math.sin(ae*.41+g*2.3)*l*o*.5}A[a]*=e,b[a]*=e,R[a]*=e;let h=A[a]*A[a]+b[a]*b[a]+R[a]*R[a];if(h>Rt*Rt){let g=Rt/Math.sqrt(h);A[a]*=g,b[a]*=g,R[a]*=g}}vo(v*(r?2.8:2.3),t),r&&W.fill(0,0,S*4),yo(t,o,r,m),wo();for(let a=0;a<S;a++)N[a]+=A[a]*o,L[a]+=b[a]*o,P[a]+=R[a]*o;if(Mo(),go(t),r)for(let a=0;a<S;a++){let h=L[a]-T[a]+d.halfH,g=T[a]*.5;if(h>=g)continue;let I=1-Math.max(h,0)/g;W[a*4+1]-=I,W[a*4+3]+=I}if(y.index>=0){let a=y.index;y.vx+=(A[a]-y.vx)*(1-Math.exp(-o/.05)),y.vy+=(b[a]-y.vy)*(1-Math.exp(-o/.05))}},_e=(t,o)=>{let r=Mt.getBoundingClientRect(),n=(t-r.left)/Math.max(r.width,1)*2-1,e=1-(o-r.top)/Math.max(r.height,1)*2;return[n*d.tan*(d.width/d.height),e*d.tan,-1]},ue=(t,o)=>{let r=(o-St)/t[2];return[t[0]*r,t[1]*r]},bo=t=>{let o=Math.hypot(t[0],t[1],t[2]),r=t[0]/o,n=t[1]/o,e=t[2]/o,l=-1,v=1/0;for(let m=0;m<S;m++){let a=-N[m],h=-L[m],g=St-P[m],I=a*r+h*n+g*e,q=T[m]*1.15,X=a*a+h*h+g*g-q*q,M=I*I-X;if(M<0)continue;let u=-I-Math.sqrt(M);u>0&&u<v&&(v=u,l=m)}return l},zo=(t,o)=>{let r=ut.current,n=d.halfH*.7;for(let e=0;e<S;e++){let l=N[e]-t,v=L[e]-o,m=P[e],a=Math.hypot(l,v,m);if(a>=n||a<1e-4)continue;let h=Math.pow(1-a/n,2)*26*(1+.6/(T[e]+.4));A[e]+=l/a*h,b[e]+=v/a*h+h*.25,R[e]+=m/a*h*.5}B.x=t,B.y=o,B.z=Math.max(r.depth,1)+1.5,B.flash=1},Be=ut.current.dpr,ze=()=>{let t=ut.current;Be=t.dpr,d.width=Math.max(1,Mt.clientWidth),d.height=Math.max(1,Mt.clientHeight),d.ratio=Math.min(t.dpr||window.devicePixelRatio||1,2),gt.width=Math.max(1,Math.round(d.width*d.ratio)),gt.height=Math.max(1,Math.round(d.height*d.ratio));let o=d.width/d.height,r=Math.tan(to*Math.PI/360);d.tan=o>Re?r*Re/o:r,d.halfH=d.tan*St,d.halfW=d.halfH*o,d.fit=G(Math.sqrt(d.halfW*d.halfH/(r*r*St*St*Re)),.4,1);let n=1/d.tan,e=1,l=80;At.fill(0),At[0]=n/o,At[5]=n,At[10]=(l+e)/(e-l),At[11]=-1,At[14]=2*l*e/(e-l),S||Ve(t,!0),Te(),pt()},Te=()=>{let t=ut.current,o=oo[t.material],r=0,n=S+1;for(let v=1;v<n;v++){let m=st[v],a=m===S?p.z:P[m],h=v-1;for(;h>=0&&(st[h]===S?p.z:P[st[h]])>a;)st[h+1]=st[h],h--;st[h+1]=m}for(let v=0;v<n;v++){let m=st[v],a=r*Gt;if(m===S){if(p.r<.01||!t.followCursor)continue;let h=re[0]||[1,1,1];z[a]=p.x,z[a+1]=p.y,z[a+2]=p.z,z[a+3]=p.r,z[a+4]=h[0],z[a+5]=h[1],z[a+6]=h[2],z[a+7]=1,z[a+8]=0,z[a+9]=0,z[a+10]=0,z[a+11]=0}else{let h=re[Xt[m]%re.length];z[a]=N[m],z[a+1]=L[m],z[a+2]=P[m],z[a+3]=T[m],z[a+4]=h[0],z[a+5]=h[1],z[a+6]=h[2],z[a+7]=0;let g=W[m*4+3],I=Math.hypot(W[m*4],W[m*4+1],W[m*4+2])||1;z[a+8]=W[m*4]/I,z[a+9]=W[m*4+1]/I,z[a+10]=W[m*4+2]/I,z[a+11]=Math.min(g*.55,1)}r++}if(i.viewport(0,0,gt.width,gt.height),i.clearColor(0,0,0,0),i.clearDepth(1),i.clear(i.COLOR_BUFFER_BIT|i.DEPTH_BUFFER_BIT),!r)return;i.enable(i.DEPTH_TEST),i.depthFunc(i.LEQUAL),i.enable(i.BLEND),i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA),i.useProgram(Jt.program),i.uniformMatrix4fv(at.uProj,!1,At),i.uniform1f(at.uCameraZ,St),i.uniform1f(at.uPixel,2*d.tan/gt.height);let e=ro(t.lightColor),l=t.lightIntensity*60*(1+B.flash*3);i.uniform3f(at.uLight,e[0]*l,e[1]*l,e[2]*l),i.uniform3f(at.uLightPos,B.x,B.y,B.z-St),i.uniform1f(at.uExposure,t.exposure),i.uniform1f(at.uShadow,t.shadows),i.uniform4f(at.uSurface,o.roughness,o.metalness,o.coat,o.coatRoughness),i.uniform2f(at.uExtra,o.scatter,o.frost),i.bindBuffer(i.ARRAY_BUFFER,ee),i.bufferSubData(i.ARRAY_BUFFER,0,z,0,r*Gt),i.bindVertexArray(Me),i.drawArraysInstanced(i.TRIANGLE_STRIP,0,4,r),i.bindVertexArray(null)},ke=t=>{if(Wt=0,!se||document.hidden)return;let o=ut.current;o.dpr!==Be&&ze();let r=ce?G((t-ce)/1e3,0,1/20):1/60;ce=t,ae+=r,Ot=Math.max(0,Ot-r),Ve(o,!1);let n=o.followCursor&&H.inside&&y.index<0?o.cursorSize*d.fit:0;p.r+=(n-p.r)*(1-Math.exp(-r/.12));let e=1-Math.exp(-r/.06),l=p.x,v=p.y;p.x+=(p.tx-p.x)*e,p.y+=(p.ty-p.y)*e,p.vx=G((p.x-l)/Math.max(r,.001),-Rt,Rt),p.vy=G((p.y-v)/Math.max(r,.001),-Rt,Rt);let m=0,a=d.halfH*.75,h=o.depth+4,g=H.inside?[p.x,p.y,o.followCursor?p.z:1.5]:B.flash>.05?[B.x,B.y,B.z]:[m,a,h],I=1-Math.exp(-r/.08);if(B.x+=(g[0]-B.x)*I,B.y+=(g[1]-B.y)*I,B.z+=(g[2]-B.z)*I,B.flash*=Math.exp(-r/.3),r>1e-4){let u=Math.min(6,Math.max(1,Math.ceil(r/.005555555555555556))),F=r/u;for(let V=0;V<u;V++)Ao(o,F,V===u-1)}Te();let q=0;for(let u=0;u<S;u++){let F=u*3,V=Math.abs(N[u]-ht[F])+Math.abs(L[u]-ht[F+1])+Math.abs(P[u]-ht[F+2]);V>q&&(q=V),ht[F]=N[u],ht[F+1]=L[u],ht[F+2]=P[u]}ie=q/Math.max(r,.001)>.6||H.inside||y.index>=0||B.flash>.01||Ot>0||p.r>.01||o.drift>0&&!te?0:ie+r,ie<.8&&(Wt=requestAnimationFrame(ke))};function pt(){ie=0,!Wt&&se&&!document.hidden&&(ce=0,Wt=requestAnimationFrame(ke))}let Fe=t=>{let o=Mt.getBoundingClientRect(),r=t.clientX-o.left,n=t.clientY-o.top;return r>=0&&n>=0&&r<=o.width&&n<=o.height},De=t=>{let o=_e(t.clientX,t.clientY),[r,n]=ue(o,p.z);if(p.tx=r,p.ty=n,y.index>=0){let[e,l]=ue(o,P[y.index]);y.tx=e-y.ox,y.ty=l-y.oy}return o},qe=t=>{let o=H.inside;H.inside=Fe(t)||y.index>=0,H.inside&&(De(t),o||(p.x=p.tx,p.y=p.ty),H.down&&Math.hypot(t.clientX-H.downX,t.clientY-H.downY)>6&&(H.moved=!0)),(H.inside||o)&&pt()},Fo=t=>t instanceof Element&&t.closest('a, button, input, textarea, select, label, [role="button"]'),Ye=t=>{if(t.button!==0||!Fe(t)||Fo(t.target))return;let o=ut.current;H.down=!0,H.moved=!1,H.downX=t.clientX,H.downY=t.clientY,H.downAt=performance.now();let r=De(t);if(o.grab){let n=bo(r);if(n>=0){let[e,l]=ue(r,P[n]);y.index=n,y.ox=e-N[n],y.oy=l-L[n],y.tx=N[n],y.ty=L[n],y.vx=0,y.vy=0,t.pointerType==="mouse"&&t.preventDefault()}}pt()},Ue=t=>{let o=ut.current;if(y.index>=0){let r=y.index,n=Math.hypot(y.vx,y.vy),e=n>22?22/n:1;A[r]=y.vx*e,b[r]=y.vy*e,y.index=-1,ct[r]=1}else if(t&&H.down&&!H.moved&&performance.now()-H.downAt<400&&o.clickEffect==="burst"&&!te&&Fe(t)){let[r,n]=ue(_e(t.clientX,t.clientY),0);zo(r,n)}H.down=!1,pt()},Xe=t=>Ue(t),Oe=()=>Ue(null),We=()=>{H.inside=y.index>=0,pt()},je=()=>pt(),Ze=new ResizeObserver(ze);Ze.observe(Mt);let Ge=new IntersectionObserver(t=>{se=t.some(o=>o.isIntersecting),se&&pt()});return Ge.observe(Mt),window.addEventListener("pointermove",qe,{passive:!0}),window.addEventListener("pointerdown",Ye),window.addEventListener("pointerup",Xe,{passive:!0}),window.addEventListener("pointercancel",Oe,{passive:!0}),document.documentElement.addEventListener("pointerleave",We),document.addEventListener("visibilitychange",je),ze(),we.current=pt,()=>{cancelAnimationFrame(Wt),we.current=null,Ze.disconnect(),Ge.disconnect(),window.removeEventListener("pointermove",qe),window.removeEventListener("pointerdown",Ye),window.removeEventListener("pointerup",Xe),window.removeEventListener("pointercancel",Oe),document.documentElement.removeEventListener("pointerleave",We),document.removeEventListener("visibilitychange",je),i.deleteBuffer(Ne),i.deleteBuffer(ee),i.deleteVertexArray(Me),i.deleteProgram(Jt.program),Pe.current=window.setTimeout(()=>i.getExtension("WEBGL_lose_context")?.loseContext(),0)}},[]),ye(()=>{we.current?.()}),Dt("div",{ref:Ee,className:fo,style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",...uo}},Dt("canvas",{ref:Le,style:{display:"block",width:"100%",height:"100%"},"aria-hidden":"true"}))},ao=Ho;Je("ballpit",ao);})();
