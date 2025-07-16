# SmartTV Remote Control App

A React Native mobile application that acts as a remote control for the SmartTV Electron application.

## Features

- **WiFi Connection**: Connect to your SmartTV over the same WiFi network
- **Navigation Control**: Use arrow keys and OK button to navigate the TV interface
- **Quick Launch**: Direct access to Video Call, Games, Streaming, and Photos
- **Haptic Feedback**: Vibration feedback for button presses
- **Connection Status**: Real-time connection status indicator
- **Reconnection**: Automatic reconnection and manual reconnect option

## Setup Instructions

### Prerequisites

- Node.js 18 or higher
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Install dependencies:**
   ```bash
   cd /home/ubuntu/workspace/projects/SmartTV/MobileRemote/SmartTVRemote
   npm install
   ```

2. **For Android development:**
   ```bash
   npx react-native run-android
   ```

3. **For iOS development (macOS only):**
   ```bash
   cd ios && pod install && cd ..
   npx react-native run-ios
   ```

### SmartTV Setup

1. Make sure your SmartTV Electron app is running
2. The WebSocket server starts automatically on port 8080
3. Note the IP address of the device running the SmartTV app

### Connection

1. Open the SmartTV Remote app on your mobile device
2. Enter the IP address of your SmartTV (e.g., 192.168.1.100)
3. Tap "Connect to SmartTV"
4. Once connected, you can control your TV using the remote interface

## Communication Protocol

The app communicates with the SmartTV using WebSocket messages:

```javascript
// Navigation command
{
  type: 'navigate',
  direction: 'up' | 'down' | 'left' | 'right'
}

// Selection command
{
  type: 'select'
}

// App launch command
{
  type: 'launch',
  app: 'video-call' | 'gamepage' | 'streaming' | 'photos'
}
```