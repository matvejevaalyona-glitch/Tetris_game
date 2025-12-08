import { TetrisLogic } from './js/tetris_logic.js';
import { ROWS, VISIBLE_ROWS } from './js/constants.js';

// Mock AudioManager
const mockAudio = {
    playSound: (type) => console.log(`[Audio] ${type}`),
    playMusic: () => {},
    pauseMusic: () => {}
};

console.log("Starting Debug Session...");
const game = new TetrisLogic(mockAudio);

console.log(`Initial Piece: ${game.currentPiece.type} at (${game.currentPiece.x}, ${game.currentPiece.y})`);
console.log(`Hidden threshold: < ${ROWS - VISIBLE_ROWS}`);

// Simulate dropping first piece to bottom
console.log("Dropping first piece...");
let moves = 0;
while (game.move(0, 1)) {
    moves++;
}
console.log(`Piece landed after ${moves} moves at y=${game.currentPiece.y}`);

// Lock it
console.log("Locking piece...");
game.lock();

if (game.gameOver) {
    console.error("FAIL: Game Over triggered after first lock!");
} else {
    console.log("Lock successful. Checking next piece...");
    if (!game.currentPiece) {
        console.error("FAIL: No current piece after lock!");
    } else {
        console.log(`New Piece: ${game.currentPiece.type} at (${game.currentPiece.x}, ${game.currentPiece.y})`);
        
        // Attempt to move new piece
        console.log("Attempting to move new piece...");
        const moved = game.move(0, 1);
        if (moved) {
            console.log(`New piece moved to y=${game.currentPiece.y}. SUCCESS`);
        } else {
             // If it spawned at 20 (visible), it should move to 21 unless blocked?
             // Or if it spawned at 19 and moved to 20 during spawn.
             console.log(`New piece failed to move from y=${game.currentPiece.y}`);
        }
    }
}
