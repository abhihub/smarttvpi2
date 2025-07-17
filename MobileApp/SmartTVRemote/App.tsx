import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Dimensions, Modal, ScrollView, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { BarCodeScanner } from 'expo-barcode-scanner';
import ConnectionSelector, { ConnectionType } from './src/components/ConnectionSelector';

const { width } = Dimensions.get('window');

interface WebSocketMessage {
  type: string;
  message?: string;
  [key: string]: any;
}

type AppState = 'homepage' | 'video-call-joining' | 'video-call-active' | 'gamepage' | 'settings' | 'other';
type VideoCallState = 'joining' | 'active' | 'disconnected';


export default function App() {
  const [tvIP, setTvIP] = useState('192.168.1.100');
  // Laptop testing state
  const [showSetup, setShowSetup] = useState(false);
  const [setupState, setSetupState] = useState('initial');
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputMode, setTextInputMode] = useState<'username' | 'roomname' | 'general'>('general');
  const [inputText, setInputText] = useState('');
  const [showInitialInstructions, setShowInitialInstructions] = useState(true);
  const [isAutoDiscovering, setIsAutoDiscovering] = useState(false);
  
  // Connection type
  const [connectionType, setConnectionType] = useState<ConnectionType>('wifi');
  
  // Hardware navigation state
  const [currentFocusedElement, setCurrentFocusedElement] = useState<string>('auto-connect');
  const [isNavigating, setIsNavigating] = useState(false);
  
  // App state mirroring
  const [currentAppState, setCurrentAppState] = useState<AppState>('homepage');
  const [videoCallState, setVideoCallState] = useState<VideoCallState>('disconnected');
  const [callData, setCallData] = useState({
    userName: 'Family Member',
    roomName: 'family-room',
    callTimer: '00:00',
    participantCount: 1,
    isMuted: false,
    isVideoOn: true
  });
  
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connectionType]);

  // Hardware key event handler
  useEffect(() => {
    const handleHardwareKey = (event: any) => {
      console.log('Hardware key event:', event);
      
      // Only handle hardware keys if we're connected to TV
      if (!isConnected) {
        return false;
      }
      
      // Handle different key events
      switch (event.keyCode) {
        case 19: // KEYCODE_DPAD_UP
          handleNavigate('up');
          return true;
        case 20: // KEYCODE_DPAD_DOWN
          handleNavigate('down');
          return true;
        case 21: // KEYCODE_DPAD_LEFT
          handleNavigate('left');
          return true;
        case 22: // KEYCODE_DPAD_RIGHT
          handleNavigate('right');
          return true;
        case 23: // KEYCODE_DPAD_CENTER (OK/Select)
        case 66: // KEYCODE_ENTER
          handleSelect();
          return true;
        case 4: // KEYCODE_BACK
          handleBack();
          return true;
        case 67: // KEYCODE_DEL (Backspace)
        case 62: // KEYCODE_SPACE
        case 56: // KEYCODE_PERIOD
          handleSpecialKey(event.keyCode);
          return true;
        default:
          // Handle numeric keypad input
          if (event.keyCode >= 7 && event.keyCode <= 16) {
            const digit = (event.keyCode - 7).toString();
            handleKeypadInput(digit);
            return true;
          }
          // Handle letter keys for text input (A-Z)
          if (event.keyCode >= 29 && event.keyCode <= 54) {
            if (showTextInput) {
              const letter = String.fromCharCode(event.keyCode - 29 + 65);
              setInputText(prev => prev + letter.toLowerCase());
              return true;
            }
          }
          return false;
      }
    };

    // Add hardware key listener for Android
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      
      // Note: React Native doesn't have built-in support for all hardware keys
      // This would typically require a native module for full Android TV remote support
      // For now, we'll focus on the back button which is supported
      
      return () => {
        backHandler.remove();
      };
    }
  }, [currentFocusedElement, isConnected, showTextInput, currentAppState]);

  const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    console.log('📱 Navigation command:', direction, 'Connected:', isConnected);
    
    if (isConnected) {
      // Send navigation command to TV
      console.log('📱 Sending navigation command to TV:', direction);
      sendCommand({ type: 'navigate', direction });
    } else {
      // Handle navigation within the mobile app UI
      console.log('📱 Handling local navigation:', direction);
      handleLocalNavigation(direction);
    }
    
    setTimeout(() => setIsNavigating(false), 100);
  };

  const handleSelect = () => {
    console.log('📱 Select command, Connected:', isConnected);
    
    if (isConnected) {
      // Send select command to TV
      console.log('📱 Sending select command to TV');
      sendCommand({ type: 'select' });
    } else {
      // Handle local selection
      console.log('📱 Handling local selection');
      handleLocalSelect();
    }
  };

  const handleBack = () => {
    if (showTextInput) {
      setShowTextInput(false);
    } else if (isConnected) {
      sendCommand({ type: 'back' });
    } else {
      // Handle local back action
      if (showSetup) {
        setShowSetup(false);
      } else if (showInitialInstructions) {
        setShowInitialInstructions(false);
      }
    }
  };

  const handleKeypadInput = (digit: string) => {
    if (showTextInput) {
      setInputText(prev => prev + digit);
    } else if (!isConnected && currentFocusedElement === 'tv-ip-input') {
      // Input IP address digits when IP field is focused
      const currentIP = tvIP;
      if (currentIP.length < 15) { // Basic IP length check
        setTvIP(prev => prev + digit);
      }
    }
  };

  // Handle special keys for text input
  const handleSpecialKey = (keyCode: number) => {
    if (showTextInput) {
      switch (keyCode) {
        case 67: // KEYCODE_DEL (Backspace)
          setInputText(prev => prev.slice(0, -1));
          break;
        case 62: // KEYCODE_SPACE
          setInputText(prev => prev + ' ');
          break;
        case 56: // KEYCODE_PERIOD
          setInputText(prev => prev + '.');
          break;
      }
    } else if (!isConnected && currentFocusedElement === 'tv-ip-input') {
      switch (keyCode) {
        case 67: // KEYCODE_DEL (Backspace)
          setTvIP(prev => prev.slice(0, -1));
          break;
        case 56: // KEYCODE_PERIOD
          setTvIP(prev => prev + '.');
          break;
      }
    }
  };

  const handleLocalNavigation = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!isConnected) {
      // Define navigation elements in connection screen
      const connectionElements = ['tv-ip-input', 'auto-connect', 'manual-connect', 'wifi-setup'];
      const currentIndex = connectionElements.indexOf(currentFocusedElement);
      
      let newIndex = currentIndex;
      if (direction === 'up' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (direction === 'down' && currentIndex < connectionElements.length - 1) {
        newIndex = currentIndex + 1;
      }
      
      setCurrentFocusedElement(connectionElements[newIndex]);
    }
  };

  const handleLocalSelect = () => {
    if (!isConnected) {
      switch (currentFocusedElement) {
        case 'tv-ip-input':
          // Focus on IP input - would need to handle text input
          break;
        case 'auto-connect':
          setIsAutoDiscovering(true);
          connectToTV();
          break;
        case 'manual-connect':
          setIsAutoDiscovering(false);
          connectToTV();
          break;
        case 'wifi-setup':
          startSetup();
          break;
      }
    }
  };

  const connectToTV = async () => {
    if (isAutoDiscovering) {
      await discoverTVIP();
    } else {
      return connectViaWiFi();
    }
  };

  const discoverTVIP = async () => {
    setIsConnecting(true);
    setConnectionStatus('Discovering TV...');
    
    try {
      // Get current network info to determine subnet
      const netState = await NetInfo.fetch();
      console.log('Network state for discovery:', netState);
      
      // Common IP ranges for home networks
      const commonIPs = [
        '10.81.110.20', // Your actual IP
        '192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.103',
        '192.168.0.100', '192.168.0.101', '192.168.0.102', '192.168.0.103',
        '10.0.0.100', '10.0.0.101', '10.0.0.102', '10.0.0.103',
        '172.16.0.100', '172.16.0.101', '172.16.0.102'
      ];
      
      console.log('Starting IP discovery with IPs:', commonIPs);
      
      for (const ip of commonIPs) {
        try {
          setConnectionStatus(`Trying ${ip}...`);
          console.log(`Testing IP: ${ip}`);
          
          const websocketUrl = `ws://${ip}:8080`;
          const testWs = new WebSocket(websocketUrl);
          
          const testResult = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              testWs.close();
              reject(new Error('Timeout'));
            }, 3000); // Increased timeout
            
            testWs.onopen = () => {
              console.log(`Successfully connected to ${ip}`);
              clearTimeout(timeout);
              testWs.close();
              resolve(ip);
            };
            
            testWs.onerror = (error) => {
              console.log(`Connection failed to ${ip}:`, error);
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            };
          });
          
          // If we get here, we found a working IP
          console.log(`Found working IP: ${testResult}`);
          setTvIP(testResult as string);
          setConnectionStatus('TV discovered!');
          await new Promise(resolve => setTimeout(resolve, 500));
          return await connectViaWiFi();
        } catch (error) {
          console.log(`Failed to connect to ${ip}:`, error);
          // Continue to next IP
          continue;
        }
      }
      
      // If no IP found, fall back to manual entry
      setIsConnecting(false);
      setConnectionStatus('TV not found automatically');
      Alert.alert(
        'TV Not Found', 
        'Could not automatically discover TV. Please enter the IP address manually or check that:\n\n• TV is powered on and connected to WiFi\n• Phone and TV are on the same network\n• SmartTV app is running on the TV'
      );
    } catch (error) {
      console.error('Discovery error:', error);
      setIsConnecting(false);
      setConnectionStatus('Discovery failed');
      Alert.alert('Discovery Failed', 'Could not scan for TV. Please try manual connection.');
    }
  };

  const connectViaWiFi = async () => {
    if (!tvIP.trim()) {
      Alert.alert('Error', 'Please enter TV IP address');
      return;
    }

    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(tvIP)) {
      Alert.alert('Invalid IP', 'Please enter a valid IP address (e.g., 192.168.1.100)');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('Connecting...');

    try {
      // Check network connectivity first
      const netState = await NetInfo.fetch();
      console.log('📶 Network state:', {
        isConnected: netState.isConnected,
        isInternetReachable: netState.isInternetReachable,
        type: netState.type,
        details: netState.details
      });

      if (!netState.isConnected) {
        Alert.alert('No Network', 'Please check your internet connection');
        setIsConnecting(false);
        return;
      }

      const websocketUrl = `ws://${tvIP}:8080`;
      console.log('Attempting WebSocket connection to:', websocketUrl);
      console.log('Device platform:', Platform.OS);
      console.log('Target IP:', tvIP);
      
      ws.current = new WebSocket(websocketUrl);
      console.log('WebSocket object created, readyState:', ws.current.readyState);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connection opened successfully');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus('Connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('Received from TV:', data);
          
          if (data.type === 'connected') {
            setConnectionStatus('Connected to SmartTV');
          } else if (data.type === 'appStateChange') {
            handleAppStateChange(data);
          } else if (data.type === 'videoCallUpdate') {
            handleVideoCallUpdate(data);
          } else if (data.type === 'showTextInput') {
            handleShowTextInput(data);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error occurred:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('WebSocket readyState at error:', ws.current?.readyState);
        setIsConnecting(false);
        setIsConnected(false);
        setConnectionStatus('Connection failed');
        Alert.alert('Connection Failed', 
          `Could not connect to SmartTV at ${tvIP}:8080.\n\nError: ${(error as any).message || 'Unknown error'}\n\nPlease check:\n• TV is powered on\n• TV and phone are on same WiFi\n• IP address is correct\n• TV app is running`
        );
      };

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket connection closed');
        console.log('Close code:', event.code);
        console.log('Close reason:', event.reason);
        console.log('Was clean close:', event.wasClean);
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionStatus('Disconnected');
        
        if (event.code !== 1000) {
          console.log('❌ Abnormal close detected');
          Alert.alert('Connection Lost', `Connection to SmartTV was lost.\nCode: ${event.code}\nReason: ${event.reason || 'Unknown'}`);
        }
      };

      setTimeout(() => {
        if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
          ws.current.close();
          setIsConnecting(false);
          Alert.alert('Connection Timeout', 
            `Could not connect to ${tvIP}:8080 within 10 seconds.\n\nPlease verify the IP address and try again.`
          );
        }
      }, 10000);

    } catch (error) {
      console.error('Connection error:', error);
      setIsConnecting(false);
      Alert.alert('Connection Error', 'Failed to establish connection. Please try again.');
    }
  };


  const handleAppStateChange = (data: any) => {
    console.log('App state change:', data);
    if (data.currentApp === 'homepage') {
      setCurrentAppState('homepage');
      setVideoCallState('disconnected');
    } else if (data.currentApp === 'video-call-joining') {
      setCurrentAppState('video-call-joining');
      setVideoCallState('joining');
    } else if (data.currentApp === 'video-call-active') {
      setCurrentAppState('video-call-active');
      setVideoCallState('active');
    } else if (data.currentApp === 'gamepage') {
      setCurrentAppState('gamepage');
      setVideoCallState('disconnected');
    } else if (data.currentApp === 'settings') {
      setCurrentAppState('settings');
      setVideoCallState('disconnected');
    } else {
      setCurrentAppState('other');
      setVideoCallState('disconnected');
    }
  };

  const handleVideoCallUpdate = (data: any) => {
    console.log('Video call update:', data);
    
    if (data.state === 'joining') {
      setVideoCallState('joining');
      setCurrentAppState('video-call-joining');
    } else if (data.state === 'active') {
      setVideoCallState('active');
      setCurrentAppState('video-call-active');
    } else if (data.state === 'disconnected') {
      setVideoCallState('disconnected');
      // When call is disconnected, don't automatically change app state
      // Let the appStateChange handle the screen transition
    }
    
    // Update call data with the new structure
    setCallData(prev => ({
      ...prev,
      userName: data.userName || prev.userName,
      roomName: data.roomName || prev.roomName,
      callTimer: data.callTimer || prev.callTimer,
      participantCount: data.participantCount || prev.participantCount,
      isMuted: data.isMuted !== undefined ? data.isMuted : prev.isMuted,
      isVideoOn: data.isVideoOn !== undefined ? data.isVideoOn : prev.isVideoOn
    }));
  };

  const handleShowTextInput = (data: any) => {
    console.log('Show text input request:', data);
    
    // Set the appropriate input mode based on the field
    if (data.field === 'userName') {
      setTextInputMode('username');
    } else if (data.field === 'roomName') {
      setTextInputMode('roomname');
    } else {
      setTextInputMode('general');
    }
    
    // Set the current value as the input text
    setInputText(data.currentValue || data.placeholder || '');
    
    // Show the text input modal
    setShowTextInput(true);
  };

  const disconnectFromTV = async () => {
    if (ws.current) {
      ws.current.close(1000, 'User disconnected');
      ws.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('');
    setCurrentAppState('homepage');
    setVideoCallState('disconnected');
  };

  const sendCommand = async (command: any) => {
    console.log('📱 Attempting to send command:', command);
    
    if (!isConnected) {
      console.log('📱 Not connected to TV, cannot send command');
      Alert.alert('Not Connected', 'Please connect to TV first');
      return;
    }

    try {
      if (!ws.current) {
        console.log('📱 WebSocket not available');
        Alert.alert('WiFi Connection Error', 'WebSocket connection is not available');
        return;
      }
      
      if (ws.current.readyState !== WebSocket.OPEN) {
        console.log('📱 WebSocket not open, state:', ws.current.readyState);
        Alert.alert('WiFi Connection Error', 'WebSocket connection is not open');
        return;
      }
      
      const commandString = JSON.stringify(command);
      console.log('📱 Sending command via WebSocket:', commandString);
      ws.current.send(commandString);
      console.log('📱 Command sent successfully');
    } catch (error) {
      console.error('📱 Error sending command:', error);
      Alert.alert('Command Failed', 'Failed to send command via WiFi');
    }
  };

  const openTextInput = (mode: 'username' | 'roomname' | 'general', placeholder: string = '') => {
    setTextInputMode(mode);
    setInputText(placeholder);
    setShowTextInput(true);
  };

  const sendTextInput = () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    let command;
    switch (textInputMode) {
      case 'username':
        command = { type: 'input', field: 'userName', value: inputText.trim() };
        setCallData(prev => ({ ...prev, userName: inputText.trim() }));
        break;
      case 'roomname':
        command = { type: 'input', field: 'roomName', value: inputText.trim() };
        setCallData(prev => ({ ...prev, roomName: inputText.trim() }));
        break;
      default:
        command = { type: 'input', field: 'general', value: inputText.trim() };
    }

    sendCommand(command);
    setShowTextInput(false);
    setInputText('');
  };

  // Connection selector handlers
  const handleConnectionTypeSelect = (type: ConnectionType) => {
    setConnectionType(type);
  };

  // Setup functions for laptop testing
  const startSetup = () => {
    setShowSetup(true);
    setSetupState('initial');
  };

  const dismissInstructions = () => {
    setShowInstructions(false);
  };

  const startQRScanner = async () => {
    setSetupState('qr-scanner');
    // Mock permission for laptop testing
    setHasPermission(true);
  };

  const handleBarCodeScanned = ({ type, data }: any) => {
    setScanned(true);
    console.log('QR Code scanned:', { type, data });
    // For laptop testing, just show success
    Alert.alert('QR Scanned', `Mock QR scan successful: ${data}`);
  };

  const renderTextInputModal = () => (
    <Modal visible={showTextInput} transparent animationType="slide">
      <KeyboardAvoidingView 
        style={styles.modalContainer}
        behavior="height"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {textInputMode === 'username' ? 'Enter Your Name' :
             textInputMode === 'roomname' ? 'Enter Room Name' :
             'Enter Text'}
          </Text>
          
          <TextInput
            style={styles.modalInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              textInputMode === 'username' ? 'Your name' :
              textInputMode === 'roomname' ? 'Room name' :
              'Type here...'
            }
            placeholderTextColor="#999"
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalBtn, styles.modalBtnCancel]} 
              onPress={() => setShowTextInput(false)}
            >
              <Text style={[styles.modalBtnText, { color: '#333' }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalBtn, styles.modalBtnSend]} 
              onPress={sendTextInput}
            >
              <Text style={styles.modalBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // WiFi Setup Modal
  const renderWiFiSetupModal = () => (
    <Modal visible={showSetup} transparent animationType="slide">
      <View style={styles.setupModalContainer}>
        <View style={styles.setupModalContent}>
          {setupState === 'initial' && (
            <>
              <Text style={styles.setupTitle}>WiFi Setup</Text>
              <Text style={styles.setupDescription}>
                Choose how to connect your Raspberry Pi to WiFi:
              </Text>
              
              <TouchableOpacity 
                style={styles.setupOption}
                onPress={() => setSetupState('wifi-setup')}
              >
                <Text style={styles.setupOptionIcon}>🌐</Text>
                <View style={styles.setupOptionText}>
                  <Text style={styles.setupOptionTitle}>Manual Setup</Text>
                  <Text style={styles.setupOptionDesc}>Connect to soft AP and enter credentials</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.setupOption}
                onPress={startQRScanner}
              >
                <Text style={styles.setupOptionIcon}>📱</Text>
                <View style={styles.setupOptionText}>
                  <Text style={styles.setupOptionTitle}>QR Code Scan</Text>
                  <Text style={styles.setupOptionDesc}>Scan WiFi QR code with camera</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.setupCloseBtn}
                onPress={() => setShowSetup(false)}
              >
                <Text style={styles.setupCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
          
          {setupState === 'qr-scanner' && (
            <>
              <Text style={styles.setupTitle}>Scan WiFi QR Code</Text>
              <Text style={styles.setupDescription}>
                Point camera at WiFi QR code to automatically configure connection
              </Text>
              
              <View style={styles.cameraContainer}>
                {hasPermission === null && (
                  <Text>Requesting camera permission...</Text>
                )}
                {hasPermission === false && (
                  <Text>No access to camera</Text>
                )}
                {hasPermission && (
                  <BarCodeScanner
                    onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={styles.camera}
                  />
                )}
              </View>
              
              <View style={styles.setupButtons}>
                <TouchableOpacity 
                  style={styles.setupBackBtn}
                  onPress={() => setSetupState('initial')}
                >
                  <Text style={styles.setupBackBtnText}>Back</Text>
                </TouchableOpacity>
                
                {scanned && (
                  <TouchableOpacity 
                    style={styles.setupRescanBtn}
                    onPress={() => setScanned(false)}
                  >
                    <Text style={styles.setupRescanBtnText}>Scan Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
          
          {setupState === 'wifi-setup' && (
            <>
              <Text style={styles.setupTitle}>Manual WiFi Setup</Text>
              <Text style={styles.setupDescription}>
                1. Connect to "SmartTV-Setup" WiFi network\n
                2. Open browser and go to: http://192.168.4.1\n
                3. Enter your home WiFi credentials\n
                4. Wait for connection to complete
              </Text>
              
              <TouchableOpacity 
                style={styles.setupDoneBtn}
                onPress={() => {
                  setSetupState('completed');
                  setShowSetup(false);
                }}
              >
                <Text style={styles.setupDoneBtnText}>Done</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.setupBackBtn}
                onPress={() => setSetupState('initial')}
              >
                <Text style={styles.setupBackBtnText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  // Initial Instructions Modal
  const renderInitialInstructionsModal = () => (
    <Modal visible={showInitialInstructions} transparent animationType="fade">
      <View style={styles.instructionsModalContainer}>
        <View style={styles.instructionsModalContent}>
          <Text style={styles.instructionsTitle}>📱 SmartTV Remote Setup</Text>
          
          <View style={styles.instructionsStep}>
            <Text style={styles.instructionsStepNumber}>1</Text>
            <Text style={styles.instructionsStepText}>
              <Text style={styles.boldText}>First Time Setup:</Text> If this is your first time, your Raspberry Pi will create a WiFi hotspot called "SmartTV-Setup". Connect to it and follow the setup instructions.
            </Text>
          </View>
          
          <View style={styles.instructionsStep}>
            <Text style={styles.instructionsStepNumber}>2</Text>
            <Text style={styles.instructionsStepText}>
              <Text style={styles.boldText}>WiFi QR Code:</Text> Alternatively, you can scan your home WiFi QR code (from your phone's WiFi settings) using the Pi's camera.
            </Text>
          </View>
          
          <View style={styles.instructionsStep}>
            <Text style={styles.instructionsStepNumber}>3</Text>
            <Text style={styles.instructionsStepText}>
              <Text style={styles.boldText}>Auto-Connect:</Text> Once both devices are on the same WiFi network, use Auto-Connect to automatically find and connect to your SmartTV.
            </Text>
          </View>
          
          <View style={styles.instructionsStep}>
            <Text style={styles.instructionsStepNumber}>4</Text>
            <Text style={styles.instructionsStepText}>
              <Text style={styles.boldText}>Manual Connect:</Text> If auto-connect fails, you can manually enter the IP address shown on your TV screen.
            </Text>
          </View>
          
          <View style={styles.instructionsButtons}>
            <TouchableOpacity 
              style={styles.instructionsSetupBtn}
              onPress={() => {
                setShowInitialInstructions(false);
                startSetup();
              }}
            >
              <Text style={styles.instructionsSetupBtnText}>WiFi Setup</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.instructionsContinueBtn}
              onPress={() => setShowInitialInstructions(false)}
            >
              <Text style={styles.instructionsContinueBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Video Call Joining Screen
  const renderVideoCallJoining = () => (
    <ScrollView style={styles.remoteContainer} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" backgroundColor="#0f0f23" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Video Call</Text>
          <TouchableOpacity 
            style={styles.headerBackBtn}
            onPress={() => sendCommand({ type: 'back' })}
          >
            <Text style={styles.headerBackText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.ipText}>{tvIP}:8080</Text>
      </View>

      {/* Join Call Card */}
      <View style={styles.joinCallCard}>
        <Text style={styles.joinTitle}>Join Family Video Call</Text>
        
        <View style={styles.inputSection}>
          <Text style={styles.inputSectionLabel}>Your Name</Text>
          <View style={styles.nameDisplay}>
            <Text style={styles.nameDisplayText}>{callData.userName}</Text>
            <TouchableOpacity 
              style={styles.editBtn}
              onPress={() => openTextInput('username', callData.userName)}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputSection}>
          <Text style={styles.inputSectionLabel}>Room Name</Text>
          <View style={styles.nameDisplay}>
            <Text style={styles.nameDisplayText}>{callData.roomName}</Text>
            <TouchableOpacity 
              style={styles.editBtn}
              onPress={() => openTextInput('roomname', callData.roomName)}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.connectCallBtn}
          onPress={() => sendCommand({ type: 'videoCall', action: 'connect' })}
        >
          <Text style={styles.connectCallIcon}>📹</Text>
          <Text style={styles.connectCallText}>Connect to Video Call</Text>
        </TouchableOpacity>
        
        {/* Popular Rooms */}
        <View style={styles.popularRooms}>
          <Text style={styles.popularRoomsTitle}>Popular Family Rooms</Text>
          <View style={styles.roomTags}>
            {['family-room', 'grandparents', 'cousins', 'game-night'].map((room) => (
              <TouchableOpacity 
                key={room}
                style={[styles.roomTag, callData.roomName === room && styles.roomTagSelected]}
                onPress={() => {
                  setCallData(prev => ({ ...prev, roomName: room }));
                  sendCommand({ type: 'input', field: 'roomName', value: room });
                }}
              >
                <Text style={[styles.roomTagText, callData.roomName === room && styles.roomTagTextSelected]}>
                  {room.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {renderTextInputModal()}
      {renderWiFiSetupModal()}
    </ScrollView>
  );

  // Active Video Call Screen
  const renderVideoCallActive = () => (
    <View style={styles.remoteContainer}>
      <StatusBar style="light" backgroundColor="#0f0f23" />
      
      {/* Call Header */}
      <View style={styles.callHeader}>
        <Text style={styles.callTitle}>Family Video Call</Text>
        <View style={styles.callInfo}>
          <View style={styles.callInfoItem}>
            <Text style={styles.callInfoIcon}>🕐</Text>
            <Text style={styles.callInfoText}>{callData.callTimer}</Text>
          </View>
          <View style={styles.callInfoItem}>
            <Text style={styles.callInfoIcon}>👥</Text>
            <Text style={styles.callInfoText}>{callData.participantCount} participants</Text>
          </View>
        </View>
      </View>

      {/* Video Area Placeholder */}
      <View style={styles.videoArea}>
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderIcon}>📹</Text>
          <Text style={styles.videoPlaceholderText}>Video call is active on TV</Text>
          <Text style={styles.videoPlaceholderSubtext}>Use controls below to manage the call</Text>
        </View>
      </View>

      {/* Call Controls */}
      <View style={styles.callControls}>
        <TouchableOpacity 
          style={[styles.callControlBtn, callData.isMuted && styles.callControlBtnActive]}
          onPress={() => {
            sendCommand({ type: 'videoCall', action: 'toggleMute' });
            setCallData(prev => ({ ...prev, isMuted: !prev.isMuted }));
          }}
        >
          <Text style={styles.callControlIcon}>{callData.isMuted ? '🔇' : '🎤'}</Text>
          <Text style={styles.callControlText}>{callData.isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.callControlBtn, !callData.isVideoOn && styles.callControlBtnActive]}
          onPress={() => {
            sendCommand({ type: 'videoCall', action: 'toggleVideo' });
            setCallData(prev => ({ ...prev, isVideoOn: !prev.isVideoOn }));
          }}
        >
          <Text style={styles.callControlIcon}>{callData.isVideoOn ? '📹' : '📷'}</Text>
          <Text style={styles.callControlText}>{callData.isVideoOn ? 'Video On' : 'Video Off'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.callControlBtn}
          onPress={() => sendCommand({ type: 'videoCall', action: 'toggleCamera' })}
        >
          <Text style={styles.callControlIcon}>🔄</Text>
          <Text style={styles.callControlText}>Flip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.callControlBtn, styles.endCallBtn]}
          onPress={() => sendCommand({ type: 'videoCall', action: 'endCall' })}
        >
          <Text style={styles.callControlIcon}>📞</Text>
          <Text style={styles.callControlText}>End Call</Text>
        </TouchableOpacity>
      </View>
      {renderWiFiSetupModal()}
    </View>
  );

  // Settings Remote Control Screen
  const renderSettingsRemoteControl = () => (
    <ScrollView style={styles.remoteContainer} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" backgroundColor="#0f0f23" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Settings Remote</Text>
          <TouchableOpacity 
            style={styles.headerBackBtn}
            onPress={() => sendCommand({ type: 'back' })}
          >
            <Text style={styles.headerBackText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.ipText}>{tvIP}:8080</Text>
      </View>

      {/* Navigation Pad */}
      <View style={styles.navSection}>
        <Text style={styles.sectionTitle}>Navigation</Text>
        <View style={styles.navigationPad}>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnUp]}
            onPress={() => sendCommand({ type: 'navigate', direction: 'up' })}
          >
            <Text style={styles.navIcon}>▲</Text>
          </TouchableOpacity>
          
          <View style={styles.navMiddleRow}>
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnSide]}
              onPress={() => sendCommand({ type: 'navigate', direction: 'left' })}
            >
              <Text style={styles.navIcon}>◀</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navBtn, styles.selectBtn]}
              onPress={() => sendCommand({ type: 'select' })}
            >
              <Text style={styles.selectText}>OK</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnSide]}
              onPress={() => sendCommand({ type: 'navigate', direction: 'right' })}
            >
              <Text style={styles.navIcon}>▶</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnDown]}
            onPress={() => sendCommand({ type: 'navigate', direction: 'down' })}
          >
            <Text style={styles.navIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Quick Actions */}
      <View style={styles.appSection}>
        <Text style={styles.sectionTitle}>Settings Options</Text>
        <View style={styles.appGrid}>
          <TouchableOpacity 
            style={[styles.appCard, styles.settingsCard]} 
            onPress={() => sendCommand({ type: 'settings', action: 'wifi' })}
          >
            <Text style={styles.appIcon}>🌐</Text>
            <Text style={styles.appTitle}>WiFi Setup</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.settingsCard]} 
            onPress={() => sendCommand({ type: 'settings', action: 'display' })}
          >
            <Text style={styles.appIcon}>🎥</Text>
            <Text style={styles.appTitle}>Display</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.settingsCard]} 
            onPress={() => sendCommand({ type: 'settings', action: 'audio' })}
          >
            <Text style={styles.appIcon}>🔊</Text>
            <Text style={styles.appTitle}>Audio</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.settingsCard]} 
            onPress={() => sendCommand({ type: 'settings', action: 'system' })}
          >
            <Text style={styles.appIcon}>ℹ️</Text>
            <Text style={styles.appTitle}>System Info</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Home Button */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickBtn, styles.homeBtn]} 
          onPress={() => sendCommand({ type: 'launch', app: 'homepage' })}
        >
          <Text style={styles.quickBtnIcon}>🏠</Text>
          <Text style={styles.quickBtnText}>Home</Text>
        </TouchableOpacity>
      </View>

      {renderTextInputModal()}
    </ScrollView>
  );

  // Games Remote Control Screen
  const renderGamesRemoteControl = () => (
    <ScrollView style={styles.remoteContainer} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" backgroundColor="#0f0f23" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Games Remote</Text>
          <TouchableOpacity 
            style={styles.headerBackBtn}
            onPress={() => sendCommand({ type: 'back' })}
          >
            <Text style={styles.headerBackText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.ipText}>{tvIP}:8080</Text>
      </View>

      {/* Navigation Pad */}
      <View style={styles.navSection}>
        <Text style={styles.sectionTitle}>Navigation</Text>
        <View style={styles.navigationPad}>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnUp]}
            onPress={() => sendCommand({ type: 'navigate', direction: 'up' })}
          >
            <Text style={styles.navIcon}>▲</Text>
          </TouchableOpacity>
          
          <View style={styles.navMiddleRow}>
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnSide]}
              onPress={() => sendCommand({ type: 'navigate', direction: 'left' })}
            >
              <Text style={styles.navIcon}>◀</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navBtn, styles.selectBtn]}
              onPress={() => sendCommand({ type: 'select' })}
            >
              <Text style={styles.selectText}>OK</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnSide]}
              onPress={() => sendCommand({ type: 'navigate', direction: 'right' })}
            >
              <Text style={styles.navIcon}>▶</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnDown]}
            onPress={() => sendCommand({ type: 'navigate', direction: 'down' })}
          >
            <Text style={styles.navIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Game Actions */}
      <View style={styles.appSection}>
        <Text style={styles.sectionTitle}>Game Options</Text>
        <View style={styles.appGrid}>
          <TouchableOpacity 
            style={[styles.appCard, styles.gamesCard]} 
            onPress={() => sendCommand({ type: 'launch', app: 'trivia-game' })}
          >
            <Text style={styles.appIcon}>🧠</Text>
            <Text style={styles.appTitle}>Trivia Time</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.gamesCard]} 
            onPress={() => sendCommand({ type: 'game', action: 'new' })}
          >
            <Text style={styles.appIcon}>🎮</Text>
            <Text style={styles.appTitle}>New Game</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.gamesCard]} 
            onPress={() => sendCommand({ type: 'game', action: 'scores' })}
          >
            <Text style={styles.appIcon}>🏆</Text>
            <Text style={styles.appTitle}>Scores</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.gamesCard]} 
            onPress={() => sendCommand({ type: 'game', action: 'settings' })}
          >
            <Text style={styles.appIcon}>⚙️</Text>
            <Text style={styles.appTitle}>Game Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Home Button */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickBtn, styles.homeBtn]} 
          onPress={() => sendCommand({ type: 'launch', app: 'homepage' })}
        >
          <Text style={styles.quickBtnIcon}>🏠</Text>
          <Text style={styles.quickBtnText}>Home</Text>
        </TouchableOpacity>
      </View>

      {renderTextInputModal()}
    </ScrollView>
  );

  // Regular Remote Control Screen
  const renderRemoteControl = () => (
    <ScrollView style={styles.remoteContainer} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" backgroundColor="#0f0f23" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>SmartTV Remote</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Connected</Text>
          </View>
        </View>
        <Text style={styles.ipText}>{tvIP}:8080</Text>
        {currentAppState !== 'homepage' && (
          <Text style={styles.currentApp}>
            Currently: {currentAppState === 'gamepage' ? 'Games' : 
                      currentAppState === 'other' ? 'App' : 'Home'}
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickBtn, styles.homeBtn]} 
          onPress={() => sendCommand({ type: 'launch', app: 'homepage' })}
        >
          <Text style={styles.quickBtnIcon}>🏠</Text>
          <Text style={styles.quickBtnText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickBtn, styles.backBtn]} 
          onPress={() => sendCommand({ type: 'back' })}
        >
          <Text style={styles.quickBtnIcon}>↶</Text>
          <Text style={styles.quickBtnText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Pad */}
      <View style={styles.navSection}>
        <Text style={styles.sectionTitle}>Navigation</Text>
        <View style={styles.navigationPad}>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnUp]}
            onPress={() => sendCommand({ type: 'navigate', direction: 'up' })}
          >
            <Text style={styles.navIcon}>▲</Text>
          </TouchableOpacity>
          
          <View style={styles.navMiddleRow}>
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnSide]}
              onPress={() => sendCommand({ type: 'navigate', direction: 'left' })}
            >
              <Text style={styles.navIcon}>◀</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navBtn, styles.selectBtn]}
              onPress={() => sendCommand({ type: 'select' })}
            >
              <Text style={styles.selectText}>OK</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnSide]}
              onPress={() => sendCommand({ type: 'navigate', direction: 'right' })}
            >
              <Text style={styles.navIcon}>▶</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnDown]}
            onPress={() => sendCommand({ type: 'navigate', direction: 'down' })}
          >
            <Text style={styles.navIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Launchers */}
      <View style={styles.appSection}>
        <Text style={styles.sectionTitle}>Quick Launch</Text>
        <View style={styles.appGrid}>
          <TouchableOpacity 
            style={[styles.appCard, styles.videoCallCard]} 
            onPress={() => sendCommand({ type: 'launch', app: 'video-call' })}
          >
            <Text style={styles.appIcon}>📞</Text>
            <Text style={styles.appTitle}>Video Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.gamesCard]} 
            onPress={() => sendCommand({ type: 'launch', app: 'gamepage' })}
          >
            <Text style={styles.appIcon}>🎮</Text>
            <Text style={styles.appTitle}>Games</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.streamingCard]} 
            onPress={() => sendCommand({ type: 'launch', app: 'streaming' })}
          >
            <Text style={styles.appIcon}>🎬</Text>
            <Text style={styles.appTitle}>Streaming</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.photosCard]} 
            onPress={() => sendCommand({ type: 'launch', app: 'photos' })}
          >
            <Text style={styles.appIcon}>📸</Text>
            <Text style={styles.appTitle}>Photos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.appCard, styles.settingsCard]} 
            onPress={() => sendCommand({ type: 'launch', app: 'settings' })}
          >
            <Text style={styles.appIcon}>⚙️</Text>
            <Text style={styles.appTitle}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Text Input Button */}
      <View style={styles.textInputSection}>
        <TouchableOpacity 
          style={styles.textInputBtn} 
          onPress={() => openTextInput('general')}
        >
          <Text style={styles.textInputIcon}>⌨️</Text>
          <Text style={styles.textInputText}>Type Text</Text>
        </TouchableOpacity>
      </View>

      {/* Disconnect Button */}
      <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectFromTV}>
        <Text style={styles.disconnectText}>Disconnect</Text>
      </TouchableOpacity>

      {renderTextInputModal()}
    </ScrollView>
  );

  if (!isConnected) {
    return (
      <View style={styles.connectContainer}>
        <StatusBar style="dark" />
        
        <View style={styles.connectHeader}>
          <Text style={styles.connectTitle}>SmartTV Remote</Text>
          <Text style={styles.connectSubtitle}>Connect to your Smart Family Console</Text>
        </View>
        
        {connectionStatus && (
          <View style={styles.statusBanner}>
            <Text style={[styles.statusBannerText, { 
              color: isConnecting ? '#ff9500' : '#ff3b30' 
            }]}>
              {connectionStatus}
            </Text>
          </View>
        )}
        
        {/* Connection Type Selector */}
        <ConnectionSelector
          onConnectionTypeSelect={handleConnectionTypeSelect}
          currentConnectionType={connectionType}
        />
        
        <View style={styles.connectForm}>
          <Text style={styles.inputLabel}>TV IP Address</Text>
          <TextInput
            style={[
              styles.input, 
              !isConnecting ? styles.inputEnabled : styles.inputDisabled,
              currentFocusedElement === 'tv-ip-input' && styles.focusedElement
            ]}
            value={tvIP}
            onChangeText={setTvIP}
            placeholder="192.168.1.100"
            placeholderTextColor="#999"
            keyboardType="numeric"
            editable={!isConnecting}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        
        <TouchableOpacity 
          style={[
            styles.connectBtn, 
            { marginBottom: 15 },
            currentFocusedElement === 'auto-connect' && styles.focusedElement
          ]} 
          onPress={() => {
            setIsAutoDiscovering(true);
            connectToTV();
          }}
          disabled={isConnecting}
        >
          <Text style={styles.connectBtnText}>
            {isConnecting && isAutoDiscovering ? 'Auto-discovering TV...' : 'Auto-Connect'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.connectBtn, 
            { backgroundColor: '#ff9500' },
            currentFocusedElement === 'manual-connect' && styles.focusedElement
          ]} 
          onPress={() => {
            setIsAutoDiscovering(false);
            connectToTV();
          }}
          disabled={isConnecting}
        >
          <Text style={styles.connectBtnText}>
            {isConnecting && !isAutoDiscovering ? 'Connecting manually...' : 'Manual Connect'}
          </Text>
        </TouchableOpacity>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>📺 Connection Guide</Text>
          <Text style={styles.helpText}>
            1. Power on your SmartTV\n2. Ensure both devices are on the same WiFi\n3. Find the IP address shown on the TV screen\n4. Enter the IP above and tap Connect
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.wifiSetupBtn,
            currentFocusedElement === 'wifi-setup' && styles.focusedElement
          ]}
          onPress={startSetup}
        >
          <Text style={styles.wifiSetupIcon}>⚙️</Text>
          <Text style={styles.wifiSetupText}>WiFi Setup</Text>
        </TouchableOpacity>
        
        {renderInitialInstructionsModal()}
        {renderWiFiSetupModal()}
      </View>
    );
  }

  // Render appropriate screen based on app state
  if (currentAppState === 'video-call-joining' && videoCallState === 'joining') {
    return renderVideoCallJoining();
  } else if (currentAppState === 'video-call-active' && videoCallState === 'active') {
    return renderVideoCallActive();
  } else if (currentAppState === 'gamepage') {
    return renderGamesRemoteControl();
  } else if (currentAppState === 'settings') {
    return renderSettingsRemoteControl();
  } else {
    return renderRemoteControl();
  }
}

