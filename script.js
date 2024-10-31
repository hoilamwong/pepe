import * as THREE from 'three'
import GUI from 'lil-gui'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { BokehShader2, SSRPass } from 'three/examples/jsm/Addons.js'
import { BokehShader, BokehDepthShader } from 'three/addons/shaders/BokehShader2.js';

const postprocessing = {};
window.scrollTo(0, document.body.scrollHeight);

const initScrollY = window.scrollY
console.log(initScrollY);
console.log(document.body.scrollHeight);


/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Camera
 */
//Group
const cameraGroup = new THREE.Group()
scene.add(cameraGroup)

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 1, 1000)
camera.position.set(0, 5, 15)
console.log(camera);


// Scroll
let scrollY = window.scrollY

window.addEventListener('scroll', () => {
    scrollY = window.scrollY
})


cameraGroup.add(camera)

/**
 * Cursor
 */
const cursor = {}
let mouse = new THREE.Vector2()
var raycaster = new THREE.Raycaster()
cursor.x = 0
cursor.y = 0


window.addEventListener('mousemove', (event) => {
    //normalized, -0.5 to 0.5
    cursor.x = event.clientX / sizes.width - 0.5
    cursor.y = event.clientY / sizes.height - 0.5

    mouse.x = (event.clientX - (sizes.width / 2)) / (sizes.width / 2);
    mouse.y = - (event.clientY - (sizes.height / 2)) / (sizes.height / 2);
    // console.log(mouse);

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        var targetDistance = intersects[0].distance
        var sdistance = smoothstep(camera.near, camera.far, targetDistance);
        var ldistance = linearize(1 -  sdistance);
        console.log('ldistance ', ldistance);

    }

    // postprocessing.bokeh_uniforms[ 'focusCoords' ].value.set( event.clientX / window.innerWidth, 1 - ( event.clientY / window.innerHeight ) );


    // postprocessing.bokeh_uniforms['focusCoords'].value.set(event.clientX / window.innerWidth, 1 - (event.clientY / window.innerHeight));
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
 * Controls
 */
// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = true
// controls.dampingFactor = 0.01
// controls.maxPolarAngle = Math.PI * 0.45;
// controls.minDistance = 10;
// controls.maxDistance = 50;
// controls.enablePan = false
// controls.enableZoom = false

/**
 * Environment map
 */
const cubeTextureLoader = new THREE.CubeTextureLoader()
const textureLoader = new THREE.TextureLoader()
const environmentMap = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.jpg',
    '/textures/environmentMaps/0/nx.jpg',
    '/textures/environmentMaps/0/py.jpg',
    '/textures/environmentMaps/0/ny.jpg',
    '/textures/environmentMaps/0/pz.jpg',
    '/textures/environmentMaps/0/nz.jpg'
])
environmentMap.colorSpace = THREE.SRGBColorSpace

// scene.background = environmentMap
// scene.environment = environmentMap

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

            // gltf.scene.scale.set(2, 2, 2)
            gltf.scene.position.y = -2.5

            if (object.name == 'Sun') {
                console.log('found sun', object)
                object.castShadow = true
                object.shadow.bias = 3
                object.shadow.normalBias = 0.3
                object.intensity = 3
            }
            if (object.name == 'Sun001') {
                console.log('found sun', object)
                object.castShadow = false
                object.shadow.bias = 0
                object.shadow.normalBias = 0.3
                object.intensity = 5
            }
            if (object.name == 'floor') {
                const newFloor = new THREE.MeshMatcapMaterial()
                // newFloor.color = new THREE.Color('darkblue')
                // console.log(newFloor);
                // object.material.roughness = 1
                object.material = newFloor

                object.material.color = new THREE.Color('black')


            }
            if (object.name == 'monitor_retroscreen') {
                console.log('found monitor_retroscreen', object)
                object.material.emissiveIntensity = 3
            }
            // pepe light
            if (object.name == 'pepe_light') {
                object.castShadow = true
                object.receiveShadow = true
                object.intensity = 1000
                object.shadow.bias = 0
                object.shadow.normalBias = 0.3
                console.log('found pepe_light', object)
            }

        }),
            scene.add(gltf.scene),
            updateAllMaterials()
    }
)




/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 1.5
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

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
unrealBloomPass.strength = 0.9
unrealBloomPass.radius = 1, 3
unrealBloomPass.threshold = 0.471

gui.add(unrealBloomPass, 'enabled')
gui.add(unrealBloomPass, 'strength').min(0).max(10).step(0.001)
gui.add(unrealBloomPass, 'radius').min(0).max(2).step(0.001)
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
    aperture: 0.1,
    maxblur: 0.01,
    width: window.innerWidth,
    height: window.innerHeight,
});


// const bokehPass = new BokehShader2
console.log(bokehPass);

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

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Animate Camera
    // camera.position.z = 15 * scrollY/ initScrollY
    // console.log(scrollY / initScrollY);



    const parallaxX = cursor.x
    const parallaxY = - cursor.y
    // // cameraGroup.position.set(parallaxX, parallaxY, 0)
    // // console.log(cameraGroup.position);

    camera.position.x = parallaxX
    camera.position.y = parallaxY

    // Update controls
    // controls.update()

    // Render
    // renderer.render(scene, camera)
    effectComposer.render()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()