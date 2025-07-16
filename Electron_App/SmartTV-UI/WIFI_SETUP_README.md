# WiFi Onboarding System

This document explains the WiFi onboarding system implemented for the Smart TV Raspberry Pi application.

## Overview

The WiFi onboarding system provides two methods for users to connect their Smart TV to WiFi:

1. **QR Code Scanning**: Users can point their phone's WiFi QR code at the TV camera
2. **Soft AP Setup**: The TV creates a setup network for manual WiFi configuration

## System Architecture

### Components

1. **WiFi Onboarding Page** (`wifi-onboarding.html`)
   - Initial startup screen shown when WiFi is not connected
   - Provides clear instructions and two setup options
   - QR code scanner with camera integration
   - Soft AP status and setup interface

2. **WiFi Credentials Page** (`wifi-credentials.html`)
   - Web interface served on the soft AP network (192.168.4.1)
   - Network scanning and selection
   - WiFi credential input form
   - Connection progress tracking

3. **WiFi Manager** (`wifi-manager.js`)
   - Handles soft AP creation and management
   - Manages WiFi connection process
   - Network scanning and configuration
   - System integration with hostapd and wpa_supplicant

4. **Updated Main Process** (`main.js`)
   - Checks WiFi status on startup
   - Loads appropriate page based on connection state
   - Integrates WiFi manager with Electron app

## WiFi Setup Flow

**The system automatically starts both setup methods simultaneously on startup when no WiFi connection is detected. Users don't need to select a method - they can use whichever is more convenient.**

### Method 1: QR Code Scanning (Automatic)

1. **Automatic Startup**: TV camera starts scanning for QR codes immediately
2. **QR Code Detection**: User points phone's WiFi QR code at TV camera
3. **Credential Parsing**: System extracts SSID, password, and security type
4. **Automatic Connection**: TV connects to the detected network immediately
5. **Success**: TV stops all setup processes and proceeds to main application

### Method 2: Soft AP Setup (Automatic)

1. **Automatic Startup**: TV creates "SmartTV-Setup" WiFi network immediately
2. **QR Code Display**: TV shows QR code for easy setup page access
3. **User Connection**: User connects phone to setup network
4. **Web Interface**: User accesses http://192.168.4.1 or scans QR code
5. **Network Selection**: User selects home WiFi and enters password
6. **Automatic Connection**: TV connects to home network and stops AP
7. **Success**: TV proceeds to main application

## Technical Implementation

### QR Code Format

The system supports standard WiFi QR codes:
```
WIFI:T:WPA;S:NetworkName;P:Password;H:false;;
```

Where:
- `T`: Security type (WPA, WEP, or nopass)
- `S`: Network SSID
- `P`: Network password
- `H`: Hidden network (true/false)

### Soft AP Configuration

- **Network Name**: SmartTV-Setup
- **IP Address**: 192.168.4.1
- **Security**: Open (no password required)
- **DHCP Range**: 192.168.4.2 - 192.168.4.20

### System Dependencies

For Raspberry Pi deployment:
- `hostapd`: WiFi access point daemon
- `dnsmasq`: DHCP server
- `wpa_supplicant`: WiFi client connection
- `iwconfig`/`iwlist`: Network interface tools

## Development vs Production

### Development Mode (Laptop Testing)

- WiFi checking is bypassed (simulated as connected)
- QR code scanning works with laptop camera
- Soft AP functionality is simulated
- All UI components work for testing

### Production Mode (Raspberry Pi)

- Real WiFi status checking
- Actual soft AP creation with hostapd
- System-level network configuration
- Hardware camera integration

## Testing Instructions

### 1. Test QR Code Generation

1. Open `test-qr-wifi.html` in a browser
2. Enter WiFi credentials (SSID, password, security type)
3. Generate QR code
4. Save or display the QR code for testing

### 2. Test on Laptop

1. Start the Electron app:
   ```bash
   ./node_modules/.bin/electron . --no-sandbox --dev
   ```