const styles = StyleSheet.create({
  // Connection Screen Styles
  connectContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  connectHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  connectTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f0f23',
    marginBottom: 8,
  },
  connectSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  statusBanner: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9500',
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  connectForm: {
    marginBottom: 40,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputEnabled: {
    borderColor: '#e1e5e9',
    backgroundColor: '#fff',
    color: '#333',
  },
  inputDisabled: {
    borderColor: '#f1f3f4',
    backgroundColor: '#f8f9fa',
    color: '#999',
  },
  connectBtn: {
    height: 56,
    backgroundColor: '#007aff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  connectBtnDisabled: {
    backgroundColor: '#c7c7cc',
    shadowOpacity: 0,
    elevation: 0,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  helpText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  
  // Bluetooth device selection styles
  selectedDeviceContainer: {
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#007aff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  selectedDeviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedDeviceAddress: {
    fontSize: 14,
    color: '#666',
  },

  // Remote Control Styles
  remoteContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerBackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  headerBackText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30d158',
    marginRight: 6,
  },
  statusText: {
    color: '#30d158',
    fontSize: 14,
    fontWeight: '600',
  },
  ipText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  currentApp: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  homeBtn: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.4)',
  },
  backBtn: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.4)',
  },
  quickBtnIcon: {
    fontSize: 20,
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  navigationPad: {
    alignItems: 'center',
  },
  navBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navBtnUp: {
    marginBottom: 12,
  },
  navBtnDown: {
    marginTop: 12,
  },
  navBtnSide: {
    marginHorizontal: 12,
  },
  navMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: '#667eea',
    borderWidth: 2,
  },
  navIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  selectText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },

  appSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  appCard: {
    width: (width - 52) / 2,
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  videoCallCard: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  gamesCard: {
    backgroundColor: 'rgba(155, 89, 182, 0.2)',
  },
  streamingCard: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  photosCard: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
  },
  comingSoonCard: {
    opacity: 0.6,
  },
  comingSoonIcon: {
    opacity: 0.7,
  },
  comingSoonLabel: {
    color: '#ffd700',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  appIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  appTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Text Input Section
  textInputSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  textInputBtn: {
    height: 60,
    backgroundColor: 'rgba(255, 159, 10, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.4)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  textInputIcon: {
    fontSize: 24,
  },
  textInputText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  disconnectBtn: {
    marginHorizontal: 20,
    marginBottom: 40,
    height: 50,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  },

  // Video Call Joining Styles
  joinCallCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  joinTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputSectionLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  nameDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  nameDisplayText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  editBtn: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  connectCallBtn: {
    backgroundColor: 'rgba(102, 126, 234, 0.8)',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 30,
  },
  connectCallIcon: {
    fontSize: 20,
  },
  connectCallText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  popularRooms: {
    marginTop: 20,
  },
  popularRoomsTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 15,
  },
  roomTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  roomTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  roomTagSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: '#667eea',
  },
  roomTagText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  roomTagTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },

  // Active Video Call Styles
  callHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  callTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  callInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  callInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callInfoIcon: {
    fontSize: 14,
  },
  callInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  videoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    alignItems: 'center',
  },
  videoPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  videoPlaceholderSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  callControlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  callControlBtnActive: {
    backgroundColor: 'rgba(231, 76, 60, 0.3)',
    borderColor: '#e74c3c',
  },
  endCallBtn: {
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
    borderColor: '#e74c3c',
  },
  callControlIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  callControlText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: width - 40,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f1f3f4',
  },
  modalBtnSend: {
    backgroundColor: '#007aff',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  
  // WiFi Setup Button
  wifiSetupBtn: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 56,
    backgroundColor: '#ff9500',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  wifiSetupIcon: {
    fontSize: 20,
  },
  wifiSetupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Instructions Modal
  instructionsModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructionsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  instructionsStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  instructionsStepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007aff',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: 'bold',
    marginRight: 15,
  },
  instructionsStepText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#007aff',
  },
  settingsCard: {
    backgroundColor: 'rgba(149, 165, 166, 0.2)',
  },
  instructionsButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  instructionsSetupBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#ff9500',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsSetupBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContinueBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#007aff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContinueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // WiFi Setup Modal
  setupModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  setupModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  setupDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  setupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  setupOptionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  setupOptionText: {
    flex: 1,
  },
  setupOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  setupOptionDesc: {
    fontSize: 14,
    color: '#666',
  },
  setupCloseBtn: {
    marginTop: 20,
    height: 50,
    backgroundColor: '#f1f3f4',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupCloseBtnText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Camera Scanner
  cameraContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  setupButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  setupBackBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#f1f3f4',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupBackBtnText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  setupRescanBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#007aff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupRescanBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  setupDoneBtn: {
    height: 50,
    backgroundColor: '#30d158',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  setupDoneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Remove coming soon styles since we're enabling the features
  // comingSoonCard: {
  //   opacity: 0.6,
  // },
  // comingSoonIcon: {
  //   opacity: 0.7,
  // },
  // comingSoonLabel: {
  //   color: '#ffd700',
  //   fontSize: 10,
  //   fontWeight: '600',
  //   marginTop: 4,
  // },
  
  // Focus indicator for hardware navigation
  focusedElement: {
    borderWidth: 3,
    borderColor: '#007aff',
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
});