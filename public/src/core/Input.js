export class Input {
    constructor() {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        this.interact = false;
        this.rightClick = false;

        this.velocity = { x: 0, y: 0, z: 0 }; // We'll manage velocity vector in Player or here? 
        // In the original code, velocity is updated by input. 
        // Let's keep state here and let Player read it.

        this._initListeners();
    }

    _initListeners() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));

        // Mouse Handlers
        document.addEventListener('mousedown', (e) => {
            if (e.button === 2) this.rightClick = true;
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) this.rightClick = false;
        });
        document.addEventListener('contextmenu', (e) => e.preventDefault()); // Block context menu
    }

    _onKeyDown(e) {
        switch (e.code) {
            case 'KeyW': this.moveForward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'Space':
                this.canJump = true;
                break;
            case 'KeyF':
                this.interact = true;
                break;
        }
    }

    _onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyD': this.moveRight = false; break;
            case 'KeyF': this.interact = false; break;
        }
    }
}
