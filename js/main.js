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
        document.getElementById('start-btn').addEventListener('click', () => this.start());
    }

    start() {
        document.getElementById('splash-screen').classList.add('hidden');
        this.restart();
    }

    restart() {
        this.gameState = new TetrisLogic(this.audioManager);
        this.isPaused = false;
        document.getElementById('gameOver').classList.add('hidden');
        this.audioManager.playMusic();
        this.loop();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.audioManager.pauseMusic();
            document.getElementById('pause-overlay').classList.remove('hidden');
        } else {
            this.audioManager.playMusic();
            document.getElementById('pause-overlay').classList.add('hidden');
            this.loop();
        }
    }

    loop(time = 0) {
        if (this.isPaused) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        if (!this.gameState.gameOver) {
            this.dropCounter += deltaTime;
            
            // Calculate speed based on level
            // Formula from Tetris Worlds: (0.8-((Level-1)*0.007))^(Level-1) secs per row?
            // Simplified: max(100, 1000 - (level-1)*50)
            const speed = Math.max(50, Math.pow(0.8 - ((this.gameState.level - 1) * 0.007), this.gameState.level - 1) * 1000);
            
            if (this.dropCounter > speed) {
                if (!this.gameState.move(0, 1)) {
                    this.gameState.lock();
                }
                this.dropCounter = 0;
            }
        } else {
             document.getElementById('gameOver').classList.remove('hidden');
             return;
        }

        this.updateUI();
        this.renderer.render(this.gameState);
        requestAnimationFrame(this.loop.bind(this));
    }

    updateUI() {
        document.getElementById('score').textContent = this.gameState.score;
        document.getElementById('level').textContent = this.gameState.level;
        document.getElementById('lines').textContent = this.gameState.lines;
    }
}

// Start the game
window.game = new Game();
