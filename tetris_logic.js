import { COLS, ROWS, SHAPES, SPAWN_OFFSETS, KICKS_JLSTZ, KICKS_I, SCORING, VISIBLE_ROWS, COLORS } from './constants.js';

export class TetrisLogic {
    constructor(audioManager, gameMode = 'MARATHON') {
        this.gameMode = gameMode;
        this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.bag = [];
        this.currentPiece = null;
        this.nextPieces = [];
        this.holdPiece = null;
        this.canHold = true;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.lockDelay = 500; // 0.5s lock delay
        this.lockTimer = null;
        this.isSoftDropping = false;
        this.combo = -1;
        this.isBackToBack = false;
        this.audio = audioManager;
        
        // Populate initial bag and next pieces
        this.refillBag();
        for (let i = 0; i < 6; i++) { // Requirement: 1-6 next pieces, recommended 6
            this.nextPieces.push(this.bag.shift());
            if (this.bag.length === 0) this.refillBag();
        }
        
        this.spawnPiece();
    }

    refillBag() {
        const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        // Shuffle
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        this.bag.push(...pieces);
    }

    getNextPiece() {
        const pieceType = this.nextPieces.shift();
        if (this.bag.length === 0) this.refillBag();
        this.nextPieces.push(this.bag.shift());
        return pieceType;
    }

    spawnPiece() {
        const type = this.getNextPiece();
        const shape = SHAPES[type].map(p => [...p]); // Copy shape
        const offset = SPAWN_OFFSETS[type];
        
        this.currentPiece = {
            type: type,
            shape: shape,
            x: offset.x,
            y: offset.y, // Spawn in hidden area (row 20-ish)
            rotation: 0, // 0: 0, 1: R, 2: 2, 3: L
            lastKick: null
        };
        
        // Check immediate collision (Block out)
        if (this.checkCollision(0, 0)) {
            this.gameOver = true;
            if (this.audio) this.audio.playSound('gameover');
        }
        
        // Initial move down if space available (Requirement: "Immediately drop one space...")
        if (!this.checkCollision(0, 1)) {
            this.currentPiece.y++;
        }
        
        this.canHold = true;
        this.resetLockTimer();
    }

    hold() {
        if (!this.canHold || this.gameOver) return;
        
        if (this.audio) this.audio.playSound('hold'); // Custom sound event if desired?

        const currentType = this.currentPiece.type;
        
        if (this.holdPiece === null) {
            this.holdPiece = currentType;
            this.spawnPiece();
        } else {
            const heldType = this.holdPiece;
            this.holdPiece = currentType;
            
            // Spawn held piece
            const type = heldType;
            const shape = SHAPES[type].map(p => [...p]);
            const offset = SPAWN_OFFSETS[type];
            
            this.currentPiece = {
                type: type,
                shape: shape,
                x: offset.x,
                y: offset.y,
                rotation: 0
            };
            this.resetLockTimer();
        }
        
        this.canHold = false;
    }

    checkCollision(dx, dy, piece = this.currentPiece) {
        if (!piece) return false;
        for (const [r, c] of piece.shape) {
            const newX = piece.x + c + dx;
            const newY = piece.y + r + dy;
            
            if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
            if (newY >= 0 && this.board[newY][newX]) return true;
        }
        return false;
    }

