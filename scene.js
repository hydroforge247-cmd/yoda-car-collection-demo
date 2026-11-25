// Hero showroom: a chrome-red 3D "YODA" over her real car photos on a ring that turns as you scroll,
// embers and a neon floor, with bloom. Night = dark showroom, day = bright white showroom.
// Tells the page when everything is loaded and drawn ('yoda-ready'), so the loader can lift without any flash.
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
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
  night: { bg: 0x08080a, floor: 0x0c0c0f, ember: 0xff4a3a, emberOp: .8, bloom: phone ? .45 : .6, panel: 0xb8b8b8, exposure: 1, key: phone ? 28 : 36 },
  day: { bg: 0xeeedea, floor: 0xf7f6f3, ember: 0xc01323, emberOp: .4, bloom: .15, panel: 0xffffff, exposure: 1.05, key: 20 },
};

// The wordmark: the logo's own YODA letters (images/yoda-word.svg) extruded in 3D; the typeface is only a fallback.
function logoGeometry(svg) {
  const shapes = svg.paths.flatMap(p => SVGLoader.createShapes(p));
  if (!shapes.length) throw new Error('no shapes');
  const S = 6.6 / 1130;                                     // ~6.6 units wide, like the old wordmark
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: .5 / S, curveSegments: phone ? 8 : 14, bevelEnabled: true,
    bevelThickness: .06 / S, bevelSize: .03 / S, bevelSegments: phone ? 3 : 5 });
  geo.rotateX(Math.PI);                                     // SVG y points down; a rotation (not a mirror) keeps the letters readable
  geo.center(); geo.scale(S, S, S); geo.computeBoundingBox();
  return geo;
}

function start(wordGeo, manager) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.75 : 1.75));   // phones were capped at 1.25: that was the blur
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog(0, 12, 30);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);

  // 3D wordmark with its light line attached, so the two always move together.
  // Satin chrome rather than mirror gloss: the old clearcoat + bloom gave a big blown-out highlight on phones.
  const word = new THREE.Mesh(wordGeo, new THREE.MeshPhysicalMaterial({ color: 0xc0121f, metalness: .75, roughness: .3, clearcoat: .45, clearcoatRoughness: .25 }));
  word.position.y = 2.6;
  scene.add(word);
  // a fine red line that fades out at both ends (like the lines beside "CAR COLLECTION" in the logo)
  const strip = (w, stops) => { const c = document.createElement('canvas'); c.width = 512; c.height = 8; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 512, 0);
    stops.forEach(([o, a]) => gr.addColorStop(o, `rgba(255,255,255,${a})`)); x.fillStyle = gr; x.fillRect(0, 0, 512, 8); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const lineY = (wordGeo.boundingBox ? wordGeo.boundingBox.min.y : -.9) - .38;
  const underline = new THREE.Mesh(new THREE.PlaneGeometry(7.4, .028), new THREE.MeshBasicMaterial({ map: strip(512, [[0, 0], [.18, .9], [.5, 1], [.82, .9], [1, 0]]),
    color: new THREE.Color(RED).multiplyScalar(2.2), transparent: true, depthWrite: false }));
  underline.position.set(0, lineY, .3);
  word.add(underline);
  // a soft light that glides along the line now and then (no hard block)
  const glintMat = new THREE.MeshBasicMaterial({ map: strip(512, [[0, 0], [.35, .25], [.5, 1], [.65, .25], [1, 0]]), color: new THREE.Color(0xffe2e5).multiplyScalar(2.5),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .05), glintMat);
  glint.position.set(0, lineY, .31);
  word.add(glint);

  const key = new THREE.PointLight(0xff3344, 40, 30); key.position.set(-4, 5, 5); scene.add(key);
  const rim = new THREE.PointLight(0xffffff, 25, 30); rim.position.set(5, 4, -3); scene.add(rim);

  // Ring of her real car photos (every car), framed by glowing strips, with a faint floor reflection.
  const ring = new THREE.Group(); scene.add(ring);
  const loader = new THREE.TextureLoader(manager);
  const shots = ['corsa-1', 'fortuner-2', 'bantam-canopy-1', 'spark-1', 'corsa-2', 'fortuner-1', 'bantam-1', 'spark-2', 'corsa-3', 'fortuner-4', 'bantam-canopy-3', 'spark-4'];
  const R = 9.2, panelMats = [];
  shots.forEach((n, i) => {
    const tex = loader.load(`images/${n}.jpeg`); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;   // sharp at an angle
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

  // multisampled render target: the composer otherwise skips antialiasing, which made the edges and photos look jagged
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .75, .5, .9);
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

  let dist = 13, lift = 0, wordLift = 0;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    dist = Math.max(13, 9.5 / (2 * Math.tan(THREE.MathUtils.degToRad(22.5)) * camera.aspect));
    scene.fog.near = dist - 1; scene.fog.far = dist + 18;
    lift = camera.aspect < 1 ? 3.5 : 0;
    wordLift = camera.aspect < 1 ? 1.25 : 0;   // portrait: lift YODA clear of the photo ring so no photo covers it
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
    word.position.y = 2.6 + wordLift + (calm ? 0 : Math.sin(t * .8) * .08) + scroll * 1.5;
    word.rotation.y = sx * .5; word.rotation.x = sy * .25;
    const cyc = (t % 6.5) / 2.6;                          // a soft sweep along the line, then a rest
    if (calm || cyc > 1) glintMat.opacity = 0;
    else { const e = cyc * cyc * (3 - 2 * cyc); glint.position.x = -3.2 + e * 6.4; glintMat.opacity = Math.sin(cyc * Math.PI) * .9; }
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

// everything the first view needs: the logo lettering and every ring photo
const manager = new THREE.LoadingManager();
manager.onProgress = (u, done, total) => dispatchEvent(new CustomEvent('yoda-progress', { detail: done / Math.max(total, 1) }));
const fontFallback = () => new FontLoader().load(
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json',
  font => { try { const g = new TextGeometry('YODA', { font, size: 1.7, height: .55, curveSegments: 10, bevelEnabled: true, bevelThickness: .07, bevelSize: .045, bevelSegments: 4 }); g.center(); g.computeBoundingBox(); start(g, manager); } catch { fail(); } },
  undefined, fail);
new SVGLoader().load('images/yoda-word.svg',
  svg => { let g; try { g = logoGeometry(svg); } catch { return fontFallback(); } try { start(g, manager); } catch { fail(); } },
  undefined, fontFallback);
