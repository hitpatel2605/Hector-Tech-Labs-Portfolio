import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from './projects.ts';
import {
  CURSOR_RADIUS,
  CURSOR_STRENGTH,
  FONT_FAMILY,
  FONT_WEIGHT_MEDIUM,
  CUBE_TEXT_COLOR,
  CUBE_FONT_SIZE,
  CUBE_LETTER_SPACING,
  SPREAD_DISTANCE,
  TEXT_WIDTH,
  TEXT_POSITION_Y,
} from './config.ts';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

let W = window.innerWidth;
let H = window.innerHeight;

const canvas = document.getElementById('c');
let renderer = null;
let composer = null;
let hasWebGL = true;

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000);
  renderer.debug.onShaderError = (gl, _program, vertexShader, fragmentShader) => {
    console.error(
      'Shader compile error:',
      gl.getShaderInfoLog(vertexShader),
      gl.getShaderInfoLog(fragmentShader)
    );
  };
} catch {
  hasWebGL = false;
  if (canvas) canvas.style.display = 'none';
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 80);
camera.position.set(0, 2.4, 9);

if (hasWebGL && renderer) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.24, 0.35, 0.38);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}

// ---------- targets (75k desktop, 40k mobile)
function rng(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isMobile = W < 768;
const N = isMobile ? 40000 : 75000;
const r = rng(7);
const gauss = () =>
  Math.sqrt(-2 * Math.log(Math.max(r(), 1e-6))) * Math.cos(6.2831853 * r());
const bez = (a, b, c, t) =>
  [0, 1, 2].map((i) => (1 - t) ** 2 * a[i] + 2 * (1 - t) * t * b[i] + t * t * c[i]);

const tree = new Float32Array(N * 3);
const sph = new Float32Array(N * 3);
const cube = new Float32Array(N * 3);
const rand = new Float32Array(N * 4);
const edge = new Float32Array(N);

const br = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * 6.283 + r() * 0.45;
  const re = 1.7 + r() * 1.8;
  const startY = i < 6 ? 0.25 + r() * 0.55 : 1.1 + r() * 0.4;
  return {
    p0: [0, startY, 0],
    p1: [Math.cos(a) * re * 0.4, startY + 1.0, Math.sin(a) * re * 0.4],
    p2: [Math.cos(a) * re - 0.3, 3.1 + r() * 0.9, Math.sin(a) * re * 0.65],
  };
});
br.push({ p0: [0, 0.4, 0], p1: [1.5, 1.8, 0.1], p2: [3.4, 4.2, 0.1] });
br.push({ p0: [0, 0.35, 0], p1: [-1.6, 1.7, -0.1], p2: [-3.5, 4.0, -0.1] });
br.push({ p0: [0, 0.3, 0], p1: [0.9, 1.4, 0.8], p2: [2.2, 3.3, 1.2] });
br.push({ p0: [0, 0.3, 0], p1: [-0.9, 1.4, -0.8], p2: [-2.4, 3.3, -1.1] });

const CC = [0, 2.6, 0];
const h = 1.2;
const cs = [...Array(8)].map((_, i) => [
  i & 1 ? h : -h,
  i & 2 ? h : -h,
  i & 4 ? h : -h,
]);
const ed = [];
for (let i = 0; i < 8; i++) {
  for (let j = i + 1; j < 8; j++) {
    const d = i ^ j;
    if (d === 1 || d === 2 || d === 4) ed.push([i, j]);
  }
}

