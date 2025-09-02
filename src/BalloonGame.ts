export class BalloonGame {
    private balloons: HTMLElement[] = [];
    private score: number = 0;
    private guardScore: number = 0;
    private currentLevel: number = 1;
    private balloonsLeft: number = 0;
    private isActive: boolean = false;
    private scoreElement: HTMLElement;
    private guardScoreElement: HTMLElement;
    private guardPanelEl: HTMLElement | null = null;
    private playerPanelEl: HTMLElement | null = null;
    private balloonsLeftElement: HTMLElement;
    private levelElement: HTMLElement;
    private timerElement: HTMLElement;
    private levelConfig: LevelConfig[] = [];
    private timeLeft: number = 60;
    private timerInterval: number | null = null;
    private guardInterval: number | null = null;
    private prevScore: number = 0;
    private prevGuardScore: number = 0;

    constructor() {
        this.scoreElement = document.getElementById('score') as HTMLElement;
        this.guardScoreElement = document.getElementById('guard-score') as HTMLElement;
        this.guardPanelEl = document.getElementById('guard-panel');
        this.playerPanelEl = document.getElementById('player-panel');
        this.balloonsLeftElement = document.getElementById('balloons-left') as HTMLElement;
        this.levelElement = document.getElementById('level') as HTMLElement;
        this.timerElement = document.getElementById('timer') as HTMLElement;
        this.initLevelConfig();
        this.init();
    }

    private initLevelConfig(): void {
        // Configure 10 levels with increasing difficulty and time limits
        this.levelConfig = [
            { balloons: 5, size: 60, speed: 1, movement: 'float', timeLimit: 60 },
            { balloons: 8, size: 55, speed: 1.2, movement: 'float', timeLimit: 55 },
            { balloons: 12, size: 50, speed: 1.4, movement: 'bounce', timeLimit: 50 },
            { balloons: 15, size: 45, speed: 1.6, movement: 'bounce', timeLimit: 45 },
            { balloons: 18, size: 40, speed: 1.8, movement: 'zigzag', timeLimit: 40 },
            { balloons: 22, size: 35, speed: 2.0, movement: 'zigzag', timeLimit: 35 },
            { balloons: 26, size: 30, speed: 2.2, movement: 'spiral', timeLimit: 30 },
            { balloons: 30, size: 25, speed: 2.4, movement: 'spiral', timeLimit: 25 },
            { balloons: 35, size: 20, speed: 2.6, movement: 'chaos', timeLimit: 20 },
            { balloons: 40, size: 18, speed: 2.8, movement: 'chaos', timeLimit: 15 }
        ];
    }

    private init(): void {
        // Create audio context for sound effects
        this.createSoundEffects();
        
        // Start the game after a delay
        setTimeout(() => {
            this.startLevel(1);
        }, 2000);
    }

    private createSoundEffects(): void {
        // Create pop sound effect
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Store audio context for later use
        (window as any).audioContext = audioContext;
    }

    private playPopSound(): void {
        const audioContext = (window as any).audioContext;
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    public startLevel(level: number): void {
        this.currentLevel = level;
        this.balloonsLeft = this.levelConfig[level - 1].balloons;
        this.timeLeft = this.levelConfig[level - 1].timeLimit;
        this.isActive = true;
        this.updateUI();
        this.createBalloons();
        this.setupClickHandler();
        this.startTimer();
        this.startGuardAI();
    }

    private startTimer(): void {
        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Start countdown timer
        this.timerInterval = window.setInterval(() => {
            this.timeLeft--;
            this.updateUI();
            
            // Check if time ran out
            if (this.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.guardInterval) {
            clearInterval(this.guardInterval);
            this.guardInterval = null;
        }
    }

    private timeUp(): void {
        this.stopTimer();
        this.isActive = false;
        
        // Clear any remaining balloons
        this.balloons.forEach(balloon => {
            if (balloon.parentNode) {
                document.body.removeChild(balloon);
            }
        });
        this.balloons = [];
        
        // Styled time up modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const card = document.createElement('div');
        card.className = 'modal-card';
        card.innerHTML = `
            <div class="modal-title">⏰ Time's Up!</div>
            <div class="modal-sub">Level ${this.currentLevel} Failed</div>
            <div class="modal-row">Your Score: <b>${this.score}</b></div>
            <div class="modal-row">Guard Score: <b>${this.guardScore}</b></div>
            <div class="modal-actions">
                <button class="btn btn-danger" onclick="this.closest('.modal-overlay')?.remove(); window.balloonGame.startLevel(1)">Restart from Level 1</button>
            </div>
        `;
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    private createBalloons(): void {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#a8e6cf', '#ff8b94', '#ffd3b6', '#ffaaa5'];
        const config = this.levelConfig[this.currentLevel - 1];
        
        for (let i = 0; i < this.balloonsLeft; i++) {
            setTimeout(() => {
                this.createBalloon(colors[Math.floor(Math.random() * colors.length)], config);
            }, i * 300);
        }
    }

    private createBalloon(color: string, config: LevelConfig): void {
        const balloon = document.createElement('div');
        balloon.className = 'balloon';
        balloon.style.background = `radial-gradient(circle at 30% 30%, ${color}, ${this.darkenColor(color, 0.2)})`;
        balloon.style.width = `${config.size}px`;
        balloon.style.height = `${config.size}px`;
        
        // Random position, avoiding UI elements
        const isMobile = window.innerWidth <= 768;
        
        // Adjust padding based on device type
        const topPadding = isMobile ? 80 : 100; // Space for top UI
        const bottomPadding = isMobile ? 100 : 120; // Space for bottom UI
        const leftPadding = isMobile ? 120 : 200; // Space for left UI
        const rightPadding = isMobile ? 120 : 150; // Space for right UI
        
        const x = leftPadding + Math.random() * (window.innerWidth - config.size - leftPadding - rightPadding);
        const y = topPadding + Math.random() * (window.innerHeight - config.size - topPadding - bottomPadding);
        
        // Ensure balloon is within safe bounds
        const safeX = Math.max(leftPadding, Math.min(x, window.innerWidth - config.size - rightPadding));
        const safeY = Math.max(topPadding, Math.min(y, window.innerHeight - config.size - bottomPadding));
        
        balloon.style.left = `${safeX}px`;
        balloon.style.top = `${safeY}px`;
        
        // Add movement animation based on level
        this.addMovementAnimation(balloon, config);
        
        // Add custom CSS animations
        this.addCustomAnimations();
        
        document.body.appendChild(balloon);
        this.balloons.push(balloon);
        
        // Add click and touch handlers
        balloon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.popBalloon(balloon, e.clientX, e.clientY);
        });
        
        // Touch events for mobile
        balloon.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            this.popBalloon(balloon, touch.clientX, touch.clientY);
        }, { passive: false });
    }

    private darkenColor(color: string, amount: number): string {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * amount * 100);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    private addMovementAnimation(balloon: HTMLElement, config: LevelConfig): void {
        const duration = 3 / config.speed;
        
        switch (config.movement) {
            case 'float':
                balloon.style.animation = `float ${duration}s ease-in-out infinite`;
                break;
            case 'bounce':
                balloon.style.animation = `bounce ${duration}s ease-in-out infinite`;
                break;
            case 'zigzag':
                balloon.style.animation = `zigzag ${duration}s ease-in-out infinite`;
                break;
            case 'spiral':
                balloon.style.animation = `spiral ${duration}s ease-in-out infinite`;
                break;
            case 'chaos':
                balloon.style.animation = `chaos ${duration}s ease-in-out infinite`;
                break;
        }
    }

    private addCustomAnimations(): void {
        if (document.getElementById('balloon-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'balloon-animations';
        style.textContent = `
            @keyframes float {
                0%, 100% { transform: translateY(0px) scale(1); }
                50% { transform: translateY(-15px) scale(1.05); }
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0px) scale(1); }
                25% { transform: translateY(-20px) scale(1.1); }
                50% { transform: translateY(0px) scale(1); }
                75% { transform: translateY(-10px) scale(0.95); }
            }
            
            @keyframes zigzag {
                0%, 100% { transform: translate(0px, 0px) scale(1); }
                25% { transform: translate(20px, -15px) scale(1.05); }
                50% { transform: translate(-15px, -25px) scale(1); }
                75% { transform: translate(15px, -10px) scale(0.95); }
            }
            
            @keyframes spiral {
                0% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
                25% { transform: translate(15px, -15px) rotate(90deg) scale(1.1); }
                50% { transform: translate(0px, -25px) rotate(180deg) scale(1); }
                75% { transform: translate(-15px, -15px) rotate(270deg) scale(0.9); }
                100% { transform: translate(0px, 0px) rotate(360deg) scale(1); }
            }
            
            @keyframes chaos {
                0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
                10% { transform: translate(10px, -5px) rotate(36deg) scale(1.05); }
                20% { transform: translate(-8px, -12px) rotate(72deg) scale(0.95); }
                30% { transform: translate(15px, -8px) rotate(108deg) scale(1.1); }
                40% { transform: translate(-12px, -18px) rotate(144deg) scale(0.9); }
                50% { transform: translate(8px, -22px) rotate(180deg) scale(1); }
                60% { transform: translate(-15px, -15px) rotate(216deg) scale(1.05); }
                70% { transform: translate(12px, -10px) rotate(252deg) scale(0.95); }
                80% { transform: translate(-8px, -5px) rotate(288deg) scale(1.1); }
                90% { transform: translate(5px, -2px) rotate(324deg) scale(0.9); }
            }
        `;
        document.head.appendChild(style);
    }

    private setupClickHandler(): void {
        document.addEventListener('click', (e) => {
            if (!this.isActive) return;
            
            // Create projectile effect
            this.createProjectile(e.clientX, e.clientY);
        });
        
        // Touch events for mobile
        document.addEventListener('touchstart', (e) => {
            if (!this.isActive) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            this.createProjectile(touch.clientX, touch.clientY);
        }, { passive: false });
    }

    private createProjectile(startX: number, startY: number): void {
        const projectile = document.createElement('div');
        projectile.className = 'projectile';
        projectile.style.left = `${startX}px`;
        projectile.style.top = `${startY}px`;
        
        document.body.appendChild(projectile);
        
        // Animate projectile
        const animation = projectile.animate([
            { 
                transform: 'translate(0, 0) scale(1)',
                opacity: 1
            },
            { 
                transform: 'translate(0, -50px) scale(0.5)',
                opacity: 0
            }
        ], {
            duration: 500,
            easing: 'ease-out'
        });
        
        animation.onfinish = () => {
            document.body.removeChild(projectile);
        };
    }

    private createGuardProjectile(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
        return new Promise((resolve) => {
            const projectile = document.createElement('div');
            projectile.className = 'projectile';
            projectile.style.left = `${fromX}px`;
            projectile.style.top = `${fromY}px`;
            projectile.style.background = '#4ecdc4';
            projectile.style.boxShadow = '0 0 6px #4ecdc4';
            document.body.appendChild(projectile);

            const animation = projectile.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${toX - fromX}px, ${toY - fromY}px) scale(0.7)`, opacity: 0.8 }
            ], { duration: 250, easing: 'linear' });

            animation.onfinish = () => {
                if (projectile.parentNode) document.body.removeChild(projectile);
                resolve();
            };
        });
    }

    private popBalloon(balloon: HTMLElement, x: number, y: number): void {
        // Play sound effect
        this.playPopSound();
        
        // Create pop effect
        this.createPopEffect(x, y);
        
        // Remove balloon
        document.body.removeChild(balloon);
        this.balloons = this.balloons.filter(b => b !== balloon);
        
        // Update score (more points for higher levels)
        this.score += 10 * this.currentLevel;
        this.balloonsLeft--;
        
        this.updateUI();
        
        // Check if level is complete
        if (this.balloonsLeft <= 0) {
            this.completeLevel();
        }
    }

    private popBalloonByGuard(balloon: HTMLElement): void {
        // Guard pops a balloon
        this.playPopSound();
        const rect = balloon.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        this.createPopEffect(x, y);

        if (balloon.parentNode) {
            document.body.removeChild(balloon);
        }
        this.balloons = this.balloons.filter(b => b !== balloon);

        // Guard score scales with level slightly differently to create tension
        this.guardScore += Math.round(8 * this.currentLevel);
        this.balloonsLeft--;
        this.updateUI();

        if (this.balloonsLeft <= 0) {
            this.completeLevel();
        }
    }

    private createPopEffect(x: number, y: number): void {
        // Create multiple particles for pop effect
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.background = '#ff6b6b';
            particle.style.borderRadius = '50%';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '60';
            
            document.body.appendChild(particle);
            
            const angle = (i * Math.PI * 2) / 8;
            const distance = 30 + Math.random() * 20;
            const endX = x + Math.cos(angle) * distance;
            const endY = y + Math.sin(angle) * distance;
            
            const animation = particle.animate([
                { 
                    transform: 'translate(0, 0) scale(1)',
                    opacity: 1
                },
                { 
                    transform: `translate(${endX - x}px, ${endY - y}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 600,
                easing: 'ease-out'
            });
            
            animation.onfinish = () => {
                if (particle.parentNode) {
                    document.body.removeChild(particle);
                }
            };
        }
    }

    private completeLevel(): void {
        this.stopTimer();
        this.isActive = false;
        
        // Clear any remaining balloons
        this.balloons.forEach(balloon => {
            if (balloon.parentNode) {
                document.body.removeChild(balloon);
            }
        });
        this.balloons = [];
        
        // Styled level complete modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const card = document.createElement('div');
        card.className = 'modal-card';
        const player = this.score;
        const guard = this.guardScore;
        const winner = player === guard ? 'It\'s a tie!' : (player > guard ? 'You win this round!' : 'Guard wins this round!');

        if (this.currentLevel < 10) {
            card.innerHTML = `
                <div class="modal-title">🎈 Level ${this.currentLevel} Complete!</div>
                <div class="modal-sub" style="color:#ffd700;">${winner}</div>
                <div class="modal-row">Your Score: <b>${this.score}</b></div>
                <div class="modal-row">Guard Score: <b>${this.guardScore}</b></div>
                <div class="modal-row">Next Level: <b>${this.currentLevel + 1}</b></div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay')?.remove(); window.balloonGame.startLevel(${this.currentLevel + 1})">Next Level</button>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="modal-title">🎈 Congratulations!</div>
                <div class="modal-sub">You've completed all 10 levels!</div>
                <div class="modal-row">Your Final Score: <b>${this.score}</b></div>
                <div class="modal-row">Guard Final Score: <b>${this.guardScore}</b></div>
                <div class="modal-row" style="color:#ffd700;">${winner}</div>
                <div class="modal-actions">
                    <button class="btn btn-danger" onclick="location.reload()">Play Again</button>
                </div>
            `;
        }
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    private updateUI(): void {
        this.scoreElement.textContent = this.score.toString();
        if (this.guardScoreElement) this.guardScoreElement.textContent = this.guardScore.toString();
        this.balloonsLeftElement.textContent = this.balloonsLeft.toString();
        this.levelElement.textContent = this.currentLevel.toString();
        this.timerElement.textContent = this.timeLeft.toString();
        
        // Change timer color when time is running low
        if (this.timeLeft <= 10) {
            this.timerElement.style.color = '#ff6b6b';
        } else if (this.timeLeft <= 20) {
            this.timerElement.style.color = '#ffa500';
        } else {
            this.timerElement.style.color = 'white';
        }

        // Update dynamic scale of score panels
        this.applyScoreScales();

        // Animate on score change and highlight the leader
        this.handleScoreAnimationsAndLead();

        // Timer danger pulse on wrapper
        this.updateTimerDanger();
    }

    private updateTimerDanger(): void {
        const wrapper = this.timerElement?.parentElement as HTMLElement | null;
        if (!wrapper) return;
        if (this.timeLeft <= 10) {
            wrapper.classList.add('danger');
        } else {
            wrapper.classList.remove('danger');
        }
    }

    private applyScoreScales(): void {
        const playerScale = this.computeScale(this.score);
        const guardScale = this.computeScale(this.guardScore);
        if (this.playerPanelEl) this.playerPanelEl.style.setProperty('--grow', playerScale.toString());
        if (this.guardPanelEl) this.guardPanelEl.style.setProperty('--grow', guardScale.toString());
    }

    private computeScale(score: number): number {
        // Smooth, bounded growth: 1.0 to 1.6 using logarithmic curve
        const cap = 1.6;
        const base = 1.0;
        const k = 0.35; // growth factor
        const s = Math.log10(Math.max(1, score + 1));
        const scale = base + Math.min(k * s, cap - base);
        return parseFloat(scale.toFixed(3));
    }

    private handleScoreAnimationsAndLead(): void {
        // Bump animation when scores increase
        if (this.score > this.prevScore && this.playerPanelEl) {
            this.playerPanelEl.classList.remove('bump');
            void this.playerPanelEl.offsetWidth; // reflow to restart animation
            this.playerPanelEl.classList.add('bump');
        }
        if (this.guardScore > this.prevGuardScore && this.guardPanelEl) {
            this.guardPanelEl.classList.remove('bump');
            void this.guardPanelEl.offsetWidth;
            this.guardPanelEl.classList.add('bump');
        }

        // Lead highlight
        const playerLeads = this.score > this.guardScore;
        const tie = this.score === this.guardScore;
        if (this.playerPanelEl && this.guardPanelEl) {
            if (tie) {
                this.playerPanelEl.classList.remove('lead');
                this.guardPanelEl.classList.remove('lead');
            } else if (playerLeads) {
                this.playerPanelEl.classList.add('lead');
                this.guardPanelEl.classList.remove('lead');
            } else {
                this.guardPanelEl.classList.add('lead');
                this.playerPanelEl.classList.remove('lead');
            }
        }

        this.prevScore = this.score;
        this.prevGuardScore = this.guardScore;
    }

    public isGameActive(): boolean {
        return this.isActive;
    }

    public getScore(): number {
        return this.score;
    }

    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    private startGuardAI(): void {
        // Higher levels: faster shooting and better targeting
        const baseInterval = 1400; // ms
        const interval = Math.max(400, baseInterval - this.currentLevel * 100);

        if (this.guardInterval) {
            clearInterval(this.guardInterval);
        }

        this.guardInterval = window.setInterval(async () => {
            if (!this.isActive) return;
            if (this.balloons.length === 0) return;

            // Choose a target balloon (prefer larger ones early levels)
            const target = this.chooseTargetBalloon();
            if (!target) return;

            // Simulate a guard on the top-right rampart firing towards the balloon
            const fromX = window.innerWidth - 80;
            const fromY = 80;
            const rect = target.getBoundingClientRect();
            const toX = rect.left + rect.width / 2;
            const toY = rect.top + rect.height / 2;

            await this.createGuardProjectile(fromX, fromY, toX, toY);

            // Chance to miss at low levels; higher accuracy at higher levels
            const accuracy = Math.min(0.6 + this.currentLevel * 0.04, 0.95);
            if (Math.random() <= accuracy && this.isActive && this.balloons.includes(target)) {
                this.popBalloonByGuard(target);
            }
        }, interval);
    }

    private chooseTargetBalloon(): HTMLElement | null {
        if (this.balloons.length === 0) return null;
        // Simple heuristic: pick the balloon closest to the center or random based on level
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const preferCenter = this.currentLevel >= 4;
        if (preferCenter) {
            let best: { b: HTMLElement; d: number } | null = null;
            for (const b of this.balloons) {
                const r = b.getBoundingClientRect();
                const bx = r.left + r.width / 2;
                const by = r.top + r.height / 2;
                const d = (bx - centerX) * (bx - centerX) + (by - centerY) * (by - centerY);
                if (!best || d < best.d) best = { b, d };
            }
            return best ? best.b : this.balloons[0];
        } else {
            return this.balloons[Math.floor(Math.random() * this.balloons.length)];
        }
    }

    public handleResize(): void {
        // Reposition existing balloons to avoid UI elements
        this.balloons.forEach(balloon => {
            const isMobile = window.innerWidth <= 768;
            const topPadding = isMobile ? 80 : 100;
            const bottomPadding = isMobile ? 100 : 120;
            const leftPadding = isMobile ? 120 : 200;
            const rightPadding = isMobile ? 120 : 150;
            
            const size = parseInt(balloon.style.width);
            const x = leftPadding + Math.random() * (window.innerWidth - size - leftPadding - rightPadding);
            const y = topPadding + Math.random() * (window.innerHeight - size - topPadding - bottomPadding);
            
            // Ensure balloon is within safe bounds
            const safeX = Math.max(leftPadding, Math.min(x, window.innerWidth - size - rightPadding));
            const safeY = Math.max(topPadding, Math.min(y, window.innerHeight - size - bottomPadding));
            
            balloon.style.left = `${safeX}px`;
            balloon.style.top = `${safeY}px`;
        });
    }
}

interface LevelConfig {
    balloons: number;
    size: number;
    speed: number;
    movement: 'float' | 'bounce' | 'zigzag' | 'spiral' | 'chaos';
    timeLimit: number;
}
