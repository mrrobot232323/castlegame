import * as THREE from 'three';

interface DialogueData {
    name: string;
    messages: string[];
    currentMessage: number;
}

export class DialogueSystem {
    private dialogueBox: HTMLElement;
    private dialogueName: HTMLElement;
    private dialogueText: HTMLElement;
    private isActive: boolean = false;
    private currentDialogue: DialogueData | null = null;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private camera: THREE.Camera | null = null;
    private characters: (THREE.Mesh | THREE.Group)[] = [];
    private interactables: THREE.Object3D[] = [];
    private handlers: {
        onGuardInteracted?: (obj: THREE.Object3D) => void;
        onGateToggled?: () => void;
    } = {};

    // Character dialogue data
    private characterDialogues: { [key: string]: string[] } = {
        "King": [
            "Welcome to my castle, brave adventurer!",
            "I rule this land with wisdom and justice.",
            "The castle has stood for generations, protecting our people.",
            "Would you like to hear tales of our kingdom's history?"
        ],
        "Wizard": [
            "Ah, a visitor! The magical energies are strong today.",
            "I study ancient spells and mystical artifacts.",
            "The castle's magic wards keep us safe from dark forces.",
            "Perhaps you'd like to learn a simple enchantment?"
        ],
        "Knight": [
            "Hail, traveler! I am sworn to protect this castle.",
            "My sword has defended these walls for many years.",
            "The patrols never rest - we keep constant watch.",
            "Would you like to see our training grounds?"
        ],
        "Princess": [
            "Hello there! I'm so glad you've come to visit!",
            "The castle gardens are my favorite place to be.",
            "I love watching the horses in the courtyard.",
            "Have you seen the beautiful view from the tower?"
        ],
        "Merchant": [
            "Greetings! I trade goods from far and wide.",
            "The castle market is always bustling with activity.",
            "I have rare treasures from distant lands.",
            "Perhaps you'd like to see my latest wares?"
        ]
    };

    constructor() {
        this.dialogueBox = document.getElementById('dialogue-box') as HTMLElement;
        this.dialogueName = document.getElementById('dialogue-name') as HTMLElement;
        this.dialogueText = document.getElementById('dialogue-text') as HTMLElement;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.setupEventListeners();
    }

    private showTransientMessage(name: string, text: string): void {
        // Do not enter full dialogue state; show message briefly
        const prevActive = this.isActive;
        const prevDialogue = this.currentDialogue;
        this.dialogueName.textContent = name;
        this.typeMessage(text);
        this.dialogueBox.classList.add('show');

        setTimeout(() => {
            // Restore previous state
            if (!prevActive) {
                this.dialogueBox.classList.remove('show');
                this.currentDialogue = null;
                this.isActive = false;
                this.removeCharacterHighlight();
            } else {
                this.currentDialogue = prevDialogue;
                this.isActive = prevActive;
            }
        }, 1500);
    }

    private randomGuardLine(): string {
        const lines = [
            'At your service!',
            'All clear on the walls.',
            'Stay vigilant!',
            'The king is safe.',
            'Patrolling the ramparts.'
        ];
        return lines[Math.floor(Math.random() * lines.length)];
    }

