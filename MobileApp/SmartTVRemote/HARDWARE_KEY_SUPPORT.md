# Hardware Key Support for SmartTV Remote

## Overview

This document explains the hardware key support implementation in the SmartTV Remote app and provides instructions for enabling full Android TV remote functionality.

## Current Implementation

The app now includes basic hardware key support for:
- **Arrow Keys**: Up, Down, Left, Right navigation
- **Select/OK Button**: Central select button and Enter key
- **Back Button**: Hardware back button
- **Numeric Keypad**: Numbers 0-9 for IP address input and text input
- **Special Keys**: Backspace, Period, Space for text input

## Features Implemented

### 1. Hardware Navigation
- Arrow key navigation in connection screen
- Focus indicators showing currently selected element
- Automatic focus management between UI elements

### 2. Text Input Support
- Numeric keypad input for IP addresses
- Full alphanumeric input in text input modal
- Backspace, space, and period key support
- Hardware keyboard support for text fields

### 3. Auto-Connect Enhancement
- Improved IP discovery algorithm
- Better error handling and user feedback
- Extended timeout for network scanning
- More comprehensive IP range scanning

### 4. Visual Focus Indicators
- Blue border and glow effect for focused elements
- Clear visual feedback for navigation state
- Consistent focus styling across all screens

## Android TV Remote Key Codes

The following Android key codes are handled:

```javascript
// Navigation Keys
19: KEYCODE_DPAD_UP
20: KEYCODE_DPAD_DOWN  
21: KEYCODE_DPAD_LEFT
22: KEYCODE_DPAD_RIGHT
23: KEYCODE_DPAD_CENTER (OK/Select)
66: KEYCODE_ENTER

// System Keys
4:  KEYCODE_BACK
67: KEYCODE_DEL (Backspace)

// Numeric Keys
7-16: KEYCODE_0 through KEYCODE_9

// Text Input Keys
29-54: KEYCODE_A through KEYCODE_Z
62: KEYCODE_SPACE
56: KEYCODE_PERIOD
```

## Usage Instructions

### For Users

1. **Navigation**: Use arrow keys to navigate between UI elements
2. **Selection**: Press OK/Select button to activate focused element
3. **Text Input**: Use numeric keypad for IP addresses, full keyboard for text
4. **Back Navigation**: Use back button to return to previous screen

### Connection Process

1. **Auto-Connect**: Focus on "Auto-Connect" button and press Select
2. **Manual Connect**: Focus on "Manual Connect" button and press Select
3. **IP Input**: Focus on IP input field and use numeric keypad
4. **WiFi Setup**: Focus on "WiFi Setup" button for initial setup

## Technical Implementation

### Key Event Handling

The app uses React Native's hardware key event system:

```javascript
useEffect(() => {
  const handleHardwareKey = (event) => {
    switch (event.keyCode) {
      case 19: // KEYCODE_DPAD_UP
        handleNavigate('up');
        return true;
      // ... other keys
    }
  };
  
  // Event listener setup
}, []);
```

### Focus Management

Focus is managed through state:

```javascript
const [currentFocusedElement, setCurrentFocusedElement] = useState('auto-connect');
```

Elements are styled with focus indicators:

```javascript
style={[
  styles.connectBtn,
  currentFocusedElement === 'auto-connect' && styles.focusedElement
]}
```

## Future Enhancements

### 1. Native Android Module

For complete Android TV remote support, a native Android module should be created:

```java
// AndroidTVRemoteModule.java
public class AndroidTVRemoteModule extends ReactContextBaseJavaModule {
    
    @ReactMethod
    public void enableTVRemoteMode() {
        // Enable TV remote key handling
        // Set up hardware key listeners
        // Configure TV-specific input modes
    }
    
    @ReactMethod
    public void registerKeyListener(String keyCode, String action) {
        // Register custom key handlers
    }
}
```

### 2. Enhanced Key Support

Additional keys that could be supported:
- Volume Up/Down
- Menu key
- Home key
- Channel Up/Down
- Play/Pause/Stop
- Fast Forward/Rewind

### 3. TV-Specific Features

- Picture-in-Picture mode support
- TV input switching
- Audio output selection
- Channel management

## Android Manifest Configuration

The app's AndroidManifest.xml should include:

```xml
<!-- TV Remote Support -->
<uses-permission android:name=\"android.permission.RECEIVE_BOOT_COMPLETED\" />

<!-- TV Hardware Features -->
<uses-feature android:name=\"android.hardware.type.television\" android:required=\"false\" />
<uses-feature android:name=\"android.software.leanback\" android:required=\"false\" />

<!-- Hardware Key Support -->
<activity android:name=\".MainActivity\"
          android:configChanges=\"keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode\"
          android:launchMode=\"singleTask\"
          android:windowSoftInputMode=\"adjustResize\"
          android:theme=\"@style/Theme.App.SplashScreen\"
          android:exported=\"true\"
          android:screenOrientation=\"portrait\">
  <!-- Intent filters for TV remote -->
  <intent-filter>
    <action android:name=\"android.intent.action.MAIN\" />
    <category android:name=\"android.intent.category.LAUNCHER\" />
    <category android:name=\"android.intent.category.LEANBACK_LAUNCHER\" />
  </intent-filter>
</activity>
```

## Testing Hardware Keys

### On Physical Device
1. Connect Android TV remote via Bluetooth
2. Test navigation with arrow keys
3. Test selection with OK button
4. Test text input with numeric keypad

### On Emulator
1. Use Android TV emulator
2. Enable hardware keyboard in AVD settings
3. Test with computer keyboard keys

## Troubleshooting

### Common Issues

1. **Keys not responding**: Check if hardware keyboard is enabled
2. **Focus not visible**: Ensure focus styles are applied correctly
3. **Text input not working**: Verify TextInput component is properly configured
4. **Auto-connect failing**: Check network connectivity and IP ranges

### Debug Tips

1. Enable console logging for key events
2. Test on different Android versions
3. Verify permissions in AndroidManifest.xml
4. Check network configuration for discovery

## Performance Considerations

- Key event handling is optimized with debouncing
- Focus state changes are minimized
- Network scanning is efficient with proper timeouts
- Memory usage is optimized for TV devices

## Conclusion

The SmartTV Remote app now provides comprehensive hardware key support for Android TV remote controls. The implementation includes navigation, text input, and system key handling with proper focus management and visual feedback.

For production deployment, consider implementing the native Android module for complete TV remote functionality and enhanced performance.