    move(dx, dy) {
        if (this.gameOver) return false;
        
        if (!this.checkCollision(dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            
            if (dy > 0 && this.audio && !this.isSoftDropping) {
                // Gravity tick - usually silent or very soft
            } else if (dx !== 0 && this.audio) {
                this.audio.playSound('move');
            }
            
            if (dy > 0) {
                 // Vertical move - if we landed, timer should start.
                 // If we were grounded and moved down (impossible), etc.
            }
            // Always check if we are now grounded to start timer
            // Or if we moved horizontally and are grounded, reset timer.
            this.resetLockTimer();
            this.lastAction = 'move';
            return true;
        } else {
            // Collision - if horizontal move, play wall touch
            if (dx !== 0 && this.audio) {
                this.audio.playSound('walltouch');
            }
        }
        return false; // Collision
    }

    rotate(direction) { // 1 for CW, -1 for CCW
        if (this.gameOver) return;
        
        const piece = this.currentPiece;
        // O piece does not rotate
        if (piece.type === 'O') return;

        const oldRotation = piece.rotation;
        const newRotation = (oldRotation + direction + 4) % 4; // 0->1->2->3->0
        
        // SRS Rotation Logic
        // Determine size of bounding box
        let size;
        if (piece.type === 'I') size = 4;
        else size = 3; // J, L, S, T, Z

        // Create new empty shape grid
        const rotatedShape = [];
        
        // Use standard rotation formula relative to (0,0) of bounding box
        // CW: (x, y) -> (y, size-1-x) => (c, r) -> (r, size-1-c) from source (r,c)
        // CCW: (x, y) -> (size-1-y, x) => (c, r) -> (size-1-c, r) from source (r,c)
        // But since we store a list of blocks, we transform each block.
        
        for (const [r, c] of piece.shape) {
             let nr, nc;
             if (direction === 1) { // CW
                 // SRS Matrix Rotation (clockwise)
                 // x' = y
                 // y' = -x
                 // To adjust for grid indices [0..size-1]:
                 // new_col = size - 1 - r
                 // new_row = c
                 
                 // Wait, let's verify standard Formula:
                 // (0,0) -> (0, size-1) in CW? 
                 // Top-Left (0,0) becomes Top-Right (0, size-1).
                 // r=0, c=0 -> nr=0, nc=size-1-0 = size-1. Match.
                 nr = c;
                 nc = size - 1 - r;
             } else { // CCW
                 // (0,0) -> (size-1, 0) in CCW?
                 // Top-Left (0,0) becomes Bottom-Left (size-1, 0).
                 // r=0, c=0 -> nr=size-1-c=size-1, nc=r=0. Match.
                 nr = size - 1 - c;
                 nc = r;
             }
             rotatedShape.push([nr, nc]);
        }
        
        // Wall Kicks
        const kickTable = piece.type === 'I' ? KICKS_I : KICKS_JLSTZ;
        const key = `${oldRotation}-${newRotation}`;
        // If key missing (rare or impossible with mod 4 arithmetic), no kick
        const kicks = kickTable[key] || [[0,0]];
        
        for (const [kx, ky] of kicks) {
             // Kicks are (dx, dy) where +x is Right, +y is Up (SRS Standard).
             // Our board +y is DOWN. So we use -ky.
             const tryX = piece.x + kx;
             const tryY = piece.y - ky;
             
             // Check collision with this shifted position and rotated shape
             const valid = !this.checkCollision(0, 0, { ...piece, x: tryX, y: tryY, shape: rotatedShape });
             
             if (valid) {
                 piece.shape = rotatedShape;
                 piece.x = tryX;
                 piece.y = tryY;
                 piece.rotation = newRotation;
                 this.audio.playSound('rotate');
                 
                 // Lock delay reset if successful rotation
                 this.resetLockTimer();
                 this.lastAction = 'rotate';
                 return;
             }
        }
        // Rotation failed (no valid kick found)
    }

    resetLockTimer() {
        if (this.lockTimer) {
            clearTimeout(this.lockTimer);
            this.lockTimer = null;
        }
        // Only start lock timer if touching ground
        if (this.checkCollision(0, 1)) {
             this.lockTimer = setTimeout(() => {
                 // Double check collision before locking (in case piece moved away and back quickly?)
                 // Actually, if timer fires, we lock.
                 // But we must verify we are still grounded?
                 // Standard behavior: Timer fires -> Lock. 
                 // If moved, timer was reset.
                 if (this.checkCollision(0, 1)) {
                    this.lock();
                 }
             }, this.lockDelay);
        }
    }

    hardDrop() {
        if (this.gameOver) return;
        let dropped = 0;
        while (!this.checkCollision(0, 1)) {
            this.currentPiece.y++;
            dropped++;
        }
        this.score += dropped * SCORING.HARD_DROP;
        if (this.audio) this.audio.playSound('harddrop');
        return this.lock();
    }

    softDrop() {
        if (this.gameOver) return;
        if (!this.checkCollision(0, 1)) {
             this.currentPiece.y++;
             this.score += SCORING.SOFT_DROP;
             if (this.audio) this.audio.playSound('softdrop');
             return true;
        }
        return false;
    }

    lock() {
        // Add to board
        for (const [r, c] of this.currentPiece.shape) {
            const y = this.currentPiece.y + r;
            const x = this.currentPiece.x + c;
            if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
                this.board[y][x] = COLORS[this.currentPiece.type];
            }
        }
        
        if (this.audio) this.audio.playSound('lock');
        
        // Detect T-Spin before anything (needed for scoring later)
        this.lastMoveTSpin = false;
        if (this.currentPiece.type === 'T') {
             // ... T-Spin logic (same as previous)
             // Corners of the T-piece 3x3 box: (0,0), (0,2), (2,2), (2,0)
             // Check occupied against board?
             const corners = [[0,0], [0,2], [2,2], [2,0]];
             let occupied = 0;
             for (const [cy, cx] of corners) {
                 const worldX = this.currentPiece.x + cx;
                 const worldY = this.currentPiece.y + cy;
                 if (worldX < 0 || worldX >= COLS || worldY >= ROWS || (worldY >= 0 && this.board[worldY][worldX])) {
                     occupied++;
                 }
             }
             if (occupied >= 3 && this.lastAction === 'rotate') {
                 this.lastMoveTSpin = true;
             }
        }
        
        // Check for line clears
        if (this.checkForLines()) {
            return 'CLEARED'; // Signal to external loop to animate
        }
        
        // Check for Lock Out
        const isLockOut = this.currentPiece.shape.every(([r, c]) => (this.currentPiece.y + r) < (ROWS - VISIBLE_ROWS));
        
        if (isLockOut) {
            this.gameOver = true;
            if (this.audio) this.audio.playSound('gameover');
            return 'GAMEOVER';
        }

        // Standard continuation
        // If no lines cleared, check combo fail?
        // Wait, logic says combo resets on clearLines usually if 0 cleared.
        // We need to handle 0-line scoring or resets somewhere.
        // If T-Spin with 0 lines?
        if (this.lastMoveTSpin) {
            // Scoring for T-Spin No Lines
            // Should be handled here? Or we only handle if cleared?
            // "T-Spin No Line" awards points.
            // Let's direct call scoring for 0 lines here?
            // Or we treat it as a "clear" of 0 lines structure?
            // For simplicity, handle minimal 0-line scoring here:
            let baseScore = SCORING.TSPIN;
             if (this.isBackToBack) baseScore *= SCORING.BACK_TO_BACK_MULTIPLIER;
             // But T-Spin No Line doesn't set B2B, just uses it? 
             // "T-Spin Mini" etc rules are complex.
             // Implemented simple:
             this.score += baseScore * this.level;
             if (this.audio) this.audio.playSound('rotate');
        } else {
             this.combo = -1; // Reset combo on normal lock
        }

        this.spawnPiece();
        return 'LOCKED';
    }

