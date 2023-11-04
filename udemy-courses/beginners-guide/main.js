import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

import { LoadingBar } from './LoadingBar.js';

class Main {
  constructor() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 4);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xaaaaaa);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3);
    this.scene.add(ambient);

    const light = new THREE.DirectionalLight();
    light.position.set(0.2, 1, 1);
    this.scene.add(light);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.setEnvironment();

    this.loadingBar = new LoadingBar();
    this.loadGLTF();

    this.renderer.setAnimationLoop(this.render.bind(this));

    const controls = new OrbitControls(this.camera, this.renderer.domElement);

    window.addEventListener('resize', this.resize.bind(this));
  }

  setEnvironment() {
    const loader = new RGBELoader();
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const self = this;

    loader.load(
      'textures/venice_sunset_1k.hdr',
      function (texture) {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        pmremGenerator.dispose();

        self.scene.environment = envMap;
      },
      undefined,
      function (err) {
        console.error('An error occurred setting the environment');
      }
    );
  }

  loadGLTF() {
    const loader = new GLTFLoader().setPath('glb/');

    loader.load(
      'plane.glb',
      (gltf) => {
        this.scene.add(gltf.scene);

        const bbox = new THREE.Box3().setFromObject(gltf.scene);

        // Get the size of the bounding box to set the scale of the model
        console.log(
          `min: ${bbox.min.x.toFixed(2)}, ${bbox.min.y.toFixed(
            2
          )}, ${bbox.min.z.toFixed(2)} max: ${bbox.max.x.toFixed(
            2
          )}, ${bbox.max.y.toFixed(2)}, ${bbox.max.z.toFixed(2)}`
        );
        this.loadingBar.visible = false;

        this.renderer.setAnimationLoop(this.render.bind(this));

        this.plane = gltf.scene;
      },
      (xhr) => {
        this.loadingBar.progress = xhr.loaded / xhr.total;
      },
      (err) => {
        console.error('An error happened loading the GLTF file', err);
      }
    );
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    if (this.plane) {
      this.plane.rotation.y += 0.01;
    }
    this.renderer.render(this.scene, this.camera);
  }
}

let app = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new Main();
});
