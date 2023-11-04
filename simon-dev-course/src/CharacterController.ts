import * as THREE from 'three';
import {
  FBXLoader,
  AnimationClip,
} from 'three/examples/jsm/loaders/FBXLoader.js';

interface AnimationData {
  clip: THREE.AnimationClip;
  action: THREE.AnimationAction;
}

interface KeyStates {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
  shift: boolean;
}

class BasicCharacterControllerProxy {
  private _animations: { [key: string]: AnimationData } | {};

  constructor(animations: { [key: string]: AnimationData } | {}) {
    this._animations = animations;
  }

  get animations(): { [key: string]: AnimationData } {
    return this._animations;
  }
}

class CharacterController {
  private _params: {
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
  };
  private _decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
  private _acceleration = new THREE.Vector3(1, 0.25, 50.0);
  private _velocity = new THREE.Vector3(0, 0, 0);
  private _animations: AnimationData | {} = {};
  private _input = new CharacterControllerInput();
  private _stateMachine = new CharacterFSM(
    new BasicCharacterControllerProxy(this._animations)
  );
  private _target: THREE.Group<THREE.Object3DEventMap> | undefined;
  private _mixer: THREE.AnimationMixer | undefined;
  private _manager: THREE.LoadingManager | undefined;

  constructor(params: { camera: THREE.PerspectiveCamera; scene: THREE.Scene }) {
    this._params = params;

    this.loadModels();
  }

  loadModels() {
    const loader = new FBXLoader();
    loader.setPath('assets/zombie/');
    loader.load('mremireh_o_desbiens.fbx', (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse((c) => {
        c.castShadow = true;
      });

      this._target = fbx;
      this._params.scene.add(this._target);
      this._mixer = new THREE.AnimationMixer(this._target);
      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._stateMachine.setState('idle');
      };

      const onLoad = (
        animationName: string,
        animation: THREE.AnimationClip
      ) => {
        const clip = animation.animations[0];
        const action = this._mixer!.clipAction(clip);

        this._animations[animationName] = {
          clip,
          action,
        };
      };
    });
  }
}

class CharacterControllerInput {
  private _keys: KeyStates = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    space: false,
    shift: false,
  };

  constructor() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this.onKeyUp(e), false);
  }

  onKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    switch (key) {
      case 'w' || 'W':
        this._keys.forward = true;
        break;
      case 'a' || 'A':
        this._keys.left = true;
        break;
      case 's' || 'S':
        this._keys.backward = true;
        break;
      case 'd' || 'D':
        this._keys.right = true;
        break;
      case ' ':
        this._keys.space = true;
        break;
      case 'Shift':
        this._keys.shift = true;
        break;
    }
  }

  onKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    switch (key) {
      case 'w' || 'W':
        this._keys.forward = false;
        break;
      case 'a' || 'A':
        this._keys.left = false;
        break;
      case 's' || 'S':
        this._keys.backward = false;
        break;
      case 'd' || 'D':
        this._keys.right = false;
        break;
      case ' ':
        this._keys.space = false;
        break;
      case 'Shift':
        this._keys.shift = false;
        break;
    }
  }
}

class FiniteStateMachine {
  private _states: { [key: string]: State } = {};
  private _currentState: State | null = null;

  addState(name: string, type: State) {
    this._states[name] = type;
  }

  setState(name: string) {
    const prevState = this._currentState;

    if (prevState) {
      if (prevState.name === name) {
        return;
      }

      prevState.exit();
    }
  }
}

class CharacterFSM extends FiniteStateMachine {
  private _proxy: BasicCharacterControllerProxy;

  constructor(proxy: BasicCharacterControllerProxy) {
    super();

    this._proxy = proxy;

    this.addState('idle', IdleState);
    this.addState('walk', WalkState);
    this.addState('run', RunState);
    this.addState('dance', DanceState);
  }
}

abstract class State {
  public parent: FiniteStateMachine;

  constructor(parent: FiniteStateMachine) {
    this.parent = parent;
  }

  abstract get name(): string;

  enter(prevState?: State) {}
  exit() {}
  update(timeElapsed: number, input: CharacterControllerInput) {}
}

class DanceState extends State {
  constructor(parent: any) {
    super(parent);
  }

  get name() {
    return 'dance';
  }

  enter(prevState: State) {
    const curAction = this.parent.proxy.animations['dance'].action;
    const mixer = curAction.getMixer();
    mixer.addEventListener('finished', this.finished);

    if (prevState) {
      const prevAction = this.parent.proxy.animations[prevState.name].action;

      curAction.reset();
      curAction.setLoop(THREE.LoopOnce, 1);
      curAction.clampWhenFinished = true;
      curAction.crossFadeFrom(prevAction, 0.2, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  finished() {
    this.cleanUp();
    this.parent.setState('idle');
  }

  cleanUp() {
    const action = this.parent.proxy.animations['dance'].action;

    action.getMixer().removeEventListener('finished', this.cleanUp);
  }

  exit() {
    this.cleanUp();
  }
}
