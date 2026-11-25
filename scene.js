// Hero showroom: a chrome-red 3D "YODA" over her real car photos on a ring that turns as you scroll,
// embers and a neon floor, with bloom. Night = dark showroom, day = bright white showroom.
// Tells the page when everything is loaded and drawn ('yoda-ready'), so the loader can lift without any flash.
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('showroom');
const root = document.documentElement;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = innerWidth < 760;
const RED = 0xe3172b;
const ready = () => dispatchEvent(new Event('yoda-ready'));
const fail = () => { canvas.remove(); ready(); };   // no font or no WebGL: the HTML wordmark shows instead

const THEMES = {
  night: { bg: 0x08080a, floor: 0x0c0c0f, ember: 0xff4a3a, emberOp: .8, bloom: .75, panel: 0xb8b8b8, exposure: 1, key: 40 },
  day: { bg: 0xeeedea, floor: 0xf7f6f3, ember: 0xc01323, emberOp: .4, bloom: .2, panel: 0xffffff, exposure: 1.05, key: 22 },
};

function start(font, manager) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog(0, 12, 30);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);

  // 3D wordmark with its light line attached, so the two always move together
  const geo = new TextGeometry('YODA', { font, size: 1.7, height: .55, curveSegments: phone ? 6 : 10, bevelEnabled: true, bevelThickness: .07, bevelSize: .045, bevelSegments: phone ? 3 : 5 });
  geo.center();
  const word = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xb3101f, metalness: .85, roughness: .22, clearcoat: 1, clearcoatRoughness: .1 }));
  word.position.y = 2.6;
  scene.add(word);
  const underline = new THREE.Mesh(new THREE.BoxGeometry(6.2, .035, .035), new THREE.MeshBasicMaterial({ color: new THREE.Color(RED).multiplyScalar(3) }));
  underline.position.set(0, -1.2, .1);
  word.add(underline);
  const glint = new THREE.Mesh(new THREE.BoxGeometry(.7, .05, .05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(4) }));
  glint.position.set(0, -1.2, .12);
  word.add(glint);

  const key = new THREE.PointLight(0xff3344, 40, 30); key.position.set(-4, 5, 5); scene.add(key);
  const rim = new THREE.PointLight(0xffffff, 25, 30); rim.position.set(5, 4, -3); scene.add(rim);

  // Ring of her real car photos (every car), framed by glowing strips, with a faint floor reflection.
  const ring = new THREE.Group(); scene.add(ring);
  const loader = new THREE.TextureLoader(manager);
  const shots = ['corsa-1', 'fortuner-2', 'bantam-canopy-1', 'spark-1', 'corsa-2', 'fortuner-1', 'bantam-1', 'spark-2', 'corsa-3', 'fortuner-4', 'bantam-canopy-3', 'spark-4'];
  const R = 9.2, panelMats = [];
  shots.forEach((n, i) => {
    const tex = loader.load(`images/${n}.jpeg`); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xb8b8b8, side: THREE.DoubleSide }); panelMats.push(mat);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.55), mat);
    const a = i / shots.length * Math.PI * 2;
    panel.position.set(Math.sin(a) * R, 1.4, Math.cos(a) * R);
    panel.lookAt(0, 1.4, 0); panel.rotateY(Math.PI);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .05), new THREE.MeshBasicMaterial({ color: new THREE.Color(RED).multiplyScalar(2.5) }));
    strip.position.y = -1.33; panel.add(strip);
    const mirror = new THREE.Mesh(panel.geometry, new THREE.MeshBasicMaterial({ map: tex, color: 0xb8b8b8, transparent: true, opacity: .14, side: THREE.DoubleSide }));
    mirror.position.copy(panel.position); mirror.position.y = -1.4;
    mirror.quaternion.copy(panel.quaternion); mirror.scale.y = -1;
    ring.add(panel, mirror);
  });

  const floorMat = new THREE.MeshStandardMaterial({ metalness: .7, roughness: .45, transparent: true, opacity: .85 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; scene.add(floor);
  // two floor grids, one per mode (GridHelper colours are fixed when it is made)
  const gridNight = new THREE.GridHelper(60, 60, RED, 0x3a0a10), gridDay = new THREE.GridHelper(60, 60, RED, 0xe2c3c6);
  for (const gr of [gridNight, gridDay]) { gr.material.transparent = true; gr.material.opacity = .55; scene.add(gr); }

  // Embers drifting up (fewer on phones)
  const N = phone ? 320 : 700, pos = new Float32Array(N * 3), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 30; pos[i * 3 + 1] = Math.random() * 12; pos[i * 3 + 2] = (Math.random() - .5) * 30; speed[i] = .004 + Math.random() * .012; }
  const embersGeo = new THREE.BufferGeometry(); embersGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32;
  const g = dot.getContext('2d'), grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, '#fff'); grad.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
  const emberMat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), size: .12, transparent: true, depthWrite: false });
  scene.add(new THREE.Points(embersGeo, emberMat));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .75, .55, .85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function theme() {
    const day = root.dataset.theme === 'day', T = THEMES[day ? 'day' : 'night'];
    scene.background.set(T.bg); scene.fog.color.set(T.bg);
    floorMat.color.set(T.floor);
    gridNight.visible = !day; gridDay.visible = day;
    emberMat.color.set(T.ember); emberMat.opacity = T.emberOp;
    emberMat.blending = day ? THREE.NormalBlending : THREE.AdditiveBlending; emberMat.needsUpdate = true;
    bloom.strength = T.bloom;
    panelMats.forEach(m => m.color.set(T.panel));
    renderer.toneMappingExposure = T.exposure;
    key.intensity = T.key;
  }
  theme(); addEventListener('themechange', theme);

  let dist = 13, lift = 0;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    dist = Math.max(13, 9.5 / (2 * Math.tan(THREE.MathUtils.degToRad(22.5)) * camera.aspect));
    scene.fog.near = dist - 1; scene.fog.far = dist + 18;
    lift = camera.aspect < 1 ? 3.5 : 0;
  }
  addEventListener('resize', size); size();

  let mx = 0, my = 0, sx = 0, sy = 0, spin = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  let visible = true;
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);

  const clock = new THREE.Clock();
  let first = true;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible && !first) return;
    const t = clock.getElapsedTime();
    const scroll = Math.min(1, scrollY / innerHeight);
    sx += (mx - sx) * .05; sy += (my - sy) * .05;
    // the ring follows the page: scrolling turns the showroom, with a slow drift on top
    const target = scrollY / innerHeight * Math.PI * .9 + (calm ? 0 : t * .03);
    spin += (target - spin) * .08;
    ring.rotation.y = spin;
    word.position.y = 2.6 + (calm ? 0 : Math.sin(t * .8) * .08) + scroll * 1.5;
    word.rotation.y = sx * .5; word.rotation.x = sy * .25;
    const gx = (t * .5) % 2.2 - .6;                       // headlight glint runs along the line every few seconds
    glint.visible = gx >= 0 && gx <= 1; glint.position.x = gx * 5.5 - 2.75;
    if (!calm) {
      for (let i = 0; i < N; i++) { pos[i * 3 + 1] += speed[i]; if (pos[i * 3 + 1] > 12) pos[i * 3 + 1] = 0; }
      embersGeo.attributes.position.needsUpdate = true;
    }
    camera.position.set(sx * 2.5, 4.2 - sy * 1.2 + scroll * 2, dist - scroll * 3);
    camera.lookAt(0, 2.2 + scroll - lift, 0);
    composer.render();
    if (first) { first = false; root.classList.add('has-3d'); requestAnimationFrame(ready); }
  }
  manager.onLoad = () => frame();
}

// everything the first view needs: the font and every ring photo
const manager = new THREE.LoadingManager();
manager.onProgress = (u, done, total) => dispatchEvent(new CustomEvent('yoda-progress', { detail: done / Math.max(total, 1) }));
new FontLoader().load(
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json',
  font => { try { start(font, manager); } catch { fail(); } },
  undefined,
  fail,
);