for (let i = 0; i < N; i++) {
  const k = i * 3;
  const q = r();
  let x, y, z, g;
  if (q < 0.14) {
    const t = r();
    const ra = 0.22 * (1 - t) * (1 - t) + 0.06 + 0.14 * t * t;
    x = gauss() * ra;
    z = gauss() * ra;
    y = t * 1.5;
    g = 0;
  } else if (q < 0.46) {
    const b = br[(r() * br.length) | 0];
    const t = r();
    const p = bez(b.p0, b.p1, b.p2, t);
    const j = 0.05 + 0.18 * t;
    x = p[0] + gauss() * j;
    y = p[1] + gauss() * j;
    z = p[2] + gauss() * j;
    g = 1;
  } else {
    let dx, dy, dz, l;
    do {
      dx = r() * 2 - 1;
      dy = r() * 2 - 1;
      dz = r() * 2 - 1;
      l = dx * dx + dy * dy + dz * dz;
    } while (l > 1);
    const n =
      1 +
      0.28 *
        Math.sin(dx * 3.1 + 1.3) *
        Math.sin(dy * 2.7 + 0.4) *
        Math.sin(dz * 3.3 + 2.1);
    x = -0.3 + dx * 3.45 * n;
    y = 3.35 + dy * 1.15 * n;
    z = dz * 1.7 * n;
    g = 2;
  }
  tree.set([x, y, z], k);

  {
    const a = r() * 6.283;
    const c = r() * 2 - 1;
    const rr = 1.1 * Math.cbrt(r()) ** 0.8;
    const s = Math.sqrt(1 - c * c);
    sph.set([rr * s * Math.cos(a), CC[1] + rr * c, rr * s * Math.sin(a)], k);
  }

  if (r() < 0.45) {
    const [a, b] = ed[(r() * 12) | 0];
    const t = r();
    cube.set(
      [0, 1, 2].map(
        (m) => CC[m] + cs[a][m] + (cs[b][m] - cs[a][m]) * t + gauss() * 0.012
      ),
      k
    );
    edge[i] = 1;
  } else {
    const ax = (r() * 3) | 0;
    const sg = r() < 0.5 ? -h : h;
    const p = [(r() * 2 - 1) * h, (r() * 2 - 1) * h, (r() * 2 - 1) * h];
    p[ax] = sg;
    cube.set([CC[0] + p[0], CC[1] + p[1], CC[2] + p[2]], k);
  }
  rand.set([r(), 0.6 + r() * 0.9, r(), g], i * 4);
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(tree, 3));
geo.setAttribute('aSphere', new THREE.BufferAttribute(sph, 3));
geo.setAttribute('aCube', new THREE.BufferAttribute(cube, 3));
geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
geo.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1));

const textTargets = new Float32Array(cube);
const textAttr = new THREE.BufferAttribute(textTargets, 3);
geo.setAttribute('aText', textAttr);

