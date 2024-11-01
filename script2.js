import * as THREE from "three";
import GUI from 'lil-gui'

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS3DRenderer,
  CSS3DObject
} from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { SSRPass } from 'three/examples/jsm/Addons.js'

let camera, scene, renderer;
let scene2, renderer2;

let gltfScale = 100
let domObjectScale = 0.43

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

let controls, gui;
let effectComposer
let lookAt = new THREE.Vector3(0, 0, 0);
init();

function init() {
  gui = new GUI()
  gui.close()

  camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 100, 10000);
  camera.position.set(0, 500, 1000);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('black')

  scene2 = new THREE.Scene();

  /**
   * Renderers
   */
  renderer2 = new CSS3DRenderer();
  renderer2.setSize(window.innerWidth, window.innerHeight);
  renderer2.domElement.style.position = "absolute";
  renderer2.domElement.style.top = 0;
  document.querySelector("#css").appendChild(renderer2.domElement);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
  document.querySelector("#webgl").appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer2.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxZoom = 10
  controls.update();

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


  var element = document.createElement("iframe");
  element.style.width = "650px";
  element.style.height = "500px";
  element.style.opacity = 1;
  element.src = "http://192.168.1.16:5173/";

  var domObject = new CSS3DObject(element);
  domObject.scale.set(domObjectScale, domObjectScale, 1)
  domObject.rotation.set(-3.141, 0.95 + 3.141, 3.141)
  domObject.position.set(118.41244581647652, 92.79841251765995, -107.83197783392244)
  // domObject.position.set(118, 200.79841251765995, -107.83197783392244)
  scene2.add(domObject);

  // document.addEventListener("mousemove", onDocumentMouseMove, false);

  var material = new THREE.MeshStandardMaterial({
    opacity: 0.2,
    color: new THREE.Color("black"),
    blending: THREE.NoBlending,
    side: THREE.DoubleSide
  });
  material.emissive = true
  material.emissiveIntensity = 100
  var geometry = new THREE.PlaneGeometry(650, 500);
  var screenFrame = new THREE.Mesh(geometry, material);
  screenFrame.rotation.copy(domObject.rotation);
  screenFrame.position.copy(domObject.position);
  screenFrame.scale.copy(domObject.scale);
  scene.add(screenFrame);

  /**
   * Models
   */
  const gltfLoader = new GLTFLoader()
  gltfLoader.load(
    '/models/pepe8.glb',
    (gltf) => {
      gltf.scene.traverse((object) => {

        if (object.isMesh) {
          object.material.envMapIntensity = 2.5
          object.material.needsUpdate = true
          object.castShadow = true
          object.receiveShadow = true
        }

        gltf.scene.position.y = -100
        gltf.scene.scale.set(gltfScale, gltfScale, gltfScale)


        if (object.name == 'Sun') {
          console.log('found sun', object)
          object.castShadow = true
          object.shadow.bias = 3
          object.shadow.normalBias = 0.3
          object.intensity = 10
          gui.add(object, 'intensity').min(0).max(100).name('blue sun intensity')
        }

        if (object.name == 'Sun001') {
          console.log('found sun2', object)
          object.castShadow = false
          object.shadow.bias = 0
          object.shadow.normalBias = 0.3
          object.intensity = 10
          gui.add(object, 'intensity').min(0).max(100).name('green sun intensity')
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
        scene.add(gltf.scene)
    }
  )

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
  effectComposer = new EffectComposer(renderer, renderTarget)
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

  // SSR pass initialize
  const ssrPass = new SSRPass({
    renderer,
    scene,
    camera,
    width: sizes.width,
    height: sizes.height,
  })
  ssrPass.maxDistance = 800
  ssrPass.opacity = 0.3

  // Unreal Bloom pass initialize
  const unrealBloomPass = new UnrealBloomPass()
  unrealBloomPass.enabled = false
  unrealBloomPass.strength = 0.45
  unrealBloomPass.radius = 2
  unrealBloomPass.threshold = 0.471

  gui.add(unrealBloomPass, 'enabled')
  gui.add(unrealBloomPass, 'strength').min(0).max(3).step(0.001)
  gui.add(unrealBloomPass, 'radius').min(0).max(5).step(0.001)
  gui.add(unrealBloomPass, 'threshold').min(0).max(1).step(0.001)

  // DOF
  const bokehPass = new BokehPass(scene, camera, {
    focus: 10,
    aperture: 0,
    maxblur: 0.01,
    width: window.innerWidth,
    height: window.innerHeight,
  });
  bokehPass.enabled = false
  gui.add(bokehPass, 'enabled')


  effectComposer.addPass(ssrPass)
  effectComposer.addPass(unrealBloomPass)
  effectComposer.addPass(bokehPass);
}

function onDocumentMouseMove(event) {
  // mouseX = event.clientX - windowHalfX;
  // mouseY = event.clientY - windowHalfY;
}
/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () => {

  camera.lookAt(lookAt);

  controls.update();

  effectComposer.render()
  renderer2.render(scene2, camera);

  window.requestAnimationFrame(tick);
}

tick()
