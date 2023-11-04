import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { LoadingBar } from './LoadingBar.js';

class Game {
  constructor() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    this.clock = new THREE.Clock();

    this.loadingBar = new LoadingBar();
    this.loadingBar.visible = false;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      50
    );
    this.camera.position.set(1, 1.7, 2.8);

    let col = 0x605550;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(col);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    this.scene.add(ambient);

    const light = new THREE.DirectionalLight();
    light.position.set(0.2, 1, 1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.setEnvironment();

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    this.loadEve();

    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setEnvironment() {
    const loader = new RGBELoader().setPath('textures/');
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const self = this;

    loader.load(
      'factory.hdr',
      (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        pmremGenerator.dispose();

        self.scene.environment = envMap;
      },
      undefined,
      (err) => {
        console.error(err.message);
      }
    );
  }

  loadEve() {
    const loader = new GLTFLoader().setPath('glb/');
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    this.loadingBar.visible = true;

    loader.load(
      'eve.glb',
      (gltf) => {
        this.scene.add(gltf.scene);
        this.eve = gltf.scene;
        this.mixer = new THREE.AnimationMixer(gltf.scene);

        this.animations = {};

        gltf.animations.forEach((animation) => {
          this.animations[animation.name.toLowerCase()] = animation;
        });

        this.actionName = '';

        this.newAnim();

        this.loadingBar.visible = false;

        this.renderer.setAnimationLoop(this.render.bind(this));
      },
      (xhr) => {
        this.loadingBar.progress = xhr.loaded / xhr.total;
      },
      (err) => {
        console.error(err);
      }
    );
  }

  newAnim() {
    const keys = Object.keys(this.animations);

    let index;

    do {
      index = Math.floor(Math.random() * keys.length);
    } while (keys[index] === this.actionName);

    this.action = keys[index];

    setTimeout(this.newAnim.bind(this), 3000);
  }

  set action(name) {
    const clip = this.animations[name];

    if (clip) {
      const action = this.mixer.clipAction(clip);

      action.reset();

      if (name === 'death') {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      }

      action.play();

      if (this.curAction) {
        if (this.actionName === 'death') {
          this.curAction.enabled = false;
        } else {
          this.curAction.crossFadeTo(action, 0.5);
        }
      }

      this.actionName = name;
      this.curAction = action;
    }
  }

  render() {
    const dt = this.clock.getDelta();

    if (this.mixer) {
      this.mixer.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

let app = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new Game();
});
