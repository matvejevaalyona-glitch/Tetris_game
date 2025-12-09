export class AudioManager {
    constructor() {
        this.bgMusic = document.getElementById('bgMusic');
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.isEnabled = true;
    }

    playMusic() {
        if (!this.isEnabled) return;
        // User interaction required to unlock AudioContext
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        
        this.bgMusic.volume = 0.5;
        this.bgMusic.play().catch(e => console.log("Music play blocked", e));
    }

    pauseMusic() {
        this.bgMusic.pause();
    }

    playSound(type) {
        if (!this.isEnabled) return;
        if (this.context.state === 'suspended') this.context.resume();

        // Synthesize sounds to avoid dependency on missing files
        // Oscillator based SFX
        const osc = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        const now = this.context.currentTime;

        switch (type) {
            case 'move':
                // Short, crisp tick (Square wave)
                osc.type = 'square';
                osc.frequency.setValueAtTime(300, now);
                gainNode.gain.setValueAtTime(0.05, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
                osc.start(now);
                osc.stop(now + 0.03);
                break;
                
            case 'walltouch':
                // Dull low thud (noise or low freq)
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;

            case 'rotate':
                // High blip
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                gainNode.gain.setValueAtTime(0.08, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
                break;
                
            case 'softdrop':
                // Very soft tick
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                gainNode.gain.setValueAtTime(0.03, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
                osc.start(now);
                osc.stop(now + 0.03);
                break;
                
            case 'harddrop':
                // Whoosh-Slam effect
                // 1. Whoosh (noise-like? using high freq slide down)
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;

            case 'land':
                // Light thud when touching ground
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
                
            case 'lock':
                // Mechanical distinct locking sound
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
                
            case 'clear':
                // Nice chime
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.setValueAtTime(1200, now + 0.1);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            
            case 'tetris':
                // Success chord
                this.playTone(800, 0, 0.4);
                this.playTone(1000, 0.1, 0.4);
                this.playTone(1200, 0.2, 0.5);
                break;

            case 'gameover':
                // Descending tone
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 1.0);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
                osc.start(now);
                osc.stop(now + 1.0);
                this.pauseMusic();
                break;
        }
    }

    playTone(freq, delay, duration) {
        const osc = this.context.createOscillator();
        const gainNode = this.context.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.context.destination);
        const now = this.context.currentTime;
        
        osc.frequency.setValueAtTime(freq, now + delay);
        gainNode.gain.setValueAtTime(0.2, now + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
        osc.start(now + delay);
        osc.stop(now + delay + duration);
    }
}
