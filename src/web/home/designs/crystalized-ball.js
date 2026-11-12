/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var Be=null,C=Symbol("Fragment");function ji(t,e,r){if(e==="ref"){typeof r=="function"?r(t):r&&(r.current=t);return}if(!(e==="children"||r==null||r===!1)){if(e==="className"){t.setAttribute("class",r);return}if(e==="style"){for(let i in r){let s=r[i];s==null||s===!1||(i.startsWith("--")?t.style.setProperty(i,String(s)):t.style[i]=typeof s=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(i)?s+"px":s)}return}if(/^on[A-Z]/.test(e)&&typeof r=="function"){t.addEventListener(e.slice(2).toLowerCase(),r);return}if(e==="htmlFor"){t.setAttribute("for",r);return}t.setAttribute(e,r===!0?"":String(r))}}function dr(t,e){for(let r of e)r==null||r===!1||r===!0||(Array.isArray(r)?dr(t,r):r instanceof Node?t.appendChild(r):t.appendChild(document.createTextNode(String(r))))}function z(t,e,...r){if(typeof t=="function")return t({...e,children:r});let i=t===C?document.createDocumentFragment():document.createElement(t);if(t!==C)for(let s in e||{})ji(i,s,e[s]);return dr(i,r),i}var pr=(t,e)=>t&&e&&t.length===e.length&&t.every((r,i)=>Object.is(r,e[i]));function Oe(t){let e=Be,r=e.i++;return e.hooks[r]||(e.hooks[r]={current:t})}function Et(t,e){let r=Be,i=r.i++,s=r.hooks[i];return s&&pr(s.deps,e)?s.value:(r.hooks[i]={deps:e,value:t()}).value}function je(t,e){let r=Be,i=r.i++;r.effects.push([i,t,e])}function Zi(t,e,r){let i={hooks:[],effects:[],i:0,cleanups:[],props:e,dead:!1,queued:!1,tree:null},s=()=>{let o=i.effects;i.effects=[];for(let[f,u,d]of o){let p=i.cleanups[f];if(p&&d&&pr(p.deps,d))continue;if(p&&p.fn)try{p.fn()}catch{}let g;try{g=u()}catch{g=null}i.cleanups[f]={deps:d,fn:typeof g=="function"?g:null}}},n=o=>{Be=i,i.i=0,i.effects=[];let f;try{f=t(i.props)}finally{Be=null}o&&(i.tree=f,f instanceof Node&&r.appendChild(f)),s()};i.queue=()=>{i.queued||i.dead||(i.queued=!0,Promise.resolve().then(()=>{i.queued=!1,i.dead||n(!1)}))},n(!0);let a=i.tree instanceof Node?i.tree:r,l=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],h=o=>{if(i.dead||o.__hubFwd||o.target instanceof Element&&o.target.closest("input,textarea,select"))return;let f;try{f=new o.constructor(o.type,o)}catch{return}f.__hubFwd=!0,a.dispatchEvent(f)},c=l.filter(()=>matchMedia("(pointer: fine)").matches);return c.forEach(o=>window.addEventListener(o,h,{passive:!0})),{update(o){i.props={...i.props,...o},n(!1)},destroy(){i.dead=!0,c.forEach(o=>window.removeEventListener(o,h));for(let o of i.cleanups)if(o&&o.fn)try{o.fn()}catch{}i.cleanups=[],i.tree instanceof Node&&i.tree.parentNode&&i.tree.parentNode.removeChild(i.tree)},root:a}}function gr(t,e){(window.HubDesigns=window.HubDesigns||{})[t]={start:(r,i)=>Zi(e,i||{},r)}}function Re(t){let e=t[0],r=t[1],i=t[2];return Math.sqrt(e*e+r*r+i*i)}function Ze(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t}function mr(t,e,r,i){return t[0]=e,t[1]=r,t[2]=i,t}function wt(t,e,r){return t[0]=e[0]+r[0],t[1]=e[1]+r[1],t[2]=e[2]+r[2],t}function Mt(t,e,r){return t[0]=e[0]-r[0],t[1]=e[1]-r[1],t[2]=e[2]-r[2],t}function xr(t,e,r){return t[0]=e[0]*r[0],t[1]=e[1]*r[1],t[2]=e[2]*r[2],t}function vr(t,e,r){return t[0]=e[0]/r[0],t[1]=e[1]/r[1],t[2]=e[2]/r[2],t}function Ke(t,e,r){return t[0]=e[0]*r,t[1]=e[1]*r,t[2]=e[2]*r,t}function yr(t,e){let r=e[0]-t[0],i=e[1]-t[1],s=e[2]-t[2];return Math.sqrt(r*r+i*i+s*s)}function Er(t,e){let r=e[0]-t[0],i=e[1]-t[1],s=e[2]-t[2];return r*r+i*i+s*s}function Ft(t){let e=t[0],r=t[1],i=t[2];return e*e+r*r+i*i}function wr(t,e){return t[0]=-e[0],t[1]=-e[1],t[2]=-e[2],t}function Mr(t,e){return t[0]=1/e[0],t[1]=1/e[1],t[2]=1/e[2],t}function $e(t,e){let r=e[0],i=e[1],s=e[2],n=r*r+i*i+s*s;return n>0&&(n=1/Math.sqrt(n)),t[0]=e[0]*n,t[1]=e[1]*n,t[2]=e[2]*n,t}function Tt(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]}function _t(t,e,r){let i=e[0],s=e[1],n=e[2],a=r[0],l=r[1],h=r[2];return t[0]=s*h-n*l,t[1]=n*a-i*h,t[2]=i*l-s*a,t}function Fr(t,e,r,i){let s=e[0],n=e[1],a=e[2];return t[0]=s+i*(r[0]-s),t[1]=n+i*(r[1]-n),t[2]=a+i*(r[2]-a),t}function Tr(t,e,r,i,s){let n=Math.exp(-i*s),a=e[0],l=e[1],h=e[2];return t[0]=r[0]+(a-r[0])*n,t[1]=r[1]+(l-r[1])*n,t[2]=r[2]+(h-r[2])*n,t}function _r(t,e,r){let i=e[0],s=e[1],n=e[2],a=r[3]*i+r[7]*s+r[11]*n+r[15];return a=a||1,t[0]=(r[0]*i+r[4]*s+r[8]*n+r[12])/a,t[1]=(r[1]*i+r[5]*s+r[9]*n+r[13])/a,t[2]=(r[2]*i+r[6]*s+r[10]*n+r[14])/a,t}function Rr(t,e,r){let i=e[0],s=e[1],n=e[2],a=r[3]*i+r[7]*s+r[11]*n+r[15];return a=a||1,t[0]=(r[0]*i+r[4]*s+r[8]*n)/a,t[1]=(r[1]*i+r[5]*s+r[9]*n)/a,t[2]=(r[2]*i+r[6]*s+r[10]*n)/a,t}function br(t,e,r){let i=e[0],s=e[1],n=e[2];return t[0]=i*r[0]+s*r[3]+n*r[6],t[1]=i*r[1]+s*r[4]+n*r[7],t[2]=i*r[2]+s*r[5]+n*r[8],t}function Ar(t,e,r){let i=e[0],s=e[1],n=e[2],a=r[0],l=r[1],h=r[2],c=r[3],o=l*n-h*s,f=h*i-a*n,u=a*s-l*i,d=l*u-h*f,p=h*o-a*u,g=a*f-l*o,m=c*2;return o*=m,f*=m,u*=m,d*=2,p*=2,g*=2,t[0]=i+o+d,t[1]=s+f+p,t[2]=n+u+g,t}var Sr=(function(){let t=[0,0,0],e=[0,0,0];return function(r,i){Ze(t,r),Ze(e,i),$e(t,t),$e(e,e);let s=Tt(t,e);return s>1?0:s<-1?Math.PI:Math.acos(s)}})();function Cr(t,e){return t[0]===e[0]&&t[1]===e[1]&&t[2]===e[2]}var Y=class t extends Array{constructor(e=0,r=e,i=e){return super(e,r,i),this}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}set x(e){this[0]=e}set y(e){this[1]=e}set z(e){this[2]=e}set(e,r=e,i=e){return e.length?this.copy(e):(mr(this,e,r,i),this)}copy(e){return Ze(this,e),this}add(e,r){return r?wt(this,e,r):wt(this,this,e),this}sub(e,r){return r?Mt(this,e,r):Mt(this,this,e),this}multiply(e){return e.length?xr(this,this,e):Ke(this,this,e),this}divide(e){return e.length?vr(this,this,e):Ke(this,this,1/e),this}inverse(e=this){return Mr(this,e),this}len(){return Re(this)}distance(e){return e?yr(this,e):Re(this)}squaredLen(){return Ft(this)}squaredDistance(e){return e?Er(this,e):Ft(this)}negate(e=this){return wr(this,e),this}cross(e,r){return r?_t(this,e,r):_t(this,this,e),this}scale(e){return Ke(this,this,e),this}normalize(){return $e(this,this),this}dot(e){return Tt(this,e)}equals(e){return Cr(this,e)}applyMatrix3(e){return br(this,this,e),this}applyMatrix4(e){return _r(this,this,e),this}scaleRotateMatrix4(e){return Rr(this,this,e),this}applyQuaternion(e){return Ar(this,this,e),this}angle(e){return Sr(this,e)}lerp(e,r){return Fr(this,this,e,r),this}smoothLerp(e,r,i){return Tr(this,this,e,r,i),this}clone(){return new t(this[0],this[1],this[2])}fromArray(e,r=0){return this[0]=e[r],this[1]=e[r+1],this[2]=e[r+2],this}toArray(e=[],r=0){return e[r]=this[0],e[r+1]=this[1],e[r+2]=this[2],e}transformDirection(e){let r=this[0],i=this[1],s=this[2];return this[0]=e[0]*r+e[4]*i+e[8]*s,this[1]=e[1]*r+e[5]*i+e[9]*s,this[2]=e[2]*r+e[6]*i+e[10]*s,this.normalize()}};var Dr=new Y,$i=1,Ki=1,Pr=!1,be=class{constructor(e,r={}){e.canvas||console.error("gl not passed as first argument to Geometry"),this.gl=e,this.attributes=r,this.id=$i++,this.VAOs={},this.drawRange={start:0,count:0},this.instancedCount=0,this.gl.renderer.bindVertexArray(null),this.gl.renderer.currentGeometry=null,this.glState=this.gl.renderer.state;for(let i in r)this.addAttribute(i,r[i])}addAttribute(e,r){if(this.attributes[e]=r,r.id=Ki++,r.size=r.size||1,r.type=r.type||(r.data.constructor===Float32Array?this.gl.FLOAT:r.data.constructor===Uint16Array?this.gl.UNSIGNED_SHORT:this.gl.UNSIGNED_INT),r.target=e==="index"?this.gl.ELEMENT_ARRAY_BUFFER:this.gl.ARRAY_BUFFER,r.normalized=r.normalized||!1,r.stride=r.stride||0,r.offset=r.offset||0,r.count=r.count||(r.stride?r.data.byteLength/r.stride:r.data.length/r.size),r.divisor=r.instanced||0,r.needsUpdate=!1,r.usage=r.usage||this.gl.STATIC_DRAW,r.buffer||this.updateAttribute(r),r.divisor){if(this.isInstanced=!0,this.instancedCount&&this.instancedCount!==r.count*r.divisor)return console.warn("geometry has multiple instanced buffers of different length"),this.instancedCount=Math.min(this.instancedCount,r.count*r.divisor);this.instancedCount=r.count*r.divisor}else e==="index"?this.drawRange.count=r.count:this.attributes.index||(this.drawRange.count=Math.max(this.drawRange.count,r.count))}updateAttribute(e){let r=!e.buffer;r&&(e.buffer=this.gl.createBuffer()),this.glState.boundBuffer!==e.buffer&&(this.gl.bindBuffer(e.target,e.buffer),this.glState.boundBuffer=e.buffer),r?this.gl.bufferData(e.target,e.data,e.usage):this.gl.bufferSubData(e.target,0,e.data),e.needsUpdate=!1}setIndex(e){this.addAttribute("index",e)}setDrawRange(e,r){this.drawRange.start=e,this.drawRange.count=r}setInstancedCount(e){this.instancedCount=e}createVAO(e){this.VAOs[e.attributeOrder]=this.gl.renderer.createVertexArray(),this.gl.renderer.bindVertexArray(this.VAOs[e.attributeOrder]),this.bindAttributes(e)}bindAttributes(e){e.attributeLocations.forEach((r,{name:i,type:s})=>{if(!this.attributes[i]){console.warn(`active attribute ${i} not being supplied`);return}let n=this.attributes[i];this.gl.bindBuffer(n.target,n.buffer),this.glState.boundBuffer=n.buffer;let a=1;s===35674&&(a=2),s===35675&&(a=3),s===35676&&(a=4);let l=n.size/a,h=a===1?0:a*a*4,c=a===1?0:a*4;for(let o=0;o<a;o++)this.gl.vertexAttribPointer(r+o,l,n.type,n.normalized,n.stride+h,n.offset+o*c),this.gl.enableVertexAttribArray(r+o),this.gl.renderer.vertexAttribDivisor(r+o,n.divisor)}),this.attributes.index&&this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.attributes.index.buffer)}draw({program:e,mode:r=this.gl.TRIANGLES}){this.gl.renderer.currentGeometry!==`${this.id}_${e.attributeOrder}`&&(this.VAOs[e.attributeOrder]||this.createVAO(e),this.gl.renderer.bindVertexArray(this.VAOs[e.attributeOrder]),this.gl.renderer.currentGeometry=`${this.id}_${e.attributeOrder}`),e.attributeLocations.forEach((s,{name:n})=>{let a=this.attributes[n];a.needsUpdate&&this.updateAttribute(a)});let i=2;this.attributes.index?.type===this.gl.UNSIGNED_INT&&(i=4),this.isInstanced?this.attributes.index?this.gl.renderer.drawElementsInstanced(r,this.drawRange.count,this.attributes.index.type,this.attributes.index.offset+this.drawRange.start*i,this.instancedCount):this.gl.renderer.drawArraysInstanced(r,this.drawRange.start,this.drawRange.count,this.instancedCount):this.attributes.index?this.gl.drawElements(r,this.drawRange.count,this.attributes.index.type,this.attributes.index.offset+this.drawRange.start*i):this.gl.drawArrays(r,this.drawRange.start,this.drawRange.count)}getPosition(){let e=this.attributes.position;if(e.data)return e;if(!Pr)return console.warn("No position buffer data found to compute bounds"),Pr=!0}computeBoundingBox(e){e||(e=this.getPosition());let r=e.data,i=e.size;this.bounds||(this.bounds={min:new Y,max:new Y,center:new Y,scale:new Y,radius:1/0});let s=this.bounds.min,n=this.bounds.max,a=this.bounds.center,l=this.bounds.scale;s.set(1/0),n.set(-1/0);for(let h=0,c=r.length;h<c;h+=i){let o=r[h],f=r[h+1],u=r[h+2];s.x=Math.min(o,s.x),s.y=Math.min(f,s.y),s.z=Math.min(u,s.z),n.x=Math.max(o,n.x),n.y=Math.max(f,n.y),n.z=Math.max(u,n.z)}l.sub(n,s),a.add(s,n).divide(2)}computeBoundingSphere(e){e||(e=this.getPosition());let r=e.data,i=e.size;this.bounds||this.computeBoundingBox(e);let s=0;for(let n=0,a=r.length;n<a;n+=i)Dr.fromArray(r,n),s=Math.max(s,this.bounds.center.squaredDistance(Dr));this.bounds.radius=Math.sqrt(s)}remove(){for(let e in this.VAOs)this.gl.renderer.deleteVertexArray(this.VAOs[e]),delete this.VAOs[e];for(let e in this.attributes)this.gl.deleteBuffer(this.attributes[e].buffer),delete this.attributes[e]}};var Ji=1,Lr={},ge=class{constructor(e,{vertex:r,fragment:i,uniforms:s={},transparent:n=!1,cullFace:a=e.BACK,frontFace:l=e.CCW,depthTest:h=!0,depthWrite:c=!0,depthFunc:o=e.LEQUAL}={}){e.canvas||console.error("gl not passed as first argument to Program"),this.gl=e,this.uniforms=s,this.id=Ji++,r||console.warn("vertex shader not supplied"),i||console.warn("fragment shader not supplied"),this.transparent=n,this.cullFace=a,this.frontFace=l,this.depthTest=h,this.depthWrite=c,this.depthFunc=o,this.blendFunc={},this.blendEquation={},this.stencilFunc={},this.stencilOp={},this.transparent&&!this.blendFunc.src&&(this.gl.renderer.premultipliedAlpha?this.setBlendFunc(this.gl.ONE,this.gl.ONE_MINUS_SRC_ALPHA):this.setBlendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA)),this.vertexShader=e.createShader(e.VERTEX_SHADER),this.fragmentShader=e.createShader(e.FRAGMENT_SHADER),this.program=e.createProgram(),e.attachShader(this.program,this.vertexShader),e.attachShader(this.program,this.fragmentShader),this.setShaders({vertex:r,fragment:i})}setShaders({vertex:e,fragment:r}){if(e&&(this.gl.shaderSource(this.vertexShader,e),this.gl.compileShader(this.vertexShader),this.gl.getShaderInfoLog(this.vertexShader)!==""&&console.warn(`${this.gl.getShaderInfoLog(this.vertexShader)}
Vertex Shader
${Nr(e)}`)),r&&(this.gl.shaderSource(this.fragmentShader,r),this.gl.compileShader(this.fragmentShader),this.gl.getShaderInfoLog(this.fragmentShader)!==""&&console.warn(`${this.gl.getShaderInfoLog(this.fragmentShader)}
Fragment Shader
${Nr(r)}`)),this.gl.linkProgram(this.program),!this.gl.getProgramParameter(this.program,this.gl.LINK_STATUS))return console.warn(this.gl.getProgramInfoLog(this.program));this.uniformLocations=new Map;let i=this.gl.getProgramParameter(this.program,this.gl.ACTIVE_UNIFORMS);for(let a=0;a<i;a++){let l=this.gl.getActiveUniform(this.program,a);this.uniformLocations.set(l,this.gl.getUniformLocation(this.program,l.name));let h=l.name.match(/(\w+)/g);l.uniformName=h[0],l.nameComponents=h.slice(1)}this.attributeLocations=new Map;let s=[],n=this.gl.getProgramParameter(this.program,this.gl.ACTIVE_ATTRIBUTES);for(let a=0;a<n;a++){let l=this.gl.getActiveAttrib(this.program,a),h=this.gl.getAttribLocation(this.program,l.name);h!==-1&&(s[h]=l.name,this.attributeLocations.set(l,h))}this.attributeOrder=s.join("")}setBlendFunc(e,r,i,s){this.blendFunc.src=e,this.blendFunc.dst=r,this.blendFunc.srcAlpha=i,this.blendFunc.dstAlpha=s,e&&(this.transparent=!0)}setBlendEquation(e,r){this.blendEquation.modeRGB=e,this.blendEquation.modeAlpha=r}setStencilFunc(e,r,i){this.stencilRef=r,this.stencilFunc.func=e,this.stencilFunc.ref=r,this.stencilFunc.mask=i}setStencilOp(e,r,i){this.stencilOp.stencilFail=e,this.stencilOp.depthFail=r,this.stencilOp.depthPass=i}applyState(){this.depthTest?this.gl.renderer.enable(this.gl.DEPTH_TEST):this.gl.renderer.disable(this.gl.DEPTH_TEST),this.cullFace?this.gl.renderer.enable(this.gl.CULL_FACE):this.gl.renderer.disable(this.gl.CULL_FACE),this.blendFunc.src?this.gl.renderer.enable(this.gl.BLEND):this.gl.renderer.disable(this.gl.BLEND),this.cullFace&&this.gl.renderer.setCullFace(this.cullFace),this.gl.renderer.setFrontFace(this.frontFace),this.gl.renderer.setDepthMask(this.depthWrite),this.gl.renderer.setDepthFunc(this.depthFunc),this.blendFunc.src&&this.gl.renderer.setBlendFunc(this.blendFunc.src,this.blendFunc.dst,this.blendFunc.srcAlpha,this.blendFunc.dstAlpha),this.gl.renderer.setBlendEquation(this.blendEquation.modeRGB,this.blendEquation.modeAlpha),this.stencilFunc.func||this.stencilOp.stencilFail?this.gl.renderer.enable(this.gl.STENCIL_TEST):this.gl.renderer.disable(this.gl.STENCIL_TEST),this.gl.renderer.setStencilFunc(this.stencilFunc.func,this.stencilFunc.ref,this.stencilFunc.mask),this.gl.renderer.setStencilOp(this.stencilOp.stencilFail,this.stencilOp.depthFail,this.stencilOp.depthPass)}use({flipFaces:e=!1}={}){let r=-1;this.gl.renderer.state.currentProgram===this.id||(this.gl.useProgram(this.program),this.gl.renderer.state.currentProgram=this.id),this.uniformLocations.forEach((s,n)=>{let a=this.uniforms[n.uniformName];for(let l of n.nameComponents){if(!a)break;if(l in a)a=a[l];else{if(Array.isArray(a.value))break;a=void 0;break}}if(!a)return kr(`Active uniform ${n.name} has not been supplied`);if(a&&a.value===void 0)return kr(`${n.name} uniform is missing a value parameter`);if(a.value.texture)return r=r+1,a.value.update(r),Rt(this.gl,n.type,s,r);if(a.value.length&&a.value[0].texture){let l=[];return a.value.forEach(h=>{r=r+1,h.update(r),l.push(r)}),Rt(this.gl,n.type,s,l)}Rt(this.gl,n.type,s,a.value)}),this.applyState(),e&&this.gl.renderer.setFrontFace(this.frontFace===this.gl.CCW?this.gl.CW:this.gl.CCW)}remove(){this.gl.deleteProgram(this.program)}};function Rt(t,e,r,i){i=i.length?es(i):i;let s=t.renderer.state.uniformLocations.get(r);if(i.length)if(s===void 0||s.length!==i.length)t.renderer.state.uniformLocations.set(r,i.slice(0));else{if(ts(s,i))return;s.set?s.set(i):rs(s,i),t.renderer.state.uniformLocations.set(r,s)}else{if(s===i)return;t.renderer.state.uniformLocations.set(r,i)}switch(e){case 5126:return i.length?t.uniform1fv(r,i):t.uniform1f(r,i);case 35664:return t.uniform2fv(r,i);case 35665:return t.uniform3fv(r,i);case 35666:return t.uniform4fv(r,i);case 35670:case 5124:case 35678:case 36306:case 35680:case 36289:return i.length?t.uniform1iv(r,i):t.uniform1i(r,i);case 35671:case 35667:return t.uniform2iv(r,i);case 35672:case 35668:return t.uniform3iv(r,i);case 35673:case 35669:return t.uniform4iv(r,i);case 35674:return t.uniformMatrix2fv(r,!1,i);case 35675:return t.uniformMatrix3fv(r,!1,i);case 35676:return t.uniformMatrix4fv(r,!1,i)}}function Nr(t){let e=t.split(`
`);for(let r=0;r<e.length;r++)e[r]=r+1+": "+e[r];return e.join(`
`)}function es(t){let e=t.length,r=t[0].length;if(r===void 0)return t;let i=e*r,s=Lr[i];s||(Lr[i]=s=new Float32Array(i));for(let n=0;n<e;n++)s.set(t[n],n*r);return s}function ts(t,e){if(t.length!==e.length)return!1;for(let r=0,i=t.length;r<i;r++)if(t[r]!==e[r])return!1;return!0}function rs(t,e){for(let r=0,i=t.length;r<i;r++)t[r]=e[r]}var bt=0;function kr(t){bt>100||(console.warn(t),bt++,bt>100&&console.warn("More than 100 program warnings - stopping logs."))}var At=new Y,is=1,Ue=class{constructor({canvas:e=document.createElement("canvas"),width:r=300,height:i=150,dpr:s=1,alpha:n=!1,depth:a=!0,stencil:l=!1,antialias:h=!1,premultipliedAlpha:c=!1,preserveDrawingBuffer:o=!1,powerPreference:f="default",autoClear:u=!0,webgl:d=2}={}){let p={alpha:n,depth:a,stencil:l,antialias:h,premultipliedAlpha:c,preserveDrawingBuffer:o,powerPreference:f};this.dpr=s,this.alpha=n,this.color=!0,this.depth=a,this.stencil=l,this.premultipliedAlpha=c,this.autoClear=u,this.id=is++,d===2&&(this.gl=e.getContext("webgl2",p)),this.isWebgl2=!!this.gl,this.gl||(this.gl=e.getContext("webgl",p)),this.gl||console.error("unable to create webgl context"),this.gl.renderer=this,this.setSize(r,i),this.state={},this.state.blendFunc={src:this.gl.ONE,dst:this.gl.ZERO},this.state.blendEquation={modeRGB:this.gl.FUNC_ADD},this.state.cullFace=!1,this.state.frontFace=this.gl.CCW,this.state.depthMask=!0,this.state.depthFunc=this.gl.LEQUAL,this.state.premultiplyAlpha=!1,this.state.flipY=!1,this.state.unpackAlignment=4,this.state.framebuffer=null,this.state.viewport={x:0,y:0,width:null,height:null},this.state.textureUnits=[],this.state.activeTextureUnit=0,this.state.boundBuffer=null,this.state.uniformLocations=new Map,this.state.currentProgram=null,this.extensions={},this.isWebgl2?(this.getExtension("EXT_color_buffer_float"),this.getExtension("OES_texture_float_linear")):(this.getExtension("OES_texture_float"),this.getExtension("OES_texture_float_linear"),this.getExtension("OES_texture_half_float"),this.getExtension("OES_texture_half_float_linear"),this.getExtension("OES_element_index_uint"),this.getExtension("OES_standard_derivatives"),this.getExtension("EXT_sRGB"),this.getExtension("WEBGL_depth_texture"),this.getExtension("WEBGL_draw_buffers")),this.getExtension("WEBGL_compressed_texture_astc"),this.getExtension("EXT_texture_compression_bptc"),this.getExtension("WEBGL_compressed_texture_s3tc"),this.getExtension("WEBGL_compressed_texture_etc1"),this.getExtension("WEBGL_compressed_texture_pvrtc"),this.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc"),this.vertexAttribDivisor=this.getExtension("ANGLE_instanced_arrays","vertexAttribDivisor","vertexAttribDivisorANGLE"),this.drawArraysInstanced=this.getExtension("ANGLE_instanced_arrays","drawArraysInstanced","drawArraysInstancedANGLE"),this.drawElementsInstanced=this.getExtension("ANGLE_instanced_arrays","drawElementsInstanced","drawElementsInstancedANGLE"),this.createVertexArray=this.getExtension("OES_vertex_array_object","createVertexArray","createVertexArrayOES"),this.bindVertexArray=this.getExtension("OES_vertex_array_object","bindVertexArray","bindVertexArrayOES"),this.deleteVertexArray=this.getExtension("OES_vertex_array_object","deleteVertexArray","deleteVertexArrayOES"),this.drawBuffers=this.getExtension("WEBGL_draw_buffers","drawBuffers","drawBuffersWEBGL"),this.parameters={},this.parameters.maxTextureUnits=this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),this.parameters.maxAnisotropy=this.getExtension("EXT_texture_filter_anisotropic")?this.gl.getParameter(this.getExtension("EXT_texture_filter_anisotropic").MAX_TEXTURE_MAX_ANISOTROPY_EXT):0}setSize(e,r){this.width=e,this.height=r,this.gl.canvas.width=e*this.dpr,this.gl.canvas.height=r*this.dpr,this.gl.canvas.style&&Object.assign(this.gl.canvas.style,{width:e+"px",height:r+"px"})}setViewport(e,r,i=0,s=0){this.state.viewport.width===e&&this.state.viewport.height===r||(this.state.viewport.width=e,this.state.viewport.height=r,this.state.viewport.x=i,this.state.viewport.y=s,this.gl.viewport(i,s,e,r))}setScissor(e,r,i=0,s=0){this.gl.scissor(i,s,e,r)}enable(e){this.state[e]!==!0&&(this.gl.enable(e),this.state[e]=!0)}disable(e){this.state[e]!==!1&&(this.gl.disable(e),this.state[e]=!1)}setBlendFunc(e,r,i,s){this.state.blendFunc.src===e&&this.state.blendFunc.dst===r&&this.state.blendFunc.srcAlpha===i&&this.state.blendFunc.dstAlpha===s||(this.state.blendFunc.src=e,this.state.blendFunc.dst=r,this.state.blendFunc.srcAlpha=i,this.state.blendFunc.dstAlpha=s,i!==void 0?this.gl.blendFuncSeparate(e,r,i,s):this.gl.blendFunc(e,r))}setBlendEquation(e,r){e=e||this.gl.FUNC_ADD,!(this.state.blendEquation.modeRGB===e&&this.state.blendEquation.modeAlpha===r)&&(this.state.blendEquation.modeRGB=e,this.state.blendEquation.modeAlpha=r,r!==void 0?this.gl.blendEquationSeparate(e,r):this.gl.blendEquation(e))}setCullFace(e){this.state.cullFace!==e&&(this.state.cullFace=e,this.gl.cullFace(e))}setFrontFace(e){this.state.frontFace!==e&&(this.state.frontFace=e,this.gl.frontFace(e))}setDepthMask(e){this.state.depthMask!==e&&(this.state.depthMask=e,this.gl.depthMask(e))}setDepthFunc(e){this.state.depthFunc!==e&&(this.state.depthFunc=e,this.gl.depthFunc(e))}setStencilMask(e){this.state.stencilMask!==e&&(this.state.stencilMask=e,this.gl.stencilMask(e))}setStencilFunc(e,r,i){this.state.stencilFunc===e&&this.state.stencilRef===r&&this.state.stencilFuncMask===i||(this.state.stencilFunc=e||this.gl.ALWAYS,this.state.stencilRef=r||0,this.state.stencilFuncMask=i||0,this.gl.stencilFunc(e||this.gl.ALWAYS,r||0,i||0))}setStencilOp(e,r,i){this.state.stencilFail===e&&this.state.stencilDepthFail===r&&this.state.stencilDepthPass===i||(this.state.stencilFail=e,this.state.stencilDepthFail=r,this.state.stencilDepthPass=i,this.gl.stencilOp(e,r,i))}activeTexture(e){this.state.activeTextureUnit!==e&&(this.state.activeTextureUnit=e,this.gl.activeTexture(this.gl.TEXTURE0+e))}bindFramebuffer({target:e=this.gl.FRAMEBUFFER,buffer:r=null}={}){this.state.framebuffer!==r&&(this.state.framebuffer=r,this.gl.bindFramebuffer(e,r))}getExtension(e,r,i){return r&&this.gl[r]?this.gl[r].bind(this.gl):(this.extensions[e]||(this.extensions[e]=this.gl.getExtension(e)),r?this.extensions[e]?this.extensions[e][i].bind(this.extensions[e]):null:this.extensions[e])}sortOpaque(e,r){return e.renderOrder!==r.renderOrder?e.renderOrder-r.renderOrder:e.program.id!==r.program.id?e.program.id-r.program.id:e.zDepth!==r.zDepth?e.zDepth-r.zDepth:r.id-e.id}sortTransparent(e,r){return e.renderOrder!==r.renderOrder?e.renderOrder-r.renderOrder:e.zDepth!==r.zDepth?r.zDepth-e.zDepth:r.id-e.id}sortUI(e,r){return e.renderOrder!==r.renderOrder?e.renderOrder-r.renderOrder:e.program.id!==r.program.id?e.program.id-r.program.id:r.id-e.id}getRenderList({scene:e,camera:r,frustumCull:i,sort:s}){let n=[];if(r&&i&&r.updateFrustum(),e.traverse(a=>{if(!a.visible)return!0;a.draw&&(i&&a.frustumCulled&&r&&!r.frustumIntersectsMesh(a)||n.push(a))}),s){let a=[],l=[],h=[];n.forEach(c=>{c.program.transparent?c.program.depthTest?l.push(c):h.push(c):a.push(c),c.zDepth=0,!(c.renderOrder!==0||!c.program.depthTest||!r)&&(c.worldMatrix.getTranslation(At),At.applyMatrix4(r.projectionViewMatrix),c.zDepth=At.z)}),a.sort(this.sortOpaque),l.sort(this.sortTransparent),h.sort(this.sortUI),n=a.concat(l,h)}return n}render({scene:e,camera:r,target:i=null,update:s=!0,sort:n=!0,frustumCull:a=!0,clear:l}){i===null?(this.bindFramebuffer(),this.setViewport(this.width*this.dpr,this.height*this.dpr)):(this.bindFramebuffer(i),this.setViewport(i.width,i.height)),(l||this.autoClear&&l!==!1)&&(this.depth&&(!i||i.depth)&&(this.enable(this.gl.DEPTH_TEST),this.setDepthMask(!0)),(this.stencil||!i||i.stencil)&&(this.enable(this.gl.STENCIL_TEST),this.setStencilMask(255)),this.gl.clear((this.color?this.gl.COLOR_BUFFER_BIT:0)|(this.depth?this.gl.DEPTH_BUFFER_BIT:0)|(this.stencil?this.gl.STENCIL_BUFFER_BIT:0))),s&&e.updateMatrixWorld(),r&&r.updateMatrixWorld(),this.getRenderList({scene:e,camera:r,frustumCull:a,sort:n}).forEach(c=>{c.draw({camera:r})})}};function Ir(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t}function Br(t,e,r,i,s){return t[0]=e,t[1]=r,t[2]=i,t[3]=s,t}function Or(t,e){let r=e[0],i=e[1],s=e[2],n=e[3],a=r*r+i*i+s*s+n*n;return a>0&&(a=1/Math.sqrt(a)),t[0]=r*a,t[1]=i*a,t[2]=s*a,t[3]=n*a,t}function Ur(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]+t[3]*e[3]}function Vr(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t}function Gr(t,e,r){r=r*.5;let i=Math.sin(r);return t[0]=i*e[0],t[1]=i*e[1],t[2]=i*e[2],t[3]=Math.cos(r),t}function St(t,e,r){let i=e[0],s=e[1],n=e[2],a=e[3],l=r[0],h=r[1],c=r[2],o=r[3];return t[0]=i*o+a*l+s*c-n*h,t[1]=s*o+a*h+n*l-i*c,t[2]=n*o+a*c+i*h-s*l,t[3]=a*o-i*l-s*h-n*c,t}function qr(t,e,r){r*=.5;let i=e[0],s=e[1],n=e[2],a=e[3],l=Math.sin(r),h=Math.cos(r);return t[0]=i*h+a*l,t[1]=s*h+n*l,t[2]=n*h-s*l,t[3]=a*h-i*l,t}function Hr(t,e,r){r*=.5;let i=e[0],s=e[1],n=e[2],a=e[3],l=Math.sin(r),h=Math.cos(r);return t[0]=i*h-n*l,t[1]=s*h+a*l,t[2]=n*h+i*l,t[3]=a*h-s*l,t}function Xr(t,e,r){r*=.5;let i=e[0],s=e[1],n=e[2],a=e[3],l=Math.sin(r),h=Math.cos(r);return t[0]=i*h+s*l,t[1]=s*h-i*l,t[2]=n*h+a*l,t[3]=a*h-n*l,t}function Wr(t,e,r,i){let s=e[0],n=e[1],a=e[2],l=e[3],h=r[0],c=r[1],o=r[2],f=r[3],u,d,p,g,m;return d=s*h+n*c+a*o+l*f,d<0&&(d=-d,h=-h,c=-c,o=-o,f=-f),1-d>1e-6?(u=Math.acos(d),p=Math.sin(u),g=Math.sin((1-i)*u)/p,m=Math.sin(i*u)/p):(g=1-i,m=i),t[0]=g*s+m*h,t[1]=g*n+m*c,t[2]=g*a+m*o,t[3]=g*l+m*f,t}function Yr(t,e){let r=e[0],i=e[1],s=e[2],n=e[3],a=r*r+i*i+s*s+n*n,l=a?1/a:0;return t[0]=-r*l,t[1]=-i*l,t[2]=-s*l,t[3]=n*l,t}function Qr(t,e){return t[0]=-e[0],t[1]=-e[1],t[2]=-e[2],t[3]=e[3],t}function jr(t,e){let r=e[0]+e[4]+e[8],i;if(r>0)i=Math.sqrt(r+1),t[3]=.5*i,i=.5/i,t[0]=(e[5]-e[7])*i,t[1]=(e[6]-e[2])*i,t[2]=(e[1]-e[3])*i;else{let s=0;e[4]>e[0]&&(s=1),e[8]>e[s*3+s]&&(s=2);let n=(s+1)%3,a=(s+2)%3;i=Math.sqrt(e[s*3+s]-e[n*3+n]-e[a*3+a]+1),t[s]=.5*i,i=.5/i,t[3]=(e[n*3+a]-e[a*3+n])*i,t[n]=(e[n*3+s]+e[s*3+n])*i,t[a]=(e[a*3+s]+e[s*3+a])*i}return t}function Zr(t,e,r="YXZ"){let i=Math.sin(e[0]*.5),s=Math.cos(e[0]*.5),n=Math.sin(e[1]*.5),a=Math.cos(e[1]*.5),l=Math.sin(e[2]*.5),h=Math.cos(e[2]*.5);return r==="XYZ"?(t[0]=i*a*h+s*n*l,t[1]=s*n*h-i*a*l,t[2]=s*a*l+i*n*h,t[3]=s*a*h-i*n*l):r==="YXZ"?(t[0]=i*a*h+s*n*l,t[1]=s*n*h-i*a*l,t[2]=s*a*l-i*n*h,t[3]=s*a*h+i*n*l):r==="ZXY"?(t[0]=i*a*h-s*n*l,t[1]=s*n*h+i*a*l,t[2]=s*a*l+i*n*h,t[3]=s*a*h-i*n*l):r==="ZYX"?(t[0]=i*a*h-s*n*l,t[1]=s*n*h+i*a*l,t[2]=s*a*l-i*n*h,t[3]=s*a*h+i*n*l):r==="YZX"?(t[0]=i*a*h+s*n*l,t[1]=s*n*h+i*a*l,t[2]=s*a*l-i*n*h,t[3]=s*a*h-i*n*l):r==="XZY"&&(t[0]=i*a*h-s*n*l,t[1]=s*n*h-i*a*l,t[2]=s*a*l+i*n*h,t[3]=s*a*h+i*n*l),t}var $r=Ir,Kr=Br;var Jr=Ur;var ei=Or;var Je=class extends Array{constructor(e=0,r=0,i=0,s=1){super(e,r,i,s),this.onChange=()=>{},this._target=this;let n=["0","1","2","3"];return new Proxy(this,{set(a,l){let h=Reflect.set(...arguments);return h&&n.includes(l)&&a.onChange(),h}})}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}get w(){return this[3]}set x(e){this._target[0]=e,this.onChange()}set y(e){this._target[1]=e,this.onChange()}set z(e){this._target[2]=e,this.onChange()}set w(e){this._target[3]=e,this.onChange()}identity(){return Vr(this._target),this.onChange(),this}set(e,r,i,s){return e.length?this.copy(e):(Kr(this._target,e,r,i,s),this.onChange(),this)}rotateX(e){return qr(this._target,this._target,e),this.onChange(),this}rotateY(e){return Hr(this._target,this._target,e),this.onChange(),this}rotateZ(e){return Xr(this._target,this._target,e),this.onChange(),this}inverse(e=this._target){return Yr(this._target,e),this.onChange(),this}conjugate(e=this._target){return Qr(this._target,e),this.onChange(),this}copy(e){return $r(this._target,e),this.onChange(),this}normalize(e=this._target){return ei(this._target,e),this.onChange(),this}multiply(e,r){return r?St(this._target,e,r):St(this._target,this._target,e),this.onChange(),this}dot(e){return Jr(this._target,e)}fromMatrix3(e){return jr(this._target,e),this.onChange(),this}fromEuler(e,r){return Zr(this._target,e,e.order),r||this.onChange(),this}fromAxisAngle(e,r){return Gr(this._target,e,r),this.onChange(),this}slerp(e,r){return Wr(this._target,this._target,e,r),this.onChange(),this}fromArray(e,r=0){return this._target[0]=e[r],this._target[1]=e[r+1],this._target[2]=e[r+2],this._target[3]=e[r+3],this.onChange(),this}toArray(e=[],r=0){return e[r]=this[0],e[r+1]=this[1],e[r+2]=this[2],e[r+3]=this[3],e}};var as=1e-6;function ti(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[4]=e[4],t[5]=e[5],t[6]=e[6],t[7]=e[7],t[8]=e[8],t[9]=e[9],t[10]=e[10],t[11]=e[11],t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15],t}function ri(t,e,r,i,s,n,a,l,h,c,o,f,u,d,p,g,m){return t[0]=e,t[1]=r,t[2]=i,t[3]=s,t[4]=n,t[5]=a,t[6]=l,t[7]=h,t[8]=c,t[9]=o,t[10]=f,t[11]=u,t[12]=d,t[13]=p,t[14]=g,t[15]=m,t}function ii(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function si(t,e){let r=e[0],i=e[1],s=e[2],n=e[3],a=e[4],l=e[5],h=e[6],c=e[7],o=e[8],f=e[9],u=e[10],d=e[11],p=e[12],g=e[13],m=e[14],x=e[15],R=r*l-i*a,E=r*h-s*a,y=r*c-n*a,F=i*h-s*l,M=i*c-n*l,P=s*c-n*h,V=o*g-f*p,O=o*m-u*p,L=o*x-d*p,k=f*m-u*g,I=f*x-d*g,b=u*x-d*m,T=R*b-E*I+y*k+F*L-M*O+P*V;return T?(T=1/T,t[0]=(l*b-h*I+c*k)*T,t[1]=(s*I-i*b-n*k)*T,t[2]=(g*P-m*M+x*F)*T,t[3]=(u*M-f*P-d*F)*T,t[4]=(h*L-a*b-c*O)*T,t[5]=(r*b-s*L+n*O)*T,t[6]=(m*y-p*P-x*E)*T,t[7]=(o*P-u*y+d*E)*T,t[8]=(a*I-l*L+c*V)*T,t[9]=(i*L-r*I-n*V)*T,t[10]=(p*M-g*y+x*R)*T,t[11]=(f*y-o*M-d*R)*T,t[12]=(l*O-a*k-h*V)*T,t[13]=(r*k-i*O+s*V)*T,t[14]=(g*E-p*F-m*R)*T,t[15]=(o*F-f*E+u*R)*T,t):null}function Ct(t){let e=t[0],r=t[1],i=t[2],s=t[3],n=t[4],a=t[5],l=t[6],h=t[7],c=t[8],o=t[9],f=t[10],u=t[11],d=t[12],p=t[13],g=t[14],m=t[15],x=e*a-r*n,R=e*l-i*n,E=e*h-s*n,y=r*l-i*a,F=r*h-s*a,M=i*h-s*l,P=c*p-o*d,V=c*g-f*d,O=c*m-u*d,L=o*g-f*p,k=o*m-u*p,I=f*m-u*g;return x*I-R*k+E*L+y*O-F*V+M*P}function zt(t,e,r){let i=e[0],s=e[1],n=e[2],a=e[3],l=e[4],h=e[5],c=e[6],o=e[7],f=e[8],u=e[9],d=e[10],p=e[11],g=e[12],m=e[13],x=e[14],R=e[15],E=r[0],y=r[1],F=r[2],M=r[3];return t[0]=E*i+y*l+F*f+M*g,t[1]=E*s+y*h+F*u+M*m,t[2]=E*n+y*c+F*d+M*x,t[3]=E*a+y*o+F*p+M*R,E=r[4],y=r[5],F=r[6],M=r[7],t[4]=E*i+y*l+F*f+M*g,t[5]=E*s+y*h+F*u+M*m,t[6]=E*n+y*c+F*d+M*x,t[7]=E*a+y*o+F*p+M*R,E=r[8],y=r[9],F=r[10],M=r[11],t[8]=E*i+y*l+F*f+M*g,t[9]=E*s+y*h+F*u+M*m,t[10]=E*n+y*c+F*d+M*x,t[11]=E*a+y*o+F*p+M*R,E=r[12],y=r[13],F=r[14],M=r[15],t[12]=E*i+y*l+F*f+M*g,t[13]=E*s+y*h+F*u+M*m,t[14]=E*n+y*c+F*d+M*x,t[15]=E*a+y*o+F*p+M*R,t}function ni(t,e,r){let i=r[0],s=r[1],n=r[2],a,l,h,c,o,f,u,d,p,g,m,x;return e===t?(t[12]=e[0]*i+e[4]*s+e[8]*n+e[12],t[13]=e[1]*i+e[5]*s+e[9]*n+e[13],t[14]=e[2]*i+e[6]*s+e[10]*n+e[14],t[15]=e[3]*i+e[7]*s+e[11]*n+e[15]):(a=e[0],l=e[1],h=e[2],c=e[3],o=e[4],f=e[5],u=e[6],d=e[7],p=e[8],g=e[9],m=e[10],x=e[11],t[0]=a,t[1]=l,t[2]=h,t[3]=c,t[4]=o,t[5]=f,t[6]=u,t[7]=d,t[8]=p,t[9]=g,t[10]=m,t[11]=x,t[12]=a*i+o*s+p*n+e[12],t[13]=l*i+f*s+g*n+e[13],t[14]=h*i+u*s+m*n+e[14],t[15]=c*i+d*s+x*n+e[15]),t}function ai(t,e,r){let i=r[0],s=r[1],n=r[2];return t[0]=e[0]*i,t[1]=e[1]*i,t[2]=e[2]*i,t[3]=e[3]*i,t[4]=e[4]*s,t[5]=e[5]*s,t[6]=e[6]*s,t[7]=e[7]*s,t[8]=e[8]*n,t[9]=e[9]*n,t[10]=e[10]*n,t[11]=e[11]*n,t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15],t}function li(t,e,r,i){let s=i[0],n=i[1],a=i[2],l=Math.hypot(s,n,a),h,c,o,f,u,d,p,g,m,x,R,E,y,F,M,P,V,O,L,k,I,b,T,ve;return Math.abs(l)<as?null:(l=1/l,s*=l,n*=l,a*=l,h=Math.sin(r),c=Math.cos(r),o=1-c,f=e[0],u=e[1],d=e[2],p=e[3],g=e[4],m=e[5],x=e[6],R=e[7],E=e[8],y=e[9],F=e[10],M=e[11],P=s*s*o+c,V=n*s*o+a*h,O=a*s*o-n*h,L=s*n*o-a*h,k=n*n*o+c,I=a*n*o+s*h,b=s*a*o+n*h,T=n*a*o-s*h,ve=a*a*o+c,t[0]=f*P+g*V+E*O,t[1]=u*P+m*V+y*O,t[2]=d*P+x*V+F*O,t[3]=p*P+R*V+M*O,t[4]=f*L+g*k+E*I,t[5]=u*L+m*k+y*I,t[6]=d*L+x*k+F*I,t[7]=p*L+R*k+M*I,t[8]=f*b+g*T+E*ve,t[9]=u*b+m*T+y*ve,t[10]=d*b+x*T+F*ve,t[11]=p*b+R*T+M*ve,e!==t&&(t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15]),t)}function hi(t,e){return t[0]=e[12],t[1]=e[13],t[2]=e[14],t}function Dt(t,e){let r=e[0],i=e[1],s=e[2],n=e[4],a=e[5],l=e[6],h=e[8],c=e[9],o=e[10];return t[0]=Math.hypot(r,i,s),t[1]=Math.hypot(n,a,l),t[2]=Math.hypot(h,c,o),t}function oi(t){let e=t[0],r=t[1],i=t[2],s=t[4],n=t[5],a=t[6],l=t[8],h=t[9],c=t[10],o=e*e+r*r+i*i,f=s*s+n*n+a*a,u=l*l+h*h+c*c;return Math.sqrt(Math.max(o,f,u))}var Pt=(function(){let t=[1,1,1];return function(e,r){let i=t;Dt(i,r);let s=1/i[0],n=1/i[1],a=1/i[2],l=r[0]*s,h=r[1]*n,c=r[2]*a,o=r[4]*s,f=r[5]*n,u=r[6]*a,d=r[8]*s,p=r[9]*n,g=r[10]*a,m=l+f+g,x=0;return m>0?(x=Math.sqrt(m+1)*2,e[3]=.25*x,e[0]=(u-p)/x,e[1]=(d-c)/x,e[2]=(h-o)/x):l>f&&l>g?(x=Math.sqrt(1+l-f-g)*2,e[3]=(u-p)/x,e[0]=.25*x,e[1]=(h+o)/x,e[2]=(d+c)/x):f>g?(x=Math.sqrt(1+f-l-g)*2,e[3]=(d-c)/x,e[0]=(h+o)/x,e[1]=.25*x,e[2]=(u+p)/x):(x=Math.sqrt(1+g-l-f)*2,e[3]=(h-o)/x,e[0]=(d+c)/x,e[1]=(u+p)/x,e[2]=.25*x),e}})();function ci(t,e,r,i){let s=Re([t[0],t[1],t[2]]),n=Re([t[4],t[5],t[6]]),a=Re([t[8],t[9],t[10]]);Ct(t)<0&&(s=-s),r[0]=t[12],r[1]=t[13],r[2]=t[14];let h=t.slice(),c=1/s,o=1/n,f=1/a;h[0]*=c,h[1]*=c,h[2]*=c,h[4]*=o,h[5]*=o,h[6]*=o,h[8]*=f,h[9]*=f,h[10]*=f,Pt(e,h),i[0]=s,i[1]=n,i[2]=a}function fi(t,e,r,i){let s=t,n=e[0],a=e[1],l=e[2],h=e[3],c=n+n,o=a+a,f=l+l,u=n*c,d=n*o,p=n*f,g=a*o,m=a*f,x=l*f,R=h*c,E=h*o,y=h*f,F=i[0],M=i[1],P=i[2];return s[0]=(1-(g+x))*F,s[1]=(d+y)*F,s[2]=(p-E)*F,s[3]=0,s[4]=(d-y)*M,s[5]=(1-(u+x))*M,s[6]=(m+R)*M,s[7]=0,s[8]=(p+E)*P,s[9]=(m-R)*P,s[10]=(1-(u+g))*P,s[11]=0,s[12]=r[0],s[13]=r[1],s[14]=r[2],s[15]=1,s}function ui(t,e){let r=e[0],i=e[1],s=e[2],n=e[3],a=r+r,l=i+i,h=s+s,c=r*a,o=i*a,f=i*l,u=s*a,d=s*l,p=s*h,g=n*a,m=n*l,x=n*h;return t[0]=1-f-p,t[1]=o+x,t[2]=u-m,t[3]=0,t[4]=o-x,t[5]=1-c-p,t[6]=d+g,t[7]=0,t[8]=u+m,t[9]=d-g,t[10]=1-c-f,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function di(t,e,r,i,s){let n=1/Math.tan(e/2),a=1/(i-s);return t[0]=n/r,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=n,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=(s+i)*a,t[11]=-1,t[12]=0,t[13]=0,t[14]=2*s*i*a,t[15]=0,t}function pi(t,e,r,i,s,n,a){let l=1/(e-r),h=1/(i-s),c=1/(n-a);return t[0]=-2*l,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=-2*h,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=2*c,t[11]=0,t[12]=(e+r)*l,t[13]=(s+i)*h,t[14]=(a+n)*c,t[15]=1,t}function gi(t,e,r,i){let s=e[0],n=e[1],a=e[2],l=i[0],h=i[1],c=i[2],o=s-r[0],f=n-r[1],u=a-r[2],d=o*o+f*f+u*u;d===0?u=1:(d=1/Math.sqrt(d),o*=d,f*=d,u*=d);let p=h*u-c*f,g=c*o-l*u,m=l*f-h*o;return d=p*p+g*g+m*m,d===0&&(c?l+=1e-6:h?c+=1e-6:h+=1e-6,p=h*u-c*f,g=c*o-l*u,m=l*f-h*o,d=p*p+g*g+m*m),d=1/Math.sqrt(d),p*=d,g*=d,m*=d,t[0]=p,t[1]=g,t[2]=m,t[3]=0,t[4]=f*m-u*g,t[5]=u*p-o*m,t[6]=o*g-f*p,t[7]=0,t[8]=o,t[9]=f,t[10]=u,t[11]=0,t[12]=s,t[13]=n,t[14]=a,t[15]=1,t}function Lt(t,e,r){return t[0]=e[0]+r[0],t[1]=e[1]+r[1],t[2]=e[2]+r[2],t[3]=e[3]+r[3],t[4]=e[4]+r[4],t[5]=e[5]+r[5],t[6]=e[6]+r[6],t[7]=e[7]+r[7],t[8]=e[8]+r[8],t[9]=e[9]+r[9],t[10]=e[10]+r[10],t[11]=e[11]+r[11],t[12]=e[12]+r[12],t[13]=e[13]+r[13],t[14]=e[14]+r[14],t[15]=e[15]+r[15],t}function Nt(t,e,r){return t[0]=e[0]-r[0],t[1]=e[1]-r[1],t[2]=e[2]-r[2],t[3]=e[3]-r[3],t[4]=e[4]-r[4],t[5]=e[5]-r[5],t[6]=e[6]-r[6],t[7]=e[7]-r[7],t[8]=e[8]-r[8],t[9]=e[9]-r[9],t[10]=e[10]-r[10],t[11]=e[11]-r[11],t[12]=e[12]-r[12],t[13]=e[13]-r[13],t[14]=e[14]-r[14],t[15]=e[15]-r[15],t}function mi(t,e,r){return t[0]=e[0]*r,t[1]=e[1]*r,t[2]=e[2]*r,t[3]=e[3]*r,t[4]=e[4]*r,t[5]=e[5]*r,t[6]=e[6]*r,t[7]=e[7]*r,t[8]=e[8]*r,t[9]=e[9]*r,t[10]=e[10]*r,t[11]=e[11]*r,t[12]=e[12]*r,t[13]=e[13]*r,t[14]=e[14]*r,t[15]=e[15]*r,t}var oe=class extends Array{constructor(e=1,r=0,i=0,s=0,n=0,a=1,l=0,h=0,c=0,o=0,f=1,u=0,d=0,p=0,g=0,m=1){return super(e,r,i,s,n,a,l,h,c,o,f,u,d,p,g,m),this}get x(){return this[12]}get y(){return this[13]}get z(){return this[14]}get w(){return this[15]}set x(e){this[12]=e}set y(e){this[13]=e}set z(e){this[14]=e}set w(e){this[15]=e}set(e,r,i,s,n,a,l,h,c,o,f,u,d,p,g,m){return e.length?this.copy(e):(ri(this,e,r,i,s,n,a,l,h,c,o,f,u,d,p,g,m),this)}translate(e,r=this){return ni(this,r,e),this}rotate(e,r,i=this){return li(this,i,e,r),this}scale(e,r=this){return ai(this,r,typeof e=="number"?[e,e,e]:e),this}add(e,r){return r?Lt(this,e,r):Lt(this,this,e),this}sub(e,r){return r?Nt(this,e,r):Nt(this,this,e),this}multiply(e,r){return e.length?r?zt(this,e,r):zt(this,this,e):mi(this,this,e),this}identity(){return ii(this),this}copy(e){return ti(this,e),this}fromPerspective({fov:e,aspect:r,near:i,far:s}={}){return di(this,e,r,i,s),this}fromOrthogonal({left:e,right:r,bottom:i,top:s,near:n,far:a}){return pi(this,e,r,i,s,n,a),this}fromQuaternion(e){return ui(this,e),this}setPosition(e){return this.x=e[0],this.y=e[1],this.z=e[2],this}inverse(e=this){return si(this,e),this}compose(e,r,i){return fi(this,e,r,i),this}decompose(e,r,i){return ci(this,e,r,i),this}getRotation(e){return Pt(e,this),this}getTranslation(e){return hi(e,this),this}getScaling(e){return Dt(e,this),this}getMaxScaleOnAxis(){return oi(this)}lookAt(e,r,i){return gi(this,e,r,i),this}determinant(){return Ct(this)}fromArray(e,r=0){return this[0]=e[r],this[1]=e[r+1],this[2]=e[r+2],this[3]=e[r+3],this[4]=e[r+4],this[5]=e[r+5],this[6]=e[r+6],this[7]=e[r+7],this[8]=e[r+8],this[9]=e[r+9],this[10]=e[r+10],this[11]=e[r+11],this[12]=e[r+12],this[13]=e[r+13],this[14]=e[r+14],this[15]=e[r+15],this}toArray(e=[],r=0){return e[r]=this[0],e[r+1]=this[1],e[r+2]=this[2],e[r+3]=this[3],e[r+4]=this[4],e[r+5]=this[5],e[r+6]=this[6],e[r+7]=this[7],e[r+8]=this[8],e[r+9]=this[9],e[r+10]=this[10],e[r+11]=this[11],e[r+12]=this[12],e[r+13]=this[13],e[r+14]=this[14],e[r+15]=this[15],e}};function xi(t,e,r="YXZ"){return r==="XYZ"?(t[1]=Math.asin(Math.min(Math.max(e[8],-1),1)),Math.abs(e[8])<.99999?(t[0]=Math.atan2(-e[9],e[10]),t[2]=Math.atan2(-e[4],e[0])):(t[0]=Math.atan2(e[6],e[5]),t[2]=0)):r==="YXZ"?(t[0]=Math.asin(-Math.min(Math.max(e[9],-1),1)),Math.abs(e[9])<.99999?(t[1]=Math.atan2(e[8],e[10]),t[2]=Math.atan2(e[1],e[5])):(t[1]=Math.atan2(-e[2],e[0]),t[2]=0)):r==="ZXY"?(t[0]=Math.asin(Math.min(Math.max(e[6],-1),1)),Math.abs(e[6])<.99999?(t[1]=Math.atan2(-e[2],e[10]),t[2]=Math.atan2(-e[4],e[5])):(t[1]=0,t[2]=Math.atan2(e[1],e[0]))):r==="ZYX"?(t[1]=Math.asin(-Math.min(Math.max(e[2],-1),1)),Math.abs(e[2])<.99999?(t[0]=Math.atan2(e[6],e[10]),t[2]=Math.atan2(e[1],e[0])):(t[0]=0,t[2]=Math.atan2(-e[4],e[5]))):r==="YZX"?(t[2]=Math.asin(Math.min(Math.max(e[1],-1),1)),Math.abs(e[1])<.99999?(t[0]=Math.atan2(-e[9],e[5]),t[1]=Math.atan2(-e[2],e[0])):(t[0]=0,t[1]=Math.atan2(e[8],e[10]))):r==="XZY"&&(t[2]=Math.asin(-Math.min(Math.max(e[4],-1),1)),Math.abs(e[4])<.99999?(t[0]=Math.atan2(e[6],e[5]),t[1]=Math.atan2(e[8],e[0])):(t[0]=Math.atan2(-e[9],e[10]),t[1]=0)),t}var vi=new oe,et=class extends Array{constructor(e=0,r=e,i=e,s="YXZ"){super(e,r,i),this.order=s,this.onChange=()=>{},this._target=this;let n=["0","1","2"];return new Proxy(this,{set(a,l){let h=Reflect.set(...arguments);return h&&n.includes(l)&&a.onChange(),h}})}get x(){return this[0]}get y(){return this[1]}get z(){return this[2]}set x(e){this._target[0]=e,this.onChange()}set y(e){this._target[1]=e,this.onChange()}set z(e){this._target[2]=e,this.onChange()}set(e,r=e,i=e){return e.length?this.copy(e):(this._target[0]=e,this._target[1]=r,this._target[2]=i,this.onChange(),this)}copy(e){return this._target[0]=e[0],this._target[1]=e[1],this._target[2]=e[2],this.onChange(),this}reorder(e){return this._target.order=e,this.onChange(),this}fromRotationMatrix(e,r=this.order){return xi(this._target,e,r),this.onChange(),this}fromQuaternion(e,r=this.order,i){return vi.fromQuaternion(e),this._target.fromRotationMatrix(vi,r),i||this.onChange(),this}fromArray(e,r=0){return this._target[0]=e[r],this._target[1]=e[r+1],this._target[2]=e[r+2],this}toArray(e=[],r=0){return e[r]=this[0],e[r+1]=this[1],e[r+2]=this[2],e}};var tt=class{constructor(){this.parent=null,this.children=[],this.visible=!0,this.matrix=new oe,this.worldMatrix=new oe,this.matrixAutoUpdate=!0,this.worldMatrixNeedsUpdate=!1,this.position=new Y,this.quaternion=new Je,this.scale=new Y(1),this.rotation=new et,this.up=new Y(0,1,0),this.rotation._target.onChange=()=>this.quaternion.fromEuler(this.rotation,!0),this.quaternion._target.onChange=()=>this.rotation.fromQuaternion(this.quaternion,void 0,!0)}setParent(e,r=!0){this.parent&&e!==this.parent&&this.parent.removeChild(this,!1),this.parent=e,r&&e&&e.addChild(this,!1)}addChild(e,r=!0){~this.children.indexOf(e)||this.children.push(e),r&&e.setParent(this,!1)}removeChild(e,r=!0){~this.children.indexOf(e)&&this.children.splice(this.children.indexOf(e),1),r&&e.setParent(null,!1)}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.worldMatrixNeedsUpdate||e)&&(this.parent===null?this.worldMatrix.copy(this.matrix):this.worldMatrix.multiply(this.parent.worldMatrix,this.matrix),this.worldMatrixNeedsUpdate=!1,e=!0);for(let r=0,i=this.children.length;r<i;r++)this.children[r].updateMatrixWorld(e)}updateMatrix(){this.matrix.compose(this.quaternion,this.position,this.scale),this.worldMatrixNeedsUpdate=!0}traverse(e){if(!e(this))for(let r=0,i=this.children.length;r<i;r++)this.children[r].traverse(e)}decompose(){this.matrix.decompose(this.quaternion._target,this.position,this.scale),this.rotation.fromQuaternion(this.quaternion)}lookAt(e,r=!1){r?this.matrix.lookAt(this.position,e,this.up):this.matrix.lookAt(e,this.position,this.up),this.matrix.getRotation(this.quaternion._target),this.rotation.fromQuaternion(this.quaternion)}};function yi(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[4],t[4]=e[5],t[5]=e[6],t[6]=e[8],t[7]=e[9],t[8]=e[10],t}function Ei(t,e){let r=e[0],i=e[1],s=e[2],n=e[3],a=r+r,l=i+i,h=s+s,c=r*a,o=i*a,f=i*l,u=s*a,d=s*l,p=s*h,g=n*a,m=n*l,x=n*h;return t[0]=1-f-p,t[3]=o-x,t[6]=u+m,t[1]=o+x,t[4]=1-c-p,t[7]=d-g,t[2]=u-m,t[5]=d+g,t[8]=1-c-f,t}function wi(t,e){return t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[4]=e[4],t[5]=e[5],t[6]=e[6],t[7]=e[7],t[8]=e[8],t}function Mi(t,e,r,i,s,n,a,l,h,c){return t[0]=e,t[1]=r,t[2]=i,t[3]=s,t[4]=n,t[5]=a,t[6]=l,t[7]=h,t[8]=c,t}function Fi(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t}function Ti(t,e){let r=e[0],i=e[1],s=e[2],n=e[3],a=e[4],l=e[5],h=e[6],c=e[7],o=e[8],f=o*a-l*c,u=-o*n+l*h,d=c*n-a*h,p=r*f+i*u+s*d;return p?(p=1/p,t[0]=f*p,t[1]=(-o*i+s*c)*p,t[2]=(l*i-s*a)*p,t[3]=u*p,t[4]=(o*r-s*h)*p,t[5]=(-l*r+s*n)*p,t[6]=d*p,t[7]=(-c*r+i*h)*p,t[8]=(a*r-i*n)*p,t):null}function kt(t,e,r){let i=e[0],s=e[1],n=e[2],a=e[3],l=e[4],h=e[5],c=e[6],o=e[7],f=e[8],u=r[0],d=r[1],p=r[2],g=r[3],m=r[4],x=r[5],R=r[6],E=r[7],y=r[8];return t[0]=u*i+d*a+p*c,t[1]=u*s+d*l+p*o,t[2]=u*n+d*h+p*f,t[3]=g*i+m*a+x*c,t[4]=g*s+m*l+x*o,t[5]=g*n+m*h+x*f,t[6]=R*i+E*a+y*c,t[7]=R*s+E*l+y*o,t[8]=R*n+E*h+y*f,t}function _i(t,e,r){let i=e[0],s=e[1],n=e[2],a=e[3],l=e[4],h=e[5],c=e[6],o=e[7],f=e[8],u=r[0],d=r[1];return t[0]=i,t[1]=s,t[2]=n,t[3]=a,t[4]=l,t[5]=h,t[6]=u*i+d*a+c,t[7]=u*s+d*l+o,t[8]=u*n+d*h+f,t}function Ri(t,e,r){let i=e[0],s=e[1],n=e[2],a=e[3],l=e[4],h=e[5],c=e[6],o=e[7],f=e[8],u=Math.sin(r),d=Math.cos(r);return t[0]=d*i+u*a,t[1]=d*s+u*l,t[2]=d*n+u*h,t[3]=d*a-u*i,t[4]=d*l-u*s,t[5]=d*h-u*n,t[6]=c,t[7]=o,t[8]=f,t}function bi(t,e,r){let i=r[0],s=r[1];return t[0]=i*e[0],t[1]=i*e[1],t[2]=i*e[2],t[3]=s*e[3],t[4]=s*e[4],t[5]=s*e[5],t[6]=e[6],t[7]=e[7],t[8]=e[8],t}function Ai(t,e){let r=e[0],i=e[1],s=e[2],n=e[3],a=e[4],l=e[5],h=e[6],c=e[7],o=e[8],f=e[9],u=e[10],d=e[11],p=e[12],g=e[13],m=e[14],x=e[15],R=r*l-i*a,E=r*h-s*a,y=r*c-n*a,F=i*h-s*l,M=i*c-n*l,P=s*c-n*h,V=o*g-f*p,O=o*m-u*p,L=o*x-d*p,k=f*m-u*g,I=f*x-d*g,b=u*x-d*m,T=R*b-E*I+y*k+F*L-M*O+P*V;return T?(T=1/T,t[0]=(l*b-h*I+c*k)*T,t[1]=(h*L-a*b-c*O)*T,t[2]=(a*I-l*L+c*V)*T,t[3]=(s*I-i*b-n*k)*T,t[4]=(r*b-s*L+n*O)*T,t[5]=(i*L-r*I-n*V)*T,t[6]=(g*P-m*M+x*F)*T,t[7]=(m*y-p*P-x*E)*T,t[8]=(p*M-g*y+x*R)*T,t):null}var rt=class extends Array{constructor(e=1,r=0,i=0,s=0,n=1,a=0,l=0,h=0,c=1){return super(e,r,i,s,n,a,l,h,c),this}set(e,r,i,s,n,a,l,h,c){return e.length?this.copy(e):(Mi(this,e,r,i,s,n,a,l,h,c),this)}translate(e,r=this){return _i(this,r,e),this}rotate(e,r=this){return Ri(this,r,e),this}scale(e,r=this){return bi(this,r,e),this}multiply(e,r){return r?kt(this,e,r):kt(this,this,e),this}identity(){return Fi(this),this}copy(e){return wi(this,e),this}fromMatrix4(e){return yi(this,e),this}fromQuaternion(e){return Ei(this,e),this}fromBasis(e,r,i){return this.set(e[0],e[1],e[2],r[0],r[1],r[2],i[0],i[1],i[2]),this}inverse(e=this){return Ti(this,e),this}getNormalMatrix(e){return Ai(this,e),this}};var cs=0,me=class extends tt{constructor(e,{geometry:r,program:i,mode:s=e.TRIANGLES,frustumCulled:n=!0,renderOrder:a=0}={}){super(),e.canvas||console.error("gl not passed as first argument to Mesh"),this.gl=e,this.id=cs++,this.geometry=r,this.program=i,this.mode=s,this.frustumCulled=n,this.renderOrder=a,this.modelViewMatrix=new oe,this.normalMatrix=new rt,this.beforeRenderCallbacks=[],this.afterRenderCallbacks=[]}onBeforeRender(e){return this.beforeRenderCallbacks.push(e),this}onAfterRender(e){return this.afterRenderCallbacks.push(e),this}draw({camera:e}={}){e&&(this.program.uniforms.modelMatrix||Object.assign(this.program.uniforms,{modelMatrix:{value:null},viewMatrix:{value:null},modelViewMatrix:{value:null},normalMatrix:{value:null},projectionMatrix:{value:null},cameraPosition:{value:null}}),this.program.uniforms.projectionMatrix.value=e.projectionMatrix,this.program.uniforms.cameraPosition.value=e.worldPosition,this.program.uniforms.viewMatrix.value=e.viewMatrix,this.modelViewMatrix.multiply(e.viewMatrix,this.worldMatrix),this.normalMatrix.getNormalMatrix(this.modelViewMatrix),this.program.uniforms.modelMatrix.value=this.worldMatrix,this.program.uniforms.modelViewMatrix.value=this.modelViewMatrix,this.program.uniforms.normalMatrix.value=this.normalMatrix),this.beforeRenderCallbacks.forEach(i=>i&&i({mesh:this,camera:e}));let r=this.program.cullFace&&this.worldMatrix.determinant()<0;this.program.use({flipFaces:r}),this.geometry.draw({mode:this.mode,program:this.program}),this.afterRenderCallbacks.forEach(i=>i&&i({mesh:this,camera:e}))}};var Si=new Uint8Array(4);function Ci(t){return(t&t-1)===0}var fs=1,ce=class{constructor(e,{image:r,target:i=e.TEXTURE_2D,type:s=e.UNSIGNED_BYTE,format:n=e.RGBA,internalFormat:a=n,wrapS:l=e.CLAMP_TO_EDGE,wrapT:h=e.CLAMP_TO_EDGE,wrapR:c=e.CLAMP_TO_EDGE,generateMipmaps:o=i===(e.TEXTURE_2D||e.TEXTURE_CUBE_MAP),minFilter:f=o?e.NEAREST_MIPMAP_LINEAR:e.LINEAR,magFilter:u=e.LINEAR,premultiplyAlpha:d=!1,unpackAlignment:p=4,flipY:g=i==(e.TEXTURE_2D||e.TEXTURE_3D),anisotropy:m=0,level:x=0,width:R,height:E=R,length:y=1}={}){this.gl=e,this.id=fs++,this.image=r,this.target=i,this.type=s,this.format=n,this.internalFormat=a,this.minFilter=f,this.magFilter=u,this.wrapS=l,this.wrapT=h,this.wrapR=c,this.generateMipmaps=o,this.premultiplyAlpha=d,this.unpackAlignment=p,this.flipY=g,this.anisotropy=Math.min(m,this.gl.renderer.parameters.maxAnisotropy),this.level=x,this.width=R,this.height=E,this.length=y,this.texture=this.gl.createTexture(),this.store={image:null},this.glState=this.gl.renderer.state,this.state={},this.state.minFilter=this.gl.NEAREST_MIPMAP_LINEAR,this.state.magFilter=this.gl.LINEAR,this.state.wrapS=this.gl.REPEAT,this.state.wrapT=this.gl.REPEAT,this.state.anisotropy=0}bind(){this.glState.textureUnits[this.glState.activeTextureUnit]!==this.id&&(this.gl.bindTexture(this.target,this.texture),this.glState.textureUnits[this.glState.activeTextureUnit]=this.id)}update(e=0){let r=!(this.image===this.store.image&&!this.needsUpdate);if((r||this.glState.textureUnits[e]!==this.id)&&(this.gl.renderer.activeTexture(e),this.bind()),!!r){if(this.needsUpdate=!1,this.flipY!==this.glState.flipY&&(this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL,this.flipY),this.glState.flipY=this.flipY),this.premultiplyAlpha!==this.glState.premultiplyAlpha&&(this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this.premultiplyAlpha),this.glState.premultiplyAlpha=this.premultiplyAlpha),this.unpackAlignment!==this.glState.unpackAlignment&&(this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT,this.unpackAlignment),this.glState.unpackAlignment=this.unpackAlignment),this.minFilter!==this.state.minFilter&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_MIN_FILTER,this.minFilter),this.state.minFilter=this.minFilter),this.magFilter!==this.state.magFilter&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_MAG_FILTER,this.magFilter),this.state.magFilter=this.magFilter),this.wrapS!==this.state.wrapS&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_WRAP_S,this.wrapS),this.state.wrapS=this.wrapS),this.wrapT!==this.state.wrapT&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_WRAP_T,this.wrapT),this.state.wrapT=this.wrapT),this.wrapR!==this.state.wrapR&&(this.gl.texParameteri(this.target,this.gl.TEXTURE_WRAP_R,this.wrapR),this.state.wrapR=this.wrapR),this.anisotropy&&this.anisotropy!==this.state.anisotropy&&(this.gl.texParameterf(this.target,this.gl.renderer.getExtension("EXT_texture_filter_anisotropic").TEXTURE_MAX_ANISOTROPY_EXT,this.anisotropy),this.state.anisotropy=this.anisotropy),this.image){if(this.image.width&&(this.width=this.image.width,this.height=this.image.height),this.target===this.gl.TEXTURE_CUBE_MAP)for(let i=0;i<6;i++)this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,this.level,this.internalFormat,this.format,this.type,this.image[i]);else if(ArrayBuffer.isView(this.image))this.target===this.gl.TEXTURE_2D?this.gl.texImage2D(this.target,this.level,this.internalFormat,this.width,this.height,0,this.format,this.type,this.image):(this.target===this.gl.TEXTURE_2D_ARRAY||this.target===this.gl.TEXTURE_3D)&&this.gl.texImage3D(this.target,this.level,this.internalFormat,this.width,this.height,this.length,0,this.format,this.type,this.image);else if(this.image.isCompressedTexture)for(let i=0;i<this.image.length;i++)this.gl.compressedTexImage2D(this.target,i,this.internalFormat,this.image[i].width,this.image[i].height,0,this.image[i].data);else this.target===this.gl.TEXTURE_2D?this.gl.texImage2D(this.target,this.level,this.internalFormat,this.format,this.type,this.image):this.gl.texImage3D(this.target,this.level,this.internalFormat,this.width,this.height,this.length,0,this.format,this.type,this.image);this.generateMipmaps&&(!this.gl.renderer.isWebgl2&&(!Ci(this.image.width)||!Ci(this.image.height))?(this.generateMipmaps=!1,this.wrapS=this.wrapT=this.gl.CLAMP_TO_EDGE,this.minFilter=this.gl.LINEAR):this.gl.generateMipmap(this.target)),this.onUpdate&&this.onUpdate()}else if(this.target===this.gl.TEXTURE_CUBE_MAP)for(let i=0;i<6;i++)this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,this.gl.RGBA,1,1,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,Si);else this.width?this.target===this.gl.TEXTURE_2D?this.gl.texImage2D(this.target,this.level,this.internalFormat,this.width,this.height,0,this.format,this.type,null):this.gl.texImage3D(this.target,this.level,this.internalFormat,this.width,this.height,this.length,0,this.format,this.type,null):this.gl.texImage2D(this.target,0,this.gl.RGBA,1,1,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,Si);this.store.image=this.image}}};var De=class{constructor(e,{width:r=e.canvas.width,height:i=e.canvas.height,target:s=e.FRAMEBUFFER,color:n=1,depth:a=!0,stencil:l=!1,depthTexture:h=!1,wrapS:c=e.CLAMP_TO_EDGE,wrapT:o=e.CLAMP_TO_EDGE,wrapR:f=e.CLAMP_TO_EDGE,minFilter:u=e.LINEAR,magFilter:d=u,type:p=e.UNSIGNED_BYTE,format:g=e.RGBA,internalFormat:m=g,unpackAlignment:x,premultiplyAlpha:R}={}){this.gl=e,this.width=r,this.height=i,this.depth=a,this.stencil=l,this.buffer=this.gl.createFramebuffer(),this.target=s,this.gl.renderer.bindFramebuffer(this),this.textures=[];let E=[];for(let y=0;y<n;y++)this.textures.push(new ce(e,{width:r,height:i,wrapS:c,wrapT:o,wrapR:f,minFilter:u,magFilter:d,type:p,format:g,internalFormat:m,unpackAlignment:x,premultiplyAlpha:R,flipY:!1,generateMipmaps:!1})),this.textures[y].update(),this.gl.framebufferTexture2D(this.target,this.gl.COLOR_ATTACHMENT0+y,this.gl.TEXTURE_2D,this.textures[y].texture,0),E.push(this.gl.COLOR_ATTACHMENT0+y);E.length>1&&this.gl.renderer.drawBuffers(E),this.texture=this.textures[0],h&&(this.gl.renderer.isWebgl2||this.gl.renderer.getExtension("WEBGL_depth_texture"))?(this.depthTexture=new ce(e,{width:r,height:i,minFilter:this.gl.NEAREST,magFilter:this.gl.NEAREST,format:this.stencil?this.gl.DEPTH_STENCIL:this.gl.DEPTH_COMPONENT,internalFormat:e.renderer.isWebgl2?this.stencil?this.gl.DEPTH24_STENCIL8:this.gl.DEPTH_COMPONENT16:this.gl.DEPTH_COMPONENT,type:this.stencil?this.gl.UNSIGNED_INT_24_8:this.gl.UNSIGNED_INT}),this.depthTexture.update(),this.gl.framebufferTexture2D(this.target,this.stencil?this.gl.DEPTH_STENCIL_ATTACHMENT:this.gl.DEPTH_ATTACHMENT,this.gl.TEXTURE_2D,this.depthTexture.texture,0)):(a&&!l&&(this.depthBuffer=this.gl.createRenderbuffer(),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.depthBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.DEPTH_COMPONENT16,r,i),this.gl.framebufferRenderbuffer(this.target,this.gl.DEPTH_ATTACHMENT,this.gl.RENDERBUFFER,this.depthBuffer)),l&&!a&&(this.stencilBuffer=this.gl.createRenderbuffer(),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.stencilBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.STENCIL_INDEX8,r,i),this.gl.framebufferRenderbuffer(this.target,this.gl.STENCIL_ATTACHMENT,this.gl.RENDERBUFFER,this.stencilBuffer)),a&&l&&(this.depthStencilBuffer=this.gl.createRenderbuffer(),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.depthStencilBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.DEPTH_STENCIL,r,i),this.gl.framebufferRenderbuffer(this.target,this.gl.DEPTH_STENCIL_ATTACHMENT,this.gl.RENDERBUFFER,this.depthStencilBuffer))),this.gl.renderer.bindFramebuffer({target:this.target})}setSize(e,r){if(!(this.width===e&&this.height===r)){this.width=e,this.height=r,this.gl.renderer.bindFramebuffer(this);for(let i=0;i<this.textures.length;i++)this.textures[i].width=e,this.textures[i].height=r,this.textures[i].needsUpdate=!0,this.textures[i].update(),this.gl.framebufferTexture2D(this.target,this.gl.COLOR_ATTACHMENT0+i,this.gl.TEXTURE_2D,this.textures[i].texture,0);this.depthTexture?(this.depthTexture.width=e,this.depthTexture.height=r,this.depthTexture.needsUpdate=!0,this.depthTexture.update(),this.gl.framebufferTexture2D(this.target,this.gl.DEPTH_ATTACHMENT,this.gl.TEXTURE_2D,this.depthTexture.texture,0)):(this.depthBuffer&&(this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.depthBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.DEPTH_COMPONENT16,e,r)),this.stencilBuffer&&(this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.stencilBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.STENCIL_INDEX8,e,r)),this.depthStencilBuffer&&(this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,this.depthStencilBuffer),this.gl.renderbufferStorage(this.gl.RENDERBUFFER,this.gl.DEPTH_STENCIL,e,r))),this.gl.renderer.bindFramebuffer({target:this.target})}}};var Ve=class extends be{constructor(e,{attributes:r={}}={}){Object.assign(r,{position:{size:2,data:new Float32Array([-1,-1,3,-1,-1,3])},uv:{size:2,data:new Float32Array([0,0,2,0,0,2])}}),super(e,r)}};var zi={plasma:{color:"#F25BD0",strands:6,crackle:.85,flares:.65,glow:.9,sparks:.6,particleCount:15e3,fill:.5,motion:"rise",particleShape:"square",depth:.6,sway:.5,twinkle:.5,haze:.7,dustSpeed:1},aurora:{color:"#5CFFC8",strands:5,crackle:.6,flares:.5,glow:.8,sparks:.45,particleCount:15e3,fill:.5,motion:"rise",particleShape:"square",depth:.6,sway:.5,twinkle:.5,haze:.7,dustSpeed:1},nebula:{color:"#9478FF",strands:6,crackle:1,flares:.5,glow:.9,sparks:.6,particleCount:18e3,fill:.45,motion:"rise",particleShape:"square",depth:.5,sway:.4,twinkle:.6,haze:.8,dustSpeed:1.2},ember:{color:"#FF8A2A",strands:5,crackle:.9,flares:.8,glow:1,sparks:.8,particleCount:12e3,fill:.35,motion:"rise",particleShape:"round",depth:.7,sway:.3,twinkle:.7,haze:.9,dustSpeed:1.6},frost:{color:"#BFE6FF",strands:3,crackle:.3,flares:.3,glow:.6,sparks:.2,particleCount:16e3,fill:.6,motion:"fall",particleShape:"round",depth:.8,sway:.4,twinkle:.4,haze:.5,dustSpeed:.7},solar:{color:"#FFD36E",strands:6,crackle:.7,flares:1,glow:1.1,sparks:.5,particleCount:15e3,fill:.55,motion:"orbit",particleShape:"square",depth:.6,sway:.7,twinkle:.5,haze:.8,dustSpeed:1},eclipse:{color:"#FFFFFF",strands:4,crackle:.5,flares:.4,glow:.7,sparks:.35,particleCount:14e3,fill:.5,motion:"drift",particleShape:"square",depth:.7,sway:.5,twinkle:.5,haze:.5,dustSpeed:.8},abyss:{color:"#3F7BFF",strands:5,crackle:.55,flares:.6,glow:.9,sparks:.4,particleCount:2e4,fill:.8,motion:"orbit",particleShape:"round",depth:.8,sway:.8,twinkle:.5,haze:.6,dustSpeed:.9}},us={rise:0,fall:1,drift:2,orbit:3},ds={square:0,round:1},Ni=8,It=4,ps=4e4,xe=256,gs=45e5,ms=2.2,xs=7,it=[1,1,1],Bt=[0,0,0],N=(t,e,r)=>Math.min(Math.max(t,e),r),fe=(t,e,r)=>{let i=N((r-t)/(e-t),0,1);return i*i*(3-2*i)},Di=t=>1-Math.pow(1-t,3),Le=(t,e,r)=>t.map((i,s)=>i+(e[s]-i)*r),Pi=t=>t-Math.PI*2*Math.floor((t+Math.PI)/(Math.PI*2)),vs=(t,e)=>{try{let r=document.createElement("canvas").getContext("2d");if(!r)return e;r.fillStyle="#000000",r.fillStyle=t;let i=r.fillStyle;if(i.startsWith("#")){let n=parseInt(i.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}let s=i.match(/[\d.]+/g);return!s||s.length<3?e:[Number(s[0])/255,Number(s[1])/255,Number(s[2])/255]}catch{return e}},ys=t=>t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4),Es=t=>t<=.0031308?t*12.92:1.055*Math.pow(t,1/2.4)-.055,Ge=t=>{let[e,r,i]=t.map(ys),s=Math.cbrt(.4122214708*e+.5363325363*r+.0514459929*i),n=Math.cbrt(.2119034982*e+.6806995451*r+.1073969566*i),a=Math.cbrt(.0883024619*e+.2817188376*r+.6299787005*i);return[.2104542553*s+.793617785*n-.0040720468*a,1.9779984951*s-2.428592205*n+.4505937099*a,.0259040371*s+.7827717662*n-.808675766*a]},Ut=([t,e,r])=>{let i=Math.pow(t+.3963377774*e+.2158037573*r,3),s=Math.pow(t-.1055613458*e-.0638541728*r,3),n=Math.pow(t-.0894841775*e-1.291485548*r,3);return[4.0767416621*i-3.3077115913*s+.2309699292*n,-1.2684380046*i+2.6097574011*s-.3413193965*n,-.0041960863*i-.7034186147*s+1.707614701*n].map(a=>N(Es(N(a,0,1)),0,1))},Li=(t,e,r)=>Ut(Le(Ge(t),Ge(e),r)),Pe=(t,e,r,i)=>{let[s,n,a]=Ge(t),l=Math.hypot(n,a)*i,h=Math.atan2(a,n)+e*Math.PI/180;return Ut([N(s+r,0,1),l*Math.cos(h),l*Math.sin(h)])},re=(t,e,r,i)=>{let[,s,n]=Ge(t),a=Math.max(Math.hypot(s,n)*i,.02),l=Math.atan2(n,s)+e*Math.PI/180;return Ut([N(r,0,1),a*Math.cos(l),a*Math.sin(l)])},ws=(t,e)=>{if(e){let r=re(t,0,Math.min(Ge(t)[0],.62),1.15);return{rim:r,rimHot:r,rimMid:r,rimDeep:re(t,0,.72,.8),spark:re(t,0,.6,1.2),sparkGlow:re(t,0,.78,.8),haze:re(t,0,.8,.6),edge:re(t,0,.72,.8),tones:[re(t,0,.56,1.1),re(t,16,.6,1.05),re(t,-16,.5,1.1),re(t,0,.66,.9),re(t,0,.74,.7)]}}return{rim:t,rimHot:Le(t,it,.72),rimMid:Le(t,Bt,.15),rimDeep:Le(t,Bt,.45),spark:Le(t,it,.45),sparkGlow:Pe(t,0,-.15,1),haze:Le(t,Bt,.6),edge:Pe(t,0,-.3,.9),tones:[Pe(t,0,-.06,1),Pe(t,16,-.02,1),Pe(t,-16,-.12,1.05),Pe(Li(t,it,.25),0,.04,1),Li(t,it,.7)]}},Vt=t=>{let e=t>>>0;return()=>{e=e+1831565813>>>0;let r=e;return r=Math.imul(r^r>>>15,r|1),r^=r+Math.imul(r^r>>>7,r|61),((r^r>>>14)>>>0)/4294967296}},Ms=()=>{let t=Vt(99),e=[[6,12,.6,1.6],[18,34,1.5,3.5],[40,70,3,7],[80,130,6,12]],r={harmonics:[],rates:[],phases:[],flareHarmonics:[],flareRates:[],flarePhases:[]};for(let i=0;i<Ni;i++){e.forEach(([n,a,l,h])=>{r.harmonics.push(Math.round(n+t()*(a-n))),r.rates.push((l+t()*(h-l))*(t()<.5?-1:1)),r.phases.push(t()*Math.PI*2)});for(let n=0;n<3;n++)r.flareHarmonics.push(4+Math.floor(t()*6)),r.flareRates.push((.4+t()*.8)*(t()<.5?-1:1)),r.flarePhases.push(t()*Math.PI*2);let s=i===0;r.flareHarmonics.push(s?.75:.95+t()*.3),r.flareRates.push(s?1.15:.8+t()*.2),r.flarePhases.push(s?1:.7+t()*.25)}return r},Fs=t=>{let e=Vt(1337),r=Math.max(1,Math.ceil(t/xe)),i=new Float32Array(xe*r*4),s=new Float32Array(xe*r*4),n=0,a=0;for(;n<t&&a<t*80;){a++;let l,h,c;if(e()<.28){let f=e()*Math.PI*2,u=.87+Math.sqrt(e())*.105;if(l=Math.cos(f)*u,h=Math.sin(f)*u,e()>fe(-.6,.3,-h))continue;let d=e();c=d<.5?3:d<.8?2:1}else{l=e()*2-1,h=e()*2-1;let f=Math.hypot(l,h);if(f>.975)continue;let u=Math.pow(fe(-.25,.85,-h),1.3),d=fe(.66,.96,f)*fe(-.7,.3,-h),p=Math.max(u,d*.9);if(e()>.012+.988*p)continue;if(p<.12)c=4;else{let g=e();c=g<.32?0:g<.52?1:g<.8?2:3}}let o=Math.sqrt(Math.max(0,.95-l*l-h*h));i[n*4]=l,i[n*4+1]=h,i[n*4+2]=(e()*2-1)*o,i[n*4+3]=c,s[n*4]=c===4?1.8:e()<.22?2.1:1.3,s[n*4+1]=e(),s[n*4+2]=2.5+e()*3.5,s[n*4+3]=.16+e()*.26,n++}return{home:i,seed:s,count:n,rows:r}},Ot=`#version 300 es
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
`,ki=`
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
${ki}
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
${ki}
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
`,Ss=({preset:t="plasma",color:e,theme:r="dark",size:i=.7,strands:s,crackle:n,flares:a,glow:l,sparks:h,particleCount:c,fill:o,motion:f,particleShape:u,depth:d,sway:p,twinkle:g,haze:m,speed:x=1,dustSpeed:R,interactive:E=!0,hoverStrength:y=.7,intro:F=!0,paused:M=!1,className:P="",style:V})=>{let O=Oe(null),L=Oe(null),k=Oe(null),I=zi[t]||zi.plasma,b=(X,Q)=>X??I[Q],T=b(e,"color"),ve=Et(()=>{let X=r==="light";return{light:X,palette:ws(vs(T,[.95,.36,.82]),X)}},[T,r]);return je(()=>{L.current={...ve,size:i,strands:b(s,"strands"),crackle:b(n,"crackle"),flares:b(a,"flares"),glow:b(l,"glow"),sparks:b(h,"sparks"),particleCount:b(c,"particleCount"),fill:b(o,"fill"),motion:b(f,"motion"),particleShape:b(u,"particleShape"),depth:b(d,"depth"),sway:b(p,"sway"),twinkle:b(g,"twinkle"),haze:b(m,"haze"),dustSpeed:b(R,"dustSpeed"),speed:x,interactive:E,hoverStrength:y,intro:F,paused:M},k.current?.()}),je(()=>{let X=O.current;if(!X)return;let Q=new Ue({alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1}),w=Q.gl;if(!Q.isWebgl2){w.getExtension("WEBGL_lose_context")?.loseContext();return}let ue=w.canvas;ue.style.display="block",ue.style.width="100%",ue.style.height="100%",ue.setAttribute("aria-hidden","true"),X.appendChild(ue);let st=!!w.getExtension("EXT_color_buffer_float"),qe=st||!!w.getExtension("EXT_color_buffer_half_float"),nt=qe?1:.25,at=new Ve(w),de=new ce(w),Ae=Ms(),Ne=new De(w,{width:1,height:1,depth:!1,type:qe?w.HALF_FLOAT:w.UNSIGNED_BYTE,format:w.RGBA,internalFormat:qe?w.RGBA16F:w.RGBA,minFilter:w.NEAREST,magFilter:w.NEAREST}),ke=new Array(It*4).fill(0),A={uCenter:{value:[0,0]},uRadius:{value:1},uDpr:{value:1},uLine:{value:.6},uTime:{value:0},uFrame:{value:0},uBins:{value:420},uStrands:{value:5},uCrackle:{value:.6},uFlares:{value:.5},uGlow:{value:.8},uHaze:{value:.7},uFill:{value:.5},uPresence:{value:0},uUnfold:{value:0},uBloom:{value:0},uInside:{value:0},uEncode:{value:nt},uRim:{value:[1,1,1]},uRimHot:{value:[1,1,1]},uRimMid:{value:[1,1,1]},uRimDeep:{value:[1,1,1]},uSpark:{value:[1,1,1]},uSparkGlow:{value:[1,1,1]},uHazeColor:{value:[0,0,0]},uEdgeColor:{value:[0,0,0]},uHeat:{value:[0,0,0,0]},uHarmonics:{value:Ae.harmonics},uRates:{value:Ae.rates},uPhases:{value:Ae.phases},uFlareHarmonics:{value:Ae.flareHarmonics},uFlareRates:{value:Ae.flareRates},uFlarePhases:{value:Ae.flarePhases},uArcs:{value:ke}},ye={uDustTime:{value:0},uTurn:{value:[0,0]},uMotion:{value:0},uFill:A.uFill,tHome:{value:de},tSeed:{value:de}},K={...ye,tOffset:{value:de},uStirred:{value:0},uCenter:A.uCenter,uViewport:{value:[1,1]},uRadius:A.uRadius,uDpr:A.uDpr,uDepth:{value:.6},uTwinkle:{value:.5},uPointScale:{value:1},uReveal:{value:0},uEncode:{value:nt},uTones:{value:new Array(15).fill(1)},uRimTone:{value:[1,1,1]},uShape:{value:0}},J={...ye,tOffset:{value:de},tVelocity:{value:de},uDt:{value:.016},uReset:{value:1},uBrush:{value:[0,0,0,0]},uBrushPower:{value:0},uKick:{value:[0,0,0,0]}},qt={tScene:{value:Ne.texture},uLight:{value:0},uDecode:{value:1/nt}},Ht=S=>(S.setBlendFunc(w.ONE,w.ONE),S),Bi=new me(w,{geometry:at,program:Ht(new ge(w,{vertex:Ot,fragment:Ts,uniforms:A,transparent:!0,depthTest:!1,depthWrite:!1}))}),Oi=Ht(new ge(w,{vertex:_s,fragment:Rs,uniforms:K,transparent:!0,depthTest:!1,depthWrite:!1})),pe=qe?new me(w,{geometry:at,program:new ge(w,{vertex:Ot,fragment:bs,uniforms:J,depthTest:!1,depthWrite:!1})}):null,Ui=new me(w,{geometry:at,program:new ge(w,{vertex:Ot,fragment:As,uniforms:qt,depthTest:!1,depthWrite:!1})}),lt=S=>{S&&(w.deleteFramebuffer(S.buffer),S.textures.forEach(v=>w.deleteTexture(v.texture)))},Xt=S=>new De(w,{width:xe,height:S,color:2,depth:!1,type:st?w.FLOAT:w.HALF_FLOAT,format:w.RGBA,internalFormat:st?w.RGBA32F:w.RGBA16F,minFilter:w.NEAREST,magFilter:w.NEAREST}),Wt=(S,v)=>new ce(w,{image:S,width:xe,height:v,type:w.FLOAT,format:w.RGBA,internalFormat:w.RGBA32F,minFilter:w.NEAREST,magFilter:w.NEAREST,generateMipmaps:!1,flipY:!1}),B=null,Yt=()=>{B&&(B.mesh.geometry.remove(),w.deleteTexture(B.home.texture),w.deleteTexture(B.seed.texture),lt(B.read),lt(B.write),B=null)},Qt=()=>{!pe||!B||!B.read||!B.write||(J.tOffset.value=de,J.tVelocity.value=de,J.uReset.value=1,Q.render({scene:pe,target:B.read,clear:!1}),Q.render({scene:pe,target:B.write,clear:!1}),J.uReset.value=0)},Vi=S=>{let v=N(Math.round(S/100)*100,0,ps);if(B&&B.requested===v)return;if(Yt(),!v){B=null;return}let _=Fs(v),Z=new Float32Array(_.count);for(let se=0;se<_.count;se++)Z[se]=se;let $=new be(w,{aIndex:{size:1,data:Z}});B={requested:v,rows:_.rows,home:Wt(_.home,_.rows),seed:Wt(_.seed,_.rows),mesh:new me(w,{mode:w.POINTS,geometry:$,program:Oi}),read:pe?Xt(_.rows):null,write:pe?Xt(_.rows):null},ye.tHome.value=B.home,ye.tSeed.value=B.seed,Qt(),Ee=0},He=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,j=Vt(913),ae=1,le=1,Ie=0,ht=performance.now(),ot=0,jt=0,ct=0,he=0,Xe=!0,ft=!0,ie=0,Ee=0,ut=0,we=null,dt=.3,Me=[],G={x:0,y:0,inside:!1,fresh:!0},D={angle:0,velocity:0,power:0,near:0},U={x:0,y:0,vx:0,vy:0},q={x:0,y:0,vx:0,vy:0},pt=!1,Gi=()=>{ae=Math.max(1,X.clientWidth),le=Math.max(1,X.clientHeight),Q.dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(gs/(ae*le))),Q.setSize(ae,le),Ne.setSize(w.canvas.width,w.canvas.height)},Zt=()=>{pt=!0,Fe()},gt=(S,v)=>{Me.length>=It||Me.push({start:S,span:(.05+j()*.07)*(j()<.5?-1:1),curl:.02+j()*.04,life:0,duration:.2+j()*.2,drift:(j()-.5)*.3,strength:v})},$t=S=>{if(Ie=0,pt&&(pt=!1,Gi()),!ft)return;let v=L.current,_=Math.min(.05,Math.max(1/240,(S-ht)/1e3));if(ht=S,!v)return;let Z=!v.paused&&!He;he=v.intro&&!He?Math.min(1,he+_/ms):1;let $=Di(fe(0,.42,he)),se=Di(fe(0,.32,he)),mt=Math.sin(Math.PI*fe(.22,.78,he))*.35,ee=Math.max(8,N(v.size,.1,1.5)*Math.min(ae,le)/2),Se=v.interactive&&!He?N(v.hoverStrength,0,1):0,Ye=G.x-ae/2,Qe=le/2-G.y,qi=Math.hypot(Ye,Qe),xt=G.inside?Se:0;D.power<.02&&(D.angle=Math.atan2(Qe,Ye),D.velocity=0);let Hi=Pi(Math.atan2(Qe,Ye)-D.angle);D.velocity+=(120*Hi-19*D.velocity)*_,D.angle=Pi(D.angle+D.velocity*_),D.power+=(xt-D.power)*(1-Math.exp(-_/(xt>D.power?.3:.55)));let Xi=Math.exp(-Math.pow((qi-ee)/(ee*.45),2));D.near+=(Xi-D.near)*(1-Math.exp(-_/.15)),ie*=Math.exp(-_/.7);let Ce=Ye/ee,ze=Qe/ee;Math.hypot(Ce-U.x,ze-U.y)>.6&&(G.fresh=!0),G.fresh&&(U.x=Ce,U.y=ze,U.vx=0,U.vy=0,G.fresh=!1);let ar=1-Math.exp(-_/.05);U.vx+=((Ce-U.x)/_-U.vx)*ar,U.vy+=((ze-U.y)/_-U.vy)*ar,U.x=Ce,U.y=ze;let vt=Math.hypot(U.vx,U.vy),lr=vt>4?4/vt:1,Wi=Math.exp(-Math.max(0,Math.hypot(Ce,ze)-1)*6),hr=G.inside?Se*Wi*$:0;if(ut=ut*Math.exp(-_/1.2)+hr*Math.min(vt,4)*_,Z){let te=1+ie*.6+D.power*D.near*.3,H=_*Math.max(0,v.speed)*2*te;ot+=H,jt+=_*Math.max(0,v.dustSpeed)*(1+ie*.4),ct+=_*Math.max(0,v.dustSpeed);let Qi=N(v.crackle+ie*.5,0,1.5);if(v.sparks>.01&&he>.55&&(dt-=H*v.sparks*2*(.6+Qi*.6),dt<=0)){let Te=D.power*D.near,_e=j()<Te*.7?D.angle+(j()-.5)*.8:j()<.7?Math.PI/2+(j()-.5)*1.5:j()*Math.PI*2;gt(_e,.8+Te*.6+ie*.4),dt=.15+j()*.6}for(let Te=Me.length-1;Te>=0;Te--){let _e=Me[Te];_e.life+=H,_e.start+=_e.drift*H,_e.life>=_e.duration&&Me.splice(Te,1)}}else Me.length=0;for(let te=0;te<It;te++){let H=Me[te];ke[te*4]=H?H.start:0,ke[te*4+1]=H?H.span:0,ke[te*4+2]=H?H.curl:0,ke[te*4+3]=H?Math.sin(Math.PI*H.life/H.duration)*H.strength:0}Vi(v.particleCount);let ne=v.palette;A.uCenter.value=[ae/2,le/2],A.uRadius.value=ee,A.uDpr.value=Q.dpr,A.uLine.value=Math.max(.6,ee*.0035),A.uTime.value=ot,A.uFrame.value=Math.floor(ot*24)%1e5,A.uBins.value=N(Math.round(Math.PI*2*ee/2.6),240,900),A.uStrands.value=Math.round(N(v.strands,1,Ni)),A.uCrackle.value=N(v.crackle,0,1)+ie*.5+mt,A.uFlares.value=N(v.flares,0,1),A.uGlow.value=N(v.glow,0,2)*(1+ie*.5+mt)*(v.light?.35:1),A.uHaze.value=N(v.haze,0,2)*(v.light?.6:1),A.uFill.value=N(v.fill,0,1),A.uPresence.value=$,A.uUnfold.value=se,A.uBloom.value=$*$,A.uInside.value=fe(.2,.95,he),A.uRim.value=ne.rim,A.uRimHot.value=ne.rimHot,A.uRimMid.value=ne.rimMid,A.uRimDeep.value=ne.rimDeep,A.uSpark.value=ne.spark,A.uSparkGlow.value=ne.sparkGlow,A.uHazeColor.value=ne.haze,A.uEdgeColor.value=ne.edge,A.uHeat.value=[D.angle,D.near,D.power*$,0],ye.uDustTime.value=jt;let or=G.inside?Se*$:0,cr=N(Ce,-1.6,1.6)*or,fr=N(ze,-1.6,1.6)*or;q.vx+=(40*(cr-q.x)-11*q.vx)*_,q.vy+=(40*(fr-q.y)-11*q.vy)*_,q.x+=q.vx*_,q.y+=q.vy*_;let ur=N(v.sway,0,1);ye.uTurn.value=[ur*.42*Math.sin(ct*.23)+q.x*.3,ur*.12*Math.sin(ct*.17+1.3)-q.y*.16],ye.uMotion.value=us[v.motion]??0,K.uViewport.value=[ae,le],K.uDepth.value=N(v.depth,0,1),K.uTwinkle.value=N(v.twinkle,0,1),K.uPointScale.value=Math.max(1,ee/491),K.uReveal.value=fe(.18,1,he),K.uTones.value=ne.tones.flat(),K.uRimTone.value=ne.rim,K.uShape.value=ds[v.particleShape]??0;let W=B;W&&pe&&(ut>.002||we)&&(Ee=xs);let yt=!1;if(W&&W.read&&W.write&&pe&&Ee>0){J.uDt.value=Math.min(_,1/30),J.uBrush.value=[U.x,U.y,U.vx*lr,U.vy*lr],J.uBrushPower.value=hr,J.uKick.value=we?[we.x,we.y,we.strength,0]:[0,0,0,0],J.tOffset.value=W.read.textures[0],J.tVelocity.value=W.read.textures[1],Q.render({scene:pe,target:W.write,clear:!1});let te=W.read;W.read=W.write,W.write=te,Ee-=_,yt=Ee>0,yt||(Ee=0,Qt())}we=null,K.uStirred.value=yt?1:0,K.tOffset.value=W&&W.read?W.read.textures[0]:de,w.clearColor(0,0,0,0),Q.render({scene:Bi,target:Ne,clear:!0}),B&&Q.render({scene:B.mesh,target:Ne,clear:!1}),qt.uLight.value=v.light?1:0,Q.render({scene:Ui,clear:!1});let Yi=Math.abs(xt-D.power)>.002||ie>.002||Ee>0||Math.abs(D.velocity)>.01||Math.hypot(q.vx,q.vy,q.x-cr,q.y-fr)>.001;Xe&&(Z||he<1||Yi)&&(Ie=requestAnimationFrame($t))},Fe=()=>{Ie||!Xe||!ft||(ht=performance.now(),Ie=requestAnimationFrame($t))},Kt=S=>{let v=X.getBoundingClientRect(),_=S.clientX-v.left,Z=S.clientY-v.top;return{x:_,y:Z,inside:_>=0&&Z>=0&&_<=v.width&&Z<=v.height}},Jt=S=>{let v=Kt(S);v.inside&&!G.inside&&(G.fresh=!0),G.x=v.x,G.y=v.y,G.inside=v.inside,v.inside&&Fe()},er=S=>{let v=L.current,_=Kt(S);if(!v||!v.interactive||He||!_.inside)return;G.inside||(G.fresh=!0),G.x=_.x,G.y=_.y,G.inside=!0;let Z=Math.max(8,N(v.size,.1,1.5)*Math.min(ae,le)/2),$=(_.x-ae/2)/Z,se=(le/2-_.y)/Z;if(Math.hypot($,se)>1.3)return;let ee=N(v.hoverStrength,0,1);we={x:$,y:se,strength:ee*1.2},ie=Math.max(ie,ee);let Se=Math.atan2(se,$);gt(Se+(j()-.5)*.5,1.3),gt(Se+Math.PI+(j()-.5)*1.2,1.1),Fe()},We=()=>{G.inside=!1,Fe()},tr=S=>{S.relatedTarget||We()},rr=S=>{S.pointerType==="touch"&&We()},ir=()=>{document.hidden||Fe()};window.addEventListener("pointermove",Jt,{passive:!0}),window.addEventListener("pointerdown",er,{passive:!0}),window.addEventListener("pointerout",tr,{passive:!0}),window.addEventListener("pointerup",rr,{passive:!0}),window.addEventListener("blur",We),document.addEventListener("visibilitychange",ir);let sr=new ResizeObserver(Zt);sr.observe(X);let nr=new IntersectionObserver(([S])=>{Xe=S.isIntersecting,Fe()});return nr.observe(X),k.current=Fe,Zt(),()=>{ft=!1,Xe=!1,cancelAnimationFrame(Ie),sr.disconnect(),nr.disconnect(),window.removeEventListener("pointermove",Jt),window.removeEventListener("pointerdown",er),window.removeEventListener("pointerout",tr),window.removeEventListener("pointerup",rr),window.removeEventListener("blur",We),document.removeEventListener("visibilitychange",ir),k.current=null,Yt(),lt(Ne),w.getExtension("WEBGL_lose_context")?.loseContext(),ue.parentNode&&ue.parentNode.removeChild(ue)}},[]),z("div",{ref:O,className:`crystalized-ball ${P}`.trim(),style:V})},Ii=Ss;gr("crystalized-ball",Ii);})();
