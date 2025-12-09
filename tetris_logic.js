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
        this.lock();
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
            
            // Level calculation
            const fixedGoal = 10;
            // Variable goal: 5 * level (cumulative lines needed to pass level L is sum(5*i)... handled simply by current total lines?) 
            // Previous logic: if lines >= level * 5. This implies:
            // Lvl 1->2: 5 lines total.
            // Lvl 2->3: 10 lines total. (Gap 5)
            // Lvl 3->4: 15 lines total. (Gap 5)
            // Wait, "Variable goal is 5 times the level number" usually means the *gap* increases.
            // Tetris Worlds: Lvl 1 needs 5, Lvl 2 needs 10, etc.
            // My previous code: this.lines >= this.level * 5. This makes gaps constant 5.
            // e.g. Level=1. Lines=5 >= 5 -> Level=2.
            // Level=2. Lines=10 >= 10 -> Level=3.
            // Gap is always 5.
            // If the Requirement meant "Goal for next level is 5*Level", then Lvl 1 goal 5 (Total 5). Lvl 2 goal 10 (Total 15).
            // Let's stick to the simpler interpretation unless specified: Constant gap of 5 vs Fixed Gap of 10.
            // Or implement strict "Variable Goal" where gap = level * 5.
            // "Variable goal is 5 times the level number."
            // Let's assume this means the required lines to clear the CURRENT level is 5 * CurrentLevel.
            
            // To support switching, I'll add a simple toggle in the code or default to Fixed if standard is requested?
            // "Implement ... supporting both"
            // I will use a flag logic.variableGoal = true/false.
            // Default to Variable as it was there.
            
            const isVariableMode = true; // Could be passed in constructor
            
            let linesNeeded;
            if (isVariableMode) {
                 // Example: Level 1 needs 5 lines. Total 5.
                 // Level 2 needs 10 lines. Total 15.
                 // Level 3 needs 15 lines. Total 30.
                 // This matches "Variable goal is 5 * level" (gap increases).
                 // Implementation:
                 // basic formula for total lines to reach level L+1:
                 // Sum(5 * i) for i=1 to L. = 5 * L * (L+1) / 2.
                 // Check if total lines >= Sum for current level.
                 
                 // However, my previous code was: lines >= level * 5.
                 // This meant gaps were constant.
                 // Let's do the "Increasing Gap" style if "Variable" is requested properly.
                 // But for safety/simplicity to match previous behavior if user liked it:
                 // Let's implement Configurable Fixed vs Variable.
                 
                 // Let's compute 'linesForNextLevel'.
                 // Variable: (this.level * 5) lines in this level.
                 
                 // Use a stored property or calculate from total?
                 // Let's track 'linesInCurrentLevel'.
            }

            // Simplest implementation of "Both":
            // Fixed: 10 lines per level.
            // Variable: 5 * Level lines per level.
            
            // I'll stick to a simple strategy update for now without complicated state refactor:
            
            // Mode 1: Fixed
            // if (this.lines >= this.level * 10) -> NO, this.lines is total.
            // (this.lines - (this.level - 1) * 10) >= 10
            
            // Mode 2: Variable (Gap 5)
            // (this.lines - (this.level-1)*5) >= 5
            
            // Mode 3: Variable Increasing (Gap = Level * 5)
            // Implementation:
            // Let's go with Fixed 10 vs Fixed 5 for now from code context, 
            // or interpret "Variable goal is 5 times the level number" literally as GAP = 5*L.
            
            // I will implement "Gap = 5*Level" for variable, and "Gap = 10" for fixed.
            // And use a flag.
            
            // NOTE: Since I can't change constructor signature easily without breaking main.js which instantiates it,
            // I'll default to Variable (since requirement emphasizes it) but add code to easy swap to Fixed.
            
            const FIXED_GOAL = 10;
            const USE_FIXED = false; // Toggle here.
            
            let goal;
            if (USE_FIXED) {
                goal = this.level * FIXED_GOAL;
            } else {
                // Variable: Sum of 5*i
                // L=1 -> 5. L=2 -> 5+10=15. L=3 -> 15+15=30.
                goal = (5 * this.level * (this.level + 1)) / 2;
            }
            
            if (this.lines >= goal) {
                this.level++;
                if (this.audio) this.audio.playSound('levelup');
            }
            
            // T-Spin Detection
            let isTSpin = false;
            if (this.currentPiece.type === 'T') {
                // 3-corner rule
                // Corners of the T-piece 3x3 box: (0,0), (0,2), (2,2), (2,0)
                // If >= 3 corners are filled (board or OOB), it's a T-Spin.
                // Center is (1,1) in local coords.
                const corners = [[0,0], [0,2], [2,2], [2,0]];
                let occupied = 0;
                for (const [cy, cx] of corners) {
                    const worldX = this.currentPiece.x + cx;
                    const worldY = this.currentPiece.y + cy;
                    if (worldX < 0 || worldX >= COLS || worldY >= ROWS || (worldY >= 0 && this.board[worldY][worldX])) {
                        occupied++;
                    }
                }
                // Also requires last action to be a rotation
                if (occupied >= 3 && this.lastAction === 'rotate') {
                    isTSpin = true;
                }
            }

            // Scoring
            let baseScore = 0;
            let difficult = false;

            if (isTSpin) {
                difficult = true;
                switch(linesCleared) {
                    case 0: baseScore = SCORING.TSPIN; break; // T-Spin No Line
                    case 1: baseScore = SCORING.TSPIN_SINGLE; break;
                    case 2: baseScore = SCORING.TSPIN_DOUBLE; break;
                    case 3: baseScore = SCORING.TSPIN_TRIPLE; break;
                }
                if (this.audio) this.audio.playSound('tetris'); // T-spin sound (same as efficient clear?) or separate
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
                    // B2B Sound effect?
                }
                this.isBackToBack = true;
            } else if (linesCleared > 0) {
                // Clearing lines without difficulty breaks B2B
                this.isBackToBack = false;
            }
            // Note: T-Spin No Line does NOT break B2B in some guidelines, breaks in others.
            // Standard Guideline: Only line clears affect B2B status. 
            // If T-Spin No Line, B2B status is unchanged?
            // Actually usually only "Difficult Line Clears" trigger B2B. A non-difficult clear breaks it.
            // A non-clear (Lock without clear) does not break it.
            
            this.score += baseScore * this.level;
            
            if (linesCleared > 0) {
                 if (this.audio && !isTSpin) this.audio.playSound(linesCleared >= 4 ? 'tetris' : 'clear');
                 this.combo++;
                 if (this.combo > 0) {
                     this.score += this.combo * SCORING.COMBO_MULTIPLIER * this.level;
                 }
            } else {
                 if (isTSpin && this.audio) this.audio.playSound('rotate'); // Special sound for T-spin 0 lines?
                 // No line cleared, combo reset?
                 // Usually combo resets on lock without clear.
                 this.combo = -1;
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
