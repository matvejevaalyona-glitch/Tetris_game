import { COLS, ROWS, SHAPES, SPAWN_OFFSETS, KICKS_JLSTZ, KICKS_I, SCORING, VISIBLE_ROWS } from './constants.js';

export class TetrisLogic {
    constructor(audioManager) {
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
                // this.audio.playSound('move'); // Maybe too noisy to play on every gravity tick?
            } else if (dx !== 0 && this.audio) {
                this.audio.playSound('move');
            }
            
            if (dy > 0) {
                 // Reset lock timer on vertical movement if touching ground?
                 // SRS lock delay reset rules are complex (15 moves constraint).
                 // Implementation simplified: Reset on successful move if touching ground previously?
                 // Standard: Move resets lock delay if it changes "lowest reached row" or similar.
            }
            return true;
        }
        return false; // Collision
    }

    rotate(direction) { // 1 for CW, -1 for CCW
        if (this.gameOver) return;
        
        const piece = this.currentPiece;
        const oldRotation = piece.rotation;
        const newRotation = (oldRotation + direction + 4) % 4; // 0->1->2->3->0
        
        // Rotate shape coordinates
        const newShape = piece.shape.map(([r, c]) => {
            // Center of rotation logic? For I and O it's specific.
            // SHAPES definitions are 0-based, SRS usually rotates around a pivot.
            // Simplified matrix rotation for standard bounding box:
            // (x,y) -> (-y, x) for CW
            if (direction === 1) return [c, -r + (piece.type === 'I' ? 3 : 2)]; // Pivot adjustment needed?
            // Actually simpler: standard 2D array rotation.
            // The SHAPES constants are 0-indexed.
            // Let's use standard SRS matrix transforms.
            // 3x3 for J,L,S,T,Z. 4x4 for I. 2x2 for O (doesn't rotate effectively or stays same)
        });

        // Better approach: Generic rotation relative to bounding box
        // J,L,S,T,Z are inside 3x3. Center is (1,1).
        // I is inside 4x4. Center is (1.5, 1.5).
        // O is 2x2.
        
        if (piece.type === 'O') return; // O doesn't rotate
        
        let size = piece.type === 'I' ? 4 : 3;
        const rotatedShape = [];
        
        for (const [r, c] of piece.shape) {
            let nr, nc;
            if (direction === 1) { // CW: (x, y) -> (y, size-1-x) => (c, r) -> (r, size-1-c) ?
                // 3x3: (0,0)->(0,2), (0,1)->(1,2), (0,2)->(2,2)
                // Matrix rotation 90 deg CW: x' = -y, y' = x
                // In array indices (r, c):
                // new_c = size - 1 - r
                // new_r = c
                nr = c;
                nc = size - 1 - r;
            } else { // CCW
                // new_c = r
                // new_r = size - 1 - c
                nr = size - 1 - c;
                nc = r;
            }
            rotatedShape.push([nr, nc]);
        }
        
        // Wall Kicks
        const kickTable = piece.type === 'I' ? KICKS_I : KICKS_JLSTZ;
        const key = `${oldRotation}-${newRotation}`;
        const kicks = kickTable[key] || [[0,0]];
        
        for (const [kx, ky] of kicks) {
             // In kick table: +x is right, +y is Up (usually).
             // But my board y is down.
             // SRS Guideline: +y is Up. So I need to subtract ky.
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
                 return;
             }
        }
        // Rotation failed
    }

    resetLockTimer() {
        if (this.lockTimer) clearTimeout(this.lockTimer);
        // Only start lock timer if touching ground
        if (this.checkCollision(0, 1)) {
            // this.lockTimer = setTimeout(() => this.lock(), this.lockDelay);
            // Actually, usually handled in update loop.
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
        this.lock();
        if (this.audio) this.audio.playSound('land'); // Hard drop implies landing
    }

    softDrop() {
        if (this.gameOver) return;
        if (!this.checkCollision(0, 1)) {
             this.currentPiece.y++;
             this.score += SCORING.SOFT_DROP;
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
        
        // Check for line clears
        this.clearLines();
        
        // Check for Lock Out (if locked completely above visible area)
        // Visible area starts at index ROWS - VISIBLE_ROWS = 20.
        // If all blocks are < 20, game over.
        const isLockOut = this.currentPiece.shape.every(([r, c]) => (this.currentPiece.y + r) < (ROWS - VISIBLE_ROWS));
        
        if (isLockOut) {
            this.gameOver = true;
            if (this.audio) this.audio.playSound('gameover');
            return;
        }

        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== 0)) {
                this.board.splice(r, 1);
                this.board.unshift(new Array(COLS).fill(0));
                linesCleared++;
                r++; // Check same index again since lines shifted down
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            
            // Level calculation: Variable goal 5 * level
            // Or fixed? Req says: "Required lines depends on the game... Variable goal is 5 times the level number."
            // Let's implement variable goal.
            if (this.lines >= this.level * 5) {
                this.level++;
                if (this.audio) this.audio.playSound('levelup'); // Or simply no sound
            }
            
            // Scoring
            let baseScore = 0;
            switch(linesCleared) {
                case 1: baseScore = SCORING.SINGLE; break;
                case 2: baseScore = SCORING.DOUBLE; break;
                case 3: baseScore = SCORING.TRIPLE; break;
                case 4: baseScore = SCORING.TETRIS; break;
            }
            
            this.score += baseScore * this.level;
            
            if (this.audio) this.audio.playSound(linesCleared >= 4 ? 'tetris' : 'clear');
            
            this.combo++;
            if (this.combo > 0) {
                 this.score += this.combo * SCORING.COMBO_MULTIPLIER * this.level;
            }
        } else {
            this.combo = -1;
        }
    }
    
    getGhostY() {
        if (!this.currentPiece) return 0;
        let ghostY = this.currentPiece.y;
        while (!this.checkCollision(0, 1, { ...this.currentPiece, y: ghostY })) {
            ghostY++;
        }
        return ghostY;
    }
}
