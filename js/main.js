import * as THREE from './three/three.module.js';
import { GLTFLoader } from './three/GLTFLoader.js';
import { OrbitControls } from './three/OrbitControls.js';
import { TransformControls } from './three/TransformControls.js';
import forEachTriangle from './three/ThreeTriangleIterator.js';

function SignCheck(a, b) {
  if (a == -0) a = 0;
  if (b == -0) b = 0;
  return (a == b) || (a * b > 0); // >=
}

function VectorDirectionCheck(vec1, vec2) {
  const X = SignCheck(vec1.x, vec2.x);
  const Y = SignCheck(vec1.y, vec2.y);
  const Z = SignCheck(vec1.z, vec2.z);

  return X && Y && Z;
}
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
    window.addEventListener('resize', event => this.resizeEvent(event));

    this.objects = {};
    this.isDraggable = false;
    this.raycaster = new THREE.Raycaster();
    this.dragObject = undefined;
    this.isMouseDown = false;
    this.tempGroup = new THREE.Group();
    this.bulletLine = 10;
  }

  async init() {
    this.addGrid();
    await this.addObjects();
    this.addControls();
    this.triangleCollision();

    this.scene.add(this.tempGroup);

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

  triangleCollision() {
    const targetObjects = [
      this.objects['Monkey'],
      this.objects['IcoSphere'],
      this.objects['Torus'],
    ];

    this.tempGroup.clear();

    const gun = this.objects["Gun"];
    const bulletStart = new THREE.Vector3(gun.position.x, gun.position.y, gun.position.z);


    let bulletDirection = new THREE.Vector3(0, 0, -1);
    bulletDirection = new THREE.Vector3(
      bulletDirection.x * Math.cos(gun.rotation.z) - bulletDirection.y * Math.sin(gun.rotation.z),
      bulletDirection.x * Math.sin(gun.rotation.z) + bulletDirection.y * Math.cos(gun.rotation.z),
      bulletDirection.z,
    );

    bulletDirection = new THREE.Vector3(
      bulletDirection.x,
      bulletDirection.y * Math.cos(gun.rotation.x) - bulletDirection.z * Math.sin(gun.rotation.x),
      bulletDirection.y * Math.sin(gun.rotation.x) + bulletDirection.z * Math.cos(gun.rotation.x),
    );

    bulletDirection = new THREE.Vector3(
      bulletDirection.z * Math.sin(gun.rotation.y) + bulletDirection.x * Math.cos(gun.rotation.y),
      bulletDirection.y,
      bulletDirection.z * Math.cos(gun.rotation.y) - bulletDirection.x * Math.sin(gun.rotation.y),
    );

    if (gun.rotation.z < -Math.PI/2 || gun.rotation.z > Math.PI/2) {
      bulletDirection.x *= -1;
    }
    if (gun.rotation.x < -Math.PI/2 || gun.rotation.x > Math.PI/2) {
      // bulletDirection.z *= -1;
    }
    if (gun.rotation.y < -Math.PI/2 || gun.rotation.y > Math.PI/2) {
      bulletDirection.y *= -1;
    }

    bulletDirection.multiplyScalar(this.bulletLine);

    const bulletEnd = bulletStart.clone().add(bulletDirection);

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([bulletStart, bulletEnd]);
    const bulletLine = new THREE.Line(lineGeometry, lineMaterial);

    if (this.objects["BulletLine"]) {
      this.scene.remove(this.objects["BulletLine"]);
    }
    this.scene.add(bulletLine);
    this.objects["BulletLine"] = bulletLine;

    let countCollisionTriangles = 0;

    for (const object of targetObjects) {
      forEachTriangle(object, triangle => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          triangle[0], triangle[1], triangle[2],
        ]);

        let isCollision = false;
        let normalVector = triangle[0].clone().cross(triangle[1]);

        let A = triangle[0].y * (triangle[1].z - triangle[2].z);
        A += triangle[1].y * (triangle[2].z - triangle[0].z);
        A += triangle[2].y * (triangle[0].z - triangle[1].z);

        let B = triangle[0].z * (triangle[1].x - triangle[2].x);
        B += triangle[1].z * (triangle[2].x - triangle[0].x);
        B += triangle[2].z * (triangle[0].x - triangle[1].x);

        let C = triangle[0].x * (triangle[1].y - triangle[2].y);
        C += triangle[1].x * (triangle[2].y - triangle[0].y);
        C += triangle[2].x * (triangle[0].y - triangle[1].y);

        let D = triangle[0].x * ((triangle[1].y * triangle[2].z) - (triangle[2].y * triangle[1].z));
        D += triangle[1].x * ((triangle[2].y * triangle[0].z) - (triangle[0].y * triangle[2].z));
        D += triangle[2].x * ((triangle[0].y * triangle[1].z) - (triangle[1].y * triangle[0].z));
        D *= -1;

        let t = (A * bulletStart.x) + (B * bulletStart.y) + (C * bulletStart.z) + D;
        t /= (A * bulletDirection.x) + (B * bulletDirection.y) + (C * bulletDirection.z);
        t *= -1;

        if (normalVector.dot(bulletDirection) == 0 && (t == 0 || t == Infinity)) {
          const OA = triangle[0].clone().sub(bulletStart);
          const OB = triangle[1].clone().sub(bulletStart);
          const OC = triangle[1].clone().sub(bulletStart);

          const LA = bulletStart.clone().cross(OA);
          const LB = bulletStart.clone().cross(OB);
          const LC = bulletStart.clone().cross(OC);

          if (!VectorDirectionCheck(LA, LB)) {
            isCollision = true;
          } else if (!VectorDirectionCheck(LB, LC)) {
            isCollision = true;
          } else if (!VectorDirectionCheck(LC, LA)) {
            isCollision = true;
          }

        } else if (t != Infinity && t >= 0 && t <= 1) {
          const tPos = bulletStart.clone().add(bulletDirection.clone().multiplyScalar(t));

          const AB = triangle[1].clone().sub(triangle[0]);
          const BC = triangle[2].clone().sub(triangle[1]);
          const CA = triangle[0].clone().sub(triangle[2]);

          AB.cross(tPos.clone().sub(triangle[0]));
          BC.cross(tPos.clone().sub(triangle[1]));
          CA.cross(tPos.clone().sub(triangle[2]));

          isCollision = VectorDirectionCheck(AB, BC) && VectorDirectionCheck(BC, CA);

          if (isCollision) {
            this.tempGroup.add(new THREE.Points(
              new THREE.BufferGeometry().setFromPoints([tPos]),
              new THREE.PointsMaterial({ size: 0.05, color: 0x0000ff }),
            ));

            countCollisionTriangles++;
          }
        }

        if (isCollision) {
          const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          const mesh = new THREE.Mesh(geometry, material);
          this.tempGroup.add(mesh);
        }

        const wireframe = new THREE.WireframeGeometry(geometry);
        const line = new THREE.LineSegments(wireframe);
        line.material.depthTest = true;
        line.material.opacity = 1;
        line.material.transparent = true;
        this.tempGroup.add(line);
      });
    }

    // Output
    const bulletVectorStr = `(${Math.round(bulletDirection.x * 1000) / 1000}, ${Math.round(bulletDirection.y * 1000) / 1000}, ${Math.round(bulletDirection.z * 1000) / 1000})`;
    document.getElementById('bullet-vector').innerText = bulletVectorStr;
    document.getElementById('count-collision-triangles').innerText = countCollisionTriangles.toString();
  }

  pointerMoveEvent(event) {
    // console.log('move');

    if (this.isMouseDown && this.transformControls.visible) {
      this.tempGroup.clear();
    }
  }

  pointerDownEvent(event) {
    // console.log('down');
    if (event.button !== 0) return;
    this.isMouseDown = true;

    const raycaster = this.raycast(event.clientX, event.clientY);
    const intersects = raycaster.intersectObjects([
      this.objects["Monkey"],
      this.objects["Torus"],
      this.objects["IcoSphere"],
      this.objects["Gun"],
    ]);

    if (intersects.length > 0) {
      let i = 0;
      while (
        intersects[i] == undefined
        || intersects[i].object.name == "BulletLine"
        || intersects[i].object instanceof THREE.LineSegments
      ) {
        if (i > intersects.length) return;
        i++;
      }

      this.transformControls.attach(intersects[i].object);
    }
  }

  pointerUpEvent(event) {
    // console.log('up');

      this.isMouseDown = false;
      this.triangleCollision();
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

  resizeEvent(event) {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
    const monkey = (await gltfLoader.loadAsync('models/monkey.glb')).scene.children[0];
    monkey.position.y = 1;
    monkey.position.z = -3;
    monkey.material.opacity = 0.8;
    monkey.material.transparent = true;
    this.scene.add(monkey);
    this.objects["Monkey"] = monkey;

    // Monkey
    const icoSphere = (await gltfLoader.loadAsync('models/icoSphere.glb')).scene.children[0];
    icoSphere.position.x = 3;
    icoSphere.position.y = 1;
    icoSphere.position.z = -3;
    icoSphere.material.opacity = 0.8;
    icoSphere.material.transparent = true;
    this.scene.add(icoSphere);
    this.objects["IcoSphere"] = icoSphere;

    // Torus
    const torus = (await gltfLoader.loadAsync('models/torus.glb')).scene.children[0];
    torus.position.x = -3;
    torus.position.y = 1;
    torus.position.z = -3;
    torus.material.opacity = 0.8;
    torus.material.transparent = true;
    this.scene.add(torus);
    this.objects["Torus"] = torus;

    // Gun
    const gun = (await gltfLoader.loadAsync('models/gun.glb')).scene.children[0];
    gun.position.y = 1.1;
    gun.position.z = 3;
    this.scene.add(gun);
    this.objects["Gun"] = gun;
    gun.rotation.x = 0;
    gun.rotation.z = 0;

    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.x = 10;
    directionalLight.position.y = 5;
    directionalLight.position.z = 5;
    this.scene.add(directionalLight);

    // Directional Light 2
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight2.position.x = -10;
    directionalLight2.position.y = 5;
    directionalLight2.position.z = 5;
    this.scene.add(directionalLight2);

    // Directional Light 3
    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight2.position.x = 5;
    directionalLight2.position.y = 5;
    directionalLight2.position.z = -10;
    this.scene.add(directionalLight3);
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
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.update());
  }
}

// WebGL Support Check Function
function detectWebGLContext() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

  return gl instanceof WebGLRenderingContext; // boolean
}

// ENTRY POINT
(async () => {
  const screen = document.getElementById('screen');
  const helpToggleBtn = document.getElementById('help-toggle-btn');

  helpToggleBtn.addEventListener('click', () => {
    if (helpToggleBtn.innerText === "HIDE") {
      document.querySelectorAll('#help .swap').forEach((el) => el.classList.remove('active'));
      helpToggleBtn.innerText = "SHOW";
    } else {
      document.querySelectorAll('#help .swap').forEach((el) => el.classList.add('active'));
      helpToggleBtn.innerText = "HIDE";
    }
  });

  if (detectWebGLContext()) {
    const space = new TheSpace();
    await space.init();
    screen.appendChild(space.renderer.domElement);
  } else {
    // warning
    const span = document.createElement("span");
    span.innerText = "This browser cannot supports WebGL context";
    screen.appendChild(span);
  }
})();
