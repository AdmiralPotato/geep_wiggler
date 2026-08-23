import {
	type Bone,
	type Object3D,
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Mesh,
	HemisphereLight,
	BoxGeometry,
	Vector3,
	SphereGeometry,
	MeshBasicMaterial,
	PointLight,
	MeshStandardMaterial,
	PCFShadowMap,
} from 'three';

import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';

const TAU = Math.PI / 2;

const gltfLoader = new GLTFLoader();
const [physics, geepLTF] = await Promise.all([
	RapierPhysics(),
	new Promise<GLTF>((resolve) => gltfLoader.load('geep.glb', resolve)),
]);

const params = {
	animate: true,
};

const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x333333, 1.0);
renderer.setPixelRatio(window.devicePixelRatio);
export const canvas = renderer.domElement;

const scene = new Scene();

const camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(10, 10, 20);

let width = 0;
let height = 0;
const resize = function () {
	const rect = canvas.getBoundingClientRect();
	if (width !== rect.width || height !== rect.height) {
		width = rect.width;
		height = rect.height;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}
};
resize();

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 10;
controls.maxDistance = 500;

const hemisphereLight = new HemisphereLight(undefined, undefined, 1);
scene.add(hemisphereLight);
// const directionalLight = new DirectionalLight(undefined, 3);
// directionalLight.castShadow = true;
// scene.add(directionalLight);
const pointLight = new PointLight(undefined, 1000);
pointLight.position.set(10, 20, 0);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
// pointLight.shadow.blurSamples = 2;
pointLight.castShadow = true;
const shadowSize = 512;
pointLight.shadow.radius = 16;
// console.log('blurSamples', pointLight.shadow.blurSamples);
pointLight.shadow.bias = 0.001;
pointLight.shadow.mapSize.set(shadowSize, shadowSize);
pointLight.shadow.map?.setSize(shadowSize, shadowSize);
scene.add(pointLight);
const c = pointLight.shadow.camera;
c.near = 0.05;
c.far = 30;

// Position and Color Data

// init gui

const gui = new GUI();

gui.add(params, 'animate');

// end init gui

const geepParentMesh = new SphereGeometry(4, 6, 4);
const geepParentMaterial = new MeshBasicMaterial({ wireframe: true });
const geepParent = new Mesh(geepParentMesh, geepParentMaterial);
scene.add(geepParent);

const geepScene = geepLTF.scene;
geepScene.traverse(function (child) {
	if (child.isObject3D) {
		child.castShadow = true;
	}
});
const geep = geepScene.getObjectByName('geep_bones') as Object3D;
const hip = geepScene.getObjectByName('hip') as Bone;

geep.position.y = -5;
geepParent.userData.physics = { mass: 1, restitution: 1 };
geepParent.add(geepScene);

const floorSize = 100;
const floorPlane = new BoxGeometry(floorSize, floorSize, 0.5);
const floorMaterial = new MeshStandardMaterial();
const floorPlaneMesh = new Mesh(floorPlane, floorMaterial);
floorPlaneMesh.rotation.x = -TAU;
floorPlaneMesh.receiveShadow = true;
floorPlaneMesh.position.y = -7;
floorPlaneMesh.userData.physics = { mass: 0, restitution: 1 };
scene.add(floorPlaneMesh);

let lastTime = performance.now();
function animate() {
	resize();
	const now = performance.now() / 1000;
	const delta = now - lastTime;
	lastTime = now;
	geep.rotation.y += 0.5 * delta;
	hip.rotation.x = Math.PI * (0.75 - Math.cos(geep.rotation.y * 32) * 0.25);
	renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
physics.addScene(scene);
physics.setMeshVelocity(geepParent, new Vector3(0, 10, 0));

export const cleanup = () => {
	gui.destroy();
	renderer.setAnimationLoop(null);
	renderer.dispose();
	renderer.forceContextLoss();
};

Object.assign(window, {
	renderer,
	camera,
	geepParent,
	pointLight,
	floorPlane,
	geep,
	hip,
	physics,
});
