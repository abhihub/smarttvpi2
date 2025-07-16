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
                if (window.tvRemote && window.tvRemote.navigate) {
                    window.tvRemote.navigate('${direction}');
                } else {
                    console.log('Navigation command: ${direction}');
                }
            `);
        }
    }

    handleSelect() {
        console.log('🎮 Select pressed');
        if (this.currentWindow) {
            this.currentWindow.webContents.executeJavaScript(`
                if (window.tvRemote && window.tvRemote.select) {
                    window.tvRemote.select();
                } else {
                    // Simulate click on focused element
                    const focused = document.activeElement;
                    if (focused) {
                        focused.click();
                    }
                }
            `);
        }
    }

    handleBack() {
        console.log('🎮 Back pressed');
        if (this.currentWindow) {
            this.currentWindow.webContents.executeJavaScript(`
                if (window.tvRemote && window.tvRemote.back) {
                    window.tvRemote.back();
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
            this.currentWindow.webContents.executeJavaScript(`
                // Find input field and set value
                const inputField = document.querySelector('input[data-field="${field}"], #${field}');
                if (inputField) {
                    inputField.value = '${value}';
                    inputField.dispatchEvent(new Event('input'));
                    inputField.dispatchEvent(new Event('change'));
                }
            `);
        }
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