    // Returns true if lines are detected and set for clearing
    checkForLines() {
        this.clearingRows = [];
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== 0)) {
                this.clearingRows.push(r);
            }
        }
        return this.clearingRows.length > 0;
    }

    finalizeClear() {
        if (!this.clearingRows || this.clearingRows.length === 0) return;
        
        // Remove rows from board
        // Sort effectively (highest index first/lowest?)
        // Clearing logic: Remove row, add new empty at top.
        // Doing strictly from sorted list (DESC) prevents index shift issues if standard splice
        this.clearingRows.sort((a, b) => b - a); // 39, 38...
        
        let linesCleared = this.clearingRows.length;
        
        for (const r of this.clearingRows) {
            this.board.splice(r, 1);
            this.board.unshift(new Array(COLS).fill(0));
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            
            // Level calculation
            const fixedGoal = 10;
            const isVariableMode = true; 
            
            let goal;
            // ... (Goal logic simplified or copied) ...
             const USE_FIXED = false; 
            if (USE_FIXED) {
                goal = this.level * FIXED_GOAL;
            } else {
                goal = (5 * this.level * (this.level + 1)) / 2;
            }
            
            if (this.lines >= goal) {
                this.level++;
                if (this.audio) this.audio.playSound('levelup');
            }
            
            // T-Spin Scoring Logic (requires state from before clear?)
            // We need to know if the last move was T-spin and apply accurate scoring.
            // But this.currentPiece is already locked? 
            // Wait, finalizeClear is called later. The piece is already on board.
            // T-state detection should ideally happen BEFORE or DURING lock.
            // Let's store `isTSpin` in a property during lock/before clear delay?
            
            let baseScore = 0;
            let difficult = false;
            
            // Use this.lastMoveTSpin if we saved it
            const isTSpin = this.lastMoveTSpin || false;

            if (isTSpin) {
                difficult = true;
                switch(linesCleared) {
                    case 0: baseScore = SCORING.TSPIN; break; 
                    case 1: baseScore = SCORING.TSPIN_SINGLE; break;
                    case 2: baseScore = SCORING.TSPIN_DOUBLE; break;
                    case 3: baseScore = SCORING.TSPIN_TRIPLE; break;
                }
                if (this.audio) this.audio.playSound('tetris'); 
            } else {
                switch(linesCleared) {
                    case 1: baseScore = SCORING.SINGLE; break;
                    case 2: baseScore = SCORING.DOUBLE; break;
                    case 3: baseScore = SCORING.TRIPLE; break;
                    case 4: 
                        baseScore = SCORING.TETRIS; 
                        difficult = true;
                        break;
                }
            }

            // Back-to-Back
            if (difficult) {
                if (this.isBackToBack) {
                    baseScore *= SCORING.BACK_TO_BACK_MULTIPLIER;
                }
                this.isBackToBack = true;
            } else {
                this.isBackToBack = false;
            }
            
            this.score += baseScore * this.level;
            
            if (this.audio && !isTSpin) this.audio.playSound(linesCleared >= 4 ? 'tetris' : 'clear');
             this.combo++;
             if (this.combo > 0) {
                 this.score += this.combo * SCORING.COMBO_MULTIPLIER * this.level;
             }
        }
        
        this.clearingRows = []; // Cleanup
        this.lastMoveTSpin = false;
        
        // Spawn done by caller? Or here? 
        // Logic flow: Lock -> Check -> (Delay) -> Finalize -> Spawn.
        // So Finalize should Spawn.
        this.spawnPiece();
    }
    
    // Stub for replacement compat
    clearLines() {}

    getGhostY() {
        if (!this.currentPiece) return 0;
        let ghostY = this.currentPiece.y;
        while (!this.checkCollision(0, 1, { ...this.currentPiece, y: ghostY })) {
            ghostY++;
        }
        return ghostY;
    }
}
