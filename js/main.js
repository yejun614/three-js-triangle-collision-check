import * as THREE from './three/three.module.js';
import { GLTFLoader } from './three/GLTFLoader.js';
import { OrbitControls } from './three/OrbitControls.js';
import { TransformControls } from './three/TransformControls.js';

class TheSpace {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    this.camera.position.z = 5;
    this.camera.position.y = 5;
    this.camera.rotation.x = -0.8;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    this.renderer.domElement.setAttribute("tabindex", 0);
    this.renderer.domElement.addEventListener('pointermove', event => this.pointerMoveEvent(event));
    this.renderer.domElement.addEventListener('pointerdown', event => this.pointerDownEvent(event));
    this.renderer.domElement.addEventListener('pointerup', event => this.pointerUpEvent(event));
    this.renderer.domElement.addEventListener('keydown', event => this.keydownEvent(event));

    this.objects = {};
    this.isDraggable = false;
    this.raycaster = new THREE.Raycaster();
    this.dragObject = undefined;
  }

  async init() {
    this.addGrid();
    await this.addObjects();
    this.addControls();

    requestAnimationFrame(() => this.update());
  }

  raycast(mouseX, mouseY) {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(
      (mouseX / window.innerWidth) * 2 - 1,
      - (mouseY / window.innerHeight) * 2 + 1,
    );

    raycaster.setFromCamera(pointer, this.camera);

    return raycaster;
  }

  pointerMoveEvent(event) {
    // console.log('move');
  }

  pointerDownEvent(event) {
    // console.log('down');
    const raycaster = this.raycast(event.clientX, event.clientY);
    const intersects = raycaster.intersectObjects([
      this.objects["Monkey"],
      this.objects["Gun"],
    ]);

    if (intersects.length > 0) {
      // console.log(intersects[0]);

      // TransformControls attach
      const object = intersects[0].object;

      if (object.name != "BulletLine") {
        this.transformControls.attach(intersects[0].object);
      }
    }
  }

  pointerUpEvent(event) {
    // console.log('up');
  }

  keydownEvent(event) {
    // console.log(event.key);

    if (event.key == "Escape") {
      this.transformControls.detach();
    } else if (event.key == "z") {
      const currentMode = this.transformControls.getMode();

      if (currentMode == 'translate') {
        this.transformControls.setMode('rotate');
      } else if (currentMode == 'rotate') {
        this.transformControls.setMode('scale');
      } else {
        this.transformControls.setMode('translate');
      }
    }
  }

  addGrid() {
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);
    this.objects["Grid"] = gridHelper;
  }

  async addObjects() {
    // GLTF Loader
    const gltfLoader = new GLTFLoader();

    // Monkey
    const monkey = (await gltfLoader.loadAsync('../models/monkey.glb')).scene.children[0];
    monkey.position.y = 1;
    monkey.position.z = -3;
    // this.scene.add(monkey);
    // this.objects["Monkey"] = monkey;
    console.log(monkey);

    // Monkey wireframe
    const monkeyWireframe = new THREE.WireframeGeometry(monkey.geometry);
    const monkeyLine = new THREE.LineSegments(monkeyWireframe);
    monkeyLine.name = "MonkeyLine";
    monkeyLine.material.depthTest = false;
    monkeyLine.material.opacity = 0.25;
    monkeyLine.material.transparent = true;
    this.scene.add(monkeyLine);
    this.objects["Monkey"] = monkeyLine;
    // monkey.add(monkeyLine);

    // Gun
    const gun = (await gltfLoader.loadAsync('../models/gun.glb')).scene.children[0];
    gun.position.y = 1;
    gun.position.z = 3;
    this.scene.add(gun);
    this.objects["Gun"] = gun;

    // Bullet Line
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(0, 0.1, -10),
    ]);
    const bulletLine = new THREE.Line(lineGeometry, lineMaterial);
    bulletLine.name = "BulletLine";
    this.objects["Gun"].add(bulletLine);

    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.x = 5;
    directionalLight.position.y = 5;
    directionalLight.position.z = 5;
    this.scene.add(directionalLight);

    // Directional Light 2
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight2.position.x = -5;
    directionalLight2.position.y = 5;
    directionalLight2.position.z = 5;
    this.scene.add(directionalLight2);
  }

  addControls() {
    // Orbit Controls
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);

    // TransformControls
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.setMode('translate');
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
    });
    this.scene.add(this.transformControls);
  }

  update() {
    if (this.monkey) {
      this.monkey.rotation.y += 0.01;
    }

    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.update());
  }
}

function detectWebGLContext() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

  return gl instanceof WebGLRenderingContext;
}

let space = undefined;

if (detectWebGLContext()) {
  space = new TheSpace();
  space.init();
  document.body.appendChild(space.renderer.domElement);

} else {
  // warning
  const span = document.createElement("span");
  span.innerText = "This browser cannot supports WebGL context";
  document.body.appendChild(span);
}
