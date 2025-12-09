import { TetrisLogic } from './tetris_logic.js';
import { Renderer } from './renderer.js';
import { Controller } from './controller.js';
import { AudioManager } from './audio_manager.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.holdCanvas = document.getElementById('holdCanvas');
        
        this.audioManager = new AudioManager();
        this.renderer = new Renderer(this.canvas, this.nextCanvas, this.holdCanvas);
        this.gameState = null;
        this.controller = new Controller(this);
        
        this.lastTime = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        
        this.isPaused = false;
        
        this.init();
    }

    init() {
        document.getElementById('btn-marathon').addEventListener('click', () => this.start('MARATHON'));
        document.getElementById('btn-sprint').addEventListener('click', () => this.start('SPRINT'));
        document.getElementById('btn-ultra').addEventListener('click', () => this.start('ULTRA'));
    }

    start(mode) {
        document.getElementById('splash-screen').classList.add('hidden');
        this.restart(mode);
    }

    restart(mode) {
        // Clear canvas and reset UI
        this.renderer.clear();
        this.renderer.nextCtx.clearRect(0, 0, this.renderer.nextCtx.canvas.width, this.renderer.nextCtx.canvas.height);
        this.renderer.holdCtx.clearRect(0, 0, this.renderer.holdCtx.canvas.width, this.renderer.holdCtx.canvas.height);
        document.getElementById('gameOver').classList.add('hidden');
        
        this.gameMode = mode || this.gameMode || 'MARATHON';
        
        // Start countdown, then initialize game
        this.startCountdown(() => {
            this.gameState = new TetrisLogic(this.audioManager, this.gameMode);
            this.isPaused = false;
            this.audioManager.playMusic();
            
            // Mode specific initialization
            this.startTime = performance.now();
            this.timeLimit = (this.gameMode === 'ULTRA') ? 120000 : 0; // 2 minutes for Ultra
            this.elapsedTime = 0;
            
            this.loop();
        });
    }
    
    // ... togglePause and startCountdown ...

    loop(time = 0) {
        if (this.isPaused) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        if (!this.gameState.gameOver) {
            
            // Mode Checks
            if (this.gameMode === 'ULTRA') {
                this.elapsedTime = time - this.startTime; // Use accumulating logic if pausing affects startTime? 
                // Better: this.elapsedTime += deltaTime; <-- Safer with pause
            } else if (this.gameMode === 'SPRINT') {
                this.elapsedTime += deltaTime; // Track time for sprint score
            }

            // Correction for pause: loop is stopped, so deltaTime is large on resume?
            // On resume, lastTime is reset. So deltaTime is small.
            // But we need to track total played time.
            
            // Actually, let's track playtime in a simpler way.
            if (!this.gameState.startTime) this.gameState.startTime = Date.now();
            
            // Game Over Conditions
            if (this.gameMode === 'SPRINT' && this.gameState.lines >= 40) {
                this.gameState.gameOver = true;
                this.showGameOver(true); // Win
            } else if (this.gameMode === 'ULTRA') {
                // Check time
                // How to track accurate time excluding pauses?
                // Let's add a timer to gameState or Game class.
                // Assuming continuous play for now, logic below handles frame updates.
                if (this.gameTimer === undefined) this.gameTimer = 0;
                this.gameTimer += deltaTime;
                
                if (this.gameTimer >= 120000) {
                    this.gameState.gameOver = true;
                    this.showGameOver(true);
                }
            }
            
            this.dropCounter += deltaTime;
            
            // Calculate speed based on level
            const speed = Math.max(50, Math.pow(0.8 - ((this.gameState.level - 1) * 0.007), this.gameState.level - 1) * 1000);
            
            if (this.dropCounter > speed) {
                if (!this.gameState.move(0, 1)) {
                    this.gameState.lock();
                }
                this.dropCounter = 0;
            }
        } else {
             this.showGameOver(false);
             return;
        }

        this.updateUI();
        this.renderer.render(this.gameState);
        requestAnimationFrame(this.loop.bind(this));
    }

    togglePause() {
        if (this.isCountingDown) return;

        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.audioManager.pauseMusic();
            document.getElementById('pause-overlay').classList.remove('hidden');
        } else {
            document.getElementById('pause-overlay').classList.add('hidden');
            this.startCountdown(() => {
                this.audioManager.playMusic();
                this.lastTime = performance.now(); 
                this.loop();
            });
        }
    }

    startCountdown(onComplete) {
        this.isCountingDown = true;
        let count = 3;
        const countdownEl = document.getElementById('countdown');
        const countdownText = countdownEl.querySelector('h1');
        countdownEl.classList.remove('hidden');
        countdownText.textContent = count;
        
        // Reset timer tracking vars on resume/start
        // If resuming, we don't reset gameTimer.
        // If restarting, logic in callback handles new State.
        
        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                 countdownText.textContent = count;
            } else {
                 clearInterval(timer);
                 countdownEl.classList.add('hidden');
                 this.isCountingDown = false;
                 // Reset lastTime to avoid huge delta
                 this.lastTime = performance.now();
                 if (onComplete) onComplete();
            }
        }, 1000);
    }

    showGameOver(win) {
        const el = document.getElementById('gameOver');
        el.classList.remove('hidden');
        const title = el.querySelector('h2');
        if (win) {
            title.textContent = "SUCCESS!";
            title.style.color = "#0f0";
        } else {
            title.textContent = "GAME OVER";
            title.style.color = "#f00";
        }
    }

    updateUI() {
        document.getElementById('score').textContent = this.gameState.score;
        document.getElementById('level').textContent = this.gameState.level;
        document.getElementById('lines').textContent = this.gameState.lines;
        
        // Add Timer/Mode info logic if needed (e.g. override Level box for Ultra?)
        // For now standard UI.
        if (this.gameMode === 'SPRINT') {
            document.getElementById('lines').innerHTML = `${this.gameState.lines} <span style="font-size:14px;color:#aaa">/ 40</span>`;
        }
        if (this.gameMode === 'ULTRA') {
             const remaining = Math.max(0, 120000 - this.gameTimer);
             const secs = Math.ceil(remaining / 1000);
             // Maybe display in Level box or separate?
             // Let's hijack Level for timer in Ultra? Or just lines box?
             // Or update HTML to include Timer. For now, let's put it in Level box.
             document.getElementById('level').textContent = `${Math.floor(secs/60)}:${(secs%60).toString().padStart(2,'0')}`;
        }
    }
}

// Start the game
window.game = new Game();
