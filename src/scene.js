import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { DitherShader } from "./DitherShader";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, composer, controls;

export async function init() {
  const container = document.getElementById("container");

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  camera.position.z = 6;
  scene = new THREE.Scene();

  const loader = new GLTFLoader();

  loader.load(
    "/moai.glb",
    function (gltf) {
      const model = gltf.scene.children[0];
      model.scale.multiplyScalar(0.01);
      model.position.y = 0.8;

      const lightColor = new THREE.Color(0xffffff);

      const ambientLight = new THREE.AmbientLight(lightColor);
      scene.add(ambientLight);

      const dLight = new THREE.DirectionalLight(new THREE.Color(0xff0ff), 5.0);
      dLight.position.set(1, 2.5, 1);
      dLight.target = model;
      scene.add(dLight);

      scene.add(model);

      renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(window.devicePixelRatio / 6);
      container.appendChild(renderer.domElement);

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new ShaderPass(DitherShader));

      controls = new OrbitControls(camera, renderer.domElement);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.0;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.rotateSpeed = 3;
      controls.update();

      onWindowResize();

      window.addEventListener("resize", onWindowResize);

      animate();
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

export function animate() {
  requestAnimationFrame(animate);
  controls.update();
  controls.enablePan = false;

  render();
}

function render() {
  composer.render(scene, camera);
}