function buildTextTargets() {
  const tCanvas = document.createElement('canvas');
  tCanvas.width = 2048;
  tCanvas.height = 256;
  const tCtx = tCanvas.getContext('2d');
  if (!tCtx) return;

  tCtx.clearRect(0, 0, 2048, 256);
  tCtx.fillStyle = '#ffffff';
  tCtx.textAlign = 'center';
  tCtx.textBaseline = 'middle';
  tCtx.font = `700 132px ${FONT_FAMILY}`;
  tCtx.fillText('HECTOR TECH LABS', 1024, 128);

  const imgData = tCtx.getImageData(0, 0, 2048, 256).data;
  const pts = [];
  let minX = 2048;
  let maxX = 0;
  let minY = 256;
  let maxY = 0;
  for (let y = 0; y < 256; y += 2) {
    for (let x = 0; x < 2048; x += 2) {
      if (imgData[(y * 2048 + x) * 4 + 3] > 128) {
        pts.push(x, y);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const count = pts.length / 2;
  if (count === 0) return;

  const spanX = Math.max(maxX - minX, 1);
  const cxMid = (minX + maxX) * 0.5;
  const cyMid = (minY + maxY) * 0.5;
  const scale = TEXT_WIDTH / spanX;

  for (let i = 0; i < N; i++) {
    const pick = ((Math.random() * count) | 0) * 2;
    const wx = (pts[pick] - cxMid) * scale;
    const wy = TEXT_POSITION_Y - (pts[pick + 1] - cyMid) * scale;
    const wz = (Math.random() * 2 - 1) * 0.03;
    if (Number.isFinite(wx) && Number.isFinite(wy) && Number.isFinite(wz)) {
      textTargets[i * 3] = wx;
      textTargets[i * 3 + 1] = wy;
      textTargets[i * 3 + 2] = wz;
    }
  }
  textAttr.needsUpdate = true;
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(buildTextTargets).catch(buildTextTargets);
} else {
  buildTextTargets();
}

const vert = `attribute vec3 aSphere;attribute vec3 aCube;attribute vec4 aRand;attribute float aEdge;attribute vec3 aText;
uniform float uTime,uIntro,uMorph,uSize,uWarp,uReflect,uCubeScale,uCursorFalloff,uCursorStrength,uSpread,uText;uniform mat3 uCubeRot;uniform vec3 uCur[4];uniform vec4 uCW;uniform vec3 uCubeCenter,uCubeOffset,uCursor;
varying vec3 vColor;varying float vAlpha;
const vec3 CYAN=vec3(.31,.85,1.);const vec3 BLUE=vec3(.10,.26,1.);const vec3 VIOLET=vec3(.54,.36,1.);
void main(){
 float stag=aRand.x*.45;float tI=smoothstep(stag*.8,stag*.8+.55,uIntro);float tM=smoothstep(stag,stag+.55,uMorph);
 vec3 cube=uCubeRot*(aCube-uCubeCenter)*uCubeScale+uCubeCenter+uCubeOffset;
 vec3 p=mix(aSphere,position,tI);p=mix(p,cube,tM);
 p+=normalize(aRand.xyz-.5+.0001)*uSpread*(2.0+3.0*aRand.y);
 float tT=smoothstep(aRand.x*.4,aRand.x*.4+.6,uText);
 p=mix(p,aText,tT);
 float arc=sin(3.14159*tI)*.5+sin(3.14159*tM)*1.1+sin(3.14159*uText)*1.1;
 p+=vec3(sin(aRand.z*6.283+uTime*.6),cos(aRand.z*12.57+uTime*.5),sin(aRand.z*9.42+uTime*.4))*arc*(.6+aRand.y*.5);
 p+=vec3(sin(uTime*.5+aRand.z*20.),cos(uTime*.4+aRand.z*31.),sin(uTime*.45+aRand.z*17.))*.035*(1.-tM*.7);
 vec3 d3=p-uCursor;float f=exp(-dot(d3.xy,d3.xy)*2.2);p.z-=f*.45;p.xy+=normalize(d3.xy+1e-4)*f*.12;
 if(uReflect>.5)p.y=-p.y;
 float rad=clamp(length(position.xz)/3.,0.,1.);
 float rootGlow=(aRand.w<1.5)?exp(-position.y*.65)*.45:0.;
 vec3 tc=mix(mix(CYAN,BLUE,smoothstep(0.,.45,rad)),VIOLET,smoothstep(.45,1.,rad))+CYAN*rootGlow*.35;
 vec3 cc=aEdge>.5?mix(CYAN,VIOLET,smoothstep(-1.2,1.2,(aCube.y-uCubeCenter.y)+(aCube.x-uCubeCenter.x)*-.4))*1.5:BLUE*.85;
 vec3 textCol=mix(CYAN,VIOLET,smoothstep(-4.5,4.5,aText.x));
 float textVis=smoothstep(0.8,1.0,uText);
 vColor=mix(mix(tc,cc,tM),textCol,textVis);
 float spreadDim=mix(1.0,0.6,clamp(uSpread,0.0,1.0)*(1.0-smoothstep(0.0,0.5,uText)));
 float baseAlpha=mix(.85+rootGlow*.15,aEdge>.5?1.:.55,tM)*spreadDim;
 vAlpha=mix(baseAlpha,0.85,textVis)*(uReflect>.5?.16:1.);
 vec4 mv=modelViewMatrix*vec4(p,1.);
 float szMul=mix(mix(1.,aEdge>.5?1.3:.8,tM),0.75,clamp(uSpread,0.0,1.0)*(1.0-smoothstep(0.0,0.5,uText)));
 szMul=mix(szMul,1.25,textVis);
 gl_PointSize=aRand.y*uSize*(8./-mv.z)*szMul;gl_Position=projectionMatrix*mv;}`;

const frag = `varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(pow(vColor,vec3(1.25)),smoothstep(.5,.16,d)*vAlpha*.48);}`;

const mk = (refl) =>
  new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uMorph: { value: 0 },
      uSize: { value: (W / 1280) * 2.5 },
      uWarp: { value: 0 },
      uReflect: { value: refl ? 1 : 0 },
      uCubeScale: { value: 1 },
      uCursorFalloff: { value: 90.0 * (0.15 / CURSOR_RADIUS) ** 2 },
      uCursorStrength: { value: CURSOR_STRENGTH },
      uSpread: { value: 0 },
      uText: { value: 0 },
      uCubeRot: { value: new THREE.Matrix3() },
      uCubeCenter: { value: new THREE.Vector3(0, 2.6, 0) },
      uCubeOffset: { value: new THREE.Vector3() },
      uCursor: { value: new THREE.Vector3(99, 99, 0) },
      uCur: { value: [0, 1, 2, 3].map(() => new THREE.Vector3(99, 99, 0)) },
      uCW: { value: new THREE.Vector4(1, 0.45, 0.25, 0.12) },
    },
  });

const m1 = mk(false);
const m2 = mk(true);
[m1, m2].forEach((m) => {
  const p = new THREE.Points(geo, m);
  p.frustumCulled = false;
  scene.add(p);
});

// ---------- rings
const rm = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uDim: { value: 1 },
  },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec2 vUv;uniform float uTime,uPulse,uDim;float ring(float r,float c,float w){return smoothstep(w,0.,abs(r-c));}
