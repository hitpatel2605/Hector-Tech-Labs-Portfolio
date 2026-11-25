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

const vert = `attribute vec3 aSphere;attribute vec3 aCube;attribute vec4 aRand;attribute float aEdge;
uniform float uTime,uIntro,uMorph,uSize,uWarp,uReflect,uCubeScale,uCursorFalloff,uCursorStrength;uniform mat3 uCubeRot;uniform vec3 uCur[4];uniform vec4 uCW;uniform vec3 uCubeCenter,uCubeOffset,uCursor;
varying vec3 vColor;varying float vAlpha;
const vec3 CYAN=vec3(.31,.85,1.);const vec3 BLUE=vec3(.10,.26,1.);const vec3 VIOLET=vec3(.54,.36,1.);
void main(){
 float stag=aRand.x*.45;float tI=smoothstep(stag*.8,stag*.8+.55,uIntro);float tM=smoothstep(stag,stag+.55,uMorph);
 vec3 cube=uCubeRot*(aCube-uCubeCenter)*uCubeScale+uCubeCenter+uCubeOffset;
 vec3 p=mix(aSphere,position,tI);p=mix(p,cube,tM);
 float arc=sin(3.14159*tI)*.5+sin(3.14159*tM)*1.1;
 p+=vec3(sin(aRand.z*6.283+uTime*.6),cos(aRand.z*12.57+uTime*.5),sin(aRand.z*9.42+uTime*.4))*arc*(.6+aRand.y*.5);
 p+=vec3(sin(uTime*.5+aRand.z*20.),cos(uTime*.4+aRand.z*31.),sin(uTime*.45+aRand.z*17.))*.035*(1.-tM*.7);
 vec3 d3=p-uCursor;float f=exp(-dot(d3.xy,d3.xy)*2.2);p.z-=f*.45;p.xy+=normalize(d3.xy+1e-4)*f*.12;
 if(uReflect>.5)p.y=-p.y;
 float rad=clamp(length(position.xz)/3.,0.,1.);
 float rootGlow=(aRand.w<1.5)?exp(-position.y*.65)*.45:0.;
 vec3 tc=mix(mix(CYAN,BLUE,smoothstep(0.,.45,rad)),VIOLET,smoothstep(.45,1.,rad))+CYAN*rootGlow*.35;
 vec3 cc=aEdge>.5?mix(CYAN,VIOLET,smoothstep(-1.2,1.2,(aCube.y-uCubeCenter.y)+(aCube.x-uCubeCenter.x)*-.4))*1.5:BLUE*.85;
 vColor=mix(tc,cc,tM);vAlpha=mix(.85+rootGlow*.15,aEdge>.5?1.:.55,tM)*(uReflect>.5?.16:1.);
 vec4 mv=modelViewMatrix*vec4(p,1.);
 gl_PointSize=aRand.y*uSize*(8./-mv.z)*mix(1.,aEdge>.5?1.3:.8,tM);gl_Position=projectionMatrix*mv;}`;

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
document.fonts.ready.then(() => {
  drawText();
  tex.needsUpdate = true;
});

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

const scrollState = { progress: 0 };
gsap.to(scrollState, {
  progress: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: '#scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
  },
});

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

window.addEventListener('beforeunload', () => {
  projectsScrollTrigger.kill();
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
const startTime = performance.now();
let introUnlocked = false;

function animate(now) {
  requestAnimationFrame(animate);
  lenis.raf(now);

  // Pause WebGL rendering and capsule updates when 3D story + projects sections are scrolled off-screen
  if (projectsSection && projectsSection.getBoundingClientRect().bottom <= 0) {
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
    const arc = Math.sin(p * Math.PI);
    const dRotY = p * Math.PI * 2.5;
    const dRotX = Math.sin(p * Math.PI * 2) * 0.15;
    const dCubeX = -1.4 * arc;
    const dCubeY = -0.65 * arc;
    const dScl = -0.15 * arc;
    const dDim = -0.18 * arc;

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

  for (const m of [m1, m2]) {
    const u = m.uniforms;
    u.uTime.value = t;
    u.uIntro.value = intro;
    u.uMorph.value = morph;
    u.uWarp.value = warp;
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
  tm.opacity = S(15.0, 16.5, ts) * morph * 0.7;

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

  // Fade out section-2 headline, paragraph, and service cards as Projects section scrolls in
  let sec2Fade = 1;
  if (projectsSection) {
    const pTop = projectsSection.getBoundingClientRect().top;
    sec2Fade = cl(pTop / (H * 0.65), 0, 1);
  }
  const h2El = h2Words[0]?.closest('h2');
  if (h2El) h2El.style.opacity = sec2Fade;

  // Section 2: headline mask reveal, paragraph, 4 cards appear fast during morph (9.8..12.6s)
  h2Words.forEach((b, i) => {
    const reveal = S(14.5 + i * 0.25, 15.8 + i * 0.25, ts);
    b.style.transform = `translateY(${(1 - reveal) * 110}%)`;
  });
  cp.style.opacity = S(15.0, 16.2, ts) * sec2Fade;

  // Triggered when HECTOR TECH LABS appears on cube (15.2..16.4s): 4 cards exit downward, Contact Us card enters
  const cardsOut = 1 - S(15.2, 16.4, ts);
  cards.forEach((c, i) => {
    const cardIn = S(9.8 + i * 0.45, 11.2 + i * 0.45, ts);
    const s = cardIn * cardsOut * sec2Fade;
    c.style.opacity = s;
    c.style.transform = `translateY(${(1 - cardIn) * 64 + (1 - cardsOut) * 28}px)`;
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

// ---------- Selected Projects Grid
const projectsGrid = document.getElementById('projects-grid');
if (projectsGrid) {
  projects.forEach((proj, idx) => {
    const card = document.createElement('article');
    card.className =
      'hud-frame relative flex flex-col overflow-hidden rounded-[20px] border border-white/12 bg-[rgba(10,12,24,0.85)] transition-all duration-500 hover:border-sky-400/40 hover:shadow-[0_0_30px_rgba(30,141,248,0.18)]';
    if (!prefersReducedMotion) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(28px)';
      card.style.transitionDelay = `${idx * 90}ms`;
    }

    const tagsHtml = proj.tags
      .map(
        (tag) =>
          `<span class="px-2.5 py-1 text-[11px] font-gm uppercase tracking-wider rounded-full border border-white/12 bg-white/5 text-white/75">${tag}</span>`
      )
      .join('');

    card.innerHTML = `
      <span class="hud-corners" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
      <div class="w-full aspect-[16/10] overflow-hidden border-b border-white/10">
        <img src="${proj.image}" alt="${proj.title}" class="w-full h-full object-cover" loading="lazy" />
      </div>
      <div class="p-6 flex flex-col flex-1 justify-between gap-4">
        <div>
          <h3 class="hud-label text-lg text-white mb-2">${proj.title}</h3>
          <p class="hud-body text-sm text-white/70">${proj.description}</p>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2">${tagsHtml}</div>
          <a href="${proj.url}" target="_blank" rel="noopener noreferrer" class="hud-label text-xs tracking-[0.14em] text-[#4fd8ff] hover:text-white transition-colors inline-flex items-center gap-1.5">
            VIEW PROJECT <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    `;
    projectsGrid.appendChild(card);
  });

  const revealCard = (el) => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  };

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealCard(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );
    [...projectsGrid.children].forEach((c) => obs.observe(c));
    setTimeout(() => {
      [...projectsGrid.children].forEach(revealCard);
    }, 1000);
  }
  ScrollTrigger.refresh();
}
