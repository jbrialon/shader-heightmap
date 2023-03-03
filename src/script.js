import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import Stats from "three/addons/libs/stats.module.js";

import { loadImage } from "./utils/utils";
import { getZFromImageDataPoint } from "./utils/functions";

import HeightMap from "/annecy.png";
/**
 * Base
 */
// Debug
const gui = new dat.GUI();
const stats = new Stats();
document.body.appendChild(stats.dom);

const terrainWidth = 60;
const terrainHeight = 60;

const params = {
  directionalColor: 0xffffff,
  directionalColorIntensity: 0.4,
  fogColor: 0x9abcc7,
  fogDensity: 0.0005,
  fogNear: 40,
  fogFar: 50,
};

// Canvas
const canvas = document.querySelector("canvas.webgl");

/**
 * Scene
 */
const scene = new THREE.Scene();

/**
 * Fog
 */
const createFog = () => {
  scene.fog = new THREE.Fog(params.fogColor, params.fogNear, params.fogFar);
};
createFog();

const fogFolder = gui.addFolder("Fog");
fogFolder.addColor(params, "fogColor").onChange(createFog);
// fogFolder.add(parameters, "fogDensity", 0, 0.005, 0.0001).onChange(createFog);
fogFolder.add(params, "fogNear", 0, terrainWidth, 1).onChange(createFog);
fogFolder.add(params, "fogFar", 0, terrainWidth, 1).onChange(createFog);

/**
 * Map
 */

let planeGeometry = null;
let planeGeometries = [];
let geometryPositionsArray = [];
let colors = [];

// load heightmap to a new image first, then read its color data to set the heights of our plane vertices
// see: https://gist.github.com/jawdatls/465d82f2158e1c4ce161
let hmImage = await loadImage(HeightMap);
const hmCanvas = document.createElement("canvas");
hmCanvas.width = hmImage.width;
hmCanvas.height = hmImage.height;
const context = hmCanvas.getContext("2d");
context.drawImage(hmImage, 0, 0);
const hmImageData = context.getImageData(0, 0, hmCanvas.width, hmCanvas.height);

// Create a PlaneGeometry
planeGeometry = new THREE.PlaneGeometry(
  terrainWidth,
  terrainHeight,
  terrainWidth,
  terrainHeight
);
let geometryPositions = planeGeometry.getAttribute("position").array;
let geometryUVs = planeGeometry.getAttribute("uv").array;

// update each vertex position's z value according to the value we extracted from the heightmap image
for (let index = 0; index < geometryUVs.length / 2; index++) {
  let vertexU = geometryUVs[index * 2];
  let vertexV = geometryUVs[index * 2 + 1];
  // Update the z positions according to height map, inverse heightmap horizontally for the second loop
  let terrainHeight = getZFromImageDataPoint(
    hmImageData,
    vertexU,
    vertexV,
    hmCanvas.width,
    hmCanvas.height
  );
  geometryPositions[index * 3 + 2] = terrainHeight;
}
planeGeometries.push(planeGeometry);
geometryPositionsArray.push(geometryPositions);
planeGeometry.computeVertexNormals();

// Define a color gradient
const colorGradient = [
  { value: 0, color: new THREE.Color(0x56658c) }, // water
  // { value: 0.45, color: new THREE.Color(0xd3b867) }, // sand
  { value: 0.5, color: new THREE.Color(0xb6d168) }, // grass
  { value: 0.7, color: new THREE.Color(0x4d876f) }, // threes
  { value: 2.5, color: new THREE.Color(0x635143) }, // rock
  { value: 4.5, color: new THREE.Color(0xffffff) }, // snow
];

for (let i = 0; i < geometryPositionsArray[0].length; i += 3) {
  let x = geometryPositionsArray[0][i];
  let y = geometryPositionsArray[0][i + 1];
  let z = geometryPositionsArray[0][i + 2];
  let color = new THREE.Color(0xffffff);

  for (let j = 0; j < colorGradient.length - 1; j++) {
    if (z >= colorGradient[j].value && z < colorGradient[j + 1].value) {
      color = colorGradient[j].color;
    }
  }

  colors.push(color.r, color.g, color.b);
}

planeGeometry.setAttribute(
  "color",
  new THREE.BufferAttribute(new Float32Array(colors), 3)
);

const threeTone = new THREE.TextureLoader().load("gradientMaps/threeTone.jpg");
threeTone.minFilter = THREE.NearestFilter;
threeTone.magFilter = THREE.NearestFilter;

const fourTone = new THREE.TextureLoader().load("gradientMaps/fourTone.jpg");
fourTone.minFilter = THREE.NearestFilter;
fourTone.magFilter = THREE.NearestFilter;

const fiveTone = new THREE.TextureLoader().load("gradientMaps/fiveTone.jpg");
fiveTone.minFilter = THREE.NearestFilter;
fiveTone.magFilter = THREE.NearestFilter;

const toonMaterial = new THREE.MeshToonMaterial({
  vertexColors: true,
  gradientMap: fiveTone,
});

const vertexMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  // wireframe: true,
  flatShading: false,
});

const plane = new THREE.Mesh(planeGeometry, toonMaterial);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

/**
 * Lights
 */

let directionalLight = null;
let ambientLight = null;
let dirLightHelper = null;
const createLights = () => {
  if (directionalLight !== null) {
    scene.remove(directionalLight);
    scene.remove(ambientLight);
  }
  // directional light / sunlight
  directionalLight = new THREE.DirectionalLight(
    params.directionalColor,
    params.directionalColorIntensity
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

  dirLightHelper = new THREE.DirectionalLightHelper(directionalLight, 10);
  scene.add(dirLightHelper);

  // ambient light
  ambientLight = new THREE.AmbientLight(0x666666);
  scene.add(ambientLight);
};
createLights();

const speed = 0.01; // adjust the speed of rotation as needed
const radius = 100; // adjust the radius of rotation as needed
let angle = 0;

const animateLight = () => {
  angle += speed;

  // calculate the new position of the light
  const x = radius * Math.cos(angle);
  const z = radius * Math.sin(angle);
  directionalLight.position.set(x, 60, z);

  // set the light's target to the center of the scene
  const center = new THREE.Vector3(0, 0, 0);
  directionalLight.target.position.copy(center);

  // update the position of the directional light helper
  dirLightHelper.update();

  // make the light look at the center of the scene
  directionalLight.lookAt(center);
};
const LightFolder = gui.addFolder("Lights");
LightFolder.addColor(params, "directionalColor").onChange(createLights);
LightFolder.add(params, "directionalColorIntensity").onChange(createLights);
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
  100
);
camera.position.x = -15;
camera.position.y = 7;
camera.position.z = -23;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

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

  // Update controls
  controls.update();

  // stats
  stats.update();

  animateLight();
  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
