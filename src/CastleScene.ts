import * as THREE from 'three';

interface Character {
    mesh: THREE.Mesh | THREE.Group;
    speed: number;
    direction: THREE.Vector3;
    patrolPoints: THREE.Vector3[];
    currentPoint: number;
}

interface Cannon {
    mesh: THREE.Mesh;
    lastShot: number;
    shotInterval: number;
}

export class CastleScene {
    private scene: THREE.Scene;
    private characters: Character[] = [];
    private cannons: Cannon[] = [];
    private horses: THREE.Mesh[] = [];
    private time: number = 0;
    private gate: THREE.Mesh | null = null;
    private gateOpening: boolean = false;
    private gateProgress: number = 0; // 0 closed, 1 open

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.buildCastle();
        this.addPatrols();
        this.addCannons();
        this.addCharacters();
        this.addHorses();
        this.addTerrain();
    }

    private buildCastle(): void {
        // Main castle base
        const baseGeometry = new THREE.BoxGeometry(40, 10, 40);
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 5;
        base.castShadow = true;
        base.receiveShadow = true;
        this.scene.add(base);

        // Main tower
        const towerGeometry = new THREE.CylinderGeometry(8, 10, 30, 8);
        const towerMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.y = 25;
        tower.castShadow = true;
        tower.receiveShadow = true;
        this.scene.add(tower);

        // Tower roof
        const roofGeometry = new THREE.ConeGeometry(8, 6, 8);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 33;
        this.scene.add(roof);

        // Corner towers
        const cornerTowers = [
            { x: -15, z: -15 },
            { x: 15, z: -15 },
            { x: 15, z: 15 },
            { x: -15, z: 15 }
        ];

        cornerTowers.forEach(pos => {
            const cornerTower = new THREE.Mesh(
                new THREE.CylinderGeometry(4, 5, 20, 8),
                new THREE.MeshLambertMaterial({ color: 0x696969 })
            );
            cornerTower.position.set(pos.x, 15, pos.z);
            cornerTower.castShadow = true;
            cornerTower.receiveShadow = true;
            this.scene.add(cornerTower);

            // Corner tower roof
            const cornerRoof = new THREE.Mesh(
                new THREE.ConeGeometry(4, 4, 8),
                new THREE.MeshLambertMaterial({ color: 0x8B0000 })
            );
            cornerRoof.position.set(pos.x, 22, pos.z);
            this.scene.add(cornerRoof);
        });

        // Walls
        const wallGeometry = new THREE.BoxGeometry(30, 8, 2);
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });

        // North wall
        const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
        northWall.position.set(0, 9, -19);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        this.scene.add(northWall);

        // South wall
        const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
        southWall.position.set(0, 9, 19);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        this.scene.add(southWall);

        // East wall
        const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
        eastWall.rotation.y = Math.PI / 2;
        eastWall.position.set(19, 9, 0);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        this.scene.add(eastWall);

        // West wall
        const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
        westWall.rotation.y = Math.PI / 2;
        westWall.position.set(-19, 9, 0);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        this.scene.add(westWall);

        // Gate
        const gateGeometry = new THREE.BoxGeometry(6, 6, 2);
        const gateMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const gate = new THREE.Mesh(gateGeometry, gateMaterial);
        gate.position.set(0, 8, -19);
        gate.castShadow = true;
        gate.receiveShadow = true;
        gate.userData = { type: 'gate', name: 'Gate' };
        this.scene.add(gate);
        this.gate = gate;

        // Windows
        const windowGeometry = new THREE.BoxGeometry(2, 2, 0.5);
        const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });

        // Main tower windows
        for (let i = 0; i < 4; i++) {
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(
                Math.cos(i * Math.PI / 2) * 8,
                20,
                Math.sin(i * Math.PI / 2) * 8
            );
            window.rotation.y = i * Math.PI / 2;
            this.scene.add(window);
        }

        // Flag
        const flagGeometry = new THREE.PlaneGeometry(3, 2);
        const flagMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        flag.position.set(0, 35, 0);
        flag.rotation.x = -Math.PI / 2;
        this.scene.add(flag);
    }

    private addPatrols(): void {
        // Create patrol guards with improved design
        for (let i = 0; i < 6; i++) {
            // Create guard group
            const guardGroup = new THREE.Group();
            
            // Guard body (torso)
            const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.8, 4, 8);
            const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F4F });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 1.2;
            guardGroup.add(body);
            
            // Guard head
            const headGeometry = new THREE.SphereGeometry(0.3, 8, 6);
            const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFE4C4 });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.y = 2.3;
            guardGroup.add(head);
            
            // Guard helmet
            const helmetGeometry = new THREE.ConeGeometry(0.35, 0.4, 8);
            const helmetMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
            const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
            helmet.position.y = 2.5;
            helmet.rotation.x = Math.PI;
            guardGroup.add(helmet);
            
            // Guard arms
            const armGeometry = new THREE.CapsuleGeometry(0.15, 1.2, 4, 6);
            const armMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F4F });
            
            const leftArm = new THREE.Mesh(armGeometry, armMaterial);
            leftArm.position.set(-0.6, 1.5, 0);
            leftArm.rotation.z = 0.3;
            guardGroup.add(leftArm);
            
            const rightArm = new THREE.Mesh(armGeometry, armMaterial);
            rightArm.position.set(0.6, 1.5, 0);
            rightArm.rotation.z = -0.3;
            guardGroup.add(rightArm);
            
            // Guard legs
            const legGeometry = new THREE.CapsuleGeometry(0.2, 1.0, 4, 6);
            const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F4F });
            
            const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
            leftLeg.position.set(-0.25, 0.3, 0);
            guardGroup.add(leftLeg);
            
            const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
            rightLeg.position.set(0.25, 0.3, 0);
            guardGroup.add(rightLeg);
            
            // Guard weapon (spear)
            const spearGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2.5, 6);
            const spearMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const spear = new THREE.Mesh(spearGeometry, spearMaterial);
            spear.position.set(0.8, 1.8, 0);
            spear.rotation.z = -0.2;
            guardGroup.add(spear);
            
            // Spear tip
            const tipGeometry = new THREE.ConeGeometry(0.05, 0.3, 6);
            const tipMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
            const tip = new THREE.Mesh(tipGeometry, tipMaterial);
            tip.position.set(0.8, 2.9, 0);
            tip.rotation.z = -0.2;
            guardGroup.add(tip);
            
            // Guard shield
            const shieldGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 8);
            const shieldMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
            const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
            shield.position.set(-0.6, 1.5, 0);
            shield.rotation.z = 0.3;
            guardGroup.add(shield);
            
            // Position on wall-top walkway (y ~ 13)
            const angle = (i * Math.PI) / 3;
            guardGroup.position.set(
                Math.cos(angle) * 19,
                13,
                Math.sin(angle) * 19
            );
            
            guardGroup.castShadow = true;
            guardGroup.userData = {
                type: 'guard',
                name: `Guard ${i + 1}`,
                limbs: { leftArm, rightArm, leftLeg, rightLeg },
                waveTime: 0
            };
            this.scene.add(guardGroup);

            // Patrol points around the wall
            const patrolPoints = [];
            for (let j = 0; j < 12; j++) {
                const patrolAngle = (j * Math.PI) / 6;
                patrolPoints.push(new THREE.Vector3(
                    Math.cos(patrolAngle) * 19,
                    13,
                    Math.sin(patrolAngle) * 19
                ));
            }

            this.characters.push({
                mesh: guardGroup,
                speed: 0.3 + Math.random() * 0.2,
                direction: new THREE.Vector3(),
                patrolPoints: patrolPoints,
                currentPoint: i * 2
            });
        }
    }

    private addCannons(): void {
        // Add cannons on the walls
        const cannonPositions = [
            { x: -15, z: -19, rotation: 0 },
            { x: 15, z: -19, rotation: 0 },
            { x: 19, z: -15, rotation: Math.PI / 2 },
            { x: 19, z: 15, rotation: Math.PI / 2 },
            { x: 15, z: 19, rotation: Math.PI },
            { x: -15, z: 19, rotation: Math.PI },
            { x: -19, z: 15, rotation: -Math.PI / 2 },
            { x: -19, z: -15, rotation: -Math.PI / 2 }
        ];

        cannonPositions.forEach(pos => {
            const cannonGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 8);
            const cannonMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F4F });
            const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
            
            cannon.position.set(pos.x, 12, pos.z);
            cannon.rotation.z = Math.PI / 2;
            cannon.rotation.y = pos.rotation;
            cannon.castShadow = true;
            this.scene.add(cannon);

            this.cannons.push({
                mesh: cannon,
                lastShot: Math.random() * 5,
                shotInterval: 3 + Math.random() * 2
            });
        });
    }

    private addCharacters(): void {
        // Add various characters inside the castle
        const characterTypes = [
            { color: 0xFFD700, name: "King" },
            { color: 0x9370DB, name: "Wizard" },
            { color: 0x32CD32, name: "Knight" },
            { color: 0xFF69B4, name: "Princess" },
            { color: 0x8B4513, name: "Merchant" }
        ];

        characterTypes.forEach((type, index) => {
            const charGeometry = new THREE.CapsuleGeometry(0.6, 2.5, 4, 8);
            const charMaterial = new THREE.MeshLambertMaterial({ color: type.color });
            const character = new THREE.Mesh(charGeometry, charMaterial);
            
            // Position inside castle
            const angle = (index * Math.PI * 2) / characterTypes.length;
            character.position.set(
                Math.cos(angle) * 8,
                6,
                Math.sin(angle) * 8
            );
            
            character.castShadow = true;
            character.userData = { name: type.name, type: 'character' };
            this.scene.add(character);

            // Add patrol points for movement
            const patrolPoints = [];
            for (let j = 0; j < 6; j++) {
                const patrolAngle = (j * Math.PI * 2) / 6;
                patrolPoints.push(new THREE.Vector3(
                    Math.cos(patrolAngle) * 8,
                    6,
                    Math.sin(patrolAngle) * 8
                ));
            }

            this.characters.push({
                mesh: character,
                speed: 0.3,
                direction: new THREE.Vector3(),
                patrolPoints: patrolPoints,
                currentPoint: index
            });
        });
    }

    private addHorses(): void {
        // Add horses in the courtyard
        for (let i = 0; i < 3; i++) {
            const horseGeometry = new THREE.CapsuleGeometry(0.8, 3, 4, 8);
            const horseMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const horse = new THREE.Mesh(horseGeometry, horseMaterial);
            
            horse.position.set(
                (Math.random() - 0.5) * 20,
                4,
                (Math.random() - 0.5) * 20
            );
            
            horse.castShadow = true;
            this.scene.add(horse);
            this.horses.push(horse);
        }
    }

    private addTerrain(): void {
        // Mountain base
        const mountainGeometry = new THREE.ConeGeometry(100, 50, 8);
        const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountain.position.y = -25;
        mountain.receiveShadow = true;
        this.scene.add(mountain);

        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(300, 300);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    public update(delta: number): void {
        this.time += delta;

        // Update character movements
        this.characters.forEach(character => {
            const targetPoint = character.patrolPoints[character.currentPoint];
            const direction = targetPoint.clone().sub(character.mesh.position);
            
            if (direction.length() < 1) {
                character.currentPoint = (character.currentPoint + 1) % character.patrolPoints.length;
            } else {
                direction.normalize();
                character.mesh.position.add(direction.multiplyScalar(character.speed * delta));
                character.mesh.lookAt(targetPoint);
            }

            // If this is a guard group, animate simple walk and optional wave
            if (character.mesh.userData && character.mesh.userData.type === 'guard') {
                const limbs = character.mesh.userData.limbs;
                if (limbs) {
                    const walk = Math.sin(this.time * 4) * 0.4;
                    limbs.leftArm.rotation.x = walk;
                    limbs.rightArm.rotation.x = -walk;
                    limbs.leftLeg.rotation.x = -walk * 0.6;
                    limbs.rightLeg.rotation.x = walk * 0.6;
                }

                // Wave animation when triggered
                if (character.mesh.userData.waveTime && character.mesh.userData.waveTime > 0) {
                    character.mesh.userData.waveTime -= delta;
                    const rightArm = character.mesh.userData.limbs?.rightArm as THREE.Mesh | undefined;
                    if (rightArm) {
                        // Raise and wave
                        rightArm.rotation.x = -1.5 + Math.sin(this.time * 12) * 0.3;
                    }
                }
            }
        });

        // Update cannon firing
        this.cannons.forEach(cannon => {
            cannon.lastShot += delta;
            if (cannon.lastShot > cannon.shotInterval) {
                this.fireCannon(cannon);
                cannon.lastShot = 0;
            }
        });

        // Animate horses
        this.horses.forEach((horse, index) => {
            horse.position.y = 4 + Math.sin(this.time * 2 + index) * 0.2;
            horse.rotation.y += delta * 0.5;
        });

        // Animate gate opening/closing
        if (this.gate) {
            const target = this.gateOpening ? 1 : 0;
            const speed = 1.0; // seconds to open/close
            if (Math.abs(this.gateProgress - target) > 0.001) {
                const dir = Math.sign(target - this.gateProgress);
                this.gateProgress = THREE.MathUtils.clamp(this.gateProgress + dir * delta / speed, 0, 1);
                // Rotate gate outward around X and slightly adjust Y to fake hinge
                this.gate.rotation.x = -this.gateProgress * Math.PI / 2; // 90 degrees
                this.gate.position.y = 8 - this.gateProgress * 2;
            }
        }
    }

    private fireCannon(cannon: Cannon): void {
        // Create cannonball effect
        const cannonballGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const cannonballMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F4F });
        const cannonball = new THREE.Mesh(cannonballGeometry, cannonballMaterial);
        
        cannonball.position.copy(cannon.mesh.position);
        cannonball.position.y += 1;
        
        this.scene.add(cannonball);

        // Animate cannonball
        const direction = new THREE.Vector3();
        cannon.mesh.getWorldDirection(direction);
        direction.multiplyScalar(50);

        let time = 0;
        const animate = () => {
            time += 0.016;
            cannonball.position.add(direction.clone().multiplyScalar(0.1));
            cannonball.position.y -= time * 2;

            if (time < 3) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(cannonball);
            }
        };
        animate();
    }

    public getCharacters(): (THREE.Mesh | THREE.Group)[] {
        return this.characters.map(char => char.mesh);
    }

    // Interaction hooks
    public onGuardInteracted(guard: THREE.Object3D): void {
        if (guard.userData && guard.userData.type === 'guard') {
            guard.userData.waveTime = 1.2; // seconds
        }
    }

    public toggleGate(): void {
        this.gateOpening = !this.gateOpening;
    }

    public getInteractables(): THREE.Object3D[] {
        const list: THREE.Object3D[] = [];
        if (this.gate) list.push(this.gate);
        return list;
    }
}
