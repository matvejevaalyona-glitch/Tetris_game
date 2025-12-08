import { KEYS } from './constants.js';

export class Controller {
    constructor(game) {
        this.game = game;
        this.keysPressed = {};
        
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    handleKeyDown(event) {
        const key = event.key;
        
        if (this.game.gameState.gameOver) {
            if (KEYS.START.includes(key)) {
                this.game.restart();
            }
            return;
        }

        if (KEYS.PAUSE.includes(key)) {
            this.game.togglePause();
            return;
        }

        if (this.game.isPaused) return;

        // Game Controls
        if (KEYS.LEFT.includes(key)) {
            this.game.gameState.move(-1, 0);
        } else if (KEYS.RIGHT.includes(key)) {
            this.game.gameState.move(1, 0);
        } else if (KEYS.SOFT_DROP.includes(key)) {
            this.game.gameState.softDrop();
            this.game.gameState.isSoftDropping = true;
        } else if (KEYS.HARD_DROP.includes(key)) {
            event.preventDefault(); // Prevent page scroll
            this.game.gameState.hardDrop();
        } else if (KEYS.ROTATE_CW.includes(key)) {
            this.game.gameState.rotate(1);
        } else if (KEYS.ROTATE_CCW.includes(key)) {
            this.game.gameState.rotate(-1);
        } else if (KEYS.HOLD.includes(key)) {
            this.game.gameState.hold();
        }
        
        this.game.renderer.render(this.game.gameState);
    }

    handleKeyUp(event) {
        const key = event.key;
        if (KEYS.SOFT_DROP.includes(key)) {
            this.game.gameState.isSoftDropping = false;
        }
    }
}
