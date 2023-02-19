import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MapControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";

const gui = new dat.GUI();

const parameters = {
  widthSeg: 100,
  heightSeg: 100,
  dispScale: 250,
  ambientColor: 0x666666,
  directionalColor: 0x5c4119,
  fogColor: 0xcccccc,
  fogDensity: 0.0011,
};

/**
 * Renderer
 */
const textureLoader = new THREE.TextureLoader();

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

const createFog = () => {
  scene.fog = new THREE.FogExp2(parameters.fogColor, parameters.fogDensity);
};
createFog();

const fogFolder = gui.addFolder("Fog");
fogFolder.addColor(parameters, "fogColor").onChange(createFog);
fogFolder.add(parameters, "fogDensity", 0, 0.005, 0.0001).onChange(createFog);
/**
 * Object
 */

let plane = null;
let wireframeMaterial = null;
let planeGeometry = null;
const displacementMap = textureLoader.load("/annecy.png", () => {
  createGround();
});
displacementMap.wrapS = displacementMap.wrapT = THREE.RepeatWrapping;

const createGround = () => {
  if (plane !== null) {
    wireframeMaterial.dispose();
    scene.remove(plane);
  }
  displacementMap.repeat.set(1, 1);
  wireframeMaterial = new THREE.MeshStandardMaterial({
    flatShading: true,
    displacementMap: displacementMap,
    displacementScale: parameters.dispScale,
  });

  planeGeometry = new THREE.PlaneGeometry(
    2000,
    2000,
    parameters.widthSeg,
    parameters.heightSeg
  );

  const shaderMaterial = new THREE.ShaderMaterial({
    vertexShader: document.getElementById("vertexShader").textContent,
    fragmentShader: document.getElementById("fragmentShader").textContent,
    uniforms: {
      heightMap: { value: displacementMap },
      heightScale: { value: parameters.dispScale },
    },
  });

  plane = new THREE.Mesh(planeGeometry, wireframeMaterial);
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
};

const groundFolder = gui.addFolder("Ground");
groundFolder
  .add(parameters, "widthSeg", 1, 1000, 1)
  .onFinishChange(createGround);
groundFolder
  .add(parameters, "heightSeg", 1, 1000, 1)
  .onFinishChange(createGround);
groundFolder
  .add(parameters, "dispScale", 0, 300, 1)
  .onFinishChange(createGround);

// Create Water
let waterGeometry = null;
const createWater = () => {
  waterGeometry = new THREE.PlaneGeometry(1000, 1000, 15, 15);

  // let vertData = [];
  // let v3 = new THREE.Vector3(); // for re-use
  // for (let i = 0; i < waterGeometry.attributes.position.count; i++) {
  //   v3.fromBufferAttribute(waterGeometry.attributes.position, i);
  //   vertData.push({
  //     initH: v3.y,
  //     amplitude: THREE.MathUtils.randFloatSpread(2) * 10000,
  //     phase: THREE.MathUtils.randFloat(0, Math.PI) * 10000,
  //   });
  // }
  let waterMaterial = new THREE.MeshLambertMaterial({
    color: "aqua",
    flatShading: true,
  });
  let water = new THREE.Mesh(waterGeometry, waterMaterial);

  water.position.y = 21;
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
};

createWater();
/**
 * Lights
 */

let directionalLight = null;
let ambientLight = null;
const createLights = () => {
  if (directionalLight !== null) {
    scene.remove(directionalLight);
    scene.remove(ambientLight);
  }
  // directional light / sunlight
  directionalLight = new THREE.DirectionalLight(
    parameters.directionalColor,
    0.55
  );
  directionalLight.position.set(50, 60, -25);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.near = 10;
  directionalLight.shadow.camera.far = 250;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.left = -100;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  directionalLight.shadow.mapSize.width = 5000;
  directionalLight.shadow.mapSize.height = 5000;
  scene.add(directionalLight);

  // ambient light
  ambientLight = new THREE.AmbientLight(parameters.ambientColor);
  scene.add(ambientLight);
  scene.add(ambientLight);
};
createLights();

const LightFolder = gui.addFolder("Lights");
LightFolder.addColor(parameters, "ambientColor").onChange(createLights);
LightFolder.addColor(parameters, "directionalColor").onChange(createLights);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  10000
);
camera.position.x = -350;
camera.position.y = 95;
camera.position.z = -635;
scene.add(camera);

// Controls
// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = true

const controls = new MapControls(camera, canvas);

controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;

controls.screenSpacePanning = false;

controls.minDistance = 100;
controls.maxDistance = 1000;

controls.maxPolarAngle = Math.PI / 2;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // vertData.forEach((vd, idx) => {
  //   let y = vd.initH + Math.sin(elapsedTime + vd.phase) * vd.amplitude;
  //   waterGeometry.attributes.position.setY(idx, y);
  // });
  // waterGeometry.attributes.position.needsUpdate = true;
  // waterGeometry.computeVertexNormals();

  // Update Object
  // plane.rotation.y = 0.1 * elapsedTime

  // plane.rotation.x = 0.15 * elapsedTime

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