    private setupEventListeners(): void {
        // Handle mouse clicks for character interaction
        document.addEventListener('click', (event) => {
            if (this.isActive) {
                this.handleDialogueClick();
                return;
            }
            this.handleCharacterClick(event);
        });

        // Handle touch events for mobile character interaction
        document.addEventListener('touchstart', (event) => {
            if (this.isActive) {
                this.handleDialogueClick();
                return;
            }
            this.handleCharacterTouch(event);
        }, { passive: false });

        // Handle escape key to close dialogue
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isActive) {
                this.closeDialogue();
            }
        });
    }

    public setCamera(camera: THREE.Camera): void {
        this.camera = camera;
    }

    public setCharacters(characters: (THREE.Mesh | THREE.Group)[]): void {
        this.characters = characters;
    }

    public setInteractables(objs: THREE.Object3D[]): void {
        this.interactables = objs.filter(Boolean);
    }

    public setInteractionHandlers(handlers: {
        onGuardInteracted?: (obj: THREE.Object3D) => void;
        onGateToggled?: () => void;
    }): void {
        this.handlers = handlers;
    }

    private handleCharacterClick(event: MouseEvent): void {
        if (!this.camera) return;

        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.handleCharacterInteraction();
    }

    private handleCharacterTouch(event: TouchEvent): void {
        if (!this.camera) return;

        event.preventDefault();

        // Use the first touch point
        const touch = event.touches[0];
        
        // Calculate touch position in normalized device coordinates
        this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

        this.handleCharacterInteraction();
    }

    private handleCharacterInteraction(): void {
        // Update the picking ray with the camera and mouse position
        if (!this.camera) return;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check for intersections with characters and extra interactables (recursive to traverse groups)
        const intersects = this.raycaster.intersectObjects([...this.characters, ...this.interactables], true);

        if (intersects.length > 0) {
            // Traverse up to find an ancestor with a userData.type
            let obj: THREE.Object3D | null = intersects[0].object;
            while (obj && !(obj.userData && obj.userData.type)) {
                obj = obj.parent;
            }
            if (!obj) return;

            const u = obj.userData || {};
            if (u.type === 'character') {
                this.startDialogue(u.name);
            } else if (u.type === 'guard') {
                // Trigger guard wave and show a short line
                this.handlers.onGuardInteracted?.(obj);
                this.showTransientMessage(u.name || 'Guard', this.randomGuardLine());
            } else if (u.type === 'gate') {
                // Toggle gate and show message
                this.handlers.onGateToggled?.();
                this.showTransientMessage('Gate', 'The gate creaks as it moves...');
            }
        }
    }

    private handleDialogueClick(): void {
        if (!this.currentDialogue) return;

        // Move to next message
        this.currentDialogue.currentMessage++;
        
        if (this.currentDialogue.currentMessage >= this.currentDialogue.messages.length) {
            // End of dialogue
            this.closeDialogue();
        } else {
            // Show next message
            this.showCurrentMessage();
        }
    }

    private startDialogue(characterName: string): void {
        const messages = this.characterDialogues[characterName];
        if (!messages) return;

        this.currentDialogue = {
            name: characterName,
            messages: messages,
            currentMessage: 0
        };

        this.isActive = true;
        this.showCurrentMessage();
        this.dialogueBox.classList.add('show');

        // Add visual feedback for the character
        this.highlightCharacter(characterName);
    }

    private showCurrentMessage(): void {
        if (!this.currentDialogue) return;

        this.dialogueName.textContent = this.currentDialogue.name;
        this.dialogueText.textContent = this.currentDialogue.messages[this.currentDialogue.currentMessage];

        // Add typing effect
        this.typeMessage(this.currentDialogue.messages[this.currentDialogue.currentMessage]);
    }

    private typeMessage(message: string): void {
        this.dialogueText.textContent = '';
        let index = 0;

        const typeInterval = setInterval(() => {
            if (index < message.length) {
                this.dialogueText.textContent += message[index];
                index++;
            } else {
                clearInterval(typeInterval);
            }
        }, 30);
    }

    private closeDialogue(): void {
        this.isActive = false;
        this.currentDialogue = null;
        this.dialogueBox.classList.remove('show');
        this.removeCharacterHighlight();
    }

    private highlightCharacter(characterName: string): void {
        // Find the character mesh and add a highlight effect
        this.characters.forEach(character => {
            if (character.userData.name === characterName) {
                // Handle both Mesh and Group objects
                if (character instanceof THREE.Mesh) {
                    // Store original material
                    if (!character.userData.originalMaterial) {
                        if (Array.isArray(character.material)) {
                            character.userData.originalMaterial = character.material.map(mat => mat.clone());
                        } else {
                            character.userData.originalMaterial = character.material.clone();
                        }
                    }

                    // Create highlight material
                    if (Array.isArray(character.material)) {
                        // Handle array of materials
                        const highlightMaterials = character.material.map(mat => {
                            const highlightMat = mat.clone();
                            if (highlightMat instanceof THREE.MeshLambertMaterial) {
                                highlightMat.emissive = new THREE.Color(0xffff00);
                                highlightMat.emissiveIntensity = 0.3;
                            }
                            return highlightMat;
                        });
                        character.material = highlightMaterials;
                    } else {
                        // Handle single material
                        const highlightMaterial = character.material.clone();
                        if (highlightMaterial instanceof THREE.MeshLambertMaterial) {
                            highlightMaterial.emissive = new THREE.Color(0xffff00);
                            highlightMaterial.emissiveIntensity = 0.3;
                        }
                        character.material = highlightMaterial;
                    }
                }
            }
        });
    }

    private removeCharacterHighlight(): void {
        // Restore original materials
        this.characters.forEach(character => {
            if (character instanceof THREE.Mesh && character.userData.originalMaterial) {
                character.material = character.userData.originalMaterial;
                delete character.userData.originalMaterial;
            }
        });
    }

    public isDialogueActive(): boolean {
        return this.isActive;
    }

    public update(): void {
        // Update any ongoing dialogue effects
        if (this.isActive && this.currentDialogue) {
            // Add subtle animation to dialogue box
            this.dialogueBox.style.transform = `translateX(-50%) translateY(${Math.sin(Date.now() * 0.003) * 2}px)`;
        }
    }
}