void main(){vec2 p=(vUv-.5)*2.;float ang=atan(p.y,p.x),r=length(p);r+=.007*sin(ang*5.+uTime*.3)+.004*sin(ang*11.-uTime*.5);float a=0.;
for(int i=0;i<6;i++){float c=.10+float(i)*.13+.01*sin(uTime*.6+float(i));a+=ring(r,c,.003+.0012*float(i));}
float pr=fract(uTime*.12);a+=ring(r,pr*.9,.012)*(1.-pr)*(.3+uPulse);
vec3 col=mix(vec3(.08,.24,.78),vec3(.42,.26,.82),smoothstep(.3,.95,r));a*=smoothstep(1.,.75,r)*uDim;gl_FragColor=vec4(col*a*.7,a*.7);}`,
});
const rings = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), rm);
rings.rotation.x = -Math.PI / 2;
scene.add(rings);

// ---------- cube text plane
const cv = document.createElement('canvas');
cv.width = 1024;
cv.height = 512;
const cx = cv.getContext('2d');
function fillTextSpaced(text, x, y, spacing) {
  cx.textAlign = 'left';
  const chars = [...text];
  const widths = chars.map((ch) => cx.measureText(ch).width);
  const total =
    widths.reduce((sum, w) => sum + w, 0) +
    spacing * Math.max(chars.length - 1, 0);
  let cursor = x - total / 2;
  for (let i = 0; i < chars.length; i++) {
    cx.fillText(chars[i], cursor, y);
    cursor += widths[i] + spacing;
  }
}

function drawText() {
  cx.clearRect(0, 0, 1024, 512);
  cx.fillStyle = CUBE_TEXT_COLOR;
  cx.textBaseline = 'middle';
  cx.font = `${FONT_WEIGHT_MEDIUM} ${CUBE_FONT_SIZE}px ${FONT_FAMILY}`;
  fillTextSpaced('HECTOR', 512, 190, CUBE_LETTER_SPACING);
  fillTextSpaced('TECH LABS', 512, 340, CUBE_LETTER_SPACING);
}
const tex = new THREE.CanvasTexture(cv);
const tm = new THREE.MeshBasicMaterial({
  map: tex,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  opacity: 0,
});
const tg = new THREE.Group();
const tp = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), tm);
tp.position.z = 1.22;
tg.add(tp);
scene.add(tg);
let faceTextPoints = null;
let faceTextMat = null;
let faceBase = null;
let faceDir = null;
let faceDist = null;
let facePosAttr = null;
let lastFaceSpread = -1;

function buildFaceTextParticles() {
  try {
    drawText();
    tex.needsUpdate = true;
    const data = cx.getImageData(0, 0, 1024, 512).data;
    const pts = [];
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 1024; x++) {
        if (data[(y * 1024 + x) * 4 + 3] > 128) {
          pts.push(x, y);
        }
      }
    }
    const avail = pts.length / 2;
    if (avail === 0) return;

    const count = 4000;
    faceBase = new Float32Array(count * 3);
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    faceDir = new Float32Array(count * 3);
    faceDist = new Float32Array(count);

    const cStart = new THREE.Color('#bff3ff');
    const cEnd = new THREE.Color('#4fd8ff');
    const tmpCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const pick = ((Math.random() * avail) | 0) * 2;
      const wx = (pts[pick] / 1024 - 0.5) * 2.0;
      const wy = (0.5 - pts[pick + 1] / 512) * 1.0;
      const wz = 1.22;
      const k = i * 3;
      faceBase[k] = wx;
      faceBase[k + 1] = wy;
      faceBase[k + 2] = wz;
      pos[k] = wx;
      pos[k + 1] = wy;
      pos[k + 2] = wz;

      const u = cl((wx + 1.0) * 0.5, 0, 1);
      tmpCol.copy(cStart).lerp(cEnd, u);
      cols[k] = tmpCol.r;
      cols[k + 1] = tmpCol.g;
      cols[k + 2] = tmpCol.b;

      const dx = Math.random() - 0.5;
      const dy = Math.random() - 0.5;
      const dz = Math.random() - 0.5;
      const len = Math.hypot(dx, dy, dz) || 1;
      faceDir[k] = dx / len;
      faceDir[k + 1] = dy / len;
      faceDir[k + 2] = dz / len;
      faceDist[i] = 2.0 + Math.random() * 3.0;
    }

    const faceGeo = new THREE.BufferGeometry();
    facePosAttr = new THREE.BufferAttribute(pos, 3);
    faceGeo.setAttribute('position', facePosAttr);
    faceGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

    faceTextMat = new THREE.PointsMaterial({
      size: 0.02,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });

    faceTextPoints = new THREE.Points(faceGeo, faceTextMat);
    tg.add(faceTextPoints);
    tp.visible = false;
  } catch (err) {
    console.error('Failed to build face text particles:', err);
    tp.visible = true;
  }
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(buildFaceTextParticles).catch(buildFaceTextParticles);
} else {
  buildFaceTextParticles();
}

// ---------- capsules
const LABELS = [
  'Web Development',
  'Software Engineering',
  'AI & Automation',
  'UI/UX Design',
  'Digital Solutions',
];
const capsulesContainer = document.getElementById('capsules');
const caps = LABELS.map((label) => {
  const d = document.createElement('div');
  d.className =
    'hud-label hud-capsule hud-frame pointer-events-auto absolute left-0 top-0 flex items-center justify-center h-[8vh] px-[2.2vw] whitespace-nowrap opacity-0';
  const corners = document.createElement('span');
  corners.className = 'hud-corners';
  corners.setAttribute('aria-hidden', 'true');
  corners.innerHTML = '<span></span><span></span><span></span><span></span>';
  const text = document.createElement('span');
  text.textContent = label;
  d.append(corners, text);
  capsulesContainer.appendChild(d);
  return d;
});

let showCapsules = false;
window.addEventListener('keydown', (e) => {
  if (e.key === 'c' || e.key === 'C') {
    showCapsules = !showCapsules;
  }
});

// ---------- helpers
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const S = (a, b, x) => {
  const t = cl((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const eo = (x) => 1 - (1 - cl(x)) ** 3;

const logo = document.getElementById('logo');
const hero = document.getElementById('hero');
const h2Words = [...document.querySelectorAll('#h2 b')];
const cp = document.getElementById('cp');
const cards = [...document.querySelectorAll('.card')];
const contactCard = document.getElementById('contact-card');

const e4 = new THREE.Euler();
const m4 = new THREE.Matrix4();

// ---------- Lenis + GSAP ScrollTrigger (locked until intro finishes)
document.body.style.overflowY = 'hidden';
const lenis = new Lenis({
  smoothWheel: true,
});
lenis.stop();
lenis.on('scroll', ScrollTrigger.update);

const scrollState = { progress: 0, spread: 0, textForm: 0 };
const storyScrollTrigger = gsap.to(scrollState, {
  progress: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: '#scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
  },
}).scrollTrigger;

const projectsScrollState = { progress: 0 };
const projectsScrollTrigger = ScrollTrigger.create({
  trigger: '#projects',
  start: 'top bottom',
  end: 'bottom top',
  scrub: 1.2,
  onUpdate: (self) => {
    projectsScrollState.progress = cl(self.progress, 0, 1);
  },
});

const spreadScrollTrigger = ScrollTrigger.create({
  trigger: '#projects',
  start: 'top bottom',
  end: 'center center',
  scrub: 1.2,
  onUpdate: (self) => {
    const val = prefersReducedMotion ? 0 : cl(self.progress, 0, 1);
    if (Number.isFinite(val)) {
      scrollState.spread = val;
    }
  },
});

const textFormScrollTrigger = ScrollTrigger.create({
  trigger: '#projects',
  start: 'center center',
  endTrigger: '#contact',
  end: 'bottom bottom',
  scrub: 1.2,
  onUpdate: (self) => {
    const val = prefersReducedMotion ? 0 : cl(self.progress, 0, 1);
    if (Number.isFinite(val)) {
      scrollState.textForm = val;
    }
  },
});

window.addEventListener('beforeunload', () => {
  storyScrollTrigger?.kill();
  projectsScrollTrigger.kill();
  spreadScrollTrigger.kill();
  textFormScrollTrigger.kill();
});

window.setScroll = (p) => {
  scrollState.progress = cl(p, 0, 1);
};

let mouseX = W * 0.5;
let mouseY = H * 0.5;
const smoothWorld = new THREE.Vector3(0, 2, 0);
const cursorHistory = [];
const TRAIL_DELAYS = [0, 0.09, 0.18, 0.28];
const capVec = new THREE.Vector3();

window.addEventListener('pointermove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

window.addEventListener('resize', () => {
  W = window.innerWidth;
  H = window.innerHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  if (renderer && composer) {
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
  }
  const sz = (W / 1280) * 2.5;
  m1.uniforms.uSize.value = sz;
  m2.uniforms.uSize.value = sz;
});

const worldAt = (px, py) => {
  const n = new THREE.Vector3((px / W) * 2 - 1, -(py / H) * 2 + 1, 0.5)
    .unproject(camera)
    .sub(camera.position)
    .normalize();
  return camera.position
    .clone()
    .add(n.multiplyScalar(-camera.position.z / n.z));
};

const sampleTrailAt = (t, delay) => {
  const targetT = t - delay;
  for (let i = cursorHistory.length - 1; i >= 0; i--) {
    if (cursorHistory[i].t <= targetT) return cursorHistory[i].pos;
  }
  return smoothWorld;
};

const scrollContainer = document.getElementById('scroll-container');
const projectsSection = document.getElementById('projects');
const contactSection = document.getElementById('contact');
const startTime = performance.now();
let introUnlocked = false;

function animate(now) {
  requestAnimationFrame(animate);
  lenis.raf(now);

  // Pause WebGL rendering and capsule updates when all sections are scrolled off-screen
  const lastSection = contactSection || projectsSection;
  if (lastSection && lastSection.getBoundingClientRect().bottom <= 0) {
    return;
  }

  const t = (now - startTime) * 0.001;

  // Autoplay 2.4s sphere->tree intro, then fade in logo (2.0-2.8s) and hero text (2.3-3.3s)
  const intro = prefersReducedMotion ? 1 : eo(t / 2.4);
  if (!introUnlocked && (prefersReducedMotion || t >= 3.3)) {
    introUnlocked = true;
    document.body.style.overflowY = '';
    lenis.start();
  }

  // Map 0..1 scroll progress to prototype seconds (5.0s -> 17.5s, ending right on Contact Us)
  const ts = 5.0 + scrollState.progress * 12.5;
  const morph = S(9.5, 14.5, ts);
  const zoom = S(14.5, 16.5, ts);
  const contactIn = S(15.4, 16.8, ts);
  const rotYBase = 0.18 * S(14.5, 16, ts) + -0.73 * zoom;
  const rotXBase = 0.18 * zoom;
  const sclBase = 1 + 0.05 * zoom;
  const cubeXBase = 0.4 * zoom;
  const cubeYBase = -0.45 * zoom;
  const camZ = 9 - 0.6 * zoom;
  const camX = 0.25 * zoom;
  const dimBase = 1 - 0.55 * zoom;
  const warp = S(16.0, 17.5, ts);

  let rotY = rotYBase;
  let rotX = rotXBase;
  let scl = sclBase;
  let cubeX = cubeXBase;
  let cubeY = cubeYBase;
  let dim = dimBase;

  if (!prefersReducedMotion && projectsSection) {
    const p = cl(projectsScrollState.progress, 0, 1);
    const endEase = 1 - S(0.8, 1.0, p);
    const arc = Math.sin(p * Math.PI);
    const dRotY = p * Math.PI * 2.5 * endEase;
    const dRotX = Math.sin(p * Math.PI * 2) * 0.15 * endEase;
    const dCubeX = -1.4 * arc * endEase;
    const dCubeY = -0.65 * arc * endEase;
    const dScl = -0.15 * arc * endEase;
    const dDim = -0.18 * arc * endEase;

    if (
      Number.isFinite(dRotY) &&
      Number.isFinite(dRotX) &&
      Number.isFinite(dCubeX) &&
      Number.isFinite(dCubeY) &&
      Number.isFinite(dScl) &&
      Number.isFinite(dDim)
    ) {
      rotY += dRotY;
      rotX += dRotX;
      cubeX += dCubeX;
      cubeY += dCubeY;
      scl = cl(scl + dScl, 0.5, 2.0);
      dim = cl(dim + dDim, 0.15, 1.0);
    }
  }

  const drift = prefersReducedMotion ? 0 : 1;
  camera.position.set(
    camX + Math.sin(t * 0.1) * 0.12 * drift,
    2.4 + Math.sin(t * 0.13) * 0.05 * drift,
    camZ
  );
  camera.lookAt(0, 2, 0);
  camera.updateMatrixWorld();

  // Pointer->world unprojection onto z=0 plane (lerp 0.15)
  const hit = worldAt(mouseX, mouseY);
  smoothWorld.lerp(hit, 0.15);
  cursorHistory.push({ t, pos: smoothWorld.clone() });
  while (cursorHistory.length > 0 && t - cursorHistory[0].t > 0.5) {
    cursorHistory.shift();
  }

  const trail = TRAIL_DELAYS.map((d) => sampleTrailAt(t, d));

  e4.set(rotX, rotY + Math.sin(t * 0.25) * 0.05, 0);
  m4.makeRotationFromEuler(e4);

  const spreadVal = prefersReducedMotion ? 0 : cl(scrollState.spread, 0, 1) * SPREAD_DISTANCE;
  const textVal = prefersReducedMotion ? 0 : cl(scrollState.textForm, 0, 1);

  for (const m of [m1, m2]) {
    const u = m.uniforms;
    u.uTime.value = t;
    u.uIntro.value = intro;
    u.uMorph.value = morph;
    u.uWarp.value = warp;
    if (Number.isFinite(spreadVal)) u.uSpread.value = spreadVal;
    if (Number.isFinite(textVal)) u.uText.value = textVal;
    u.uCubeRot.value.setFromMatrix4(m4);
    u.uCubeScale.value = scl;
    u.uCubeOffset.value.set(cubeX, cubeY, 0);
    u.uCursor.value.copy(smoothWorld);
    trail.forEach((w, i) => u.uCur.value[i].copy(w));
  }

  rm.uniforms.uTime.value = t;
  rm.uniforms.uDim.value = dim;
  rm.uniforms.uPulse.value = Math.max(0, 1 - Math.abs(ts - 5.6) / 0.8);

  tg.rotation.copy(e4);
  tg.scale.setScalar(scl);
  tg.position.set(cubeX, 2.6 + cubeY, 0);
  const faceIn = S(15.0, 16.5, ts) * morph;
  const faceFade = 1 - cl(textVal / 0.5, 0, 1);
  if (faceTextPoints && faceTextMat && facePosAttr && faceBase && faceDir && faceDist) {
    const fSpread = prefersReducedMotion ? 0 : cl(scrollState.spread, 0, 1);
    if (fSpread !== lastFaceSpread) {
      lastFaceSpread = fSpread;
      const arr = facePosAttr.array;
      const distMul = fSpread * SPREAD_DISTANCE;
      for (let i = 0; i < faceDist.length; i++) {
        const k = i * 3;
        const d = faceDist[i] * distMul;
        const nx = faceBase[k] + faceDir[k] * d;
        const ny = faceBase[k + 1] + faceDir[k + 1] * d;
        const nz = faceBase[k + 2] + faceDir[k + 2] * d;
        if (Number.isFinite(nx) && Number.isFinite(ny) && Number.isFinite(nz)) {
          arr[k] = nx;
          arr[k + 1] = ny;
          arr[k + 2] = nz;
        }
      }
      facePosAttr.needsUpdate = true;
    }
    const fOp = faceIn * faceFade;
    if (Number.isFinite(fOp)) {
      faceTextMat.opacity = cl(fOp, 0, 1);
    }
  } else {
    const cubeTextFade = 1 - cl(scrollState.spread * 2, 0, 1);
    const tOp = faceIn * 0.7 * cubeTextFade;
    if (Number.isFinite(tOp)) tm.opacity = cl(tOp, 0, 1);
  }

  // DOM intro + scroll-driven fades
  const navOpacity = prefersReducedMotion ? 1 : S(2.0, 2.8, t);
  logo.style.opacity = navOpacity;
  const heroIn = prefersReducedMotion ? 1 : S(2.3, 3.3, t);
  const heroOut = S(5.2, 6.2, ts);
  hero.style.opacity = heroIn * (1 - heroOut);
  hero.style.transform = `translateY(${(1 - heroIn) * 24 - heroOut * 48}px)`;

  // Capsules: 3D ellipse (RX 4.2, RZ 2.6, Y 0.55) projected through camera
  const ci = showCapsules
    ? 1
    : S(6.0, 6.8, ts) * (1 - S(10.0, 10.8, ts));
  const ph = (ts - 6.0) * 0.5 + 0.2 + (showCapsules ? t * 0.35 : 0);
  caps.forEach((el, i) => {
    const th = ph + (i * 6.2832) / 5;
    const fl = Math.sin(t * 1.3 + i * 1.7) * 0.04;
    capVec.set(3.1 * Math.cos(th), 0.55 + fl, 2.0 * Math.sin(th)).project(camera);
    const d = (Math.sin(th) + 1) / 2;
    const backFade = S(0.25, 0.5, d);
    const x = (capVec.x * 0.5 + 0.5) * W;
    const y = (-capVec.y * 0.5 + 0.5) * H;
    el.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) perspective(900px) rotateZ(${-Math.cos(th) * 6}deg) rotateY(${Math.cos(th) * 18}deg) scale(${0.78 + 0.28 * d})`;
    el.style.opacity = ci * (0.15 + 0.85 * Math.pow(d, 1.2)) * backFade;
    el.style.visibility = backFade === 0 ? 'hidden' : 'visible';
    el.style.pointerEvents = backFade === 0 ? 'none' : 'auto';
    el.style.filter = `blur(${(1 - d) * 3}px)`;
    el.style.zIndex = Math.round(d * 10);
  });

  // Fade out section-2 headline and paragraph as Projects section scrolls in
  const sec2Fade = 1 - cl(projectsScrollState.progress * 3, 0, 1);
  const h2El = h2Words[0]?.closest('h2');
  if (h2El) h2El.style.opacity = sec2Fade;

  // Section 2: headline mask reveal, paragraph, 4 cards appear fast during morph (9.8..12.6s)
  h2Words.forEach((b, i) => {
    const reveal = S(14.5 + i * 0.25, 15.8 + i * 0.25, ts);
    b.style.transform = `translateY(${(1 - reveal) * 110}%)`;
  });
  cp.style.opacity = S(15.0, 16.2, ts) * sec2Fade;

  // 4 service cards appear when HECTOR TECH LABS appears on cube (14.8..16.8s) and fade out as Projects scrolls in
  const pp = cl(projectsScrollState.progress, 0, 1);
  const svcFade = 1 - S(0.0, 0.16, pp);
  cards.forEach((c, i) => {
    const cardIn = S(14.8 + i * 0.25, 16.0 + i * 0.25, ts);
    const s = cardIn * svcFade;
    c.style.opacity = s;
    c.style.transform = `translateY(${(1 - cardIn) * 64 + (1 - svcFade) * 28}px)`;
    c.style.pointerEvents = s > 0.1 ? 'auto' : 'none';
  });

  // 3 project cards fade in after service cards exit, stay visible through Projects, and fade out before Contact enters
  let projOut = 1;
  if (contactSection) {
    const cTop = contactSection.getBoundingClientRect().top;
    projOut = cl((cTop - H * 0.55) / (H * 0.45), 0, 1);
  }
  projectCardEls.forEach((c, i) => {
    const stagger = S(0.18 + i * 0.06, 0.34 + i * 0.06, pp);
    const s = stagger * projOut;
    c.style.opacity = s;
    c.style.transform = `translateY(${(1 - stagger) * 64 + (1 - projOut) * 28}px)`;
    c.style.pointerEvents = s > 0.1 ? 'auto' : 'none';
  });

  // Single Contact Us card (final composition beneath branded cube)
  if (contactCard) {
    contactCard.style.opacity = contactIn;
    contactCard.style.transform = `translateY(${(1 - contactIn) * 40}px)`;
    contactCard.style.pointerEvents = contactIn > 0.5 ? 'auto' : 'none';
  }

  if (composer) {
    composer.render();
  }
}

