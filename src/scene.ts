import {
	type Bone,
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
	Object3D,
	LineSegments,
	BufferGeometry,
	LineBasicMaterial,
	BufferAttribute,
	Quaternion,
	ArrowHelper,
	SkeletonHelper,
	ConeGeometry,
	TextureLoader,
	RepeatWrapping,
	ColorManagement,
	NeutralToneMapping,
} from 'three';

// use lil-gui as its own dependency; the one bundled with three.js is 0.17,
// which has select field bugs that were fixed 3 years ago
// reference: https://github.com/georgealways/lil-gui/issues/86
import { GUI } from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';
import type { Collider, RigidBody } from '@dimforge/rapier3d-compat';

const TAU = Math.PI * 2;

const gltfLoader = new GLTFLoader();
const [physics, geepLTF] = await Promise.all([
	RapierPhysics(),
	new Promise<GLTF>((resolve) => gltfLoader.load('geep.glb', resolve)),
]);
const { RAPIER, world } = physics;
const resetGeepPhysics = () => {
	const rigidBody: RigidBody = geepParent.userData.physics.body;
	const zeroVec = new Vector3();
	const zeroQuat = new Quaternion();
	rigidBody.setTranslation(zeroVec, true);
	rigidBody.setRotation(zeroQuat, true);
	rigidBody.setAngvel(zeroQuat, true);
	rigidBody.setLinvel(zeroVec, true);
	controls.target.set(0, 0, 0);
	controls.update();
};
const fileInputField = document.createElement('input');
fileInputField.type = 'file';
fileInputField.addEventListener('change', async () => {
	const file: File | undefined = (fileInputField.files || [])[0];
	if (file?.name) {
		console.log('fileInputField file:', file);
		const fileContentBuffer = await file.arrayBuffer();
		const hashBuffer = await window.crypto.subtle.digest('SHA-256', fileContentBuffer);
		const hashString = [...new Uint8Array(hashBuffer)]
			.map((a) => a.toString(16).padStart(2, '0'))
			.join('');
		console.log('fileInputField hashString:', hashString);
		const blob = new Blob([fileContentBuffer]);
		const url = URL.createObjectURL(blob);
		console.log('fileInputField url:', url);
		textureNamePathMap[file?.name] = url;
		params.texture = url;
		floorTextureController.options(textureNamePathMap);
		floorTextureController.updateDisplay();
		loadTexture(url);
	}
});
const textureNamePathMap: Record<string, string> = {
	'floor_texture_0.png': 'floor_texture_0.png',
	'floor_texture_1.png': 'floor_texture_1.png',
	'floor_texture_2.png': 'floor_texture_2.png',
	'floor_texture_3.png': 'floor_texture_3.png',
	'floor_texture_4.png': 'floor_texture_4.png',
	'floor_texture_5.png': 'floor_texture_5.png',
};
const defaultParams = {
	geepWiggleSpeed: 200,
	geepWiggleIntensity: 1,
	showPhysics: true,
	cameraFollow: false,
	texture: textureNamePathMap['floor_texture_0.png']!,
	textureRepeatCount: 16,
	offsetX: 0,
	offsetY: 0,
};
const resetAllConfigurableSettings = () => {
	// Object.assign(params, defaultParams);
	// gui.reset(true);
	gui.load({ controllers: { ...defaultParams } });
};
const params = {
	...defaultParams,
	resetAllConfigurableSettings,
	resetGeepPhysics,
	uploadTexture: function () {
		fileInputField.click();
	},
};

const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0.0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = NeutralToneMapping;
export const canvas = renderer.domElement;

const scene = new Scene();

const camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(10, 10, 20);
// camera.position.set(20, 0, 0); // right side
// camera.position.set(0, 20, 0); // top side

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
controls.enableDamping = true;
controls.dampingFactor = 1;

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
const shadowSize = 1024;
pointLight.shadow.radius = 16;
// console.log('blurSamples', pointLight.shadow.blurSamples);
pointLight.shadow.bias = 0.001;
pointLight.shadow.mapSize.set(shadowSize, shadowSize);
pointLight.shadow.map?.setSize(shadowSize, shadowSize);
scene.add(pointLight);
const c = pointLight.shadow.camera;
c.near = 0.05;
c.far = 100;

// Position and Color Data

// init gui

const gui = new GUI();
gui.add(params, 'resetAllConfigurableSettings');
gui.add(params, 'geepWiggleSpeed', 0, 400);
gui.add(params, 'geepWiggleIntensity', 0, 2.5);
gui.add(params, 'showPhysics').name('Physics Debug Renderer');
gui.add(params, 'cameraFollow').name('Camera Follows Geep');
gui.add(params, 'resetGeepPhysics');
const floorTextureController = gui
	.add(params, 'texture')
	.options(textureNamePathMap)
	.onChange((path: string) => loadTexture(path));
