/**
 * TV Remote Navigation System
 * Supports arrow keys, Enter, Escape, and other TV remote buttons
 */

class TVRemoteController {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = 0;
        this.isEnabled = true;
        this.gridColumns = 3; // Default grid layout
        
        // Key mappings for different remote types
        this.keyMappings = {
            // Standard Arrow keys
            'ArrowUp': 'up',
            'ArrowDown': 'down', 
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            
            // Enter/Select keys
            'Enter': 'select',
            'NumpadEnter': 'select',
            ' ': 'select', // Spacebar
            
            // Back/Exit keys
            'Escape': 'back',
            'Backspace': 'back',
            
            // TV Remote Media Keys
            'MediaPlayPause': 'select',
            'MediaPlay': 'select',
            'MediaPause': 'select',
            'MediaStop': 'back',
            'MediaTrackNext': 'right',
            'MediaTrackPrevious': 'left',
            'MediaFastForward': 'right',
            'MediaRewind': 'left',
            
            // TV Remote specific keys
            'ChannelUp': 'up',
            'ChannelDown': 'down',
            'VolumeUp': 'up',
            'VolumeDown': 'down',
            'VolumeMute': 'select',
            
            // HDMI-CEC Remote codes (as key codes)
            'F1': 'back',      // Often mapped to back/exit
            'F2': 'select',    // Often mapped to OK/select
            'F3': 'menu',      // Menu button
            'F4': 'home',      // Home button
            
            // Additional remote codes that might be sent
            'Home': 'home',
            'Menu': 'menu',
            'Info': 'info',
            'Guide': 'menu',
            'Exit': 'back',
            'Return': 'back',
            'Back': 'back',
            'Select': 'select',
            'OK': 'select',
            
            // Number keys (for direct selection)
            '0': 'number0', '1': 'number1', '2': 'number2', 
            '3': 'number3', '4': 'number4', '5': 'number5',
            '6': 'number6', '7': 'number7', '8': 'number8', '9': 'number9',
            
            // Keypad numbers
            'Numpad0': 'number0', 'Numpad1': 'number1', 'Numpad2': 'number2',
            'Numpad3': 'number3', 'Numpad4': 'number4', 'Numpad5': 'number5',
            'Numpad6': 'number6', 'Numpad7': 'number7', 'Numpad8': 'number8', 'Numpad9': 'number9'
        };
        
        // KeyCode mappings for TV remotes that don't send proper key names
        this.keyCodeMappings = {
            // Common TV remote keyCodes
            13: 'select',    // Enter
            27: 'back',      // Escape
            37: 'left',      // Left arrow
            38: 'up',        // Up arrow  
            39: 'right',     // Right arrow
            40: 'down',      // Down arrow
            32: 'select',    // Space
            8: 'back',       // Backspace
            
            // Function keys often used by TV remotes
            112: 'back',     // F1
            113: 'select',   // F2  
            114: 'menu',     // F3
            115: 'home',     // F4
            
            // Number keys
            48: 'number0', 49: 'number1', 50: 'number2', 51: 'number3', 52: 'number4',
            53: 'number5', 54: 'number6', 55: 'number7', 56: 'number8', 57: 'number9',
            
            // TV remote specific codes (varies by manufacturer)
            // Samsung TV remote
            403: 'select',   // Red button (Enter)
            404: 'back',     // Green button (Back)
            405: 'menu',     // Yellow button (Menu)
            406: 'info',     // Blue button (Info)
            
            // LG TV remote
            461: 'back',     // Back
            13: 'select',    // OK
            
            // Common media keys
            179: 'select',   // Play/Pause
            178: 'back',     // Stop
            176: 'right',    // Next
            177: 'left',     // Previous
        };
        
