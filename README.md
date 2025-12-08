My Tetris

A simple implementation of the classic puzzle game Tetris, built entirely in JavaScript, HTML, and CSS without any external libraries.
This project follows the general Tetris Guideline rules and demonstrates basic game architecture, rendering, event handling, and real-time gameplay.

🎮 Overview

Tetris is a falling-block puzzle game where the player rotates and moves Tetriminos (shapes made of four squares) to create complete horizontal lines.
When a full line is made, it disappears, and the player earns points.
If the stack of blocks reaches the top, the game ends.

This version includes:

A 10 × 40 playfield (top rows hidden)

Standard 7-bag piece randomizer

Ghost piece

Hold piece

Standard keyboard controls

Sound effects

Lock delay

Leveling and scoring

Next-piece preview

Pause and resume

Basic T-Spin recognition

📁 Project Structure
index.html          → main HTML file containing the canvas and JS imports
style.css           → all visual styling
controller.js       → handles keyboard input
renderer.js         → draws the playfield, pieces, ghost, UI, etc.
tetris_logic.js     → main game logic (collisions, rotation, gravity, line clears…)
my_tetris.js        → general initialization and game startup


File names may vary depending on your exact implementation; the important part is keeping logic separate from rendering and input.

🛠️ Technical Details
Game Board

Logical grid size: 10 columns × 40 rows

Only the bottom 20 rows are visible during gameplay

Pieces spawn above the visible area, as in official Tetris Guideline behavior

Tetrimino Colors

I — Cyan

O — Yellow

T — Purple

S — Green

Z — Red

J — Blue

L — Orange

Controls (Keyboard)
Key	Action
←	Move left
→	Move right
↓	Soft drop
Space	Hard drop
X / ↑	Rotate clockwise
Z / Ctrl	Rotate counterclockwise
Shift / C	Hold piece
Esc / F1	Pause
Additional Features

Ghost piece showing where the tetrimino will land

Hold system

Random 7-bag generator

Sound effects for rotation, movement, lock, line clear, and game over

Lock delay: 0.5 seconds

Next queue: Up to 6 pieces

T-Spin detection (simple corner-based system)

Scoring and leveling following the guideline system

Start countdown (3…2…1…Go!)

Required copyright notice displayed at game start

▶️ How to Run the Project

You can open index.html directly in a browser or run it using a small Node.js server.

Option 1: Open Directly

Simply open:

index.html


in any modern browser.

Option 2: Use the Provided HTML Server Script

Create html_server.js:

function start_html_server() {
    const http = require('http');
    const fs = require('fs');

    const hostname = '0.0.0.0';
    const port = 8080;

    const server = http.createServer(function(request, response) {
        response.writeHeader(200, {"Content-Type": "text/html"});
        html = fs.readFileSync('./index.html', 'utf8');
        response.write(html);
        response.end();
    }).listen(port, hostname, () => {
        console.log("Server running at http://web-XXXXXXXXX.docode.YYYY.qwasar.io");
        console.log("Replace XXXXXXXXX by your current workspace ID");
        console.log("(look at the URL of this page and XXXXXXXXX.docode.YYYY.qwasar.io, XXXXXXXXX is your workspace ID and YYYY is your zone)");
    });
}

start_html_server();


Add a temporary HTML file if needed:

echo "Hello world" > index.html


Run the server:

node html_server.js


Visit the displayed URL.

✔️ Goal of This Project

This project demonstrates your ability to:

Structure a real-time game in modular JavaScript

Use events to handle controls

Separate logic, rendering, and input

Animate game objects using requestAnimationFrame

Manage timing, state, and UI updates

Recreate an established game system from scratch