let lastFloorTextureImage: HTMLImageElement;
const updateTextureUVParams = () => {
	const repeat = params.textureRepeatCount;
	const { width, height } = lastFloorTextureImage;
	floorMaterial.map!.repeat.set(repeat, (width / height) * repeat);
	floorMaterial.map!.offset.set(params.offsetX, params.offsetY);
};
gui.add(params, 'textureRepeatCount', 0.25, 32).onChange(updateTextureUVParams);
gui.add(params, 'offsetX', 0, 1).onChange(updateTextureUVParams);
gui.add(params, 'offsetY', 0, 1).onChange(updateTextureUVParams);
gui.add(params, 'uploadTexture').name('Upload Floor Texture');

const geepParentMesh = new SphereGeometry(1, 6, 4);
const geepParentMaterial = new MeshBasicMaterial({ wireframe: true });
const geepParent = new Mesh(geepParentMesh, geepParentMaterial);
geepParentMaterial.visible = false;
scene.add(geepParent);

const geepScene = geepLTF.scene;
geepScene.traverse(function (child) {
	if (child.isObject3D) {
		child.castShadow = true;
	}
});
const geepBones = geepScene.getObjectByName('geep_bones') as Object3D;
// const geep = geepScene.getObjectByName('geep') as SkinnedMesh;
const skeletonHelper = new SkeletonHelper(geepBones);
scene.add(skeletonHelper);
// const hip = geepScene.getObjectByName('hip') as Bone;
const legL = geepScene.getObjectByName('hind_1_L') as Bone;
const legR = geepScene.getObjectByName('hind_1_R') as Bone;
const armL = geepScene.getObjectByName('leg_1_L') as Bone;
const armR = geepScene.getObjectByName('leg_1_R') as Bone;
const spine0 = geepScene.getObjectByName('spine_0') as Bone;
const spine1 = geepScene.getObjectByName('spine_1') as Bone;
geepBones.position.y = -3.75;
geepParent.userData.physics = { mass: 1, restitution: 0.99 };
geepParent.add(geepScene);

const floorSize = 100;
const floorGeometry = new BoxGeometry(floorSize, floorSize, floorSize);
const floorMaterial = new MeshStandardMaterial();
const loadTexture = (path: string) => {
	if (floorMaterial.map) {
		floorMaterial.map.dispose();
	}
	const texture = new TextureLoader().load(path, (texture) => {
		console.log('Floor texture loaded!', texture.image);
		lastFloorTextureImage = texture.image;
		updateTextureUVParams();
	});
	texture.anisotropy = 4;
	texture.wrapS = RepeatWrapping;
	texture.wrapT = RepeatWrapping;
	floorMaterial.map = texture;
};
loadTexture(params.texture);
const floorMesh = new Mesh(floorGeometry, floorMaterial);
floorMesh.receiveShadow = true;
floorMesh.position.y = -floorSize / 2 - 7;
floorMesh.userData.physics = { mass: 0, restitution: 1 };
scene.add(floorMesh);
physics.addScene(scene);
// physics.setMeshVelocity(geepParent, new Vector3(0, 5, 0));
const geepRigidBody: RigidBody = geepParent.userData.physics.body;
const legRadius = 1;
const legLength = 1.125;
const limbRestitution = 0.5;
const armsShape = RAPIER.ColliderDesc.capsule(legLength, legRadius)
	.setMass(1000)
	.setRestitution(limbRestitution);
const legsShape = RAPIER.ColliderDesc.capsule(legLength, legRadius)
	.setMass(1000)
	.setRestitution(limbRestitution);
// reference: https://github.com/mrdoob/three.js/blob/083a11c06704e31f67f4fbcc988801dbff81e20c/examples/jsm/physics/RapierPhysics.js#L54-L74
const getConvexShapeFromBufferGeometry = (geometry: BufferGeometry) => {
	const vertices: number[] = [];
	const vertex = new Vector3();
	const position = geometry.getAttribute('position');

	for (let i = 0; i < position.count; i++) {
		vertex.fromBufferAttribute(position, i);
		vertices.push(vertex.x, vertex.y, vertex.z);
	}

	/*
	// only needed if we're making a trimesh, but this one is convexMesh
	// if the buffer is non-indexed, generate an index buffer
	const indices = Uint32Array.from(
		geometry.getIndex() === null
			? Array(Math.floor(vertices.length / 3)).keys()
			: geometry.getIndex()!.array,
	);
	*/

	return RAPIER.ColliderDesc.convexMesh(Float32Array.from(vertices))!;
};
const geepTopCollisionCone = new ConeGeometry(10, 8, 4);
const geepTopCollisionMesh = new BufferGeometry();
geepTopCollisionMesh.copy(geepTopCollisionCone);
geepTopCollisionMesh.rotateX(Math.PI);
geepTopCollisionMesh.translate(0, 3, 0);
const topMeshShape = getConvexShapeFromBufferGeometry(geepTopCollisionMesh)
	.setMass(0.1)
	.setRestitution(3);
