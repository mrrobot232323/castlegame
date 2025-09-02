import * as THREE from 'three';

export class CameraController {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    private isEnabled: boolean = false;
    private isMouseDown: boolean = false;
    private mousePosition: THREE.Vector2 = new THREE.Vector2();
    private previousMousePosition: THREE.Vector2 = new THREE.Vector2();
    private target: THREE.Vector3 = new THREE.Vector3(0, 20, 0);
    private distance: number = 50;
    private minDistance: number = 10;
    private maxDistance: number = 100;
    private phi: number = Math.PI / 4;
    private theta: number = 0;
    private sensitivity: number = 0.01;
    private zoomSpeed: number = 0.1;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Mouse events
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.domElement.addEventListener('wheel', this.onWheel.bind(this));

        // Touch events for mobile
        this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));

        // Prevent context menu
        this.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    private onMouseDown(event: MouseEvent): void {
        if (!this.isEnabled) return;
        
        this.isMouseDown = true;
        this.previousMousePosition.set(event.clientX, event.clientY);
        this.domElement.style.cursor = 'grabbing';
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.isEnabled || !this.isMouseDown) return;

        this.mousePosition.set(event.clientX, event.clientY);
        const deltaX = this.mousePosition.x - this.previousMousePosition.x;
        const deltaY = this.mousePosition.y - this.previousMousePosition.y;

        this.theta -= deltaX * this.sensitivity;
        this.phi += deltaY * this.sensitivity;

        // Clamp phi to prevent camera flipping
        this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));

        this.previousMousePosition.copy(this.mousePosition);
        this.updateCameraPosition();
    }

    private onMouseUp(): void {
        if (!this.isEnabled) return;
        
        this.isMouseDown = false;
        this.domElement.style.cursor = 'grab';
    }

    private onWheel(event: WheelEvent): void {
        if (!this.isEnabled) return;

        event.preventDefault();
        
        const zoomDelta = event.deltaY > 0 ? 1 : -1;
        this.distance += zoomDelta * this.zoomSpeed * this.distance;
        
        // Clamp distance
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
        
        this.updateCameraPosition();
    }

    private onTouchStart(event: TouchEvent): void {
        if (!this.isEnabled) return;
        
        if (event.touches.length === 1) {
            this.isMouseDown = true;
            this.previousMousePosition.set(event.touches[0].clientX, event.touches[0].clientY);
        }
    }

    private onTouchMove(event: TouchEvent): void {
        if (!this.isEnabled || !this.isMouseDown) return;

        event.preventDefault();
        
        if (event.touches.length === 1) {
            this.mousePosition.set(event.touches[0].clientX, event.touches[0].clientY);
            const deltaX = this.mousePosition.x - this.previousMousePosition.x;
            const deltaY = this.mousePosition.y - this.previousMousePosition.y;

            this.theta -= deltaX * this.sensitivity * 2; // Increased sensitivity for touch
            this.phi += deltaY * this.sensitivity * 2;

            this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));

            this.previousMousePosition.copy(this.mousePosition);
            this.updateCameraPosition();
        } else if (event.touches.length === 2) {
            // Pinch to zoom
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
            
            if (this.previousTouchDistance) {
                const scale = currentDistance / this.previousTouchDistance;
                this.distance /= scale;
                this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
                this.updateCameraPosition();
            }
            
            this.previousTouchDistance = currentDistance;
        }
    }

    private onTouchEnd(event: TouchEvent): void {
        if (!this.isEnabled) return;
        
        if (event.touches.length === 0) {
            this.isMouseDown = false;
            this.previousTouchDistance = null;
        }
    }

    private previousTouchDistance: number | null = null;

    private updateCameraPosition(): void {
        // Calculate camera position based on spherical coordinates
        const x = this.distance * Math.sin(this.phi) * Math.cos(this.theta);
        const y = this.distance * Math.cos(this.phi);
        const z = this.distance * Math.sin(this.phi) * Math.sin(this.theta);

        this.camera.position.set(
            this.target.x + x,
            this.target.y + y,
            this.target.z + z
        );

        this.camera.lookAt(this.target);
    }

    public enable(): void {
        this.isEnabled = true;
        this.domElement.style.cursor = 'grab';
    }

    public disable(): void {
        this.isEnabled = false;
        this.isMouseDown = false;
        this.domElement.style.cursor = 'default';
    }

    public setTarget(target: THREE.Vector3): void {
        this.target.copy(target);
        this.updateCameraPosition();
    }

    public setDistance(distance: number): void {
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
        this.updateCameraPosition();
    }

    public getTarget(): THREE.Vector3 {
        return this.target.clone();
    }

    public getDistance(): number {
        return this.distance;
    }

    public update(delta: number): void {
        // Smooth camera movement if needed
        if (this.isEnabled && !this.isMouseDown) {
            // Add subtle camera drift for cinematic effect
            this.theta += delta * 0.1;
            this.updateCameraPosition();
        }
    }

    public reset(): void {
        this.theta = 0;
        this.phi = Math.PI / 4;
        this.distance = 50;
        this.target.set(0, 20, 0);
        this.updateCameraPosition();
    }
}
