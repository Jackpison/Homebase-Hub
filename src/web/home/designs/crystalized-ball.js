/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var Be=null,C=Symbol("Fragment");function jr(t,e,i){if(e==="ref"){typeof i=="function"?i(t):i&&(i.current=t);return}if(!(e==="children"||i==null||i===!1)){if(e==="className"){t.setAttribute("class",i);return}if(e==="style"){for(let r in i){let s=i[r];s==null||s===!1||(r.startsWith("--")?t.style.setProperty(r,String(s)):t.style[r]=typeof s=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(r)?s+"px":s)}return}if(/^on[A-Z]/.test(e)&&typeof i=="function"){t.addEventListener(e.slice(2).toLowerCase(),i);return}if(e==="htmlFor"){t.setAttribute("for",i);return}t.setAttribute(e,i===!0?"":String(i))}}function di(t,e){for(let i of e)i==null||i===!1||i===!0||(Array.isArray(i)?di(t,i):i instanceof Node?t.appendChild(i):t.appendChild(document.createTextNode(String(i))))}function z(t,e,...i){if(typeof t=="function")return t({...e,children:i});let r=t===C?document.createDocumentFragment():document.createElement(t);if(t!==C)for(let s in e||{})jr(r,s,e[s]);return di(r,i),r}var pi=(t,e)=>t&&e&&t.length===e.length&&t.every((i,r)=>Object.is(i,e[r]));function Oe(t){let e=Be,i=e.i++;return e.hooks[i]||(e.hooks[i]={current:t})}function Et(t,e){let i=Be,r=i.i++,s=i.hooks[r];return s&&pi(s.deps,e)?s.value:(i.hooks[r]={deps:e,value:t()}).value}function je(t,e){let i=Be,r=i.i++;i.effects.push([r,t,e])}function Kr(t,e,i){let r={hooks:[],effects:[],i:0,cleanups:[],props:e,dead:!1,queued:!1,tree:null},s=()=>{let c=r.effects;r.effects=[];for(let[u,d,p]of c){let g=r.cleanups[u];if(g&&p&&pi(g.deps,p))continue;if(g&&g.fn)try{g.fn()}catch{}let m;try{m=d()}catch{m=null}r.cleanups[u]={deps:p,fn:typeof m=="function"?m:null}}},n=c=>{Be=r,r.i=0,r.effects=[];let u;try{u=t(r.props)}finally{Be=null}c&&(r.tree=u,u instanceof Node&&i.appendChild(u)),s()};r.queue=()=>{r.queued||r.dead||(r.queued=!0,Promise.resolve().then(()=>{r.queued=!1,r.dead||n(!1)}))},n(!0);let a=r.tree instanceof Node?r.tree:i,l=["pointermove","mousemove"],h=["clientX","clientY","screenX","screenY","button","buttons","ctrlKey","shiftKey","altKey","metaKey","pointerId","pointerType","isPrimary","width","height","pressure","movementX","movementY"],o=c=>{if(r.dead||c.__hubFwd||c.target instanceof Element&&c.target.closest("input,textarea,select"))return;let u={bubbles:!1,cancelable:!1};for(let p of h)p in c&&(u[p]=c[p]);let d;try{d=new c.constructor(c.type,u)}catch{return}d.__hubFwd=!0,a.dispatchEvent(d)},f=l.filter(()=>matchMedia("(pointer: fine)").matches);return f.forEach(c=>window.addEventListener(c,o,{passive:!0})),{update(c){r.props={...r.props,...c},n(!1)},destroy(){r.dead=!0,f.forEach(c=>window.removeEventListener(c,o));for(let c of r.cleanups)if(c&&c.fn)try{c.fn()}catch{}r.cleanups=[],r.tree instanceof Node&&r.tree.parentNode&&r.tree.parentNode.removeChild(r.tree)},root:a}}function gi(t,e){(window.HubDesigns=window.HubDesigns||{})[t]={start:(i,r)=>Kr(e,r||{},i)}}function Re(t){let e=t[0],i=t[1],r=t[2];return Math.sqrt(e*e+i*i+r*r)}function Ke(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t}function mi(t,e,i,r){return t[0]=e,t[1]=i,t[2]=r,t}function wt(t,e,i){return t[0]=e[0]+i[0],t[1]=e[1]+i[1],t[2]=e[2]+i[2],t}function Mt(t,e,i){return t[0]=e[0]-i[0],t[1]=e[1]-i[1],t[2]=e[2]-i[2],t}function xi(t,e,i){return t[0]=e[0]*i[0],t[1]=e[1]*i[1],t[2]=e[2]*i[2],t}function vi(t,e,i){return t[0]=e[0]/i[0],t[1]=e[1]/i[1],t[2]=e[2]/i[2],t}function $e(t,e,i){return t[0]=e[0]*i,t[1]=e[1]*i,t[2]=e[2]*i,t}function yi(t,e){let i=e[0]-t[0],r=e[1]-t[1],s=e[2]-t[2];return Math.sqrt(i*i+r*r+s*s)}function Ei(t,e){let i=e[0]-t[0],r=e[1]-t[1],s=e[2]-t[2];return i*i+r*r+s*s}function Ft(t){let e=t[0],i=t[1],r=t[2];return e*e+i*i+r*r}function wi(t,e){return t[0]=-e[0],t[1]=-e[1],t[2]=-e[2],t}function Mi(t,e){return t[0]=1/e[0],t[1]=1/e[1],t[2]=1/e[2],t}function Ze(t,e){let i=e[0],r=e[1],s=e[2],n=i*i+r*r+s*s;return n>0&&(n=1/Math.sqrt(n)),t[0]=e[0]*n,t[1]=e[1]*n,t[2]=e[2]*n,t}function Tt(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]}function _t(t,e,i){let r=e[0],s=e[1],n=e[2],a=i[0],l=i[1],h=i[2];return t[0]=s*h-n*l,t[1]=n*a-r*h,t[2]=r*l-s*a,t}function Fi(t,e,i,r){let s=e[0],n=e[1],a=e[2];return t[0]=s+r*(i[0]-s),t[1]=n+r*(i[1]-n),t[2]=a+r*(i[2]-a),t}function Ti(t,e,i,r,s){let n=Math.exp(-r*s),a=e[0],l=e[1],h=e[2];return t[0]=i[0]+(a-i[0])*n,t[1]=i[1]+(l-i[1])*n,t[2]=i[2]+(h-i[2])*n,t}function _i(t,e,i){let r=e[0],s=e[1],n=e[2],a=i[3]*r+i[7]*s+i[11]*n+i[15];return a=a||1,t[0]=(i[0]*r+i[4]*s+i[8]*n+i[12])/a,t[1]=(i[1]*r+i[5]*s+i[9]*n+i[13])/a,t[2]=(i[2]*r+i[6]*s+i[10]*n+i[14])/a,t}function Ri(t,e,i){let r=e[0],s=e[1],n=e[2],a=i[3]*r+i[7]*s+i[11]*n+i[15];return a=a||1,t[0]=(i[0]*r+i[4]*s+i[8]*n)/a,t[1]=(i[1]*r+i[5]*s+i[9]*n)/a,t[2]=(i[2]*r+i[6]*s+i[10]*n)/a,t}function bi(t,e,i){let r=e[0],s=e[1],n=e[2];return t[0]=r*i[0]+s*i[3]+n*i[6],t[1]=r*i[1]+s*i[4]+n*i[7],t[2]=r*i[2]+s*i[5]+n*i[8],t}function Ai(t,e,i){let r=e[0],s=e[1],n=e[2],a=i[0],l=i[1],h=i[2],o=i[3],f=l*n-h*s,c=h*r-a*n,u=a*s-l*r,d=l*u-h*c,p=h*f-a*u,g=a*c-l*f,m=o*2;return f*=m,c*=m,u*=m,d*=2,p*=2,g*=2,t[0]=r+f+d,t[1]=s+c+p,t[2]=n+u+g,t}var Si=(function(){let t=[0,0,0],e=[0,0,0];return function(i,r){Ke(t,i),Ke(e,r),Ze(t,t),Ze(e,e);let s=Tt(t,e);return s>1?0:s<-1?Math.PI:Math.acos(s)}})();function Ci(t,e){return t[0]===e[0]&&t[1]===e[1]&&t[2]===e[2]}var Y=class t extends Array{constructor(e=0,i=e,r=e){return super(e,i,r),this}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}set x(e){this[0]=e}set y(e){this[1]=e}set z(e){this[2]=e}set(e,i=e,r=e){return e.length?this.copy(e):(mi(this,e,i,r),this)}copy(e){return Ke(this,e),this}add(e,i){return i?wt(this,e,i):wt(this,this,e),this}sub(e,i){return i?Mt(this,e,i):Mt(this,this,e),this}multiply(e){return e.length?xi(this,this,e):$e(this,this,e),this}divide(e){return e.length?vi(this,this,e):$e(this,this,1/e),this}inverse(e=this){return Mi(this,e),this}len(){return Re(this)}distance(e){return e?yi(this,e):Re(this)}squaredLen(){return Ft(this)}squaredDistance(e){return e?Ei(this,e):Ft(this)}negate(e=this){return wi(this,e),this}cross(e,i){return i?_t(this,e,i):_t(this,this,e),this}scale(e){return $e(this,this,e),this}normalize(){return Ze(this,this),this}dot(e){return Tt(this,e)}equals(e){return Ci(this,e)}applyMatrix3(e){return bi(this,this,e),this}applyMatrix4(e){return _i(this,this,e),this}scaleRotateMatrix4(e){return Ri(this,this,e),this}applyQuaternion(e){return Ai(this,this,e),this}angle(e){return Si(this,e)}lerp(e,i){return Fi(this,this,e,i),this}smoothLerp(e,i,r){return Ti(this,this,e,i,r),this}clone(){return new t(this[0],this[1],this[2])}fromArray(e,i=0){return this[0]=e[i],this[1]=e[i+1],this[2]=e[i+2],this}toArray(e=[],i=0){return e[i]=this[0],e[i+1]=this[1],e[i+2]=this[2],e}transformDirection(e){let i=this[0],r=this[1],s=this[2];return this[0]=e[0]*i+e[4]*r+e[8]*s,this[1]=e[1]*i+e[5]*r+e[9]*s,this[2]=e[2]*i+e[6]*r+e[10]*s,this.normalize()}};var Di=new Y,Zr=1,$r=1,Pi=!1,be=class{constructor(e,i={}){e.canvas||console.error("gl not passed as first argument to Geometry"),this.gl=e,this.attributes=i,this.id=Zr++,this.VAOs={},this.drawRange={start:0,count:0},this.instancedCount=0,this.gl.renderer.bindVertexArray(null),this.gl.renderer.currentGeometry=null,this.glState=this.gl.renderer.state;for(let r in i)this.addAttribute(r,i[r])}addAttribute(e,i){if(this.attributes[e]=i,i.id=$r++,i.size=i.size||1,i.type=i.type||(i.data.constructor===Float32Array?this.gl.FLOAT:i.data.constructor===Uint16Array?this.gl.UNSIGNED_SHORT:this.gl.UNSIGNED_INT),i.target=e==="index"?this.gl.ELEMENT_ARRAY_BUFFER:this.gl.ARRAY_BUFFER,i.normalized=i.normalized||!1,i.stride=i.stride||0,i.offset=i.offset||0,i.count=i.count||(i.stride?i.data.byteLength/i.stride:i.data.length/i.size),i.divisor=i.instanced||0,i.needsUpdate=!1,i.usage=i.usage||this.gl.STATIC_DRAW,i.buffer||this.updateAttribute(i),i.divisor){if(this.isInstanced=!0,this.instancedCount&&this.instancedCount!==i.count*i.divisor)return console.warn("geometry has multiple instanced buffers of different length"),this.instancedCount=Math.min(this.instancedCount,i.count*i.divisor);this.instancedCount=i.count*i.divisor}else e==="index"?this.drawRange.count=i.count:this.attributes.index||(this.drawRange.count=Math.max(this.drawRange.count,i.count))}updateAttribute(e){let i=!e.buffer;i&&(e.buffer=this.gl.createBuffer()),this.glState.boundBuffer!==e.buffer&&(this.gl.bindBuffer(e.target,e.buffer),this.glState.boundBuffer=e.buffer),i?this.gl.bufferData(e.target,e.data,e.usage):this.gl.bufferSubData(e.target,0,e.data),e.needsUpdate=!1}setIndex(e){this.addAttribute("index",e)}setDrawRange(e,i){this.drawRange.start=e,this.drawRange.count=i}setInstancedCount(e){this.instancedCount=e}createVAO(e){this.VAOs[e.attributeOrder]=this.gl.renderer.createVertexArray(),this.gl.renderer.bindVertexArray(this.VAOs[e.attributeOrder]),this.bindAttributes(e)}bindAttributes(e){e.attributeLocations.forEach((i,{name:r,type:s})=>{if(!this.attributes[r]){console.warn(`active attribute ${r} not being supplied`);return}let n=this.attributes[r];this.gl.bindBuffer(n.target,n.buffer),this.glState.boundBuffer=n.buffer;let a=1;s===35674&&(a=2),s===35675&&(a=3),s===35676&&(a=4);let l=n.size/a,h=a===1?0:a*a*4,o=a===1?0:a*4;for(let f=0;f<a;f++)this.gl.vertexAttribPointer(i+f,l,n.type,n.normalized,n.stride+h,n.offset+f*o),this.gl.enableVertexAttribArray(i+f),this.gl.renderer.vertexAttribDivisor(i+f,n.divisor)}),this.attributes.index&&this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.attributes.index.buffer)}draw({program:e,mode:i=this.gl.TRIANGLES}){this.gl.renderer.currentGeometry!==`${this.id}_${e.attributeOrder}`&&(this.VAOs[e.attributeOrder]||this.createVAO(e),this.gl.renderer.bindVertexArray(this.VAOs[e.attributeOrder]),this.gl.renderer.currentGeometry=`${this.id}_${e.attributeOrder}`),e.attributeLocations.forEach((s,{name:n})=>{let a=this.attributes[n];a.needsUpdate&&this.updateAttribute(a)});let r=2;this.attributes.index?.type===this.gl.UNSIGNED_INT&&(r=4),this.isInstanced?this.attributes.index?this.gl.renderer.drawElementsInstanced(i,this.drawRange.count,this.attributes.index.type,this.attributes.index.offset+this.drawRange.start*r,this.instancedCount):this.gl.renderer.drawArraysInstanced(i,this.drawRange.start,this.drawRange.count,this.instancedCount):this.attributes.index?this.gl.drawElements(i,this.drawRange.count,this.attributes.index.type,this.attributes.index.offset+this.drawRange.start*r):this.gl.drawArrays(i,this.drawRange.start,this.drawRange.count)}getPosition(){let e=this.attributes.position;if(e.data)return e;if(!Pi)return console.warn("No position buffer data found to compute bounds"),Pi=!0}computeBoundingBox(e){e||(e=this.getPosition());let i=e.data,r=e.size;this.bounds||(this.bounds={min:new Y,max:new Y,center:new Y,scale:new Y,radius:1/0});let s=this.bounds.min,n=this.bounds.max,a=this.bounds.center,l=this.bounds.scale;s.set(1/0),n.set(-1/0);for(let h=0,o=i.length;h<o;h+=r){let f=i[h],c=i[h+1],u=i[h+2];s.x=Math.min(f,s.x),s.y=Math.min(c,s.y),s.z=Math.min(u,s.z),n.x=Math.max(f,n.x),n.y=Math.max(c,n.y),n.z=Math.max(u,n.z)}l.sub(n,s),a.add(s,n).divide(2)}computeBoundingSphere(e){e||(e=this.getPosition());let i=e.data,r=e.size;this.bounds||this.computeBoundingBox(e);let s=0;for(let n=0,a=i.length;n<a;n+=r)Di.fromArray(i,n),s=Math.max(s,this.bounds.center.squaredDistance(Di));this.bounds.radius=Math.sqrt(s)}remove(){for(let e in this.VAOs)this.gl.renderer.deleteVertexArray(this.VAOs[e]),delete this.VAOs[e];for(let e in this.attributes)this.gl.deleteBuffer(this.attributes[e].buffer),delete this.attributes[e]}};var Jr=1,Li={},ge=class{constructor(e,{vertex:i,fragment:r,uniforms:s={},transparent:n=!1,cullFace:a=e.BACK,frontFace:l=e.CCW,depthTest:h=!0,depthWrite:o=!0,depthFunc:f=e.LEQUAL}={}){e.canvas||console.error("gl not passed as first argument to Program"),this.gl=e,this.uniforms=s,this.id=Jr++,i||console.warn("vertex shader not supplied"),r||console.warn("fragment shader not supplied"),this.transparent=n,this.cullFace=a,this.frontFace=l,this.depthTest=h,this.depthWrite=o,this.depthFunc=f,this.blendFunc={},this.blendEquation={},this.stencilFunc={},this.stencilOp={},this.transparent&&!this.blendFunc.src&&(this.gl.renderer.premultipliedAlpha?this.setBlendFunc(this.gl.ONE,this.gl.ONE_MINUS_SRC_ALPHA):this.setBlendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA)),this.vertexShader=e.createShader(e.VERTEX_SHADER),this.fragmentShader=e.createShader(e.FRAGMENT_SHADER),this.program=e.createProgram(),e.attachShader(this.program,this.vertexShader),e.attachShader(this.program,this.fragmentShader),this.setShaders({vertex:i,fragment:r})}setShaders({vertex:e,fragment:i}){if(e&&(this.gl.shaderSource(this.vertexShader,e),this.gl.compileShader(this.vertexShader),this.gl.getShaderInfoLog(this.vertexShader)!==""&&console.warn(`${this.gl.getShaderInfoLog(this.vertexShader)}
Vertex Shader
${Ni(e)}`)),i&&(this.gl.shaderSource(this.fragmentShader,i),this.gl.compileShader(this.fragmentShader),this.gl.getShaderInfoLog(this.fragmentShader)!==""&&console.warn(`${this.gl.getShaderInfoLog(this.fragmentShader)}
Fragment Shader
${Ni(i)}`)),this.gl.linkProgram(this.program),!this.gl.getProgramParameter(this.program,this.gl.LINK_STATUS))return console.warn(this.gl.getProgramInfoLog(this.program));this.uniformLocations=new Map;let r=this.gl.getProgramParameter(this.program,this.gl.ACTIVE_UNIFORMS);for(let a=0;a<r;a++){let l=this.gl.getActiveUniform(this.program,a);this.uniformLocations.set(l,this.gl.getUniformLocation(this.program,l.name));let h=l.name.match(/(\w+)/g);l.uniformName=h[0],l.nameComponents=h.slice(1)}this.attributeLocations=new Map;let s=[],n=this.gl.getProgramParameter(this.program,this.gl.ACTIVE_ATTRIBUTES);for(let a=0;a<n;a++){let l=this.gl.getActiveAttrib(this.program,a),h=this.gl.getAttribLocation(this.program,l.name);h!==-1&&(s[h]=l.name,this.attributeLocations.set(l,h))}this.attributeOrder=s.join("")}setBlendFunc(e,i,r,s){this.blendFunc.src=e,this.blendFunc.dst=i,this.blendFunc.srcAlpha=r,this.blendFunc.dstAlpha=s,e&&(this.transparent=!0)}setBlendEquation(e,i){this.blendEquation.modeRGB=e,this.blendEquation.modeAlpha=i}setStencilFunc(e,i,r){this.stencilRef=i,this.stencilFunc.func=e,this.stencilFunc.ref=i,this.stencilFunc.mask=r}setStencilOp(e,i,r){this.stencilOp.stencilFail=e,this.stencilOp.depthFail=i,this.stencilOp.depthPass=r}applyState(){this.depthTest?this.gl.renderer.enable(this.gl.DEPTH_TEST):this.gl.renderer.disable(this.gl.DEPTH_TEST),this.cullFace?this.gl.renderer.enable(this.gl.CULL_FACE):this.gl.renderer.disable(this.gl.CULL_FACE),this.blendFunc.src?this.gl.renderer.enable(this.gl.BLEND):this.gl.renderer.disable(this.gl.BLEND),this.cullFace&&this.gl.renderer.setCullFace(this.cullFace),this.gl.renderer.setFrontFace(this.frontFace),this.gl.renderer.setDepthMask(this.depthWrite),this.gl.renderer.setDepthFunc(this.depthFunc),this.blendFunc.src&&this.gl.renderer.setBlendFunc(this.blendFunc.src,this.blendFunc.dst,this.blendFunc.srcAlpha,this.blendFunc.dstAlpha),this.gl.renderer.setBlendEquation(this.blendEquation.modeRGB,this.blendEquation.modeAlpha),this.stencilFunc.func||this.stencilOp.stencilFail?this.gl.renderer.enable(this.gl.STENCIL_TEST):this.gl.renderer.disable(this.gl.STENCIL_TEST),this.gl.renderer.setStencilFunc(this.stencilFunc.func,this.stencilFunc.ref,this.stencilFunc.mask),this.gl.renderer.setStencilOp(this.stencilOp.stencilFail,this.stencilOp.depthFail,this.stencilOp.depthPass)}use({flipFaces:e=!1}={}){let i=-1;this.gl.renderer.state.currentProgram===this.id||(this.gl.useProgram(this.program),this.gl.renderer.state.currentProgram=this.id),this.uniformLocations.forEach((s,n)=>{let a=this.uniforms[n.uniformName];for(let l of n.nameComponents){if(!a)break;if(l in a)a=a[l];else{if(Array.isArray(a.value))break;a=void 0;break}}if(!a)return ki(`Active uniform ${n.name} has not been supplied`);if(a&&a.value===void 0)return ki(`${n.name} uniform is missing a value parameter`);if(a.value.texture)return i=i+1,a.value.update(i),Rt(this.gl,n.type,s,i);if(a.value.length&&a.value[0].texture){let l=[];return a.value.forEach(h=>{i=i+1,h.update(i),l.push(i)}),Rt(this.gl,n.type,s,l)}Rt(this.gl,n.type,s,a.value)}),this.applyState(),e&&this.gl.renderer.setFrontFace(this.frontFace===this.gl.CCW?this.gl.CW:this.gl.CCW)}remove(){this.gl.deleteProgram(this.program)}};function Rt(t,e,i,r){r=r.length?es(r):r;let s=t.renderer.state.uniformLocations.get(i);if(r.length)if(s===void 0||s.length!==r.length)t.renderer.state.uniformLocations.set(i,r.slice(0));else{if(ts(s,r))return;s.set?s.set(r):is(s,r),t.renderer.state.uniformLocations.set(i,s)}else{if(s===r)return;t.renderer.state.uniformLocations.set(i,r)}switch(e){case 5126:return r.length?t.uniform1fv(i,r):t.uniform1f(i,r);case 35664:return t.uniform2fv(i,r);case 35665:return t.uniform3fv(i,r);case 35666:return t.uniform4fv(i,r);case 35670:case 5124:case 35678:case 36306:case 35680:case 36289:return r.length?t.uniform1iv(i,r):t.uniform1i(i,r);case 35671:case 35667:return t.uniform2iv(i,r);case 35672:case 35668:return t.uniform3iv(i,r);case 35673:case 35669:return t.uniform4iv(i,r);case 35674:return t.uniformMatrix2fv(i,!1,r);case 35675:return t.uniformMatrix3fv(i,!1,r);case 35676:return t.uniformMatrix4fv(i,!1,r)}}function Ni(t){let e=t.split(`
`);for(let i=0;i<e.length;i++)e[i]=i+1+": "+e[i];return e.join(`
`)}function es(t){let e=t.length,i=t[0].length;if(i===void 0)return t;let r=e*i,s=Li[r];s||(Li[r]=s=new Float32Array(r));for(let n=0;n<e;n++)s.set(t[n],n*i);return s}function ts(t,e){if(t.length!==e.length)return!1;for(let i=0,r=t.length;i<r;i++)if(t[i]!==e[i])return!1;return!0}function is(t,e){for(let i=0,r=t.length;i<r;i++)t[i]=e[i]}var bt=0;function ki(t){bt>100||(console.warn(t),bt++,bt>100&&console.warn("More than 100 program warnings - stopping logs."))}var At=new Y,rs=1,Ue=class{constructor({canvas:e=document.createElement("canvas"),width:i=300,height:r=150,dpr:s=1,alpha:n=!1,depth:a=!0,stencil:l=!1,antialias:h=!1,premultipliedAlpha:o=!1,preserveDrawingBuffer:f=!1,powerPreference:c="default",autoClear:u=!0,webgl:d=2}={}){let p={alpha:n,depth:a,stencil:l,antialias:h,premultipliedAlpha:o,preserveDrawingBuffer:f,powerPreference:c};this.dpr=s,this.alpha=n,this.color=!0,this.depth=a,this.stencil=l,this.premultipliedAlpha=o,this.autoClear=u,this.id=rs++,d===2&&(this.gl=e.getContext("webgl2",p)),this.isWebgl2=!!this.gl,this.gl||(this.gl=e.getContext("webgl",p)),this.gl||console.error("unable to create webgl context"),this.gl.renderer=this,this.setSize(i,r),this.state={},this.state.blendFunc={src:this.gl.ONE,dst:this.gl.ZERO},this.state.blendEquation={modeRGB:this.gl.FUNC_ADD},this.state.cullFace=!1,this.state.frontFace=this.gl.CCW,this.state.depthMask=!0,this.state.depthFunc=this.gl.LEQUAL,this.state.premultiplyAlpha=!1,this.state.flipY=!1,this.state.unpackAlignment=4,this.state.framebuffer=null,this.state.viewport={x:0,y:0,width:null,height:null},this.state.textureUnits=[],this.state.activeTextureUnit=0,this.state.boundBuffer=null,this.state.uniformLocations=new Map,this.state.currentProgram=null,this.extensions={},this.isWebgl2?(this.getExtension("EXT_color_buffer_float"),this.getExtension("OES_texture_float_linear")):(this.getExtension("OES_texture_float"),this.getExtension("OES_texture_float_linear"),this.getExtension("OES_texture_half_float"),this.getExtension("OES_texture_half_float_linear"),this.getExtension("OES_element_index_uint"),this.getExtension("OES_standard_derivatives"),this.getExtension("EXT_sRGB"),this.getExtension("WEBGL_depth_texture"),this.getExtension("WEBGL_draw_buffers")),this.getExtension("WEBGL_compressed_texture_astc"),this.getExtension("EXT_texture_compression_bptc"),this.getExtension("WEBGL_compressed_texture_s3tc"),this.getExtension("WEBGL_compressed_texture_etc1"),this.getExtension("WEBGL_compressed_texture_pvrtc"),this.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc"),this.vertexAttribDivisor=this.getExtension("ANGLE_instanced_arrays","vertexAttribDivisor","vertexAttribDivisorANGLE"),this.drawArraysInstanced=this.getExtension("ANGLE_instanced_arrays","drawArraysInstanced","drawArraysInstancedANGLE"),this.drawElementsInstanced=this.getExtension("ANGLE_instanced_arrays","drawElementsInstanced","drawElementsInstancedANGLE"),this.createVertexArray=this.getExtension("OES_vertex_array_object","createVertexArray","createVertexArrayOES"),this.bindVertexArray=this.getExtension("OES_vertex_array_object","bindVertexArray","bindVertexArrayOES"),this.deleteVertexArray=this.getExtension("OES_vertex_array_object","deleteVertexArray","deleteVertexArrayOES"),this.drawBuffers=this.getExtension("WEBGL_draw_buffers","drawBuffers","drawBuffersWEBGL"),this.parameters={},this.parameters.maxTextureUnits=this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),this.parameters.maxAnisotropy=this.getExtension("EXT_texture_filter_anisotropic")?this.gl.getParameter(this.getExtension("EXT_texture_filter_anisotropic").MAX_TEXTURE_MAX_ANISOTROPY_EXT):0}setSize(e,i){this.width=e,this.height=i,this.gl.canvas.width=e*this.dpr,this.gl.canvas.height=i*this.dpr,this.gl.canvas.style&&Object.assign(this.gl.canvas.style,{width:e+"px",height:i+"px"})}setViewport(e,i,r=0,s=0){this.state.viewport.width===e&&this.state.viewport.height===i||(this.state.viewport.width=e,this.state.viewport.height=i,this.state.viewport.x=r,this.state.viewport.y=s,this.gl.viewport(r,s,e,i))}setScissor(e,i,r=0,s=0){this.gl.scissor(r,s,e,i)}enable(e){this.state[e]!==!0&&(this.gl.enable(e),this.state[e]=!0)}disable(e){this.state[e]!==!1&&(this.gl.disable(e),this.state[e]=!1)}setBlendFunc(e,i,r,s){this.state.blendFunc.src===e&&this.state.blendFunc.dst===i&&this.state.blendFunc.srcAlpha===r&&this.state.blendFunc.dstAlpha===s||(this.state.blendFunc.src=e,this.state.blendFunc.dst=i,this.state.blendFunc.srcAlpha=r,this.state.blendFunc.dstAlpha=s,r!==void 0?this.gl.blendFuncSeparate(e,i,r,s):this.gl.blendFunc(e,i))}setBlendEquation(e,i){e=e||this.gl.FUNC_ADD,!(this.state.blendEquation.modeRGB===e&&this.state.blendEquation.modeAlpha===i)&&(this.state.blendEquation.modeRGB=e,this.state.blendEquation.modeAlpha=i,i!==void 0?this.gl.blendEquationSeparate(e,i):this.gl.blendEquation(e))}setCullFace(e){this.state.cullFace!==e&&(this.state.cullFace=e,this.gl.cullFace(e))}setFrontFace(e){this.state.frontFace!==e&&(this.state.frontFace=e,this.gl.frontFace(e))}setDepthMask(e){this.state.depthMask!==e&&(this.state.depthMask=e,this.gl.depthMask(e))}setDepthFunc(e){this.state.depthFunc!==e&&(this.state.depthFunc=e,this.gl.depthFunc(e))}setStencilMask(e){this.state.stencilMask!==e&&(this.state.stencilMask=e,this.gl.stencilMask(e))}setStencilFunc(e,i,r){this.state.stencilFunc===e&&this.state.stencilRef===i&&this.state.stencilFuncMask===r||(this.state.stencilFunc=e||this.gl.ALWAYS,this.state.stencilRef=i||0,this.state.stencilFuncMask=r||0,this.gl.stencilFunc(e||this.gl.ALWAYS,i||0,r||0))}setStencilOp(e,i,r){this.state.stencilFail===e&&this.state.stencilDepthFail===i&&this.state.stencilDepthPass===r||(this.state.stencilFail=e,this.state.stencilDepthFail=i,this.state.stencilDepthPass=r,this.gl.stencilOp(e,i,r))}activeTexture(e){this.state.activeTextureUnit!==e&&(this.state.activeTextureUnit=e,this.gl.activeTexture(this.gl.TEXTURE0+e))}bindFramebuffer({target:e=this.gl.FRAMEBUFFER,buffer:i=null}={}){this.state.framebuffer!==i&&(this.state.framebuffer=i,this.gl.bindFramebuffer(e,i))}getExtension(e,i,r){return i&&this.gl[i]?this.gl[i].bind(this.gl):(this.extensions[e]||(this.extensions[e]=this.gl.getExtension(e)),i?this.extensions[e]?this.extensions[e][r].bind(this.extensions[e]):null:this.extensions[e])}sortOpaque(e,i){return e.renderOrder!==i.renderOrder?e.renderOrder-i.renderOrder:e.program.id!==i.program.id?e.program.id-i.program.id:e.zDepth!==i.zDepth?e.zDepth-i.zDepth:i.id-e.id}sortTransparent(e,i){return e.renderOrder!==i.renderOrder?e.renderOrder-i.renderOrder:e.zDepth!==i.zDepth?i.zDepth-e.zDepth:i.id-e.id}sortUI(e,i){return e.renderOrder!==i.renderOrder?e.renderOrder-i.renderOrder:e.program.id!==i.program.id?e.program.id-i.program.id:i.id-e.id}getRenderList({scene:e,camera:i,frustumCull:r,sort:s}){let n=[];if(i&&r&&i.updateFrustum(),e.traverse(a=>{if(!a.visible)return!0;a.draw&&(r&&a.frustumCulled&&i&&!i.frustumIntersectsMesh(a)||n.push(a))}),s){let a=[],l=[],h=[];n.forEach(o=>{o.program.transparent?o.program.depthTest?l.push(o):h.push(o):a.push(o),o.zDepth=0,!(o.renderOrder!==0||!o.program.depthTest||!i)&&(o.worldMatrix.getTranslation(At),At.applyMatrix4(i.projectionViewMatrix),o.zDepth=At.z)}),a.sort(this.sortOpaque),l.sort(this.sortTransparent),h.sort(this.sortUI),n=a.concat(l,h)}return n}render({scene:e,camera:i,target:r=null,update:s=!0,sort:n=!0,frustumCull:a=!0,clear:l}){r===null?(this.bindFramebuffer(),this.setViewport(this.width*this.dpr,this.height*this.dpr)):(this.bindFramebuffer(r),this.setViewport(r.width,r.height)),(l||this.autoClear&&l!==!1)&&(this.depth&&(!r||r.depth)&&(this.enable(this.gl.DEPTH_TEST),this.setDepthMask(!0)),(this.stencil||!r||r.stencil)&&(this.enable(this.gl.STENCIL_TEST),this.setStencilMask(255)),this.gl.clear((this.color?this.gl.COLOR_BUFFER_BIT:0)|(this.depth?this.gl.DEPTH_BUFFER_BIT:0)|(this.stencil?this.gl.STENCIL_BUFFER_BIT:0))),s&&e.updateMatrixWorld(),i&&i.updateMatrixWorld(),this.getRenderList({scene:e,camera:i,frustumCull:a,sort:n}).forEach(o=>{o.draw({camera:i})})}};function Ii(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t}function Bi(t,e,i,r,s){return t[0]=e,t[1]=i,t[2]=r,t[3]=s,t}function Oi(t,e){let i=e[0],r=e[1],s=e[2],n=e[3],a=i*i+r*r+s*s+n*n;return a>0&&(a=1/Math.sqrt(a)),t[0]=i*a,t[1]=r*a,t[2]=s*a,t[3]=n*a,t}function Ui(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]+t[3]*e[3]}function Vi(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t}function Gi(t,e,i){i=i*.5;let r=Math.sin(i);return t[0]=r*e[0],t[1]=r*e[1],t[2]=r*e[2],t[3]=Math.cos(i),t}function St(t,e,i){let r=e[0],s=e[1],n=e[2],a=e[3],l=i[0],h=i[1],o=i[2],f=i[3];return t[0]=r*f+a*l+s*o-n*h,t[1]=s*f+a*h+n*l-r*o,t[2]=n*f+a*o+r*h-s*l,t[3]=a*f-r*l-s*h-n*o,t}function qi(t,e,i){i*=.5;let r=e[0],s=e[1],n=e[2],a=e[3],l=Math.sin(i),h=Math.cos(i);return t[0]=r*h+a*l,t[1]=s*h+n*l,t[2]=n*h-s*l,t[3]=a*h-r*l,t}function Hi(t,e,i){i*=.5;let r=e[0],s=e[1],n=e[2],a=e[3],l=Math.sin(i),h=Math.cos(i);return t[0]=r*h-n*l,t[1]=s*h+a*l,t[2]=n*h+r*l,t[3]=a*h-s*l,t}function Xi(t,e,i){i*=.5;let r=e[0],s=e[1],n=e[2],a=e[3],l=Math.sin(i),h=Math.cos(i);return t[0]=r*h+s*l,t[1]=s*h-r*l,t[2]=n*h+a*l,t[3]=a*h-n*l,t}function Wi(t,e,i,r){let s=e[0],n=e[1],a=e[2],l=e[3],h=i[0],o=i[1],f=i[2],c=i[3],u,d,p,g,m;return d=s*h+n*o+a*f+l*c,d<0&&(d=-d,h=-h,o=-o,f=-f,c=-c),1-d>1e-6?(u=Math.acos(d),p=Math.sin(u),g=Math.sin((1-r)*u)/p,m=Math.sin(r*u)/p):(g=1-r,m=r),t[0]=g*s+m*h,t[1]=g*n+m*o,t[2]=g*a+m*f,t[3]=g*l+m*c,t}function Yi(t,e){let i=e[0],r=e[1],s=e[2],n=e[3],a=i*i+r*r+s*s+n*n,l=a?1/a:0;return t[0]=-i*l,t[1]=-r*l,t[2]=-s*l,t[3]=n*l,t}function Qi(t,e){return t[0]=-e[0],t[1]=-e[1],t[2]=-e[2],t[3]=e[3],t}function ji(t,e){let i=e[0]+e[4]+e[8],r;if(i>0)r=Math.sqrt(i+1),t[3]=.5*r,r=.5/r,t[0]=(e[5]-e[7])*r,t[1]=(e[6]-e[2])*r,t[2]=(e[1]-e[3])*r;else{let s=0;e[4]>e[0]&&(s=1),e[8]>e[s*3+s]&&(s=2);let n=(s+1)%3,a=(s+2)%3;r=Math.sqrt(e[s*3+s]-e[n*3+n]-e[a*3+a]+1),t[s]=.5*r,r=.5/r,t[3]=(e[n*3+a]-e[a*3+n])*r,t[n]=(e[n*3+s]+e[s*3+n])*r,t[a]=(e[a*3+s]+e[s*3+a])*r}return t}function Ki(t,e,i="YXZ"){let r=Math.sin(e[0]*.5),s=Math.cos(e[0]*.5),n=Math.sin(e[1]*.5),a=Math.cos(e[1]*.5),l=Math.sin(e[2]*.5),h=Math.cos(e[2]*.5);return i==="XYZ"?(t[0]=r*a*h+s*n*l,t[1]=s*n*h-r*a*l,t[2]=s*a*l+r*n*h,t[3]=s*a*h-r*n*l):i==="YXZ"?(t[0]=r*a*h+s*n*l,t[1]=s*n*h-r*a*l,t[2]=s*a*l-r*n*h,t[3]=s*a*h+r*n*l):i==="ZXY"?(t[0]=r*a*h-s*n*l,t[1]=s*n*h+r*a*l,t[2]=s*a*l+r*n*h,t[3]=s*a*h-r*n*l):i==="ZYX"?(t[0]=r*a*h-s*n*l,t[1]=s*n*h+r*a*l,t[2]=s*a*l-r*n*h,t[3]=s*a*h+r*n*l):i==="YZX"?(t[0]=r*a*h+s*n*l,t[1]=s*n*h+r*a*l,t[2]=s*a*l-r*n*h,t[3]=s*a*h-r*n*l):i==="XZY"&&(t[0]=r*a*h-s*n*l,t[1]=s*n*h-r*a*l,t[2]=s*a*l+r*n*h,t[3]=s*a*h+r*n*l),t}var Zi=Ii,$i=Bi;var Ji=Ui;var er=Oi;var Je=class extends Array{constructor(e=0,i=0,r=0,s=1){super(e,i,r,s),this.onChange=()=>{},this._target=this;let n=["0","1","2","3"];return new Proxy(this,{set(a,l){let h=Reflect.set(...arguments);return h&&n.includes(l)&&a.onChange(),h}})}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}get w(){return this[3]}set x(e){this._target[0]=e,this.onChange()}set y(e){this._target[1]=e,this.onChange()}set z(e){this._target[2]=e,this.onChange()}set w(e){this._target[3]=e,this.onChange()}identity(){return Vi(this._target),this.onChange(),this}set(e,i,r,s){return e.length?this.copy(e):($i(this._target,e,i,r,s),this.onChange(),this)}rotateX(e){return qi(this._target,this._target,e),this.onChange(),this}rotateY(e){return Hi(this._target,this._target,e),this.onChange(),this}rotateZ(e){return Xi(this._target,this._target,e),this.onChange(),this}inverse(e=this._target){return Yi(this._target,e),this.onChange(),this}conjugate(e=this._target){return Qi(this._target,e),this.onChange(),this}copy(e){return Zi(this._target,e),this.onChange(),this}normalize(e=this._target){return er(this._target,e),this.onChange(),this}multiply(e,i){return i?St(this._target,e,i):St(this._target,this._target,e),this.onChange(),this}dot(e){return Ji(this._target,e)}fromMatrix3(e){return ji(this._target,e),this.onChange(),this}fromEuler(e,i){return Ki(this._target,e,e.order),i||this.onChange(),this}fromAxisAngle(e,i){return Gi(this._target,e,i),this.onChange(),this}slerp(e,i){return Wi(this._target,this._target,e,i),this.onChange(),this}fromArray(e,i=0){return this._target[0]=e[i],this._target[1]=e[i+1],this._target[2]=e[i+2],this._target[3]=e[i+3],this.onChange(),this}toArray(e=[],i=0){return e[i]=this[0],e[i+1]=this[1],e[i+2]=this[2],e[i+3]=this[3],e}};var as=1e-6;function tr(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[4]=e[4],t[5]=e[5],t[6]=e[6],t[7]=e[7],t[8]=e[8],t[9]=e[9],t[10]=e[10],t[11]=e[11],t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15],t}function ir(t,e,i,r,s,n,a,l,h,o,f,c,u,d,p,g,m){return t[0]=e,t[1]=i,t[2]=r,t[3]=s,t[4]=n,t[5]=a,t[6]=l,t[7]=h,t[8]=o,t[9]=f,t[10]=c,t[11]=u,t[12]=d,t[13]=p,t[14]=g,t[15]=m,t}function rr(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function sr(t,e){let i=e[0],r=e[1],s=e[2],n=e[3],a=e[4],l=e[5],h=e[6],o=e[7],f=e[8],c=e[9],u=e[10],d=e[11],p=e[12],g=e[13],m=e[14],x=e[15],R=i*l-r*a,E=i*h-s*a,y=i*o-n*a,F=r*h-s*l,M=r*o-n*l,P=s*o-n*h,V=f*g-c*p,O=f*m-u*p,L=f*x-d*p,k=c*m-u*g,I=c*x-d*g,b=u*x-d*m,T=R*b-E*I+y*k+F*L-M*O+P*V;return T?(T=1/T,t[0]=(l*b-h*I+o*k)*T,t[1]=(s*I-r*b-n*k)*T,t[2]=(g*P-m*M+x*F)*T,t[3]=(u*M-c*P-d*F)*T,t[4]=(h*L-a*b-o*O)*T,t[5]=(i*b-s*L+n*O)*T,t[6]=(m*y-p*P-x*E)*T,t[7]=(f*P-u*y+d*E)*T,t[8]=(a*I-l*L+o*V)*T,t[9]=(r*L-i*I-n*V)*T,t[10]=(p*M-g*y+x*R)*T,t[11]=(c*y-f*M-d*R)*T,t[12]=(l*O-a*k-h*V)*T,t[13]=(i*k-r*O+s*V)*T,t[14]=(g*E-p*F-m*R)*T,t[15]=(f*F-c*E+u*R)*T,t):null}function Ct(t){let e=t[0],i=t[1],r=t[2],s=t[3],n=t[4],a=t[5],l=t[6],h=t[7],o=t[8],f=t[9],c=t[10],u=t[11],d=t[12],p=t[13],g=t[14],m=t[15],x=e*a-i*n,R=e*l-r*n,E=e*h-s*n,y=i*l-r*a,F=i*h-s*a,M=r*h-s*l,P=o*p-f*d,V=o*g-c*d,O=o*m-u*d,L=f*g-c*p,k=f*m-u*p,I=c*m-u*g;return x*I-R*k+E*L+y*O-F*V+M*P}function zt(t,e,i){let r=e[0],s=e[1],n=e[2],a=e[3],l=e[4],h=e[5],o=e[6],f=e[7],c=e[8],u=e[9],d=e[10],p=e[11],g=e[12],m=e[13],x=e[14],R=e[15],E=i[0],y=i[1],F=i[2],M=i[3];return t[0]=E*r+y*l+F*c+M*g,t[1]=E*s+y*h+F*u+M*m,t[2]=E*n+y*o+F*d+M*x,t[3]=E*a+y*f+F*p+M*R,E=i[4],y=i[5],F=i[6],M=i[7],t[4]=E*r+y*l+F*c+M*g,t[5]=E*s+y*h+F*u+M*m,t[6]=E*n+y*o+F*d+M*x,t[7]=E*a+y*f+F*p+M*R,E=i[8],y=i[9],F=i[10],M=i[11],t[8]=E*r+y*l+F*c+M*g,t[9]=E*s+y*h+F*u+M*m,t[10]=E*n+y*o+F*d+M*x,t[11]=E*a+y*f+F*p+M*R,E=i[12],y=i[13],F=i[14],M=i[15],t[12]=E*r+y*l+F*c+M*g,t[13]=E*s+y*h+F*u+M*m,t[14]=E*n+y*o+F*d+M*x,t[15]=E*a+y*f+F*p+M*R,t}function nr(t,e,i){let r=i[0],s=i[1],n=i[2],a,l,h,o,f,c,u,d,p,g,m,x;return e===t?(t[12]=e[0]*r+e[4]*s+e[8]*n+e[12],t[13]=e[1]*r+e[5]*s+e[9]*n+e[13],t[14]=e[2]*r+e[6]*s+e[10]*n+e[14],t[15]=e[3]*r+e[7]*s+e[11]*n+e[15]):(a=e[0],l=e[1],h=e[2],o=e[3],f=e[4],c=e[5],u=e[6],d=e[7],p=e[8],g=e[9],m=e[10],x=e[11],t[0]=a,t[1]=l,t[2]=h,t[3]=o,t[4]=f,t[5]=c,t[6]=u,t[7]=d,t[8]=p,t[9]=g,t[10]=m,t[11]=x,t[12]=a*r+f*s+p*n+e[12],t[13]=l*r+c*s+g*n+e[13],t[14]=h*r+u*s+m*n+e[14],t[15]=o*r+d*s+x*n+e[15]),t}function ar(t,e,i){let r=i[0],s=i[1],n=i[2];return t[0]=e[0]*r,t[1]=e[1]*r,t[2]=e[2]*r,t[3]=e[3]*r,t[4]=e[4]*s,t[5]=e[5]*s,t[6]=e[6]*s,t[7]=e[7]*s,t[8]=e[8]*n,t[9]=e[9]*n,t[10]=e[10]*n,t[11]=e[11]*n,t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15],t}function lr(t,e,i,r){let s=r[0],n=r[1],a=r[2],l=Math.hypot(s,n,a),h,o,f,c,u,d,p,g,m,x,R,E,y,F,M,P,V,O,L,k,I,b,T,ve;return Math.abs(l)<as?null:(l=1/l,s*=l,n*=l,a*=l,h=Math.sin(i),o=Math.cos(i),f=1-o,c=e[0],u=e[1],d=e[2],p=e[3],g=e[4],m=e[5],x=e[6],R=e[7],E=e[8],y=e[9],F=e[10],M=e[11],P=s*s*f+o,V=n*s*f+a*h,O=a*s*f-n*h,L=s*n*f-a*h,k=n*n*f+o,I=a*n*f+s*h,b=s*a*f+n*h,T=n*a*f-s*h,ve=a*a*f+o,t[0]=c*P+g*V+E*O,t[1]=u*P+m*V+y*O,t[2]=d*P+x*V+F*O,t[3]=p*P+R*V+M*O,t[4]=c*L+g*k+E*I,t[5]=u*L+m*k+y*I,t[6]=d*L+x*k+F*I,t[7]=p*L+R*k+M*I,t[8]=c*b+g*T+E*ve,t[9]=u*b+m*T+y*ve,t[10]=d*b+x*T+F*ve,t[11]=p*b+R*T+M*ve,e!==t&&(t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15]),t)}function hr(t,e){return t[0]=e[12],t[1]=e[13],t[2]=e[14],t}function Dt(t,e){let i=e[0],r=e[1],s=e[2],n=e[4],a=e[5],l=e[6],h=e[8],o=e[9],f=e[10];return t[0]=Math.hypot(i,r,s),t[1]=Math.hypot(n,a,l),t[2]=Math.hypot(h,o,f),t}function or(t){let e=t[0],i=t[1],r=t[2],s=t[4],n=t[5],a=t[6],l=t[8],h=t[9],o=t[10],f=e*e+i*i+r*r,c=s*s+n*n+a*a,u=l*l+h*h+o*o;return Math.sqrt(Math.max(f,c,u))}var Pt=(function(){let t=[1,1,1];return function(e,i){let r=t;Dt(r,i);let s=1/r[0],n=1/r[1],a=1/r[2],l=i[0]*s,h=i[1]*n,o=i[2]*a,f=i[4]*s,c=i[5]*n,u=i[6]*a,d=i[8]*s,p=i[9]*n,g=i[10]*a,m=l+c+g,x=0;return m>0?(x=Math.sqrt(m+1)*2,e[3]=.25*x,e[0]=(u-p)/x,e[1]=(d-o)/x,e[2]=(h-f)/x):l>c&&l>g?(x=Math.sqrt(1+l-c-g)*2,e[3]=(u-p)/x,e[0]=.25*x,e[1]=(h+f)/x,e[2]=(d+o)/x):c>g?(x=Math.sqrt(1+c-l-g)*2,e[3]=(d-o)/x,e[0]=(h+f)/x,e[1]=.25*x,e[2]=(u+p)/x):(x=Math.sqrt(1+g-l-c)*2,e[3]=(h-f)/x,e[0]=(d+o)/x,e[1]=(u+p)/x,e[2]=.25*x),e}})();function cr(t,e,i,r){let s=Re([t[0],t[1],t[2]]),n=Re([t[4],t[5],t[6]]),a=Re([t[8],t[9],t[10]]);Ct(t)<0&&(s=-s),i[0]=t[12],i[1]=t[13],i[2]=t[14];let h=t.slice(),o=1/s,f=1/n,c=1/a;h[0]*=o,h[1]*=o,h[2]*=o,h[4]*=f,h[5]*=f,h[6]*=f,h[8]*=c,h[9]*=c,h[10]*=c,Pt(e,h),r[0]=s,r[1]=n,r[2]=a}function fr(t,e,i,r){let s=t,n=e[0],a=e[1],l=e[2],h=e[3],o=n+n,f=a+a,c=l+l,u=n*o,d=n*f,p=n*c,g=a*f,m=a*c,x=l*c,R=h*o,E=h*f,y=h*c,F=r[0],M=r[1],P=r[2];return s[0]=(1-(g+x))*F,s[1]=(d+y)*F,s[2]=(p-E)*F,s[3]=0,s[4]=(d-y)*M,s[5]=(1-(u+x))*M,s[6]=(m+R)*M,s[7]=0,s[8]=(p+E)*P,s[9]=(m-R)*P,s[10]=(1-(u+g))*P,s[11]=0,s[12]=i[0],s[13]=i[1],s[14]=i[2],s[15]=1,s}function ur(t,e){let i=e[0],r=e[1],s=e[2],n=e[3],a=i+i,l=r+r,h=s+s,o=i*a,f=r*a,c=r*l,u=s*a,d=s*l,p=s*h,g=n*a,m=n*l,x=n*h;return t[0]=1-c-p,t[1]=f+x,t[2]=u-m,t[3]=0,t[4]=f-x,t[5]=1-o-p,t[6]=d+g,t[7]=0,t[8]=u+m,t[9]=d-g,t[10]=1-o-c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function dr(t,e,i,r,s){let n=1/Math.tan(e/2),a=1/(r-s);return t[0]=n/i,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=n,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=(s+r)*a,t[11]=-1,t[12]=0,t[13]=0,t[14]=2*s*r*a,t[15]=0,t}function pr(t,e,i,r,s,n,a){let l=1/(e-i),h=1/(r-s),o=1/(n-a);return t[0]=-2*l,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=-2*h,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=2*o,t[11]=0,t[12]=(e+i)*l,t[13]=(s+r)*h,t[14]=(a+n)*o,t[15]=1,t}function gr(t,e,i,r){let s=e[0],n=e[1],a=e[2],l=r[0],h=r[1],o=r[2],f=s-i[0],c=n-i[1],u=a-i[2],d=f*f+c*c+u*u;d===0?u=1:(d=1/Math.sqrt(d),f*=d,c*=d,u*=d);let p=h*u-o*c,g=o*f-l*u,m=l*c-h*f;return d=p*p+g*g+m*m,d===0&&(o?l+=1e-6:h?o+=1e-6:h+=1e-6,p=h*u-o*c,g=o*f-l*u,m=l*c-h*f,d=p*p+g*g+m*m),d=1/Math.sqrt(d),p*=d,g*=d,m*=d,t[0]=p,t[1]=g,t[2]=m,t[3]=0,t[4]=c*m-u*g,t[5]=u*p-f*m,t[6]=f*g-c*p,t[7]=0,t[8]=f,t[9]=c,t[10]=u,t[11]=0,t[12]=s,t[13]=n,t[14]=a,t[15]=1,t}function Lt(t,e,i){return t[0]=e[0]+i[0],t[1]=e[1]+i[1],t[2]=e[2]+i[2],t[3]=e[3]+i[3],t[4]=e[4]+i[4],t[5]=e[5]+i[5],t[6]=e[6]+i[6],t[7]=e[7]+i[7],t[8]=e[8]+i[8],t[9]=e[9]+i[9],t[10]=e[10]+i[10],t[11]=e[11]+i[11],t[12]=e[12]+i[12],t[13]=e[13]+i[13],t[14]=e[14]+i[14],t[15]=e[15]+i[15],t}function Nt(t,e,i){return t[0]=e[0]-i[0],t[1]=e[1]-i[1],t[2]=e[2]-i[2],t[3]=e[3]-i[3],t[4]=e[4]-i[4],t[5]=e[5]-i[5],t[6]=e[6]-i[6],t[7]=e[7]-i[7],t[8]=e[8]-i[8],t[9]=e[9]-i[9],t[10]=e[10]-i[10],t[11]=e[11]-i[11],t[12]=e[12]-i[12],t[13]=e[13]-i[13],t[14]=e[14]-i[14],t[15]=e[15]-i[15],t}function mr(t,e,i){return t[0]=e[0]*i,t[1]=e[1]*i,t[2]=e[2]*i,t[3]=e[3]*i,t[4]=e[4]*i,t[5]=e[5]*i,t[6]=e[6]*i,t[7]=e[7]*i,t[8]=e[8]*i,t[9]=e[9]*i,t[10]=e[10]*i,t[11]=e[11]*i,t[12]=e[12]*i,t[13]=e[13]*i,t[14]=e[14]*i,t[15]=e[15]*i,t}var oe=class extends Array{constructor(e=1,i=0,r=0,s=0,n=0,a=1,l=0,h=0,o=0,f=0,c=1,u=0,d=0,p=0,g=0,m=1){return super(e,i,r,s,n,a,l,h,o,f,c,u,d,p,g,m),this}get x(){return this[12]}get y(){return this[13]}get z(){return this[14]}get w(){return this[15]}set x(e){this[12]=e}set y(e){this[13]=e}set z(e){this[14]=e}set w(e){this[15]=e}set(e,i,r,s,n,a,l,h,o,f,c,u,d,p,g,m){return e.length?this.copy(e):(ir(this,e,i,r,s,n,a,l,h,o,f,c,u,d,p,g,m),this)}translate(e,i=this){return nr(this,i,e),this}rotate(e,i,r=this){return lr(this,r,e,i),this}scale(e,i=this){return ar(this,i,typeof e=="number"?[e,e,e]:e),this}add(e,i){return i?Lt(this,e,i):Lt(this,this,e),this}sub(e,i){return i?Nt(this,e,i):Nt(this,this,e),this}multiply(e,i){return e.length?i?zt(this,e,i):zt(this,this,e):mr(this,this,e),this}identity(){return rr(this),this}copy(e){return tr(this,e),this}fromPerspective({fov:e,aspect:i,near:r,far:s}={}){return dr(this,e,i,r,s),this}fromOrthogonal({left:e,right:i,bottom:r,top:s,near:n,far:a}){return pr(this,e,i,r,s,n,a),this}fromQuaternion(e){return ur(this,e),this}setPosition(e){return this.x=e[0],this.y=e[1],this.z=e[2],this}inverse(e=this){return sr(this,e),this}compose(e,i,r){return fr(this,e,i,r),this}decompose(e,i,r){return cr(this,e,i,r),this}getRotation(e){return Pt(e,this),this}getTranslation(e){return hr(e,this),this}getScaling(e){return Dt(e,this),this}getMaxScaleOnAxis(){return or(this)}lookAt(e,i,r){return gr(this,e,i,r),this}determinant(){return Ct(this)}fromArray(e,i=0){return this[0]=e[i],this[1]=e[i+1],this[2]=e[i+2],this[3]=e[i+3],this[4]=e[i+4],this[5]=e[i+5],this[6]=e[i+6],this[7]=e[i+7],this[8]=e[i+8],this[9]=e[i+9],this[10]=e[i+10],this[11]=e[i+11],this[12]=e[i+12],this[13]=e[i+13],this[14]=e[i+14],this[15]=e[i+15],this}toArray(e=[],i=0){return e[i]=this[0],e[i+1]=this[1],e[i+2]=this[2],e[i+3]=this[3],e[i+4]=this[4],e[i+5]=this[5],e[i+6]=this[6],e[i+7]=this[7],e[i+8]=this[8],e[i+9]=this[9],e[i+10]=this[10],e[i+11]=this[11],e[i+12]=this[12],e[i+13]=this[13],e[i+14]=this[14],e[i+15]=this[15],e}};function xr(t,e,i="YXZ"){return i==="XYZ"?(t[1]=Math.asin(Math.min(Math.max(e[8],-1),1)),Math.abs(e[8])<.99999?(t[0]=Math.atan2(-e[9],e[10]),t[2]=Math.atan2(-e[4],e[0])):(t[0]=Math.atan2(e[6],e[5]),t[2]=0)):i==="YXZ"?(t[0]=Math.asin(-Math.min(Math.max(e[9],-1),1)),Math.abs(e[9])<.99999?(t[1]=Math.atan2(e[8],e[10]),t[2]=Math.atan2(e[1],e[5])):(t[1]=Math.atan2(-e[2],e[0]),t[2]=0)):i==="ZXY"?(t[0]=Math.asin(Math.min(Math.max(e[6],-1),1)),Math.abs(e[6])<.99999?(t[1]=Math.atan2(-e[2],e[10]),t[2]=Math.atan2(-e[4],e[5])):(t[1]=0,t[2]=Math.atan2(e[1],e[0]))):i==="ZYX"?(t[1]=Math.asin(-Math.min(Math.max(e[2],-1),1)),Math.abs(e[2])<.99999?(t[0]=Math.atan2(e[6],e[10]),t[2]=Math.atan2(e[1],e[0])):(t[0]=0,t[2]=Math.atan2(-e[4],e[5]))):i==="YZX"?(t[2]=Math.asin(Math.min(Math.max(e[1],-1),1)),Math.abs(e[1])<.99999?(t[0]=Math.atan2(-e[9],e[5]),t[1]=Math.atan2(-e[2],e[0])):(t[0]=0,t[1]=Math.atan2(e[8],e[10]))):i==="XZY"&&(t[2]=Math.asin(-Math.min(Math.max(e[4],-1),1)),Math.abs(e[4])<.99999?(t[0]=Math.atan2(e[6],e[5]),t[1]=Math.atan2(e[8],e[0])):(t[0]=Math.atan2(-e[9],e[10]),t[1]=0)),t}var vr=new oe,et=class extends Array{constructor(e=0,i=e,r=e,s="YXZ"){super(e,i,r),this.order=s,this.onChange=()=>{},this._target=this;let n=["0","1","2"];return new Proxy(this,{set(a,l){let h=Reflect.set(...arguments);return h&&n.includes(l)&&a.onChange(),h}})}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}set x(e){this._target[0]=e,this.onChange()}set y(e){this._target[1]=e,this.onChange()}set z(e){this._target[2]=e,this.onChange()}set(e,i=e,r=e){return e.length?this.copy(e):(this._target[0]=e,this._target[1]=i,this._target[2]=r,this.onChange(),this)}copy(e){return this._target[0]=e[0],this._target[1]=e[1],this._target[2]=e[2],this.onChange(),this}reorder(e){return this._target.order=e,this.onChange(),this}fromRotationMatrix(e,i=this.order){return xr(this._target,e,i),this.onChange(),this}fromQuaternion(e,i=this.order,r){return vr.fromQuaternion(e),this._target.fromRotationMatrix(vr,i),r||this.onChange(),this}fromArray(e,i=0){return this._target[0]=e[i],this._target[1]=e[i+1],this._target[2]=e[i+2],this}toArray(e=[],i=0){return e[i]=this[0],e[i+1]=this[1],e[i+2]=this[2],e}};var tt=class{constructor(){this.parent=null,this.children=[],this.visible=!0,this.matrix=new oe,this.worldMatrix=new oe,this.matrixAutoUpdate=!0,this.worldMatrixNeedsUpdate=!1,this.position=new Y,this.quaternion=new Je,this.scale=new Y(1),this.rotation=new et,this.up=new Y(0,1,0),this.rotation._target.onChange=()=>this.quaternion.fromEuler(this.rotation,!0),this.quaternion._target.onChange=()=>this.rotation.fromQuaternion(this.quaternion,void 0,!0)}setParent(e,i=!0){this.parent&&e!==this.parent&&this.parent.removeChild(this,!1),this.parent=e,i&&e&&e.addChild(this,!1)}addChild(e,i=!0){~this.children.indexOf(e)||this.children.push(e),i&&e.setParent(this,!1)}removeChild(e,i=!0){~this.children.indexOf(e)&&this.children.splice(this.children.indexOf(e),1),i&&e.setParent(null,!1)}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.worldMatrixNeedsUpdate||e)&&(this.parent===null?this.worldMatrix.copy(this.matrix):this.worldMatrix.multiply(this.parent.worldMatrix,this.matrix),this.worldMatrixNeedsUpdate=!1,e=!0);for(let i=0,r=this.children.length;i<r;i++)this.children[i].updateMatrixWorld(e)}updateMatrix(){this.matrix.compose(this.quaternion,this.position,this.scale),this.worldMatrixNeedsUpdate=!0}traverse(e){if(!e(this))for(let i=0,r=this.children.length;i<r;i++)this.children[i].traverse(e)}decompose(){this.matrix.decompose(this.quaternion._target,this.position,this.scale),this.rotation.fromQuaternion(this.quaternion)}lookAt(e,i=!1){i?this.matrix.lookAt(this.position,e,this.up):this.matrix.lookAt(e,this.position,this.up),this.matrix.getRotation(this.quaternion._target),this.rotation.fromQuaternion(this.quaternion)}};function yr(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[4],t[4]=e[5],t[5]=e[6],t[6]=e[8],t[7]=e[9],t[8]=e[10],t}function Er(t,e){let i=e[0],r=e[1],s=e[2],n=e[3],a=i+i,l=r+r,h=s+s,o=i*a,f=r*a,c=r*l,u=s*a,d=s*l,p=s*h,g=n*a,m=n*l,x=n*h;return t[0]=1-c-p,t[3]=f-x,t[6]=u+m,t[1]=f+x,t[4]=1-o-p,t[7]=d-g,t[2]=u-m,t[5]=d+g,t[8]=1-o-c,t}function wr(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[4]=e[4],t[5]=e[5],t[6]=e[6],t[7]=e[7],t[8]=e[8],t}function Mr(t,e,i,r,s,n,a,l,h,o){return t[0]=e,t[1]=i,t[2]=r,t[3]=s,t[4]=n,t[5]=a,t[6]=l,t[7]=h,t[8]=o,t}function Fr(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t}function Tr(t,e){let i=e[0],r=e[1],s=e[2],n=e[3],a=e[4],l=e[5],h=e[6],o=e[7],f=e[8],c=f*a-l*o,u=-f*n+l*h,d=o*n-a*h,p=i*c+r*u+s*d;return p?(p=1/p,t[0]=c*p,t[1]=(-f*r+s*o)*p,t[2]=(l*r-s*a)*p,t[3]=u*p,t[4]=(f*i-s*h)*p,t[5]=(-l*i+s*n)*p,t[6]=d*p,t[7]=(-o*i+r*h)*p,t[8]=(a*i-r*n)*p,t):null}function kt(t,e,i){let r=e[0],s=e[1],n=e[2],a=e[3],l=e[4],h=e[5],o=e[6],f=e[7],c=e[8],u=i[0],d=i[1],p=i[2],g=i[3],m=i[4],x=i[5],R=i[6],E=i[7],y=i[8];return t[0]=u*r+d*a+p*o,t[1]=u*s+d*l+p*f,t[2]=u*n+d*h+p*c,t[3]=g*r+m*a+x*o,t[4]=g*s+m*l+x*f,t[5]=g*n+m*h+x*c,t[6]=R*r+E*a+y*o,t[7]=R*s+E*l+y*f,t[8]=R*n+E*h+y*c,t}function _r(t,e,i){let r=e[0],s=e[1],n=e[2],a=e[3],l=e[4],h=e[5],o=e[6],f=e[7],c=e[8],u=i[0],d=i[1];return t[0]=r,t[1]=s,t[2]=n,t[3]=a,t[4]=l,t[5]=h,t[6]=u*r+d*a+o,t[7]=u*s+d*l+f,t[8]=u*n+d*h+c,t}function Rr(t,e,i){let r=e[0],s=e[1],n=e[2],a=e[3],l=e[4],h=e[5],o=e[6],f=e[7],c=e[8],u=Math.sin(i),d=Math.cos(i);return t[0]=d*r+u*a,t[1]=d*s+u*l,t[2]=d*n+u*h,t[3]=d*a-u*r,t[4]=d*l-u*s,t[5]=d*h-u*n,t[6]=o,t[7]=f,t[8]=c,t}function br(t,e,i){let r=i[0],s=i[1];return t[0]=r*e[0],t[1]=r*e[1],t[2]=r*e[2],t[3]=s*e[3],t[4]=s*e[4],t[5]=s*e[5],t[6]=e[6],t[7]=e[7],t[8]=e[8],t}function Ar(t,e){let i=e[0],r=e[1],s=e[2],n=e[3],a=e[4],l=e[5],h=e[6],o=e[7],f=e[8],c=e[9],u=e[10],d=e[11],p=e[12],g=e[13],m=e[14],x=e[15],R=i*l-r*a,E=i*h-s*a,y=i*o-n*a,F=r*h-s*l,M=r*o-n*l,P=s*o-n*h,V=f*g-c*p,O=f*m-u*p,L=f*x-d*p,k=c*m-u*g,I=c*x-d*g,b=u*x-d*m,T=R*b-E*I+y*k+F*L-M*O+P*V;return T?(T=1/T,t[0]=(l*b-h*I+o*k)*T,t[1]=(h*L-a*b-o*O)*T,t[2]=(a*I-l*L+o*V)*T,t[3]=(s*I-r*b-n*k)*T,t[4]=(i*b-s*L+n*O)*T,t[5]=(r*L-i*I-n*V)*T,t[6]=(g*P-m*M+x*F)*T,t[7]=(m*y-p*P-x*E)*T,t[8]=(p*M-g*y+x*R)*T,t):null}var it=class extends Array{constructor(e=1,i=0,r=0,s=0,n=1,a=0,l=0,h=0,o=1){return super(e,i,r,s,n,a,l,h,o),this}set(e,i,r,s,n,a,l,h,o){return e.length?this.copy(e):(Mr(this,e,i,r,s,n,a,l,h,o),this)}translate(e,i=this){return _r(this,i,e),this}rotate(e,i=this){return Rr(this,i,e),this}scale(e,i=this){return br(this,i,e),this}multiply(e,i){return i?kt(this,e,i):kt(this,this,e),this}identity(){return Fr(this),this}copy(e){return wr(this,e),this}fromMatrix4(e){return yr(this,e),this}fromQuaternion(e){return Er(this,e),this}fromBasis(e,i,r){return this.set(e[0],e[1],e[2],i[0],i[1],i[2],r[0],r[1],r[2]),this}inverse(e=this){return Tr(this,e),this}getNormalMatrix(e){return Ar(this,e),this}};var cs=0,me=class extends tt{constructor(e,{geometry:i,program:r,mode:s=e.TRIANGLES,frustumCulled:n=!0,renderOrder:a=0}={}){super(),e.canvas||console.error("gl not passed as first argument to Mesh"),this.gl=e,this.id=cs++,this.geometry=i,this.program=r,this.mode=s,this.frustumCulled=n,this.renderOrder=a,this.modelViewMatrix=new oe,this.normalMatrix=new it,this.beforeRenderCallbacks=[],this.afterRenderCallbacks=[]}onBeforeRender(e){return this.beforeRenderCallbacks.push(e),this}onAfterRender(e){return this.afterRenderCallbacks.push(e),this}draw({camera:e}={}){e&&(this.program.uniforms.modelMatrix||Object.assign(this.program.uniforms,{modelMatrix:{value:null},viewMatrix:{value:null},modelViewMatrix:{value:null},normalMatrix:{value:null},projectionMatrix:{value:null},cameraPosition:{value:null}}),this.program.uniforms.projectionMatrix.value=e.projectionMatrix,this.program.uniforms.cameraPosition.value=e.worldPosition,this.program.uniforms.viewMatrix.value=e.viewMatrix,this.modelViewMatrix.multiply(e.viewMatrix,this.worldMatrix),this.normalMatrix.getNormalMatrix(this.modelViewMatrix),this.program.uniforms.modelMatrix.value=this.worldMatrix,this.program.uniforms.modelViewMatrix.value=this.modelViewMatrix,this.program.uniforms.normalMatrix.value=this.normalMatrix),this.beforeRenderCallbacks.forEach(r=>r&&r({mesh:this,camera:e}));let i=this.program.cullFace&&this.worldMatrix.determinant()<0;this.program.use({flipFaces:i}),this.geometry.draw({mode:this.mode,program:this.program}),this.afterRenderCallbacks.forEach(r=>r&&r({mesh:this,camera:e}))}};var Sr=new Uint8Array(4);function Cr(t){return(t&t-1)===0}var fs=1,ce=class{constructor(e,{image:i,target:r=e.TEXTURE_2D,type:s=e.UNSIGNED_BYTE,format:n=e.RGBA,internalFormat:a=n,wrapS:l=e.CLAMP_TO_EDGE,wrapT:h=e.CLAMP_TO_EDGE,wrapR:o=e.CLAMP_TO_EDGE,generateMipmaps:f=r===(e.TEXTURE_2D||e.TEXTURE_CUBE_MAP),minFilter:c=f?e.NEAREST_MIPMAP_LINEAR:e.LINEAR,magFilter:u=e.LINEAR,premultiplyAlpha:d=!1,unpackAlignment:p=4,flipY:g=r==(e.TEXTURE_2D||e.TEXTURE_3D),anisotropy:m=0,level:x=0,width:R,height:E=R,length:y=1}={}){this.gl=e,this.id=fs++,this.image=i,this.target=r,this.type=s,this.format=n,this.internalFormat=a,this.minFilter=c,this.magFilter=u,this.wrapS=l,this.wrapT=h,this.wrapR=o,this.generateMipmaps=f,this.premultiplyAlpha=d,this.unpackAlignment=p,this.flipY=g,this.anisotropy=Math.min(m,this.gl.renderer.parameters.maxAnisotropy),this.level=x,this.width=R,this.height=E,this.length=y,this.texture=this.gl.createTexture(),this.store={image:null},this.glState=this.gl.renderer.state,this.state={},this.state.minFilter=this.gl.NEAREST_MIPMAP_LINEAR,this.state.magFilter=this.gl.LINEAR,this.state.wrapS=this.gl.REPEAT,this.state.wrapT=this.gl.REPEAT,this.state.anisotropy=0}bind(){this.glState.textureUnits[this.glState.activeTextureUnit]!==this.id&&(this.gl.bindTexture(this.target,this.texture),this.glState.textureUnits[this.glState.activeTextureUnit]=this.id)}update(e=0){let i=!(this.image===this.store.image&&!this.needsUpdate);if((i||this.glState.textureUnits[e]!==this.id)&&(this.gl.renderer.activeTexture(e),this.bind()),!!i){if(this.needsUpdate=!1,this.flipY!==this.glState.flipY&&(this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL,this.flipY),this.glState.flipY=this.flipY),this.premultiplyAlpha!==this.glState.premultiplyAlpha&&(this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this.premultiplyAlpha),this.glState.premultiplyAlpha=this.premultiplyAlpha),this.unpackAlignment!==this.glState.unpackAlignment&&(this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT,this.unpackAlignment),this.glState.unpackAlignment=this.unpackAlignment),this.minFilter!==this.state.minFilter&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_MIN_FILTER,this.minFilter),this.state.minFilter=this.minFilter),this.magFilter!==this.state.magFilter&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_MAG_FILTER,this.magFilter),this.state.magFilter=this.magFilter),this.wrapS!==this.state.wrapS&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_WRAP_S,this.wrapS),this.state.wrapS=this.wrapS),this.wrapT!==this.state.wrapT&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_WRAP_T,this.wrapT),this.state.wrapT=this.wrapT),this.wrapR!==this.state.wrapR&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_WRAP_R,this.wrapR),this.state.wrapR=this.wrapR),this.anisotropy&&this.anisotropy!==this.state.anisotropy&&(this.gl.texParameterf(this.target,this.gl.renderer.getExtension("EXT_texture_filter_anisotropic").TEXTURE_MAX_ANISOTROPY_EXT,this.anisotropy),this.state.anisotropy=this.anisotropy),this.image){if(this.image.width&&(this.width=this.image.width,this.height=this.image.height),this.target===this.gl.TEXTURE_CUBE_MAP)for(let r=0;r<6;r++)this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X+r,this.level,this.internalFormat,this.format,this.type,this.image[r]);else if(ArrayBuffer.isView(this.image))this.target===this.gl.TEXTURE_2D?this.gl.texImage2D(this.target,this.level,this.internalFormat,this.width,this.height,0,this.format,this.type,this.image):(this.target===this.gl.TEXTURE_2D_ARRAY||this.target===this.gl.TEXTURE_3D)&&this.gl.texImage3D(this.target,this.level,this.internalFormat,this.width,this.height,this.length,0,this.format,this.type,this.image);else if(this.image.isCompressedTexture)for(let r=0;r<this.image.length;r++)this.gl.compressedTexImage2D(this.target,r,this.internalFormat,this.image[r].width,this.image[r].height,0,this.image[r].data);else this.target===this.gl.TEXTURE_2D?this.gl.texImage2D(this.target,this.level,this.internalFormat,this.format,this.type,this.image):this.gl.texImage3D(this.target,this.level,this.internalFormat,this.width,this.height,this.length,0,this.format,this.type,this.image);this.generateMipmaps&&(!this.gl.renderer.isWebgl2&&(!Cr(this.image.width)||!Cr(this.image.height))?(this.generateMipmaps=!1,this.wrapS=this.wrapT=this.gl.CLAMP_TO_EDGE,this.minFilter=this.gl.LINEAR):this.gl.generateMipmap(this.target)),this.onUpdate&&this.onUpdate()}else if(this.target===this.gl.TEXTURE_CUBE_MAP)for(let r=0;r<6;r++)this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X+r,0,this.gl.RGBA,1,1,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,Sr);else this.width?this.target===this.gl.TEXTURE_2D?this.gl.texImage2D(this.target,this.level,this.internalFormat,this.width,this.height,0,this.format,this.type,null):this.gl.texImage3D(this.target,this.level,this.internalFormat,this.width,this.height,this.length,0,this.format,this.type,null):this.gl.texImage2D(this.target,0,this.gl.RGBA,1,1,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,Sr);this.store.image=this.image}}};var De=class{constructor(e,{width:i=e.canvas.width,height:r=e.canvas.height,target:s=e.FRAMEBUFFER,color:n=1,depth:a=!0,stencil:l=!1,depthTexture:h=!1,wrapS:o=e.CLAMP_TO_EDGE,wrapT:f=e.CLAMP_TO_EDGE,wrapR:c=e.CLAMP_TO_EDGE,minFilter:u=e.LINEAR,magFilter:d=u,type:p=e.UNSIGNED_BYTE,format:g=e.RGBA,internalFormat:m=g,unpackAlignment:x,premultiplyAlpha:R}={}){this.gl=e,this.width=i,this.height=r,this.depth=a,this.stencil=l,this.buffer=this.gl.createFramebuffer(),this.target=s,this.gl.renderer.bindFramebuffer(this),this.textures=[];let E=[];for(let y=0;y<n;y++)this.textures.push(new ce(e,{width:i,height:r,wrapS:o,wrapT:f,wrapR:c,minFilter:u,magFilter:d,type:p,format:g,internalFormat:m,unpackAlignment:x,premultiplyAlpha:R,flipY:!1,generateMipmaps:!1})),this.textures[y].update(),this.gl.framebufferTexture2D(this.target,this.gl.COLOR_ATTACHMENT0+y,this.gl.TEXTURE_2D,this.textures[y].texture,0),E.push(this.gl.COLOR_ATTACHMENT0+y);E.length>1&&this.gl.renderer.drawBuffers(E),this.texture=this.textures[0],h&&(this.gl.renderer.isWebgl2||this.gl.renderer.getExtension("WEBGL_depth_texture"))?(this.depthTexture=new ce(e,{width:i,height:r,minFilter:this.gl.NEAREST,magFilter:this.gl.NEAREST,format:this.stencil?this.gl.DEPTH_STENCIL:this.gl.DEPTH_COMPONENT,internalFormat:e.renderer.isWebgl2?this.stencil?this.gl.DEPTH24_STENCIL8:this.gl.DEPTH_COMPONENT16:this.gl.DEPTH_COMPONENT,type:this.stencil?this.gl.UNSIGNED_INT_24_8:this.gl.UNSIGNED_INT}),this.depthTexture.update(),this.gl.framebufferTexture2D(this.target,this.stencil?this.gl.DEPTH_STENCIL_ATTACHMENT:this.gl.DEPTH_ATTACHMENT,this.gl.TEXTURE_2D,this.depthTexture.texture,0)):(a&&!l&&(this.depthBuffer=this.gl.createRenderbuffer(),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.depthBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.DEPTH_COMPONENT16,i,r),this.gl.framebufferRenderbuffer(this.target,this.gl.DEPTH_ATTACHMENT,this.gl.RENDERBUFFER,this.depthBuffer)),l&&!a&&(this.stencilBuffer=this.gl.createRenderbuffer(),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.stencilBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.STENCIL_INDEX8,i,r),this.gl.framebufferRenderbuffer(this.target,this.gl.STENCIL_ATTACHMENT,this.gl.RENDERBUFFER,this.stencilBuffer)),a&&l&&(this.depthStencilBuffer=this.gl.createRenderbuffer(),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.depthStencilBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.DEPTH_STENCIL,i,r),this.gl.framebufferRenderbuffer(this.target,this.gl.DEPTH_STENCIL_ATTACHMENT,this.gl.RENDERBUFFER,this.depthStencilBuffer))),this.gl.renderer.bindFramebuffer({target:this.target})}setSize(e,i){if(!(this.width===e&&this.height===i)){this.width=e,this.height=i,this.gl.renderer.bindFramebuffer(this);for(let r=0;r<this.textures.length;r++)this.textures[r].width=e,this.textures[r].height=i,this.textures[r].needsUpdate=!0,this.textures[r].update(),this.gl.framebufferTexture2D(this.target,this.gl.COLOR_ATTACHMENT0+r,this.gl.TEXTURE_2D,this.textures[r].texture,0);this.depthTexture?(this.depthTexture.width=e,this.depthTexture.height=i,this.depthTexture.needsUpdate=!0,this.depthTexture.update(),this.gl.framebufferTexture2D(this.target,this.gl.DEPTH_ATTACHMENT,this.gl.TEXTURE_2D,this.depthTexture.texture,0)):(this.depthBuffer&&(this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.depthBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.DEPTH_COMPONENT16,e,i)),this.stencilBuffer&&(this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.stencilBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.STENCIL_INDEX8,e,i)),this.depthStencilBuffer&&(this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.depthStencilBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.DEPTH_STENCIL,e,i))),this.gl.renderer.bindFramebuffer({target:this.target})}}};var Ve=class extends be{constructor(e,{attributes:i={}}={}){Object.assign(i,{position:{size:2,data:new Float32Array([-1,-1,3,-1,-1,3])},uv:{size:2,data:new Float32Array([0,0,2,0,0,2])}}),super(e,i)}};var zr={plasma:{color:"#F25BD0",strands:6,crackle:.85,flares:.65,glow:.9,sparks:.6,particleCount:15e3,fill:.5,motion:"rise",particleShape:"square",depth:.6,sway:.5,twinkle:.5,haze:.7,dustSpeed:1},aurora:{color:"#5CFFC8",strands:5,crackle:.6,flares:.5,glow:.8,sparks:.45,particleCount:15e3,fill:.5,motion:"rise",particleShape:"square",depth:.6,sway:.5,twinkle:.5,haze:.7,dustSpeed:1},nebula:{color:"#9478FF",strands:6,crackle:1,flares:.5,glow:.9,sparks:.6,particleCount:18e3,fill:.45,motion:"rise",particleShape:"square",depth:.5,sway:.4,twinkle:.6,haze:.8,dustSpeed:1.2},ember:{color:"#FF8A2A",strands:5,crackle:.9,flares:.8,glow:1,sparks:.8,particleCount:12e3,fill:.35,motion:"rise",particleShape:"round",depth:.7,sway:.3,twinkle:.7,haze:.9,dustSpeed:1.6},frost:{color:"#BFE6FF",strands:3,crackle:.3,flares:.3,glow:.6,sparks:.2,particleCount:16e3,fill:.6,motion:"fall",particleShape:"round",depth:.8,sway:.4,twinkle:.4,haze:.5,dustSpeed:.7},solar:{color:"#FFD36E",strands:6,crackle:.7,flares:1,glow:1.1,sparks:.5,particleCount:15e3,fill:.55,motion:"orbit",particleShape:"square",depth:.6,sway:.7,twinkle:.5,haze:.8,dustSpeed:1},eclipse:{color:"#FFFFFF",strands:4,crackle:.5,flares:.4,glow:.7,sparks:.35,particleCount:14e3,fill:.5,motion:"drift",particleShape:"square",depth:.7,sway:.5,twinkle:.5,haze:.5,dustSpeed:.8},abyss:{color:"#3F7BFF",strands:5,crackle:.55,flares:.6,glow:.9,sparks:.4,particleCount:2e4,fill:.8,motion:"orbit",particleShape:"round",depth:.8,sway:.8,twinkle:.5,haze:.6,dustSpeed:.9}},us={rise:0,fall:1,drift:2,orbit:3},ds={square:0,round:1},Nr=8,It=4,ps=4e4,xe=256,gs=45e5,ms=2.2,xs=7,rt=[1,1,1],Bt=[0,0,0],N=(t,e,i)=>Math.min(Math.max(t,e),i),fe=(t,e,i)=>{let r=N((i-t)/(e-t),0,1);return r*r*(3-2*r)},Dr=t=>1-Math.pow(1-t,3),Le=(t,e,i)=>t.map((r,s)=>r+(e[s]-r)*i),Pr=t=>t-Math.PI*2*Math.floor((t+Math.PI)/(Math.PI*2)),vs=(t,e)=>{try{let i=document.createElement("canvas").getContext("2d");if(!i)return e;i.fillStyle="#000000",i.fillStyle=t;let r=i.fillStyle;if(r.startsWith("#")){let n=parseInt(r.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}let s=r.match(/[\d.]+/g);return!s||s.length<3?e:[Number(s[0])/255,Number(s[1])/255,Number(s[2])/255]}catch{return e}},ys=t=>t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4),Es=t=>t<=.0031308?t*12.92:1.055*Math.pow(t,1/2.4)-.055,Ge=t=>{let[e,i,r]=t.map(ys),s=Math.cbrt(.4122214708*e+.5363325363*i+.0514459929*r),n=Math.cbrt(.2119034982*e+.6806995451*i+.1073969566*r),a=Math.cbrt(.0883024619*e+.2817188376*i+.6299787005*r);return[.2104542553*s+.793617785*n-.0040720468*a,1.9779984951*s-2.428592205*n+.4505937099*a,.0259040371*s+.7827717662*n-.808675766*a]},Ut=([t,e,i])=>{let r=Math.pow(t+.3963377774*e+.2158037573*i,3),s=Math.pow(t-.1055613458*e-.0638541728*i,3),n=Math.pow(t-.0894841775*e-1.291485548*i,3);return[4.0767416621*r-3.3077115913*s+.2309699292*n,-1.2684380046*r+2.6097574011*s-.3413193965*n,-.0041960863*r-.7034186147*s+1.707614701*n].map(a=>N(Es(N(a,0,1)),0,1))},Lr=(t,e,i)=>Ut(Le(Ge(t),Ge(e),i)),Pe=(t,e,i,r)=>{let[s,n,a]=Ge(t),l=Math.hypot(n,a)*r,h=Math.atan2(a,n)+e*Math.PI/180;return Ut([N(s+i,0,1),l*Math.cos(h),l*Math.sin(h)])},ie=(t,e,i,r)=>{let[,s,n]=Ge(t),a=Math.max(Math.hypot(s,n)*r,.02),l=Math.atan2(n,s)+e*Math.PI/180;return Ut([N(i,0,1),a*Math.cos(l),a*Math.sin(l)])},ws=(t,e)=>{if(e){let i=ie(t,0,Math.min(Ge(t)[0],.62),1.15);return{rim:i,rimHot:i,rimMid:i,rimDeep:ie(t,0,.72,.8),spark:ie(t,0,.6,1.2),sparkGlow:ie(t,0,.78,.8),haze:ie(t,0,.8,.6),edge:ie(t,0,.72,.8),tones:[ie(t,0,.56,1.1),ie(t,16,.6,1.05),ie(t,-16,.5,1.1),ie(t,0,.66,.9),ie(t,0,.74,.7)]}}return{rim:t,rimHot:Le(t,rt,.72),rimMid:Le(t,Bt,.15),rimDeep:Le(t,Bt,.45),spark:Le(t,rt,.45),sparkGlow:Pe(t,0,-.15,1),haze:Le(t,Bt,.6),edge:Pe(t,0,-.3,.9),tones:[Pe(t,0,-.06,1),Pe(t,16,-.02,1),Pe(t,-16,-.12,1.05),Pe(Lr(t,rt,.25),0,.04,1),Lr(t,rt,.7)]}},Vt=t=>{let e=t>>>0;return()=>{e=e+1831565813>>>0;let i=e;return i=Math.imul(i^i>>>15,i|1),i^=i+Math.imul(i^i>>>7,i|61),((i^i>>>14)>>>0)/4294967296}},Ms=()=>{let t=Vt(99),e=[[6,12,.6,1.6],[18,34,1.5,3.5],[40,70,3,7],[80,130,6,12]],i={harmonics:[],rates:[],phases:[],flareHarmonics:[],flareRates:[],flarePhases:[]};for(let r=0;r<Nr;r++){e.forEach(([n,a,l,h])=>{i.harmonics.push(Math.round(n+t()*(a-n))),i.rates.push((l+t()*(h-l))*(t()<.5?-1:1)),i.phases.push(t()*Math.PI*2)});for(let n=0;n<3;n++)i.flareHarmonics.push(4+Math.floor(t()*6)),i.flareRates.push((.4+t()*.8)*(t()<.5?-1:1)),i.flarePhases.push(t()*Math.PI*2);let s=r===0;i.flareHarmonics.push(s?.75:.95+t()*.3),i.flareRates.push(s?1.15:.8+t()*.2),i.flarePhases.push(s?1:.7+t()*.25)}return i},Fs=t=>{let e=Vt(1337),i=Math.max(1,Math.ceil(t/xe)),r=new Float32Array(xe*i*4),s=new Float32Array(xe*i*4),n=0,a=0;for(;n<t&&a<t*80;){a++;let l,h,o;if(e()<.28){let c=e()*Math.PI*2,u=.87+Math.sqrt(e())*.105;if(l=Math.cos(c)*u,h=Math.sin(c)*u,e()>fe(-.6,.3,-h))continue;let d=e();o=d<.5?3:d<.8?2:1}else{l=e()*2-1,h=e()*2-1;let c=Math.hypot(l,h);if(c>.975)continue;let u=Math.pow(fe(-.25,.85,-h),1.3),d=fe(.66,.96,c)*fe(-.7,.3,-h),p=Math.max(u,d*.9);if(e()>.012+.988*p)continue;if(p<.12)o=4;else{let g=e();o=g<.32?0:g<.52?1:g<.8?2:3}}let f=Math.sqrt(Math.max(0,.95-l*l-h*h));r[n*4]=l,r[n*4+1]=h,r[n*4+2]=(e()*2-1)*f,r[n*4+3]=o,s[n*4]=o===4?1.8:e()<.22?2.1:1.3,s[n*4+1]=e(),s[n*4+2]=2.5+e()*3.5,s[n*4+3]=.16+e()*.26,n++}return{home:r,seed:s,count:n,rows:i}},Ot=`#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`,Gt=`
uint scramble(uint v) {
  v = v * 747796405u + 2891336453u;
  uint w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  return (w >> 22u) ^ w;
}

float random(uint v) {
  return float(scramble(v)) * (1.0 / 4294967295.0);
}
`,kr=`
uniform float uDustTime;
uniform vec2 uTurn;
uniform float uMotion;
uniform float uFill;

vec3 settle(vec3 p, out float spread) {
  float bend = exp2((0.5 - uFill) * 1.8);
  float h = clamp((p.y + 1.0) * 0.5, 0.0, 1.0);
  float y = 2.0 * pow(h, bend) - 1.0;
  float from = sqrt(max(1.0 - p.y * p.y, 1e-4));
  float to = sqrt(max(1.0 - y * y, 0.0));
  spread = clamp(bend * pow(max(h, 1e-3), bend - 1.0) * to / from, 0.25, 1.0);
  return vec3(p.xz * (to / from), y).xzy;
}

vec3 drift(vec4 home, vec4 seed, uint id, out float life, out float spread) {
  vec3 p = settle(home.xyz, spread);
  float t = uDustTime;
  float u = fract(t / seed.z + seed.y);
  life = sin(3.14159265 * u);
  float travel = seed.w;
  if (uMotion < 0.5) {
    p.y += travel * (u - 0.5);
  } else if (uMotion < 1.5) {
    p.y -= travel * (u - 0.5);
  } else if (uMotion < 2.5) {
    p += 0.045 * vec3(
      sin(t * 0.37 + seed.y * 17.0) + 0.5 * sin(t * 0.83 + seed.z * 5.0),
      sin(t * 0.29 + seed.z * 11.0) + 0.5 * sin(t * 0.61 + seed.w * 7.0),
      sin(t * 0.33 + seed.w * 23.0)
    );
  } else {
    float loop = t * (0.6 + 0.9 * random(id * 7u + 3u)) * (random(id * 7u + 10u) < 0.5 ? -1.0 : 1.0) + seed.y * 6.2831853;
    p.xy += (0.025 + 0.05 * random(id * 7u + 16u)) * vec2(cos(loop), sin(loop));
  }
  float wobble = 0.002 + 0.006 * random(id * 7u + 1u);
  float w1 = 0.8 + 2.4 * random(id * 7u + 2u);
  float w2 = 0.8 + 2.4 * random(id * 7u + 4u);
  p += wobble * vec3(sin(t * w1 + seed.y * 40.0), cos(t * w2 + seed.z * 30.0), sin(t * (w1 + w2) * 0.5 + seed.w * 20.0));
  float cy = cos(uTurn.x);
  float sy = sin(uTurn.x);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  float cx = cos(uTurn.y);
  float sx = sin(uTurn.y);
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  return p;
}
`,Ts=`#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform float uRadius;
uniform float uDpr;
uniform float uLine;
uniform float uTime;
uniform float uFrame;
uniform float uBins;
uniform float uStrands;
uniform float uCrackle;
uniform float uFlares;
uniform float uGlow;
uniform float uHaze;
uniform float uFill;
uniform float uPresence;
uniform float uUnfold;
uniform float uBloom;
uniform float uInside;
uniform float uEncode;
uniform vec3 uRim;
uniform vec3 uRimHot;
uniform vec3 uRimMid;
uniform vec3 uRimDeep;
uniform vec3 uSpark;
uniform vec3 uSparkGlow;
uniform vec3 uHazeColor;
uniform vec3 uEdgeColor;
uniform vec4 uHeat;
uniform vec4 uHarmonics[8];
uniform vec4 uRates[8];
uniform vec4 uPhases[8];
uniform vec4 uFlareHarmonics[8];
uniform vec4 uFlareRates[8];
uniform vec4 uFlarePhases[8];
uniform vec4 uArcs[4];

out vec4 fragColor;
${Gt}
const float PI = 3.14159265;
const float TAU = 6.28318531;
const vec4 AMPS = vec4(0.35, 0.3, 0.22, 0.13);

float bell(float d, float w) {
  float x = d / w;
  return exp(-x * x);
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}

float pool(vec2 q) {
  float t = length(q - vec2(0.0, mix(-1.0, -0.66, uFill))) / mix(0.8, 1.35, uFill);
  return t < 0.6 ? mix(0.5, 0.22, t / 0.6) : mix(0.22, 0.0, clamp((t - 0.6) / 0.4, 0.0, 1.0));
}

void main() {
  vec2 p = gl_FragCoord.xy / uDpr - uCenter;
  float r = length(p);
  float R = uRadius;
  float theta = atan(p.y, p.x);
  float lift = p.y / max(r, 1e-3);
  float topDim = 1.0 - 0.35 * pow(max(lift, 0.0), 1.5);
  vec3 col = vec3(0.0);
  float hot = 0.0;
  uint frame = uint(uFrame);

  if (r < R) {
    vec2 q = p / R;
    float chord = sqrt(max(1.0 - dot(q, q), 0.0));
    float haze = pool(q) * (0.55 + 0.45 * chord);
    col += uHazeColor * haze * uHaze * uInside;
    float e = length(q - vec2(0.0, 0.2)) / 1.2;
    float edge = 0.5 * pow(smoothstep(0.62, 1.0, e), 1.4);
    col += uEdgeColor * edge * uInside * (0.5 + 0.5 * uHaze);
  }

  float dr = r - R;
  float halo = 1.0 - smoothstep(R * 0.05, R * 0.105, abs(dr - R * 0.0213));
  col += uRimDeep * 0.18 * halo * topDim * uGlow * uBloom;
  col += uRim * 0.12 * bell(dr + R * 0.0383, R * 0.032) * uGlow * uBloom;
  col += uRim * 0.32 * bell(dr, max(R * 0.0117, uLine)) * uPresence * uUnfold;

  float delta = mod(theta - uHeat.x + PI, TAU) - PI;
  float heat = uHeat.z * uHeat.y * exp(-delta * delta / 0.3);
  float crackle = uCrackle + heat * 0.9;
  float amp = R * 0.016 * (0.3 + 1.4 * crackle) * uUnfold;
  float jitterAmp = R * 0.0048 * (0.3 + 1.4 * uCrackle) * uUnfold * (1.0 + heat * 0.3);
  float flareAmp = R * 0.064 * (0.4 + 1.2 * crackle) * uFlares * 1.6 * uUnfold;

  if (abs(dr) < amp * 2.0 + flareAmp + R * 0.3) {
    float step = TAU / uBins;
    float binPos = (theta + PI) / step;
    float bin0 = floor(binPos);
    float binF = binPos - bin0;
    float th0 = bin0 * step - PI;
    float th1 = th0 + step;
    uint b0 = uint(mod(bin0, uBins));
    uint b1 = uint(mod(bin0 + 1.0, uBins));
    float gain = min(1.0, 2.4 / max(uStrands, 1.0));
    for (int k = 0; k < 8; k++) {
      if (float(k) >= uStrands) break;
      vec4 m = uHarmonics[k];
      vec4 lead = uRates[k] * uTime + uPhases[k];
      float wave0 = dot(AMPS, sin(m * th0 + lead));
      float wave1 = dot(AMPS, sin(m * th1 + lead));
      uint salt = uint(k) * 1013u + frame * 7919u;
      vec4 shape = uFlareHarmonics[k];
      vec4 look = uFlareRates[k];
      vec4 tone = uFlarePhases[k];
      float a = amp * shape.w;
      float off0 = a * wave0 + jitterAmp * (random(b0 + salt) - 0.5);
      float off1 = a * wave1 + jitterAmp * (random(b1 + salt) - 0.5);
      float rc = R + mix(off0, off1, binF);
      float grade = (off1 - off0) / (step * max(r, 1.0));
      float d = abs(r - rc) * inversesqrt(1.0 + grade * grade);
      float swell = 0.8 + 0.4 * (0.5 + 0.5 * sin(3.0 * theta + uTime * 0.7 + tone.x * 1.7));
      float width = uLine * look.w * swell * (1.0 + heat * 0.25);
      float core = exp(-d * d / (width * width));
      float sheath = exp(-d * d / (width * width * 3.0));
      float bright = tone.w * (1.0 + heat * 0.45) * uPresence;
      col += (uRimHot * core * 0.8 + uRim * sheath * 0.32) * bright;
      hot += core * bright;
      vec3 fargs = shape.xyz * theta + look.xyz * uTime + tone.xyz;
      float flare = max(0.0, (sin(fargs.x) + sin(fargs.y) + sin(fargs.z)) / 3.0);
      flare = (flare * flare + heat * 0.35) * flareAmp;
      float dw = abs(r - rc - flare);
      float dm = abs(r - rc - flare * 0.6);
      float dn = abs(r - rc - flare * 0.25);
      vec3 glow = uRimDeep * (0.07 * bell(dw, R * 0.09) + 0.16 * bell(dw, R * 0.05));
      glow += uRimMid * 0.28 * bell(dm, R * 0.027) + uRim * 0.38 * bell(dn, R * 0.013);
      col += glow * gain * topDim * uGlow * uBloom * (1.0 + heat * 1.4);
    }
  }

  for (int i = 0; i < 4; i++) {
    vec4 arc = uArcs[i];
    if (arc.w <= 0.002) continue;
    float mid = arc.x + arc.y * 0.5;
    vec2 center = R * 0.93 * vec2(cos(mid), sin(mid));
    if (distance(p, center) > R * (abs(arc.y) * 0.6 + 0.1) + 12.0) continue;
    float ar = R * 0.955;
    vec2 a0 = ar * vec2(cos(arc.x), sin(arc.x));
    vec2 a2 = ar * vec2(cos(arc.x + arc.y), sin(arc.x + arc.y));
    vec2 a1 = R * (0.955 - arc.z) * vec2(cos(mid), sin(mid));
    float dmin = 1e5;
    float along = 0.0;
    vec2 prev = a0;
    for (int s = 1; s <= 10; s++) {
      float u = float(s) / 10.0;
      vec2 b = mix(mix(a0, a1, u), mix(a1, a2, u), u);
      vec2 pa = p - prev;
      vec2 ba = b - prev;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
      float dist = length(pa - ba * h);
      if (dist < dmin) {
        dmin = dist;
        along = (float(s) - 1.0 + h) / 10.0;
      }
      prev = b;
    }
    float taper = sqrt(max(sin(PI * along), 0.0));
    float arcWidth = uLine * (0.55 + 0.6 * taper);
    float arcCore = exp(-dmin * dmin / (arcWidth * arcWidth));
    float arcGlow = exp(-dmin * dmin / (arcWidth * arcWidth * 12.0));
    col += (uSpark * 0.95 * arcCore + uSparkGlow * 0.4 * arcGlow) * arc.w * taper;
    hot += arcCore * arc.w * taper * 0.6;
  }

  fragColor = vec4(col, hot) * uEncode;
}
`,_s=`#version 300 es
precision highp float;

in float aIndex;

uniform sampler2D tHome;
uniform sampler2D tSeed;
uniform sampler2D tOffset;
uniform float uStirred;
uniform vec2 uCenter;
uniform vec2 uViewport;
uniform float uRadius;
uniform float uDpr;
uniform float uDepth;
uniform float uTwinkle;
uniform float uPointScale;
uniform float uReveal;
uniform float uEncode;
uniform vec3 uTones[5];
uniform vec3 uRimTone;

out vec3 vColor;
out float vSize;
${Gt}
${kr}
void main() {
  ivec2 cell = ivec2(int(mod(aIndex, ${xe}.0)), int(floor(aIndex / ${xe}.0)));
  uint id = uint(aIndex);
  vec4 home = texelFetch(tHome, cell, 0);
  vec4 seed = texelFetch(tSeed, cell, 0);
  float life;
  float spread;
  vec3 p = drift(home, seed, id, life, spread);
  if (uStirred > 0.5) p += texelFetch(tOffset, cell, 0).xyz;
  float len = length(p);
  float inside = 1.0 - smoothstep(0.955, 0.985, length(p.xy));
  if (len > 0.975) p *= 0.975 / len;

  float front = p.z * 0.5 + 0.5;
  float depthSize = mix(1.0, 0.7 + 0.6 * front, uDepth);
  float depthLight = mix(1.0, 0.35 + 0.8 * front, uDepth);
  float blink = sin(uDustTime * (2.0 + 6.0 * random(id * 7u + 5u)) + random(id * 7u + 6u) * 6.2831853);
  float twinkle = mix(1.0, smoothstep(-0.9, -0.6, blink), uTwinkle);
  float fade = smoothstep(0.04, 0.12, life);
  float order = (home.y + 1.0) * 0.5 * 0.55 + random(id * 7u + 8u) * 0.25;
  float reveal = smoothstep(order, order + 0.2, uReveal * 1.0);
  float alpha = random(id * 7u + 9u) < 0.5 || home.w > 3.5 ? 1.0 : 0.6;

  float size = seed.x * uPointScale * (0.35 + 0.95 * life) * depthSize * mix(0.5, 1.0, reveal);
  vec2 screen = uCenter + p.xy * uRadius;
  gl_Position = vec4(screen / uViewport * 2.0 - 1.0, 0.0, 1.0);
  float px = size * uDpr;
  gl_PointSize = px + 2.0;
  vSize = px;

  int tone = int(home.w + 0.5);
  float rimLit = smoothstep(0.8, 0.97, length(p.xy));
  vec3 color = uTones[tone] + uRimTone * rimLit * rimLit * 0.12;
  vColor = color * alpha * fade * twinkle * depthLight * reveal * inside * sqrt(spread) * uEncode;
}
`,Rs=`#version 300 es
precision highp float;

uniform float uShape;

in vec3 vColor;
in float vSize;

out vec4 fragColor;

void main() {
  vec2 q = (gl_PointCoord - 0.5) * (vSize + 2.0);
  float half_ = max(vSize * 0.5, 0.5);
  float cover;
  if (uShape < 0.5) {
    vec2 c = clamp(half_ - abs(q) + 0.5, 0.0, 1.0);
    cover = c.x * c.y;
  } else {
    cover = clamp(half_ - length(q) + 0.5, 0.0, 1.0);
  }
  if (cover <= 0.0) discard;
  fragColor = vec4(vColor * cover, 0.0);
}
`,bs=`#version 300 es
precision highp float;

uniform sampler2D tHome;
uniform sampler2D tSeed;
uniform sampler2D tOffset;
uniform sampler2D tVelocity;
uniform float uDt;
uniform float uReset;
uniform vec4 uBrush;
uniform float uBrushPower;
uniform vec4 uKick;

layout(location = 0) out vec4 outOffset;
layout(location = 1) out vec4 outVelocity;
${Gt}
${kr}
vec3 swirl(vec3 p) {
  float t = uDustTime * 0.15;
  vec3 a = vec3(1.7, 1.9, 1.5) * p.yzx + vec3(t, 1.2, 2.1);
  vec3 b = vec3(2.3, 2.1, 2.7) * p.zxy + vec3(0.4, t * 1.3, 0.9);
  vec3 ca = cos(a) * vec3(1.7, 1.9, 1.5);
  vec3 cb = cos(b) * vec3(2.3, 2.1, 2.7);
  return vec3(ca.z - cb.x, cb.y - ca.x, ca.y - cb.z);
}

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  if (uReset > 0.5) {
    outOffset = vec4(0.0);
    outVelocity = vec4(0.0);
    return;
  }
  uint id = uint(cell.y * ${xe} + cell.x);
  vec4 home = texelFetch(tHome, cell, 0);
  vec4 seed = texelFetch(tSeed, cell, 0);
  vec3 o = texelFetch(tOffset, cell, 0).xyz;
  vec3 v = texelFetch(tVelocity, cell, 0).xyz;
  float life;
  float spread;
  vec3 base = drift(home, seed, id, life, spread);
  vec3 p = base + o;

  float k = mix(0.8, 2.2, random(id * 7u + 11u));
  vec3 acc = -k * o - 1.5 * sqrt(k) * v;

  vec2 gap = p.xy - uBrush.xy;
  float touch = exp(-dot(gap, gap) / 0.07) * uBrushPower;
  acc += (vec3(uBrush.zw, 0.0) - v) * touch * 14.0;
  float pace = length(v);
  if (pace > 1e-4) {
    vec3 heading = v / pace;
    vec3 curl = swirl(p * 1.6);
    acc += (curl - heading * dot(curl, heading)) * min(pace, 2.0) * 1.8;
  }

  if (uKick.z > 0.0) {
    vec3 jolt = vec3(random(id * 7u + 12u), random(id * 7u + 13u), random(id * 7u + 14u)) - 0.5;
    float near = exp(-dot(p.xy - uKick.xy, p.xy - uKick.xy) / 0.4);
    vec3 spinKick = vec3(-p.z, 0.0, p.x) * 0.9;
    vec3 lift = vec3(0.0, 0.5 + 0.8 * random(id * 7u + 15u), 0.0) * (0.3 + 0.7 * smoothstep(0.2, -0.8, p.y));
    v += (jolt * 0.8 + spinKick + lift) * uKick.z * (0.4 + 0.45 * near);
  }

  v += acc * uDt;
  o += v * uDt;
  vec3 q = base + o;
  float len = length(q);
  if (len > 0.97) {
    vec3 n = q / len;
    o -= n * (len - 0.97);
    v -= n * max(dot(v, n), 0.0) * 1.5;
  }
  outOffset = vec4(o, 1.0);
  outVelocity = vec4(v, 1.0);
}
`,As=`#version 300 es
precision highp float;

uniform sampler2D tScene;
uniform float uLight;
uniform float uDecode;

in vec2 vUv;
out vec4 fragColor;

vec3 soften(vec3 x) {
  vec3 over = max(x - 0.6, 0.0);
  return min(x, 0.6) + 0.4 * (1.0 - exp(-over / 0.4));
}

void main() {
  vec4 scene = texture(tScene, vUv) * uDecode;
  vec3 light = max(scene.rgb, 0.0);
  float peak = max(light.r, max(light.g, light.b));
  if (uLight > 0.5) {
    vec3 hue = light / max(peak, 1e-4);
    float cover = 1.0 - exp(-peak * 2.4);
    vec3 ink = hue * mix(0.92, 0.72, cover);
    float core = clamp(scene.a * 0.7, 0.0, 1.0) * cover;
    vec3 tint = mix(vec3(1.0), hue, 0.22);
    fragColor = vec4(tint * core + ink * cover * (1.0 - core), core + cover * (1.0 - core));
    return;
  }
  light += vec3(max(peak - 1.8, 0.0) * 0.25);
  vec3 shown = soften(light);
  fragColor = vec4(shown, max(shown.r, max(shown.g, shown.b)));
}
`,Ss=({preset:t="plasma",color:e,theme:i="dark",size:r=.7,strands:s,crackle:n,flares:a,glow:l,sparks:h,particleCount:o,fill:f,motion:c,particleShape:u,depth:d,sway:p,twinkle:g,haze:m,speed:x=1,dustSpeed:R,interactive:E=!0,hoverStrength:y=.7,intro:F=!0,paused:M=!1,className:P="",style:V})=>{let O=Oe(null),L=Oe(null),k=Oe(null),I=zr[t]||zr.plasma,b=(X,Q)=>X??I[Q],T=b(e,"color"),ve=Et(()=>{let X=i==="light";return{light:X,palette:ws(vs(T,[.95,.36,.82]),X)}},[T,i]);return je(()=>{L.current={...ve,size:r,strands:b(s,"strands"),crackle:b(n,"crackle"),flares:b(a,"flares"),glow:b(l,"glow"),sparks:b(h,"sparks"),particleCount:b(o,"particleCount"),fill:b(f,"fill"),motion:b(c,"motion"),particleShape:b(u,"particleShape"),depth:b(d,"depth"),sway:b(p,"sway"),twinkle:b(g,"twinkle"),haze:b(m,"haze"),dustSpeed:b(R,"dustSpeed"),speed:x,interactive:E,hoverStrength:y,intro:F,paused:M},k.current?.()}),je(()=>{let X=O.current;if(!X)return;let Q=new Ue({alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1}),w=Q.gl;if(!Q.isWebgl2){w.getExtension("WEBGL_lose_context")?.loseContext();return}let ue=w.canvas;ue.style.display="block",ue.style.width="100%",ue.style.height="100%",ue.setAttribute("aria-hidden","true"),X.appendChild(ue);let st=!!w.getExtension("EXT_color_buffer_float"),qe=st||!!w.getExtension("EXT_color_buffer_half_float"),nt=qe?1:.25,at=new Ve(w),de=new ce(w),Ae=Ms(),Ne=new De(w,{width:1,height:1,depth:!1,type:qe?w.HALF_FLOAT:w.UNSIGNED_BYTE,format:w.RGBA,internalFormat:qe?w.RGBA16F:w.RGBA,minFilter:w.NEAREST,magFilter:w.NEAREST}),ke=new Array(It*4).fill(0),A={uCenter:{value:[0,0]},uRadius:{value:1},uDpr:{value:1},uLine:{value:.6},uTime:{value:0},uFrame:{value:0},uBins:{value:420},uStrands:{value:5},uCrackle:{value:.6},uFlares:{value:.5},uGlow:{value:.8},uHaze:{value:.7},uFill:{value:.5},uPresence:{value:0},uUnfold:{value:0},uBloom:{value:0},uInside:{value:0},uEncode:{value:nt},uRim:{value:[1,1,1]},uRimHot:{value:[1,1,1]},uRimMid:{value:[1,1,1]},uRimDeep:{value:[1,1,1]},uSpark:{value:[1,1,1]},uSparkGlow:{value:[1,1,1]},uHazeColor:{value:[0,0,0]},uEdgeColor:{value:[0,0,0]},uHeat:{value:[0,0,0,0]},uHarmonics:{value:Ae.harmonics},uRates:{value:Ae.rates},uPhases:{value:Ae.phases},uFlareHarmonics:{value:Ae.flareHarmonics},uFlareRates:{value:Ae.flareRates},uFlarePhases:{value:Ae.flarePhases},uArcs:{value:ke}},ye={uDustTime:{value:0},uTurn:{value:[0,0]},uMotion:{value:0},uFill:A.uFill,tHome:{value:de},tSeed:{value:de}},$={...ye,tOffset:{value:de},uStirred:{value:0},uCenter:A.uCenter,uViewport:{value:[1,1]},uRadius:A.uRadius,uDpr:A.uDpr,uDepth:{value:.6},uTwinkle:{value:.5},uPointScale:{value:1},uReveal:{value:0},uEncode:{value:nt},uTones:{value:new Array(15).fill(1)},uRimTone:{value:[1,1,1]},uShape:{value:0}},J={...ye,tOffset:{value:de},tVelocity:{value:de},uDt:{value:.016},uReset:{value:1},uBrush:{value:[0,0,0,0]},uBrushPower:{value:0},uKick:{value:[0,0,0,0]}},qt={tScene:{value:Ne.texture},uLight:{value:0},uDecode:{value:1/nt}},Ht=S=>(S.setBlendFunc(w.ONE,w.ONE),S),Br=new me(w,{geometry:at,program:Ht(new ge(w,{vertex:Ot,fragment:Ts,uniforms:A,transparent:!0,depthTest:!1,depthWrite:!1}))}),Or=Ht(new ge(w,{vertex:_s,fragment:Rs,uniforms:$,transparent:!0,depthTest:!1,depthWrite:!1})),pe=qe?new me(w,{geometry:at,program:new ge(w,{vertex:Ot,fragment:bs,uniforms:J,depthTest:!1,depthWrite:!1})}):null,Ur=new me(w,{geometry:at,program:new ge(w,{vertex:Ot,fragment:As,uniforms:qt,depthTest:!1,depthWrite:!1})}),lt=S=>{S&&(w.deleteFramebuffer(S.buffer),S.textures.forEach(v=>w.deleteTexture(v.texture)))},Xt=S=>new De(w,{width:xe,height:S,color:2,depth:!1,type:st?w.FLOAT:w.HALF_FLOAT,format:w.RGBA,internalFormat:st?w.RGBA32F:w.RGBA16F,minFilter:w.NEAREST,magFilter:w.NEAREST}),Wt=(S,v)=>new ce(w,{image:S,width:xe,height:v,type:w.FLOAT,format:w.RGBA,internalFormat:w.RGBA32F,minFilter:w.NEAREST,magFilter:w.NEAREST,generateMipmaps:!1,flipY:!1}),B=null,Yt=()=>{B&&(B.mesh.geometry.remove(),w.deleteTexture(B.home.texture),w.deleteTexture(B.seed.texture),lt(B.read),lt(B.write),B=null)},Qt=()=>{!pe||!B||!B.read||!B.write||(J.tOffset.value=de,J.tVelocity.value=de,J.uReset.value=1,Q.render({scene:pe,target:B.read,clear:!1}),Q.render({scene:pe,target:B.write,clear:!1}),J.uReset.value=0)},Vr=S=>{let v=N(Math.round(S/100)*100,0,ps);if(B&&B.requested===v)return;if(Yt(),!v){B=null;return}let _=Fs(v),K=new Float32Array(_.count);for(let se=0;se<_.count;se++)K[se]=se;let Z=new be(w,{aIndex:{size:1,data:K}});B={requested:v,rows:_.rows,home:Wt(_.home,_.rows),seed:Wt(_.seed,_.rows),mesh:new me(w,{mode:w.POINTS,geometry:Z,program:Or}),read:pe?Xt(_.rows):null,write:pe?Xt(_.rows):null},ye.tHome.value=B.home,ye.tSeed.value=B.seed,Qt(),Ee=0},He=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,j=Vt(913),ae=1,le=1,Ie=0,ht=performance.now(),ot=0,jt=0,ct=0,he=0,Xe=!0,ft=!0,re=0,Ee=0,ut=0,we=null,dt=.3,Me=[],G={x:0,y:0,inside:!1,fresh:!0},D={angle:0,velocity:0,power:0,near:0},U={x:0,y:0,vx:0,vy:0},q={x:0,y:0,vx:0,vy:0},pt=!1,Gr=()=>{ae=Math.max(1,X.clientWidth),le=Math.max(1,X.clientHeight),Q.dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(gs/(ae*le))),Q.setSize(ae,le),Ne.setSize(w.canvas.width,w.canvas.height)},Kt=()=>{pt=!0,Fe()},gt=(S,v)=>{Me.length>=It||Me.push({start:S,span:(.05+j()*.07)*(j()<.5?-1:1),curl:.02+j()*.04,life:0,duration:.2+j()*.2,drift:(j()-.5)*.3,strength:v})},Zt=S=>{if(Ie=0,pt&&(pt=!1,Gr()),!ft)return;let v=L.current,_=Math.min(.05,Math.max(1/240,(S-ht)/1e3));if(ht=S,!v)return;let K=!v.paused&&!He;he=v.intro&&!He?Math.min(1,he+_/ms):1;let Z=Dr(fe(0,.42,he)),se=Dr(fe(0,.32,he)),mt=Math.sin(Math.PI*fe(.22,.78,he))*.35,ee=Math.max(8,N(v.size,.1,1.5)*Math.min(ae,le)/2),Se=v.interactive&&!He?N(v.hoverStrength,0,1):0,Ye=G.x-ae/2,Qe=le/2-G.y,qr=Math.hypot(Ye,Qe),xt=G.inside?Se:0;D.power<.02&&(D.angle=Math.atan2(Qe,Ye),D.velocity=0);let Hr=Pr(Math.atan2(Qe,Ye)-D.angle);D.velocity+=(120*Hr-19*D.velocity)*_,D.angle=Pr(D.angle+D.velocity*_),D.power+=(xt-D.power)*(1-Math.exp(-_/(xt>D.power?.3:.55)));let Xr=Math.exp(-Math.pow((qr-ee)/(ee*.45),2));D.near+=(Xr-D.near)*(1-Math.exp(-_/.15)),re*=Math.exp(-_/.7);let Ce=Ye/ee,ze=Qe/ee;Math.hypot(Ce-U.x,ze-U.y)>.6&&(G.fresh=!0),G.fresh&&(U.x=Ce,U.y=ze,U.vx=0,U.vy=0,G.fresh=!1);let ai=1-Math.exp(-_/.05);U.vx+=((Ce-U.x)/_-U.vx)*ai,U.vy+=((ze-U.y)/_-U.vy)*ai,U.x=Ce,U.y=ze;let vt=Math.hypot(U.vx,U.vy),li=vt>4?4/vt:1,Wr=Math.exp(-Math.max(0,Math.hypot(Ce,ze)-1)*6),hi=G.inside?Se*Wr*Z:0;if(ut=ut*Math.exp(-_/1.2)+hi*Math.min(vt,4)*_,K){let te=1+re*.6+D.power*D.near*.3,H=_*Math.max(0,v.speed)*2*te;ot+=H,jt+=_*Math.max(0,v.dustSpeed)*(1+re*.4),ct+=_*Math.max(0,v.dustSpeed);let Qr=N(v.crackle+re*.5,0,1.5);if(v.sparks>.01&&he>.55&&(dt-=H*v.sparks*2*(.6+Qr*.6),dt<=0)){let Te=D.power*D.near,_e=j()<Te*.7?D.angle+(j()-.5)*.8:j()<.7?Math.PI/2+(j()-.5)*1.5:j()*Math.PI*2;gt(_e,.8+Te*.6+re*.4),dt=.15+j()*.6}for(let Te=Me.length-1;Te>=0;Te--){let _e=Me[Te];_e.life+=H,_e.start+=_e.drift*H,_e.life>=_e.duration&&Me.splice(Te,1)}}else Me.length=0;for(let te=0;te<It;te++){let H=Me[te];ke[te*4]=H?H.start:0,ke[te*4+1]=H?H.span:0,ke[te*4+2]=H?H.curl:0,ke[te*4+3]=H?Math.sin(Math.PI*H.life/H.duration)*H.strength:0}Vr(v.particleCount);let ne=v.palette;A.uCenter.value=[ae/2,le/2],A.uRadius.value=ee,A.uDpr.value=Q.dpr,A.uLine.value=Math.max(.6,ee*.0035),A.uTime.value=ot,A.uFrame.value=Math.floor(ot*24)%1e5,A.uBins.value=N(Math.round(Math.PI*2*ee/2.6),240,900),A.uStrands.value=Math.round(N(v.strands,1,Nr)),A.uCrackle.value=N(v.crackle,0,1)+re*.5+mt,A.uFlares.value=N(v.flares,0,1),A.uGlow.value=N(v.glow,0,2)*(1+re*.5+mt)*(v.light?.35:1),A.uHaze.value=N(v.haze,0,2)*(v.light?.6:1),A.uFill.value=N(v.fill,0,1),A.uPresence.value=Z,A.uUnfold.value=se,A.uBloom.value=Z*Z,A.uInside.value=fe(.2,.95,he),A.uRim.value=ne.rim,A.uRimHot.value=ne.rimHot,A.uRimMid.value=ne.rimMid,A.uRimDeep.value=ne.rimDeep,A.uSpark.value=ne.spark,A.uSparkGlow.value=ne.sparkGlow,A.uHazeColor.value=ne.haze,A.uEdgeColor.value=ne.edge,A.uHeat.value=[D.angle,D.near,D.power*Z,0],ye.uDustTime.value=jt;let oi=G.inside?Se*Z:0,ci=N(Ce,-1.6,1.6)*oi,fi=N(ze,-1.6,1.6)*oi;q.vx+=(40*(ci-q.x)-11*q.vx)*_,q.vy+=(40*(fi-q.y)-11*q.vy)*_,q.x+=q.vx*_,q.y+=q.vy*_;let ui=N(v.sway,0,1);ye.uTurn.value=[ui*.42*Math.sin(ct*.23)+q.x*.3,ui*.12*Math.sin(ct*.17+1.3)-q.y*.16],ye.uMotion.value=us[v.motion]??0,$.uViewport.value=[ae,le],$.uDepth.value=N(v.depth,0,1),$.uTwinkle.value=N(v.twinkle,0,1),$.uPointScale.value=Math.max(1,ee/491),$.uReveal.value=fe(.18,1,he),$.uTones.value=ne.tones.flat(),$.uRimTone.value=ne.rim,$.uShape.value=ds[v.particleShape]??0;let W=B;W&&pe&&(ut>.002||we)&&(Ee=xs);let yt=!1;if(W&&W.read&&W.write&&pe&&Ee>0){J.uDt.value=Math.min(_,1/30),J.uBrush.value=[U.x,U.y,U.vx*li,U.vy*li],J.uBrushPower.value=hi,J.uKick.value=we?[we.x,we.y,we.strength,0]:[0,0,0,0],J.tOffset.value=W.read.textures[0],J.tVelocity.value=W.read.textures[1],Q.render({scene:pe,target:W.write,clear:!1});let te=W.read;W.read=W.write,W.write=te,Ee-=_,yt=Ee>0,yt||(Ee=0,Qt())}we=null,$.uStirred.value=yt?1:0,$.tOffset.value=W&&W.read?W.read.textures[0]:de,w.clearColor(0,0,0,0),Q.render({scene:Br,target:Ne,clear:!0}),B&&Q.render({scene:B.mesh,target:Ne,clear:!1}),qt.uLight.value=v.light?1:0,Q.render({scene:Ur,clear:!1});let Yr=Math.abs(xt-D.power)>.002||re>.002||Ee>0||Math.abs(D.velocity)>.01||Math.hypot(q.vx,q.vy,q.x-ci,q.y-fi)>.001;Xe&&(K||he<1||Yr)&&(Ie=requestAnimationFrame(Zt))},Fe=()=>{Ie||!Xe||!ft||(ht=performance.now(),Ie=requestAnimationFrame(Zt))},$t=S=>{let v=X.getBoundingClientRect(),_=S.clientX-v.left,K=S.clientY-v.top;return{x:_,y:K,inside:_>=0&&K>=0&&_<=v.width&&K<=v.height}},Jt=S=>{let v=$t(S);v.inside&&!G.inside&&(G.fresh=!0),G.x=v.x,G.y=v.y,G.inside=v.inside,v.inside&&Fe()},ei=S=>{let v=L.current,_=$t(S);if(!v||!v.interactive||He||!_.inside)return;G.inside||(G.fresh=!0),G.x=_.x,G.y=_.y,G.inside=!0;let K=Math.max(8,N(v.size,.1,1.5)*Math.min(ae,le)/2),Z=(_.x-ae/2)/K,se=(le/2-_.y)/K;if(Math.hypot(Z,se)>1.3)return;let ee=N(v.hoverStrength,0,1);we={x:Z,y:se,strength:ee*1.2},re=Math.max(re,ee);let Se=Math.atan2(se,Z);gt(Se+(j()-.5)*.5,1.3),gt(Se+Math.PI+(j()-.5)*1.2,1.1),Fe()},We=()=>{G.inside=!1,Fe()},ti=S=>{S.relatedTarget||We()},ii=S=>{S.pointerType==="touch"&&We()},ri=()=>{document.hidden||Fe()};window.addEventListener("pointermove",Jt,{passive:!0}),window.addEventListener("pointerdown",ei,{passive:!0}),window.addEventListener("pointerout",ti,{passive:!0}),window.addEventListener("pointerup",ii,{passive:!0}),window.addEventListener("blur",We),document.addEventListener("visibilitychange",ri);let si=new ResizeObserver(Kt);si.observe(X);let ni=new IntersectionObserver(([S])=>{Xe=S.isIntersecting,Fe()});return ni.observe(X),k.current=Fe,Kt(),()=>{ft=!1,Xe=!1,cancelAnimationFrame(Ie),si.disconnect(),ni.disconnect(),window.removeEventListener("pointermove",Jt),window.removeEventListener("pointerdown",ei),window.removeEventListener("pointerout",ti),window.removeEventListener("pointerup",ii),window.removeEventListener("blur",We),document.removeEventListener("visibilitychange",ri),k.current=null,Yt(),lt(Ne),w.getExtension("WEBGL_lose_context")?.loseContext(),ue.parentNode&&ue.parentNode.removeChild(ue)}},[]),z("div",{ref:O,className:`crystalized-ball ${P}`.trim(),style:V})},Ir=Ss;gi("crystalized-ball",Ir);})();