requestAnimationFrame(animate);

// ---------- Selected Projects (inside fixed stage, like service cards)
const projectCardsContainer = document.getElementById('project-cards');
if (projectCardsContainer) {
  projects.forEach((proj, idx) => {
    const card = document.createElement('article');
    card.className =
      'project-card hud-card hud-frame pointer-events-auto relative flex flex-col justify-between overflow-hidden opacity-0';
    card.style.background = 'rgba(10, 12, 24, 0.85)';
    card.style.backdropFilter = 'none';

    const tagsHtml = proj.tags
      .map(
        (tag) =>
          `<span class="px-2 py-0.5 text-[10px] font-gm uppercase tracking-wider rounded-full border border-white/12 bg-white/5 text-white/75">${tag}</span>`
      )
      .join('');

    card.innerHTML = `
      <span class="hud-corners" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
      <span class="hud-num absolute right-[1.2vw] top-[1.2vw] z-10">[ 0${idx + 1} ]</span>
      <div class="w-full h-[17vh] shrink-0 overflow-hidden border-b border-white/10">
        <img src="${proj.image}" alt="${proj.title}" class="w-full h-full object-cover" loading="lazy" />
      </div>
      <div class="p-[1.15vw] flex flex-col flex-1 justify-between gap-[0.4vw] min-h-0">
        <div>
          <h3 class="hud-label hud-card-title">${proj.title}</h3>
          <p class="hud-body mt-[0.25vw]">${proj.description}</p>
        </div>
        <div class="flex items-end justify-between gap-2 pt-1">
          <div class="flex flex-wrap gap-1.5">${tagsHtml}</div>
          <a href="${proj.url}" target="_blank" rel="noopener noreferrer" class="hud-label text-[0.65vw] tracking-[0.14em] text-[#4fd8ff] hover:text-white transition-colors inline-flex items-center gap-1 shrink-0 pb-0.5">
            VIEW PROJECT <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    `;
    projectCardsContainer.appendChild(card);
  });
}

const projectCardEls = [...document.querySelectorAll('.project-card')];
ScrollTrigger.refresh();
