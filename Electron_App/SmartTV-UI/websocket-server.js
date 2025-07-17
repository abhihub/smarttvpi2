const WebSocket = require('ws');
const { BrowserWindow } = require('electron');

class WebSocketServer {
    constructor(port = 8080) {
        this.port = port;
        this.wss = null;
        this.currentWindow = null;
        this.appState = {
            currentApp: 'homepage',
            videoCallState: 'disconnected',
            callData: {
                userName: 'Family Member',
                roomName: 'family-room',
                callTimer: '00:00',
                participantCount: 1,
                isMuted: false,
                isVideoOn: true
            }
        };
    }

    start() {
        this.wss = new WebSocket.Server({ port: this.port });
        
        console.log(`🌐 WebSocket server started on port ${this.port}`);
        
        this.wss.on('connection', (ws, req) => {
            console.log('📱 Mobile app connected from:', req.connection.remoteAddress);
            
            // Store the WebSocket connection for global access
            this.mobileWebSocket = ws;
            
            // Make WebSocket available to renderer process
            if (this.currentWindow) {
                this.currentWindow.webContents.executeJavaScript(`
                    window.mobileAppWebSocket = {
                        send: (message) => {
                            console.log('Sending to mobile app:', message);
                        }
                    };
                    
                    // Set up global text input request handler
                    window.requestTextInput = (field, currentValue) => {
                        console.log('📱 Text input request from renderer:', field, currentValue);
                        // This will be handled by the main process
                    };
                `);
            }
            
            // Send connection confirmation
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Connected to SmartTV',
                appState: this.appState
            }));
            