        this.init();
    }
    
    init() {
        console.log('🎮 TV Remote Controller initialized');
        this.setupEventListeners();
        this.scanFocusableElements();
        this.setInitialFocus();
    }
    
    setupEventListeners() {
        // Primary keydown listener for all key events
        document.addEventListener('keydown', (event) => {
            if (!this.isEnabled) return;
            
            // Log all key events for debugging TV remote
            console.log(`🎮 Key event - key: "${event.key}", code: "${event.code}", keyCode: ${event.keyCode}, which: ${event.which}`);
            
            const action = this.keyMappings[event.key];
            if (action) {
                event.preventDefault();
                event.stopPropagation();
                console.log(`🎮 Remote key: ${event.key} → ${action}`);
                this.handleAction(action);
                return;
            }
            
            // Try alternative mappings by keyCode for TV remotes
            const keyCodeAction = this.getActionByKeyCode(event.keyCode);
            if (keyCodeAction) {
                event.preventDefault();
                event.stopPropagation();
                console.log(`🎮 Remote keyCode: ${event.keyCode} → ${keyCodeAction}`);
                this.handleAction(keyCodeAction);
                return;
            }
            
            // Log unmapped keys for TV remote debugging
            console.log(`🎮 Unmapped key: "${event.key}" (code: ${event.code}, keyCode: ${event.keyCode})`);
        });
        
        // Additional listener for input events (some TV remotes use this)
        document.addEventListener('input', (event) => {
            console.log('🎮 Input event:', event);
        });
        
        // Gamepad API for some TV remotes that appear as gamepads
        this.setupGamepadSupport();
        
        // Handle mouse clicks (still allow mouse for development)
        document.addEventListener('click', (event) => {
            const clickedElement = event.target.closest('[data-focusable]');
            if (clickedElement) {
                const index = this.focusableElements.indexOf(clickedElement);
                if (index !== -1) {
                    this.setFocus(index);
                }
            }
        });
        
        // Re-scan when page changes
        window.addEventListener('load', () => {
            setTimeout(() => this.scanFocusableElements(), 100);
        });
    }
    
    scanFocusableElements() {
        // Find all focusable elements
        this.focusableElements = Array.from(document.querySelectorAll([
            '[data-focusable]',
            '.card[onclick]',
            '.card[href]', 
            'button:not([disabled])',
            'a[href]',
            '.control-btn',
            '.call-btn',
            '.back-btn'
        ].join(',')));
        
        // Add data-focusable attribute if missing
        this.focusableElements.forEach((element, index) => {
            if (!element.hasAttribute('data-focusable')) {
                element.setAttribute('data-focusable', 'true');
            }
            element.setAttribute('data-focus-index', index);
        });
        
        console.log(`🎮 Found ${this.focusableElements.length} focusable elements`);
        
        // Auto-detect grid layout
        this.detectGridLayout();
    }
    
    detectGridLayout() {
        // Try to detect grid layout from CSS
        const container = document.querySelector('.grid, .cards-grid, .users-grid');
        if (container) {
            const computedStyle = window.getComputedStyle(container);
            const gridTemplateColumns = computedStyle.gridTemplateColumns;
            if (gridTemplateColumns && gridTemplateColumns !== 'none') {
                this.gridColumns = gridTemplateColumns.split(' ').length;
            }
        }
        console.log(`🎮 Grid layout: ${this.gridColumns} columns`);
    }
    
    setInitialFocus() {
        if (this.focusableElements.length > 0) {
            this.setFocus(0);
        }
    }
    
    setFocus(index) {
        // Remove focus from all elements
        this.focusableElements.forEach(el => {
            el.classList.remove('tv-focused');
            el.setAttribute('tabindex', '-1');
        });
        
        // Set focus to target element
        if (index >= 0 && index < this.focusableElements.length) {
            this.currentFocusIndex = index;
            const element = this.focusableElements[index];
            
            element.classList.add('tv-focused');
            element.setAttribute('tabindex', '0');
            element.focus();
            
            // Scroll into view if needed
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
            });
            
            console.log(`🎮 Focus set to element ${index}:`, element);
        }
    }
    
    handleAction(action) {
        switch (action) {
            case 'up':
                this.navigateUp();
                break;
            case 'down':
                this.navigateDown();
                break;
            case 'left':
                this.navigateLeft();
                break;
            case 'right':
                this.navigateRight();
                break;
            case 'select':
                this.activateElement();
                break;
            case 'back':
                this.goBack();
                break;
            case 'number1':
            case 'number2':
            case 'number3':
            case 'number4':
            case 'number5':
            case 'number6':
                this.selectByNumber(parseInt(action.slice(-1)));
                break;
        }
    }
    
    navigateUp() {
        const newIndex = this.currentFocusIndex - this.gridColumns;
        if (newIndex >= 0) {
            this.setFocus(newIndex);
        } else {
            // Wrap to bottom
            const bottomRowStart = Math.floor((this.focusableElements.length - 1) / this.gridColumns) * this.gridColumns;
            const column = this.currentFocusIndex % this.gridColumns;
            const targetIndex = Math.min(bottomRowStart + column, this.focusableElements.length - 1);
            this.setFocus(targetIndex);
        }
    }
    
    navigateDown() {
        const newIndex = this.currentFocusIndex + this.gridColumns;
        if (newIndex < this.focusableElements.length) {
            this.setFocus(newIndex);
        } else {
            // Wrap to top
            const column = this.currentFocusIndex % this.gridColumns;
            this.setFocus(column);
        }
    }
    
    navigateLeft() {
        if (this.currentFocusIndex > 0) {
            this.setFocus(this.currentFocusIndex - 1);
        } else {
            // Wrap to end
            this.setFocus(this.focusableElements.length - 1);
        }
    }
    
    navigateRight() {
        if (this.currentFocusIndex < this.focusableElements.length - 1) {
            this.setFocus(this.currentFocusIndex + 1);
        } else {
            // Wrap to beginning
            this.setFocus(0);
        }
    }
    
    activateElement() {
        const element = this.focusableElements[this.currentFocusIndex];
        if (!element) return;
        
        console.log('🎮 Activating element:', element);
        console.log('🎮 Element type:', element.tagName, 'class:', element.className);
        
        // Add visual feedback
        element.classList.add('tv-focused', 'pulse');
        setTimeout(() => element.classList.remove('pulse'), 600);
        
        // Try different activation methods in order of preference
        if (element.tagName === 'INPUT') {
            // Input field - trigger mobile app text input
            console.log('🎮 Activating input field for mobile text input');
            const fieldName = element.getAttribute('data-field') || element.name || element.id || 'general';
            const currentValue = element.value || element.placeholder || '';
            
            // Request text input through electronAPI
            if (window.electronAPI && window.electronAPI.requestTextInput) {
                console.log('🎮 Requesting text input via electronAPI for field:', fieldName);
                window.electronAPI.requestTextInput(fieldName, currentValue);
            } else {
                console.log('🎮 electronAPI not available, focusing input element');
                element.focus();
            }
        } else if (element.tagName === 'BUTTON') {
            // Direct button click
            console.log('🎮 Clicking button');
            element.click();
        } else if (element.onclick) {
            // Element has onclick handler
            console.log('🎮 Calling onclick handler');
            element.onclick();
        } else if (element.href) {
            // Link navigation
            console.log('🎮 Navigating to:', element.href);
            window.location.href = element.href;
        } else if (element.getAttribute('data-app')) {
            // Homepage tiles with data-app attribute
            const app = element.getAttribute('data-app');
            console.log('🎮 Launching app:', app);
            window.location.href = `${app}.html`;
        } else {
            // Fallback: dispatch click event
            console.log('🎮 Dispatching click event');
            element.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        }
    }
    
    goBack() {
        console.log('🎮 Back button pressed');
        
        // Look for back button first
        const backBtn = document.querySelector('.back-btn, [data-action="back"]');
        if (backBtn) {
            backBtn.click();
            return;
        }
        
        // Try browser back
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // Go to homepage
            window.location.href = 'homepage.html';
        }
    }
    
    selectByNumber(number) {
        const targetIndex = number - 1;
        if (targetIndex >= 0 && targetIndex < this.focusableElements.length) {
            this.setFocus(targetIndex);
            // Auto-activate after short delay
            setTimeout(() => this.activateElement(), 300);
        }
    }
    
    // Public methods for page-specific control
    enable() {
        this.isEnabled = true;
        console.log('🎮 TV Remote enabled');
    }
    
    disable() {
        this.isEnabled = false;
        console.log('🎮 TV Remote disabled');
    }
    
    refresh() {
        console.log('🎮 Refreshing TV Remote');
        this.scanFocusableElements();
        this.setInitialFocus();
    }
    
    setGridColumns(columns) {
        this.gridColumns = columns;
        console.log(`🎮 Grid columns set to: ${columns}`);
    }
    
    getActionByKeyCode(keyCode) {
        return this.keyCodeMappings[keyCode];
    }
    
    setupGamepadSupport() {
        // Some TV remotes appear as gamepads
        window.addEventListener('gamepadconnected', (event) => {
            console.log('🎮 Gamepad connected:', event.gamepad);
            this.pollGamepad();
        });
        
        this.gamepadInterval = null;
    }
    
    pollGamepad() {
        if (this.gamepadInterval) return;
        
        this.gamepadInterval = setInterval(() => {
            const gamepads = navigator.getGamepads();
            for (let gamepad of gamepads) {
                if (gamepad) {
                    this.handleGamepadInput(gamepad);
                }
            }
        }, 100);
    }
    
    handleGamepadInput(gamepad) {
        // Map gamepad buttons to actions
        if (gamepad.buttons[0].pressed) { // A button
            this.handleAction('select');
        }
        if (gamepad.buttons[1].pressed) { // B button  
            this.handleAction('back');
        }
        
        // D-pad or analog stick
        if (gamepad.axes[0] < -0.5) this.handleAction('left');
        if (gamepad.axes[0] > 0.5) this.handleAction('right');
        if (gamepad.axes[1] < -0.5) this.handleAction('up');
        if (gamepad.axes[1] > 0.5) this.handleAction('down');
    }
}

// Global instance
window.tvRemote = new TVRemoteController();

// Auto-refresh when page content changes
const observer = new MutationObserver(() => {
    if (window.tvRemote) {
        clearTimeout(window.tvRemote.refreshTimeout);
        window.tvRemote.refreshTimeout = setTimeout(() => {
            window.tvRemote.scanFocusableElements();
        }, 500);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});