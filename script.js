import * as THREE from 'three'
import GUI from 'lil-gui'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { SSRPass } from 'three/examples/jsm/Addons.js'

import {
	CSS3DObject
} from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';

const postprocessing = {};
window.scrollTo(0, document.body.scrollHeight);

const initScrollY = window.scrollY
console.log(window.scrollY);


/**
 * Base
 */
let camera, scene, renderer;
let scene2, renderer2;

/**
 * Sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight
}

// Debug
const gui = new GUI()

// Scene
scene = new THREE.Scene()
scene2 = new THREE.Scene()

// iframe
var element = document.createElement("iframe");
element.style.width = sizes.width + "px";
element.style.height = sizes.height + "px";
element.style.opacity = 0.999;
element.src = "http://192.168.1.16:5174/";
console.log(element);


var domObject = new CSS3DObject(element);
domObject.position.set(0, 3, 0)
var domObjectScale = 1
domObject.scale.set(domObjectScale, domObjectScale, 0)
scene2.add(domObject);

var material = new THREE.MeshPhongMaterial({
	opacity: 1,
	color: new THREE.Color("white"),
	blending: THREE.NoBlending,
	side: THREE.DoubleSide
});
var geometry = new THREE.PlaneGeometry(4, 3);
var mesh = new THREE.Mesh(geometry, material);
mesh.position.copy(domObject.position);
mesh.rotation.copy(domObject.rotation);
//mesh.scale.copy( domObject.scale );
mesh.castShadow = false;
mesh.receiveShadow = true;
// scene.add(mesh);

/**
 * Camera
 */
//Group
const cameraGroup = new THREE.Group()
scene.add(cameraGroup)

camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 1, 1000)
camera.position.set(0, 5, 15)
cameraGroup.add(camera)
console.log(camera);

// Scroll
let scrollY = window.scrollY

window.addEventListener('scroll', () => {
	scrollY = window.scrollY
})

/**
 * Cursor
 */
const cursor = {}
cursor.x = 0
cursor.y = 0

window.addEventListener('mousemove', (event) => {
	//normalized, -0.5 to 0.5
	cursor.x = event.clientX / sizes.width - 0.5
	cursor.y = event.clientY / sizes.height - 0.5

})


/**
 * Resize
 */
window.addEventListener('resize', () => {
	// Update sizes
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	// Update camera
	camera.aspect = sizes.width / sizes.height
	camera.updateProjectionMatrix()

	// Update renderer
	renderer.setSize(sizes.width, sizes.height)
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

	// Update effect composer
	effectComposer.setSize(sizes.width, sizes.height)
	effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})


/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 10)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.normalBias = 0.05
directionalLight.position.set(0.25, 3, - 2.25)
scene.add(directionalLight)


/**
 * Update all materials
 */
const updateAllMaterials = () => {
	scene.traverse((child) => {
		if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
			child.material.envMapIntensity = 2.5
			child.material.needsUpdate = true
			child.castShadow = true
			child.receiveShadow = true
		}
	})
}


/**
 * Models
 */
const gltfLoader = new GLTFLoader()

gltfLoader.load(
	'/models/pepe6.glb',
	(gltf) => {
		gltf.scene.traverse((object) => {

			// console.log(object.name, object);
			gltf.scene.position.y = 0

			if (object.name == 'Sun') {
				console.log('found sun', object)
				object.castShadow = true
				object.shadow.bias = 3
				object.shadow.normalBias = 0.3
				object.intensity = 10
			}
			if (object.name == 'Sun001') {
				console.log('found sun', object)
				object.castShadow = false
				object.shadow.bias = 0
				object.shadow.normalBias = 0.3
				object.intensity = 10
			}
			if (object.name == 'floor') {
				const newFloor = new THREE.MeshMatcapMaterial()
				object.material = newFloor
				object.material.color = new THREE.Color('black')
			}
			if (object.name == 'monitor_retroscreen') {
				console.log('found monitor_retroscreen', object)
				object.material.emissiveIntensity = 3
			}

		}),
			scene.add(gltf.scene),
			updateAllMaterials()
	}
)


/**
 * Renderer
 */
renderer2 = new CSS3DRenderer();
renderer2.setSize(sizes.width, sizes.height);
renderer2.domElement.style.position = "absolute";
renderer2.domElement.style.top = 0;
document.querySelector("#css").appendChild(renderer2.domElement);

renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(sizes.width, sizes.height);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
document.querySelector("#webgl").appendChild(renderer.domElement);

/**
 * Post processing
 */
const renderTarget = new THREE.WebGLRenderTarget(
	800,
	600,
	{
		samples: 2
	}
)

// Effect composer
const effectComposer = new EffectComposer(renderer, renderTarget)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
effectComposer.setSize(sizes.width, sizes.height)

// Render pass
const renderPass = new RenderPass(scene, camera)
effectComposer.addPass(renderPass)

// Antialias pass
if (renderer.getPixelRatio() === 1 && !renderer.capabilities.isWebGL2) {
	const smaaPass = new SMAAPass()
	effectComposer.addPass(smaaPass)

	console.log('Using SMAA')
}

// Unreal Bloom pass initialize
const unrealBloomPass = new UnrealBloomPass()
unrealBloomPass.enabled = true
unrealBloomPass.strength = 0.45
unrealBloomPass.radius = 2
unrealBloomPass.threshold = 0.471

gui.add(unrealBloomPass, 'enabled')
gui.add(unrealBloomPass, 'strength').min(0).max(3).step(0.001)
gui.add(unrealBloomPass, 'radius').min(0).max(5).step(0.001)
gui.add(unrealBloomPass, 'threshold').min(0).max(1).step(0.001)

// SSR pass initialize
const ssrPass = new SSRPass({
	renderer,
	scene,
	camera,
	width: sizes.width,
	height: sizes.height,
})
ssrPass.maxDistance = 10
ssrPass.opacity = 0.3

// DOF
const bokehPass = new BokehPass(scene, camera, {
	focus: 10,
	aperture: 0,
	maxblur: 0.01,
	width: window.innerWidth,
	height: window.innerHeight,
});
console.log(bokehPass);
// bokehPass.enabled = false
gui.add(bokehPass, 'enabled')
gui.add(bokehPass.uniforms.focus, 'value').min(-5000).max(500000).step(0.0001)
gui.add(bokehPass.uniforms.aperture, 'value').min(-1).max(1).step(0.001)
gui.add(bokehPass.uniforms.maxblur, 'value').min(0).max(0.5).step(0.0001)


effectComposer.addPass(ssrPass)
effectComposer.addPass(unrealBloomPass)
effectComposer.addPass(bokehPass);

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () => {
	const elapsedTime = clock.getElapsedTime()
	const deltaTime = elapsedTime - previousTime
	previousTime = elapsedTime

	// Animate Camera
	var zoomFactor = ((scrollY / initScrollY) * 15) + 5
	// to adjust the height by moving the whole scene
	var scrollFactor = ((scrollY / initScrollY) * 3) + 2
	camera.position.z = zoomFactor
	camera.position.y = scrollFactor

	// Parallax
	const parallaxX = cursor.x
	const parallaxY = - cursor.y
	cameraGroup.position.set(parallaxX, parallaxY, 0)
	cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 2 * deltaTime
	cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 2 * deltaTime

	// Update controls
	// controls.update()

	// Render
	effectComposer.render()
	// renderer.render(scene, camera)
	// renderer2.render(scene2, camera)

	// Call tick again on the next frame
	window.requestAnimationFrame(tick)
}

tick()