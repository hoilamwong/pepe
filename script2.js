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

let mouseX = 0,
  mouseY = 0;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

let controls, gui;

let sphere;

let lights = [];

let effectComposer

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

let lookAt = new THREE.Vector3(0, 0, 0);

let lightMovementAmplitude = 200;

init();
animate(performance.now());

function init() {
  gui = new GUI()
  gui.close()

  camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 100, 10000);
  camera.position.set(0, 500, 1000);

  scene = new THREE.Scene();
  console.log(scene);
  scene.background = new THREE.Color('black')

  scene2 = new THREE.Scene();

  var element = document.createElement("iframe");
  element.style.width = "300px";
  element.style.height = "200px";
  element.style.opacity = 0.999;
  element.src = "http://192.168.1.16:5174/";

  var domObject = new CSS3DObject(element);
  var domObjectScale = 0.8
  domObject.scale.set(domObjectScale, domObjectScale, 1)
  domObject.rotation.set(0, 2.3, 0)
  domObject.position.set(0, 100, 0)
  scene2.add(domObject);


  /**
   * Models
   */
  const gltfLoader = new GLTFLoader()

  gltfLoader.load(
    '/models/pepe6.glb',
    (gltf) => {
      gltf.scene.traverse((object) => {

        // console.log(object.name, object);
        gltf.scene.position.y = -100
        var gltfScale = 100
        gltf.scene.scale.set(gltfScale, gltfScale, gltfScale)


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

          
          var material = new THREE.MeshBasicMaterial({
            opacity: 0.2,
            color: new THREE.Color("black"),
            blending: THREE.NoBlending,
            side: THREE.DoubleSide
          });
          var geometry = new THREE.PlaneGeometry(300, 200);
          var mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(0, 10, 0);
          mesh.position.copy(domObject.position);
          mesh.rotation.copy(domObject.rotation);
          mesh.scale.copy(domObject.scale);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          scene.add(mesh);

        }

      }),
        scene.add(gltf.scene),
        updateAllMaterials()
    }
  )


  //

  renderer2 = new CSS3DRenderer();
  renderer2.setSize(window.innerWidth, window.innerHeight);
  renderer2.domElement.style.position = "absolute";
  renderer2.domElement.style.top = 0;
  document.querySelector("#css").appendChild(renderer2.domElement);

  let controls = new OrbitControls(camera, renderer2.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
  document.querySelector("#webgl").appendChild(renderer.domElement);

  // let controls2 = new OrbitControls(camera, renderer.domElement);
  // controls2.target.set(0, 0, 0);
  // controls2.update();

  document.addEventListener("mousemove", onDocumentMouseMove, false);


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
  console.log(bokehPass);
  bokehPass.enabled = false
  gui.add(bokehPass, 'enabled')
  gui.add(bokehPass.uniforms.focus, 'value').min(-5000).max(500000).step(0.0001)
  gui.add(bokehPass.uniforms.aperture, 'value').min(-1).max(1).step(0.001)
  gui.add(bokehPass.uniforms.maxblur, 'value').min(0).max(0.5).step(0.0001)


  effectComposer.addPass(ssrPass)
  effectComposer.addPass(unrealBloomPass)
  effectComposer.addPass(bokehPass);
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

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

function animate(time) {

  camera.lookAt(lookAt);

  effectComposer.render()
  renderer2.render(scene2, camera);

  requestAnimationFrame(animate);
}
