export const COLS = 10;
export const ROWS = 40; // Total rows (20 hidden)
export const VISIBLE_ROWS = 20;
export const BLOCK_SIZE = 30;

export const KEYS = {
    // Standard computer keyboard mappings
    ROTATE_CW: ['ArrowUp', 'x', 'X', 'NumPad1', 'NumPad5', 'NumPad9'],
    ROTATE_CCW: ['Control', 'z', 'Z', 'NumPad3', 'NumPad7'],
    SOFT_DROP: ['ArrowDown', 'NumPad2'],
    HARD_DROP: ['Space', 'NumPad8'],
    LEFT: ['ArrowLeft', 'NumPad4'],
    RIGHT: ['ArrowRight', 'NumPad6'],
    HOLD: ['Shift', 'c', 'C', 'NumPad0'],
    PAUSE: ['Escape', 'F1'],
    START: ['Enter']
};

export const COLORS = {
    I: '#00F0F0', // Cyan
    O: '#F0F000', // Yellow
    T: '#A000F0', // Purple
    S: '#00F000', // Green
    Z: '#F00000', // Red
    J: '#0000F0', // Blue
    L: '#F0A000', // Orange
    GHOST: 'rgba(255, 255, 255, 0.3)' // Ghost piece color
};

export const SHAPES = {
    I: [[1, 0], [1, 1], [1, 2], [1, 3]],
    O: [[0, 0], [0, 1], [1, 0], [1, 1]],
    T: [[0, 1], [1, 0], [1, 1], [1, 2]],
    S: [[0, 1], [0, 2], [1, 0], [1, 1]],
    Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
    J: [[0, 0], [1, 0], [1, 1], [1, 2]],
    L: [[0, 2], [1, 0], [1, 1], [1, 2]],
};

// Offsets for spawn positions (approximate centering)
export const SPAWN_OFFSETS = {
    I: {x: 3, y: 19}, // Spawns at 20th/21st row (index 19/20) - hidden area
    O: {x: 4, y: 18},
    T: {x: 3, y: 18},
    S: {x: 3, y: 18},
    Z: {x: 3, y: 18},
    J: {x: 3, y: 18},
    L: {x: 3, y: 18},
};

// SRS Wall Kicks
// [x, y] - +x is right, +y is down (but typically kicks are Up, so -y)
// JLSTZ Wall Kicks
export const KICKS_JLSTZ = {
    '0-1': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]], // 0->R
    '1-0': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],   // R->0
    '1-2': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],   // R->2
    '2-1': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]], // 2->R
    '2-3': [[0,0], [1,0], [1,-1], [0,2], [1,2]],    // 2->L
    '3-2': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],// L->2
    '3-0': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],// L->0
    '0-3': [[0,0], [1,0], [1,-1], [0,2], [1,2]]     // 0->L
};

// I Wall Kicks
export const KICKS_I = {
    '0-1': [[0,0], [-2,0], [1,0], [-2,1], [1,-2]],
    '1-0': [[0,0], [2,0], [-1,0], [2,-1], [-1,2]],
    '1-2': [[0,0], [-1,0], [2,0], [-1,-2], [2,1]],
    '2-1': [[0,0], [1,0], [-2,0], [1,2], [-2,-1]],
    '2-3': [[0,0], [2,0], [-1,0], [2,-1], [-1,2]],
    '3-2': [[0,0], [-2,0], [1,0], [-2,1], [1,-2]],
    '3-0': [[0,0], [1,0], [-2,0], [1,2], [-2,-1]],
    '0-3': [[0,0], [-1,0], [2,0], [-1,-2], [2,1]]
};

export const SCORING = {
    SINGLE: 100,
    DOUBLE: 300,
    TRIPLE: 500,
    TETRIS: 800,
    SOFT_DROP: 1, // per cell
    HARD_DROP: 2, // per cell
    TSPIN: 400,
    TSPIN_SINGLE: 800,
    TSPIN_DOUBLE: 1200,
    TSPIN_TRIPLE: 1600,
    BACK_TO_BACK_MULTIPLIER: 1.5,
    COMBO_MULTIPLIER: 50
};