2. The app should show the homepage (development mode)

3. To test WiFi onboarding, temporarily modify the development check:
   ```javascript
   // In main.js, comment out the development check
   // if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
   //     return true;
   // }
   ```

4. Restart the app - it should show the WiFi onboarding screen

### 3. Test QR Code Scanning

1. The QR code scanner starts automatically when the onboarding page loads
2. Point laptop camera at the generated QR code
3. Verify the WiFi credentials are detected and displayed
4. The system will automatically connect to the detected network

### 4. Test Soft AP Setup

1. The soft AP starts automatically when the onboarding page loads
2. Verify the setup network status is displayed
3. Check that the QR code is generated for the setup URL
4. Test the web interface by opening `wifi-credentials.html`

## Raspberry Pi Deployment

### Prerequisites

Install required packages:
```bash
sudo apt-get update
sudo apt-get install hostapd dnsmasq
```

### Configuration Files

The system automatically creates:
- `/tmp/hostapd.conf`: Access point configuration
- `/tmp/dnsmasq.conf`: DHCP server configuration
- `/etc/wpa_supplicant/wpa_supplicant.conf`: WiFi client configuration

### Permissions

Ensure the application has sudo access for network operations:
```bash
# Add to /etc/sudoers (use visudo)
pi ALL=(ALL) NOPASSWD: /usr/sbin/hostapd, /usr/sbin/dnsmasq, /sbin/ip, /usr/sbin/iwconfig, /usr/sbin/iwlist
```

### Auto-start

Configure the application to start on boot:
```bash
# Add to /etc/rc.local or create systemd service
cd /path/to/SmartTV-UI
./node_modules/.bin/electron . --no-sandbox --kiosk
```

## Mobile App Integration

The Android mobile app works seamlessly with the WiFi onboarding system:

1. **No Initial Control**: Mobile app cannot control TV until WiFi is connected
2. **Automatic Setup**: TV automatically starts both QR scanning and soft AP on startup
3. **Connection Discovery**: App can scan for SmartTV devices on the network after WiFi setup
4. **Remote Control**: Once WiFi is connected, mobile app provides full remote control
5. **Fallback**: If WiFi connection is lost, system returns to onboarding mode

### Android App Development

The mobile app is configured for Android-only development using EAS (Expo Application Services):

- **Build Commands**:
  ```bash
  npm run build:dev        # Development APK
  npm run build:preview    # Preview APK
  npm run build:production # Production AAB
  ```

- **Testing on Device**:
  ```bash
  npm run android         # Run on connected device/emulator
  ```

- **QR Code Setup**: The mobile app can generate WiFi QR codes for easy TV setup
- **Network Detection**: App automatically detects available SmartTV devices on the network

## Security Considerations

1. **Soft AP Security**: Setup network is open but only active during setup
2. **Credential Handling**: WiFi passwords are handled securely and not logged
3. **Network Isolation**: Setup network is isolated from main network
4. **Automatic Cleanup**: Soft AP is automatically disabled after successful connection

## Troubleshooting

### Common Issues

1. **Camera Access**: Ensure camera permissions are granted
2. **QR Code Detection**: Verify QR code format is correct
3. **Network Conflicts**: Check for conflicting network configurations
4. **Permission Errors**: Verify sudo access for network operations

### Debug Mode

Enable debug logging:
```bash
DEBUG=wifi-manager ./node_modules/.bin/electron . --no-sandbox
```

### Reset Network Configuration

```bash
# Reset to factory WiFi settings
sudo rm /etc/wpa_supplicant/wpa_supplicant.conf
sudo systemctl restart wpa_supplicant
```

## Future Enhancements

- **WPS Support**: Add WiFi Protected Setup support
- **Enterprise Networks**: Support for WPA Enterprise
- **Bluetooth Setup**: Alternative setup method via Bluetooth
- **Captive Portal**: Automatic captive portal detection
- **Multiple Networks**: Support for multiple saved networks