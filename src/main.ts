import * as THREE from 'three';
import { CastleScene } from './CastleScene';
import { BalloonGame } from './BalloonGame';
import { DialogueSystem } from './DialogueSystem';
import { CameraController } from './CameraController';

class EpicCastleApp {
    private scene!: THREE.Scene;
    private renderer!: THREE.WebGLRenderer;
    private camera!: THREE.PerspectiveCamera;
    private castleScene!: CastleScene;
    private balloonGame!: BalloonGame;
    private dialogueSystem!: DialogueSystem;
    private cameraController!: CameraController;
    private clock!: THREE.Clock;

    constructor() {
        this.clock = new THREE.Clock();
        this.init();
    }

    private init(): void {
        // Set up mobile viewport
        this.setupMobileViewport();
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 30, 50);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('castle-canvas') as HTMLCanvasElement,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            depth: true,
            stencil: false,
            precision: 'highp'
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87ceeb, 1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.physicallyCorrectLights = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.domElement.style.touchAction = 'none';

        // Initialize components
        this.castleScene = new CastleScene(this.scene);
        this.balloonGame = new BalloonGame();
        this.dialogueSystem = new DialogueSystem();
        this.cameraController = new CameraController(this.camera, this.renderer.domElement);

        // Make balloon game globally accessible for level progression
        (window as any).balloonGame = this.balloonGame;

        // Connect dialogue system with camera and characters
        this.dialogueSystem.setCamera(this.camera);
        this.dialogueSystem.setCharacters(this.castleScene.getCharacters());
        this.dialogueSystem.setInteractables(this.castleScene.getInteractables());
        this.dialogueSystem.setInteractionHandlers({
            onGuardInteracted: (obj: THREE.Object3D) => this.castleScene.onGuardInteracted(obj),
            onGateToggled: () => this.castleScene.toggleGate()
        });

        // Add lighting
        this.setupLighting();

        // Add clouds and atmosphere
        this.setupAtmosphere();

        // Start cinematic camera
        this.startCinematicCamera();

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Start animation loop
        this.animate();
    }

    private setupMobileViewport(): void {
        // Set viewport meta tag for mobile
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }

        // Prevent zoom on double tap for iOS
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Prevent pull-to-refresh on mobile
        document.body.style.overscrollBehavior = 'none';
    }

    private setupLighting(): void {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Point lights for castle windows
        const windowLight1 = new THREE.PointLight(0xffaa00, 0.8, 20);
        windowLight1.position.set(-15, 25, 0);
        this.scene.add(windowLight1);

        const windowLight2 = new THREE.PointLight(0xffaa00, 0.8, 20);
        windowLight2.position.set(15, 25, 0);
        this.scene.add(windowLight2);
    }

    private setupAtmosphere(): void {
        // Create clouds
        const cloudGeometry = new THREE.SphereGeometry(1, 8, 8);
        const cloudMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.8 
        });

        for (let i = 0; i < 20; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                (Math.random() - 0.5) * 200,
                60 + Math.random() * 40,
                (Math.random() - 0.5) * 200
            );
            cloud.scale.setScalar(5 + Math.random() * 10);
            this.scene.add(cloud);
        }

        // Add fog particles
        const fogGeometry = new THREE.BufferGeometry();
        const fogCount = 1000;
        const fogPositions = new Float32Array(fogCount * 3);

        for (let i = 0; i < fogCount * 3; i += 3) {
            fogPositions[i] = (Math.random() - 0.5) * 300;
            fogPositions[i + 1] = Math.random() * 50;
            fogPositions[i + 2] = (Math.random() - 0.5) * 300;
        }

        fogGeometry.setAttribute('position', new THREE.BufferAttribute(fogPositions, 3));
        const fogMaterial = new THREE.PointsMaterial({
            color: 0xcccccc,
            size: 2,
            transparent: true,
            opacity: 0.3
        });

        const fog = new THREE.Points(fogGeometry, fogMaterial);
        this.scene.add(fog);
    }

    private startCinematicCamera(): void {
        // Start with a cinematic camera movement
        let time = 0;
        const animate = () => {
            time += 0.01;
            this.camera.position.x = Math.sin(time * 0.5) * 60;
            this.camera.position.z = Math.cos(time * 0.5) * 60;
            this.camera.position.y = 40 + Math.sin(time * 0.3) * 10;
            this.camera.lookAt(0, 20, 0);

            if (time < 10) {
                requestAnimationFrame(animate);
            } else {
                // Switch to interactive camera
                this.cameraController.enable();
            }
        };
        animate();
    }

    private onWindowResize(): void {
        // Handle mobile orientation change
        const isMobile = window.innerWidth <= 768;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Adjust camera for mobile
        if (isMobile) {
            this.camera.fov = 60; // Narrower FOV for mobile
            this.camera.updateProjectionMatrix();
        } else {
            this.camera.fov = 75; // Normal FOV for desktop
            this.camera.updateProjectionMatrix();
        }
        
        // Reposition balloons to avoid UI elements
        this.balloonGame.handleResize();
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();

        // Update castle scene
        this.castleScene.update(delta);

        // Update camera controller
        this.cameraController.update(delta);

        // Update dialogue system
        this.dialogueSystem.update();

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the app when the page loads
window.addEventListener('load', () => {
    new EpicCastleApp();
});
