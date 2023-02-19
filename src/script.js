import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MapControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";

const gui = new dat.GUI();

const parameters = {
  widthSeg: 300,
  heightSeg: 300,
  dispScale: 100,
  horTexture: 1,
  vertTexture: 1,
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

// vertex shader
const vertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vColor;

  uniform float heightScale;
  uniform sampler2D heightMap;

  void main() {
    vPosition = position;
    vNormal = normal;

    // compute height value from heightmap texture
    vec4 heightPixel = texture2D(heightMap, uv);
    float height = heightPixel.r * heightScale;

    // compute vertex color based on height value
    vColor = vec3(heightPixel.r, heightPixel.r, heightPixel.r);

    // apply model and projection matrices
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * height, 1.0);
  }
`;

const fragmentShader = `
    uniform float heightScale;
    uniform sampler2D heightMap;

    varying vec3 vColor;

    void main() {
        // compute the color based on the z position of the vertex
        float height = vColor.r; // height value is stored in the red channel of vColor

        vec3 water = (smoothstep(0.01, 0.35, height ) - smoothstep(0.34, 0.35, height )) * vec3(0.0, 0.0, 1.0);
        vec3 sand = (smoothstep(0.3, 0.32, height ) - smoothstep(0.30, 0.40, height )) * vec3(0.76, 0.7, 0.5);
        vec3 grass = (smoothstep(0.30, 0.46, height ) - smoothstep(0.33, 0.60, height )) * vec3(0.0, 0.6, 0.01);
        vec3 rock = (smoothstep(0.43, 0.75, height ) - smoothstep(0.50, 0.85, height )) * vec3(0.28, 0.25, 0.23);
        vec3 snow = (smoothstep(0.70, 0.8, height ) ) * vec3(1, 1, 1);

        gl_FragColor = vec4(water + sand + grass + rock + snow, 1.0);
    }
`;

const createGround = () => {
  if (plane !== null) {
    wireframeMaterial.dispose();
    scene.remove(plane);
  }
  displacementMap.repeat.set(parameters.horTexture, parameters.vertTexture);
  wireframeMaterial = new THREE.MeshStandardMaterial({
    wireframe: true,
    displacementMap: displacementMap,
    displacementScale: parameters.dispScale,
  });

  planeGeometry = new THREE.PlaneGeometry(
    1000,
    1000,
    parameters.widthSeg,
    parameters.heightSeg
  );

  const shaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      heightMap: { value: displacementMap },
      heightScale: { value: parameters.dispScale },
    },
  });

  plane = new THREE.Mesh(planeGeometry, shaderMaterial);

  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
};

gui.add(parameters, "widthSeg", 1, 1000, 1).onFinishChange(createGround);
gui.add(parameters, "heightSeg", 1, 1000, 1).onFinishChange(createGround);
gui.add(parameters, "dispScale", 0, 200, 1).onFinishChange(createGround);
gui.add(parameters, "horTexture", 0, 50, 1).onFinishChange(createGround);
gui.add(parameters, "vertTexture", 0, 50, 1).onFinishChange(createGround);

/**
 * Lights
 */

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
ambientLight.position.set(100, 250, 100);
scene.add(ambientLight);

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
  1000
);
camera.position.x = 15;
camera.position.y = 400;
camera.position.z = 700;
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
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

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