const topMeshCollider = world.createCollider(topMeshShape, geepRigidBody);
const armsCollider = world.createCollider(armsShape, geepRigidBody);
const legsCollider = world.createCollider(legsShape, geepRigidBody);
const legsOffset = new Vector3(0, -legLength, 0);
const armsOffset = new Vector3(0, legLength, 0);
const applyPivotedColliderRotation = (
	collider: Collider,
	pivot: Vector3,
	orientation: Orientation,
) => {
	const { position, quaternion } = orientation;
	const rotatedPivot = new Vector3().sub(pivot).applyQuaternion(quaternion).add(position);
	collider.setTranslationWrtParent(rotatedPivot);
	collider.setRotationWrtParent(quaternion);
};
type Orientation = {
	position: Vector3;
	quaternion: Quaternion;
};
const getRelativeOrientationAndFlattenX = (
	child: Object3D,
	relativeParent: Object3D,
): Orientation => {
	relativeParent.updateMatrixWorld(true);
	child.updateMatrixWorld(true);
	const childWorld = child.matrixWorld;
	const localMatrix = relativeParent.matrixWorld.clone().invert().multiply(childWorld);
	const position = new Vector3();
	const quaternion = new Quaternion();
	localMatrix.decompose(position, quaternion, new Vector3());
	position.setX(0);
	return { position, quaternion };
};
// the vectors on the ArrowHelpers define orientation along the parent bone;
// mandatory for propper collider orientation
const armsPivotHelper = new ArrowHelper(new Vector3(0, -1, 0), undefined, 3, 0x00ff00);
const legsPivotHelper = new ArrowHelper(new Vector3(0, 1, 0), undefined, 3, 0xff0000);
(armsPivotHelper.line.material as MeshBasicMaterial).depthTest = false;
(legsPivotHelper.line.material as MeshBasicMaterial).depthTest = false;
armR.add(armsPivotHelper);
legL.add(legsPivotHelper);

const makeRapierDebug = () => {
	const geometry = new BufferGeometry();
	const mesh = new LineSegments(
		geometry,
		new LineBasicMaterial({ color: 0xffffff, vertexColors: true }),
	);
	mesh.frustumCulled = false;
	const showList: Object3D[] = [mesh, skeletonHelper, armsPivotHelper, legsPivotHelper];
	scene.add(mesh);
	return () => {
		if (params.showPhysics) {
			const { vertices, colors } = physics.world.debugRender();
			geometry.setAttribute('position', new BufferAttribute(vertices, 3));
			geometry.setAttribute('color', new BufferAttribute(colors, 4));
			showList.forEach((o) => (o.visible = true));
			mesh.visible = true;
		} else {
			showList.forEach((o) => (o.visible = false));
		}
	};
};
const updateRapierDebug = makeRapierDebug();

let lastTime = performance.now();
let phase = 0;
function animate() {
	resize();
	if (geepParent.position.length() > 10) {
		resetGeepPhysics();
	}
	if (params.cameraFollow) {
		const { x, y, z } = geepParent.position;
		controls.target.set(x, y, z);
		controls.update();
	}

	const now = performance.now() / 1000;
	const delta = now - lastTime;
	lastTime = now;
	phase += params.geepWiggleSpeed * 0.1 * delta;
	// hip.rotation.x = TAU * (1.55 - Math.cos(phase) * 0.0625);
	const arms = TAU * Math.cos(phase) * 0.0625 * params.geepWiggleIntensity;
	const legs = TAU * Math.cos(phase) * 0.125 * params.geepWiggleIntensity;
	const spine = TAU * Math.cos(phase) * 0.025 * params.geepWiggleIntensity;
	legL.rotation.z = -legs + TAU * -0.625;
	legR.rotation.z = legs + TAU * 0.625;
	armL.rotation.z = arms + TAU * 0.125;
	armR.rotation.z = -arms + TAU * -0.125;
	spine0.rotation.y = -spine;
	spine1.rotation.x = -spine;
	armsPivotHelper.position.x = 0;
	legsPivotHelper.position.x = 0;
	applyPivotedColliderRotation(
		armsCollider,
		armsOffset,
		getRelativeOrientationAndFlattenX(armsPivotHelper, geepParent),
	);
	applyPivotedColliderRotation(
		legsCollider,
		legsOffset,
		getRelativeOrientationAndFlattenX(legsPivotHelper, geepParent),
	);
	updateRapierDebug();
	renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

export const cleanup = () => {
	gui.destroy();
	renderer.setAnimationLoop(null);
	renderer.dispose();
	renderer.forceContextLoss();
};

Object.assign(window, {
	renderer,
	camera,
	floorMaterial,
	floorMesh,
	geepParent,
	geepRigidBody,
	armsShape,
	legsShape,
	topMeshCollider,
	armsCollider,
	legsCollider,
	pointLight,
	geepScene,
	physics,
	RAPIER,
	ColorManagement,
});
