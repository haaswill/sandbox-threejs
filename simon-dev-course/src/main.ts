import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Main {
  private threejs = new THREE.WebGLRenderer({
    antialias: true,
  });
  private camera: THREE.PerspectiveCamera;
  private scene = new THREE.Scene();
  private stats: Stats | undefined;

  constructor() {
    this.threejs.shadowMap.enabled = true;
    this.threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threejs.setPixelRatio(window.devicePixelRatio);
    this.threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.threejs.domElement);

    window.addEventListener(
      'resize',
      () => {
        this.onWindowResize();
      },
      false
    );

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(75, 20, 0);

    this.initializeLights();
    this.initializeControls();
    this.initializeTextures();
    this.initializePlane();
    this.initializeModel();
    this.initializeStats();

    this.animate();
  }

  private initializeLights(): void {
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 100, 10);
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500.0;
    dirLight.shadow.camera.left = 100;
    dirLight.shadow.camera.right = -100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    this.scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0x101010);
    this.scene.add(ambLight);
  }

  private initializeControls(): void {
    const controls = new OrbitControls(this.camera, this.threejs.domElement);
    controls.target.set(0, 20, 0);
    controls.update();
  }

  private initializeTextures(): void {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      'assets/textures/posx.jpg',
      'assets/textures/negx.jpg',
      'assets/textures/posy.jpg',
      'assets/textures/negy.jpg',
      'assets/textures/posz.jpg',
      'assets/textures/negz.jpg',
    ]);
    this.scene.background = texture;
  }

  private initializePlane(): void {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
      })
    );

    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this.scene.add(plane);
  }

  private initializeModel(): void {
    const loader = new GLTFLoader();
    loader.load('assets/low-poly_wolf/scene.gltf', (gltf) => {
      gltf.scene.scale.set(0.01, 0.01, 0.01);
      this.scene.add(gltf.scene);
    });
  }

  private initializeStats(): void {
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.threejs.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => {
      this.threejs.render(this.scene, this.camera);
      this.stats?.update();

      this.animate();
    });
  }
}

let App: Main | null = null;

window.addEventListener('DOMContentLoaded', () => {
  App = new Main();
});
