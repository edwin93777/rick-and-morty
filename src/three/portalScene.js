// Portal 3D de la pantalla de carga.
//
// El modelo (portal.glb) y la textura (portal-noise.webp) salen de Blender con
// blender/build_portal.py. Aquí solo se cargan y se animan:
//   - Vórtice: cada capa del embudo trae un mapa UV en espiral (ver el script).
//     Desplazar la textura en V lleva el dibujo del borde al centro siguiendo
//     la espiral; desplazarla en U lo hace girar.
//   - Borde viscoso y gotas: animación hecha en Blender (shape keys y
//     fotogramas clave), reproducida con AnimationMixer.
//
// Este módulo se carga con import() dinámico para que three.js no pese en el
// bundle principal. Mantiene UNA sola escena y un solo contexto WebGL, que se
// monta y desmonta cada vez que aparece la pantalla de carga.
import {
  AmbientLight,
  AnimationMixer,
  Color,
  DirectionalLight,
  Group,
  MeshPhongMaterial,
  NoColorSpace,
  PerspectiveCamera,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import modelUrl from '../assets/portal/portal.glb?url';
import noiseUrl from '../assets/portal/portal-noise.webp';

// Mismos valores que PALETTE y SAMPLES en blender/build_portal.py.
const PALETTE = {
  uDark: '#0a6a17',
  uMid: '#18a01d',
  uLime: '#4bd817',
  uLimeLight: '#8cec2b',
  uLimeBright: '#86ea25',
  uYellow: '#e4f658',
  uWhite: '#f8ffe0',
};

// escala (U, V) y velocidad (giro, entrada al centro) en unidades de textura por segundo
const LAYERS = {
  M_Portal_Deep: {
    layer: 0,
    a: { scale: [1.0, 0.8], speed: [0.05, 0.11] }, // brazos grandes
    b: { scale: [2.0, 1.6], speed: [0.1, 0.26] }, // detalle
  },
  M_Portal_Flow: {
    layer: 1,
    a: { scale: [2.0, 1.9], speed: [0.16, 0.42] }, // vetas
    b: { scale: [1.0, 1.1], speed: [0.07, 0.2] }, // manchas
  },
  M_Portal_Glints: {
    layer: 2,
    a: { scale: [1.0, 1.4], speed: [0.1, 0.42] }, // motas
    b: { scale: [1.0, 1.0], speed: [0, 0] },
  },
};

const LIGHT_DIRECTION = new Vector3(-2.5, 3.5, 5).normalize();

// El portal es el indicador de carga y se pidió expresamente que se mueva, así
// que se anima aunque el sistema tenga activado "movimiento reducido".
// Con `true`, en ese caso el vórtice sigue pero el portal deja de balancearse.
const HONOR_REDUCED_MOTION = false;

const vertexShader = /* glsl */ `
  attribute vec2 aPolar;

  varying vec2 vFlow;
  varying float vRadius;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    // glTF guarda V invertida respecto a Blender: se deshace aquí.
    vFlow = vec2(uv.x, 1.0 - uv.y);   // U = espiral, V = 0 borde -> 1 centro
    vRadius = 1.0 - aPolar.y;         // 0 centro -> 1 borde

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalMatrix * normal;
    vViewPosition = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uNoise;   // R = brazos, G = vetas, B = motas
  uniform float uTime;
  uniform vec2 uScaleA;
  uniform vec2 uSpeedA;
  uniform vec2 uScaleB;
  uniform vec2 uSpeedB;
  uniform vec3 uDark;
  uniform vec3 uMid;
  uniform vec3 uLime;
  uniform vec3 uLimeLight;
  uniform vec3 uLimeBright;
  uniform vec3 uYellow;
  uniform vec3 uWhite;
  uniform vec3 uLightDir;

  varying vec2 vFlow;
  varying float vRadius;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // +U: gira. -V: el dibujo avanza hacia el centro.
  vec3 flowSample(vec2 scale, vec2 speed) {
    vec2 coords = vec2(vFlow.x * scale.x + uTime * speed.x, vFlow.y * scale.y - uTime * speed.y);
    return texture2D(uNoise, coords).rgb;
  }

  // Corte nítido (estilo dibujo animado) con antialiasing.
  float edge(float threshold, float value) {
    float width = max(fwidth(value), 0.0001);
    return smoothstep(threshold - width, threshold + width, value);
  }

  // Las capas superiores se desvanecen junto al centro y junto al borde.
  float window(float radius) {
    return smoothstep(0.10, 0.30, radius) * (1.0 - smoothstep(0.86, 1.0, radius));
  }

  void main() {
    float radius = vRadius;
    vec3 color;
    float alpha = 1.0;

    #if LAYER == 0
      // Capa profunda: brazos oscuros sobre verde medio, franja lima y núcleo claro.
      float arms = flowSample(uScaleA, uSpeedA).r;
      float detail = flowSample(uScaleB, uSpeedB).g;

      color = mix(uMid, uDark, edge(0.52, arms));

      float outer = radius + 0.20 * (detail - 0.5);
      color = mix(color, uLime, edge(0.80, outer));
      color = mix(color, uLimeLight, edge(0.92, outer));

      float core = radius + 0.05 * (arms - 0.5);
      color = mix(color, uLime, 1.0 - edge(0.13, core));
      color = mix(color, uYellow, 1.0 - edge(0.075, core));

      // Más oscuro hacia el fondo del embudo y un brillo líquido en los surcos.
      color *= mix(0.74, 1.0, smoothstep(0.0, 0.6, radius));
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vViewPosition);
      float gloss = pow(max(dot(normal, normalize(uLightDir + viewDir)), 0.0), 36.0);
      color += uWhite * edge(0.55, gloss) * 0.2;
    #elif LAYER == 1
      // Vetas lima con corazón amarillo.
      float streaks = flowSample(uScaleA, uSpeedA).g;
      float blobs = flowSample(uScaleB, uSpeedB).r;
      float field = streaks * 0.75 + blobs * 0.25 + 0.18 * (window(radius) - 1.0);
      alpha = edge(0.66, field);
      color = mix(uLimeBright, uYellow, edge(0.80, field));
    #else
      // Motas blancas, la capa más cercana.
      float field = flowSample(uScaleA, uSpeedA).b * window(radius);
      alpha = edge(0.5, field);
      color = uWhite;
    #endif

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

function createVortexMaterial(config, shared) {
  const material = new ShaderMaterial({
    defines: { LAYER: config.layer },
    uniforms: {
      ...shared,
      uScaleA: { value: new Vector2(...config.a.scale) },
      uSpeedA: { value: new Vector2(...config.a.speed) },
      uScaleB: { value: new Vector2(...config.b.scale) },
      uSpeedB: { value: new Vector2(...config.b.speed) },
    },
    vertexShader,
    fragmentShader,
  });
  if (config.layer > 0) {
    // Las capas con huecos se mezclan sobre la profunda, de atrás hacia delante.
    material.transparent = true;
    material.depthWrite = false;
  }
  return material;
}

async function createPortal() {
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true }); // lanza si no hay WebGL
  renderer.setClearColor(0x000000, 0);

  let gltf;
  let noise;
  try {
    [gltf, noise] = await Promise.all([
      new GLTFLoader().loadAsync(modelUrl),
      new TextureLoader().loadAsync(noiseUrl),
    ]);
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }

  noise.wrapS = RepeatWrapping;
  noise.wrapT = RepeatWrapping;
  noise.colorSpace = NoColorSpace; // son datos, no color
  noise.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const shared = {
    uNoise: { value: noise },
    uTime: { value: 0 },
    uLightDir: { value: LIGHT_DIRECTION },
  };
  for (const [name, hex] of Object.entries(PALETTE)) {
    shared[name] = { value: new Color(hex) };
  }

  // Borde y gotas: baba brillante. El color y el resplandor vienen del material
  // de Blender; aquí solo se le da un brillo especular nítido, de líquido.
  let slime = null;
  function slimeFrom(source) {
    slime ??= new MeshPhongMaterial({
      color: source.color,
      emissive: source.emissive,
      emissiveIntensity: source.emissiveIntensity,
      specular: 0xffffff,
      shininess: 110,
    });
    return slime;
  }

  // Capas del embudo: se sustituye su material por el shader del vórtice.
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    if (object.material.name === 'M_Portal_Slime') {
      const source = object.material;
      object.material = slimeFrom(source);
      source.dispose();
      return;
    }
    const config = LAYERS[object.material.name];
    if (!config) return;

    // PolarUV llega como `uv1`; se renombra para declararlo a mano en el shader.
    object.geometry.setAttribute('aPolar', object.geometry.getAttribute('uv1'));
    object.geometry.deleteAttribute('uv1');
    object.material.dispose();
    object.material = createVortexMaterial(config, shared);
    object.renderOrder = config.layer;
  });

  const scene = new Scene();
  const model = new Group();
  model.add(gltf.scene);
  scene.add(model);

  scene.add(new AmbientLight(0xffffff, 0.55));
  const keyLight = new DirectionalLight(0xffffff, 2.4);
  keyLight.position.copy(LIGHT_DIRECTION).multiplyScalar(6);
  const fillLight = new DirectionalLight(0xbfffa0, 1.1);
  fillLight.position.set(3, -2, 3);
  scene.add(keyLight, fillLight);

  const camera = new PerspectiveCamera(26, 1, 0.1, 30);
  camera.position.set(0, 0, 6.5);

  const mixer = new AnimationMixer(gltf.scene);
  for (const clip of gltf.animations) {
    mixer.clipAction(clip).play(); // en bucle
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let host = null;
  let frame = 0;
  let observer = null;
  let seconds = 0;
  let startedAt = 0;

  /** Dibuja el portal tal como está en el instante `time` (en segundos). */
  function renderAt(time) {
    seconds = time;
    shared.uTime.value = time;
    mixer.setTime(time);

    if (HONOR_REDUCED_MOTION && reducedMotion.matches) {
      model.rotation.set(0.1, -0.3, 0);
      model.position.y = 0;
    } else {
      model.rotation.set(0.1 + Math.sin(time * 0.6 + 1.2) * 0.14, Math.sin(time * 0.8) * 0.38, 0);
      model.position.y = Math.sin(time * 1.1) * 0.05;
    }
    renderer.render(scene, camera);
  }

  function resize() {
    if (!host) return;
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function tick(now) {
    frame = requestAnimationFrame(tick);
    renderAt((now - startedAt) / 1000);
  }

  function unmount() {
    cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    observer = null;
    canvas.remove();
    host = null;
  }

  function mount(element) {
    unmount();
    host = element;
    host.appendChild(canvas);
    resize();
    observer = new ResizeObserver(() => {
      resize();
      renderAt(seconds);
    });
    observer.observe(host);

    startedAt = performance.now() - seconds * 1000; // continúa donde se quedó
    renderAt(seconds);
    frame = requestAnimationFrame(tick);
  }

  const portal = { canvas, mount, unmount, renderAt };
  // Solo en desarrollo: permite dibujar un instante concreto desde la consola,
  // p. ej. `__portal3d.renderAt(2.5)`.
  if (import.meta.env.DEV) window.__portal3d = portal;
  return portal;
}

let portalPromise = null;

/** Devuelve (creándolo la primera vez) el portal compartido. */
export function loadPortal() {
  if (!portalPromise) {
    portalPromise = createPortal().catch((error) => {
      portalPromise = null;
      throw error;
    });
  }
  return portalPromise;
}