            // Handle incoming messages
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    console.log('📨 Received from mobile app:', data);
                    this.handleMobileCommand(data, ws);
                } catch (error) {
                    console.error('❌ Error parsing mobile message:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('📱 Mobile app disconnected');
                this.mobileWebSocket = null;
            });
            
            ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
            });
        });
    }

    handleMobileCommand(data, ws) {
        const { type, action, direction, app, field, value } = data;
        
        switch (type) {
            case 'navigate':
                this.handleNavigation(direction);
                break;
                
            case 'select':
                this.handleSelect();
                break;
                
            case 'back':
                this.handleBack();
                break;
                
            case 'launch':
                this.handleAppLaunch(app);
                break;
                
            case 'input':
                this.handleTextInput(field, value);
                break;
                
            case 'requestTextInput':
                this.handleTextInputRequest(field, value, ws);
                break;
                
            case 'videoCall':
                this.handleVideoCallAction(action, ws);
                break;
                
            default:
                console.log('🤷 Unknown command type:', type);
        }
    }

    handleNavigation(direction) {
        console.log(`🎮 Navigation: ${direction}`);
        if (this.currentWindow) {
            this.currentWindow.webContents.executeJavaScript(`
                console.log('🎮 WebSocket navigation command:', '${direction}');
                
                // First try to use the TV remote controller
                if (window.tvRemote && window.tvRemote.handleAction) {
                    console.log('🎮 Using TV remote controller for navigation');
                    window.tvRemote.handleAction('${direction}');
                } else {
                    console.log('🎮 TV remote controller not available, using keyboard events');
                    // Simulate key press for navigation
                    const keyMap = {
                        'up': 'ArrowUp',
                        'down': 'ArrowDown', 
                        'left': 'ArrowLeft',
                        'right': 'ArrowRight'
                    };
                    
                    const key = keyMap['${direction}'];
                    if (key) {
                        const event = new KeyboardEvent('keydown', {
                            key: key,
                            code: key,
                            bubbles: true,
                            cancelable: true
                        });
                        document.dispatchEvent(event);
                        console.log('🎮 Dispatched keyboard event:', key);
                    }
                }
            `);
        }
    }

    handleSelect() {
        console.log('🎮 Select pressed');
        if (this.currentWindow) {
            this.currentWindow.webContents.executeJavaScript(`
                console.log('🎮 WebSocket select command');
                
                // First try to use the TV remote controller
                if (window.tvRemote && window.tvRemote.handleAction) {
                    console.log('🎮 Using TV remote controller for select');
                    window.tvRemote.handleAction('select');
                } else {
                    console.log('🎮 TV remote controller not available, using direct click');
                    // Try multiple methods to find and click the focused element
                    let clicked = false;
                    
                    // Method 1: TV focused element
                    const tvFocused = document.querySelector('.tv-focused');
                    if (tvFocused) {
                        console.log('🎮 Clicking TV focused element:', tvFocused);
                        tvFocused.click();
                        clicked = true;
                    }
                    
                    // Method 2: Active element
                    if (!clicked) {
                        const focused = document.activeElement;
                        if (focused && focused !== document.body) {
                            console.log('🎮 Clicking active element:', focused);
                            focused.click();
                            clicked = true;
                        }
                    }
                    
                    // Method 3: Any focusable element with tabindex=0
                    if (!clicked) {
                        const focusable = document.querySelector('[tabindex="0"]');
                        if (focusable) {
                            console.log('🎮 Clicking focusable element:', focusable);
                            focusable.click();
                            clicked = true;
                        }
                    }
                    
                    // Method 4: Simulate Enter key
                    if (!clicked) {
                        console.log('🎮 Simulating Enter key press');
                        const event = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            bubbles: true,
                            cancelable: true
                        });
                        document.dispatchEvent(event);
                    }
                }
            `);
        }
    }

    handleBack() {
        console.log('🎮 Back pressed');
        if (this.currentWindow) {
            this.currentWindow.webContents.executeJavaScript(`
                if (window.tvRemote && window.tvRemote.handleAction) {
                    window.tvRemote.handleAction('back');
                } else {
                    history.back();
                }
            `);
        }
    }

    handleAppLaunch(app) {
        console.log(`🚀 Launching app: ${app}`);
        if (this.currentWindow) {
            this.currentWindow.loadFile(`${app}.html`).then(() => {
                this.appState.currentApp = app;
                this.broadcastAppStateChange();
                console.log(`✅ App launched: ${app}`);
            }).catch((error) => {
                console.error(`❌ Failed to launch app ${app}:`, error);
            });
        }
    }

    handleTextInput(field, value) {
        console.log(`⌨️ Text input: ${field} = ${value}`);
        if (this.currentWindow) {
            // Escape the value to prevent injection
            const escapedValue = value.replace(/'/g, "\\'").replace(/"/g, '\\"');
            this.currentWindow.webContents.executeJavaScript(`
                // Find input field and set value
                const inputField = document.querySelector('input[data-field="${field}"], #${field}, input[name="${field}"]');
                if (inputField) {
                    inputField.value = '${escapedValue}';
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                    inputField.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('Text input set for field:', '${field}', 'value:', '${escapedValue}');
                    
                    // Also trigger focus events to ensure proper handling
                    inputField.focus();
                    inputField.blur();
                } else {
                    console.log('Input field not found for:', '${field}');
                    // Try to find any focused input element
                    const focusedInput = document.querySelector('input:focus, .tv-focused input');
                    if (focusedInput) {
                        focusedInput.value = '${escapedValue}';
                        focusedInput.dispatchEvent(new Event('input', { bubbles: true }));
                        focusedInput.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('Text input set for focused input:', '${escapedValue}');
                    }
                }
            `);
        }
    }

    handleTextInputRequest(field, currentValue, ws) {
        console.log(`📱 Text input request: ${field} (current: ${currentValue})`);
        
        // Determine the appropriate mobile app text input mode
        let mode = 'general';
        let placeholder = '';
        
        if (field === 'userName') {
            mode = 'username';
            placeholder = currentValue || 'Enter your name';
        } else if (field === 'roomName') {
            mode = 'roomname';
            placeholder = currentValue || 'Enter room name';
        }
        
        // Send message to mobile app to open text input modal
        const response = {
            type: 'showTextInput',
            mode: mode,
            field: field,
            placeholder: placeholder,
            currentValue: currentValue || ''
        };
        
        ws.send(JSON.stringify(response));
    }

    handleVideoCallAction(action, ws) {
        console.log(`📞 Video call action: ${action}`);
        
        switch (action) {
            case 'connect':
                this.appState.videoCallState = 'active';
                this.appState.currentApp = 'video-call-active';
                break;
                
            case 'toggleMute':
                this.appState.callData.isMuted = !this.appState.callData.isMuted;
                break;
                
            case 'toggleVideo':
                this.appState.callData.isVideoOn = !this.appState.callData.isVideoOn;
                break;
                
            case 'endCall':
                this.appState.videoCallState = 'disconnected';
                this.appState.currentApp = 'homepage';
                break;
        }
        
        this.broadcastVideoCallUpdate();
        
        // Execute action in renderer process
        if (this.currentWindow) {
            this.currentWindow.webContents.executeJavaScript(`
                if (window.videoCallManager) {
                    window.videoCallManager.${action}();
                }
            `);
        }
    }

    broadcastAppStateChange() {
        const message = {
            type: 'appStateChange',
            currentApp: this.appState.currentApp,
            videoCallState: this.appState.videoCallState
        };
        
        this.broadcast(message);
    }

    broadcastVideoCallUpdate() {
        const message = {
            type: 'videoCallUpdate',
            state: this.appState.videoCallState,
            ...this.appState.callData
        };
        
        this.broadcast(message);
    }

    broadcast(message) {
        if (this.wss) {
            this.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            });
        }
    }

    setCurrentWindow(window) {
        this.currentWindow = window;
    }

    stop() {
        if (this.wss) {
            this.wss.close();
            console.log('🌐 WebSocket server stopped');
        }
    }
}

module.exports = WebSocketServer;