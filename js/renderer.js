import { BLOCK_SIZE, COLS, ROWS, VISIBLE_ROWS, COLORS, SHAPES } from './constants.js';

export class Renderer {
    constructor(gameCanvas, nextCanvas, holdCanvas) {
        this.ctx = gameCanvas.getContext('2d');
        this.nextCtx = nextCanvas.getContext('2d');
        this.holdCtx = holdCanvas.getContext('2d');
        
        this.width = gameCanvas.width;
        this.height = gameCanvas.height;
        
        // Ensure accurate scaling if needed, but assuming 300x600 for 10x20 blocks of 30px
    }

    render(gameState) {
        this.clear();
        this.drawBoard(gameState.board);
        this.drawGhost(gameState);
        this.drawPiece(gameState.currentPiece);
        this.drawNext(gameState.nextPieces);
        this.drawHold(gameState.holdPiece);
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Grid
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        for (let r = 0; r < VISIBLE_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                this.ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }

    drawBoard(board) {
        // Board is ROWS high (40), we only draw the last VISIBLE_ROWS (20)
        // So index 20 in board corresponds to y=0 in canvas
        const offsetRow = ROWS - VISIBLE_ROWS;
        
        for (let r = offsetRow; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = board[r][c];
                if (cell) {
                    this.drawBlock(this.ctx, c, r - offsetRow, cell);
                }
            }
        }
    }

    drawPiece(piece) {
        if (!piece) return;
        
        const offsetRow = ROWS - VISIBLE_ROWS;
        const color = COLORS[piece.type];
        
        for (const [r, c] of piece.shape) {
            const y = piece.y + r - offsetRow;
            const x = piece.x + c;
            
            if (y >= 0) { // Only draw if visible
                this.drawBlock(this.ctx, x, y, color);
            }
        }
    }
    
    drawGhost(gameState) {
        const piece = gameState.currentPiece;
        if (!piece) return;
        
        const ghostY = gameState.getGhostY();
        const offsetRow = ROWS - VISIBLE_ROWS;
        const color = COLORS.GHOST;
        
        this.ctx.globalAlpha = 0.3;
        for (const [r, c] of piece.shape) {
            const y = ghostY + r - offsetRow;
            const x = piece.x + c;
            
            if (y >= 0) {
                 this.drawBlock(this.ctx, x, y, COLORS[piece.type], true);
            }
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawBlock(ctx, x, y, color, isGhost = false) {
        ctx.fillStyle = color;
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        
        if (!isGhost) {
            // Bevel effect / Border
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, 4);
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, 4, BLOCK_SIZE);
        }
    }

    drawNext(nextPieces) {
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCtx.canvas.width, this.nextCtx.canvas.height);
        
        // Draw top 1 next piece primarily, maybe others smaller?
        // Req: "Must have 1 to 6 next pieces."
        // Let's draw first 3 vertically
        
        let yOffset = 10;
        const scale = 0.8;
         
        nextPieces.slice(0, 3).forEach((type, idx) => {
             const shape = SHAPES[type];
             const color = COLORS[type];
             
             this.nextCtx.save();
             this.nextCtx.scale(scale, scale);
             // Centering logic
             const offsetX = (this.nextCtx.canvas.width / scale - shape[0].length * BLOCK_SIZE) / 2 + 15;
             
             shape.forEach(([r, c]) => {
                 this.nextCtx.fillStyle = color;
                 this.nextCtx.fillRect(offsetX + c * BLOCK_SIZE, yOffset + r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                 this.nextCtx.strokeStyle = '#000';
                 this.nextCtx.strokeRect(offsetX + c * BLOCK_SIZE, yOffset + r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
             });
             this.nextCtx.restore();
             yOffset += 80;
        });
    }

    drawHold(holdPiece) {
        this.holdCtx.fillStyle = '#000';
        this.holdCtx.fillRect(0, 0, this.holdCtx.canvas.width, this.holdCtx.canvas.height);
        
        if (holdPiece) {
            const shape = SHAPES[holdPiece];
            const color = COLORS[holdPiece];
            const scale = 0.8;
            
            this.holdCtx.save();
            this.holdCtx.scale(scale, scale);
            const offsetX = (this.holdCtx.canvas.width / scale - 3 * BLOCK_SIZE) / 2 + 20;
            const offsetY = 20;
            
            shape.forEach(([r, c]) => {
                 this.holdCtx.fillStyle = color;
                 this.holdCtx.fillRect(offsetX + c * BLOCK_SIZE, offsetY + r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            });
            this.holdCtx.restore();
        }
    }
}
