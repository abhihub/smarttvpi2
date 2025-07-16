# Android Build Guide for SmartTV Remote

This guide covers building the SmartTV Remote app for Android using Expo Application Services (EAS).

## Prerequisites

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure EAS Project**
   ```bash
   eas init
   ```

## Build Profiles

### Development Build
- **Purpose**: For development and testing
- **Output**: APK file
- **Command**: `npm run build:android:dev`

### Preview Build
- **Purpose**: For internal testing and QA
- **Output**: APK file
- **Command**: `npm run build:android:preview`

### Production Build
- **Purpose**: For Google Play Store release
- **Output**: AAB (Android App Bundle)
- **Command**: `npm run build:android:production`

## Build Commands

### Quick Build Commands
```bash
# Development build
npm run build:android:dev

# Preview build (recommended for testing)
npm run build:android:preview

# Production build (for Play Store)
npm run build:android:production
```

### Manual EAS Commands
```bash
# Development build
eas build --platform android --profile development

# Preview build
eas build --platform android --profile preview

# Production build
eas build --platform android --profile production
```

## Local Development

### Running on Device/Emulator
```bash
# Start development server
npm start

# Run on Android device/emulator
npm run android
```

### Development Server
```bash
# Start with QR code
expo start

# Start with specific options
expo start --android --clear
```

## Key Features Configured

- **Android-only builds**: iOS configuration removed
- **Camera permissions**: For QR code scanning
- **Network permissions**: For WiFi connectivity
- **Cleartext traffic**: Allowed for local IP connections
- **Version management**: Automatic version incrementing
- **Build types**: APK for testing, AAB for production

## Build Outputs

- **Development**: APK for easy installation during development
- **Preview**: APK for internal testing and QA
- **Production**: AAB optimized for Google Play Store

## Google Play Store Submission

### Preparation
1. Create a Google Play Console account
2. Generate a service account key
3. Save the key as `android-service-account.json` in the project root

### Submit to Play Store
```bash
npm run submit:android
```

## Update Management

### Over-the-Air Updates
```bash
# Create an update
npm run update

# Update specific channel
eas update --channel preview
```

## Troubleshooting

### Common Issues

1. **Build fails with Gradle errors**
   - Ensure `compileSdkVersion` matches `targetSdkVersion`
   - Check Android build tools version

2. **Network permissions**
   - Verify `usesCleartextTraffic: true` for local IP connections
   - Check network permissions in manifest

3. **Camera not working**
   - Ensure camera permissions are declared
   - Test barcode scanner functionality

### Debug Commands
```bash
# Check build status
eas build:list

# View build logs
eas build:view [build-id]

# Check project configuration
eas config
```

## App Configuration

### Key Settings
- **Package**: `com.smarttvremote`
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)
- **Permissions**: Internet, Network State, WiFi State, Camera, Vibrate

### Build Optimization
- **APK size**: Optimized with proper asset bundling
- **Performance**: Hermes JavaScript engine enabled
- **Security**: Backup disabled, cleartext traffic controlled

## Testing

### Device Testing
1. Install APK from development or preview builds
2. Connect to same WiFi network as SmartTV
3. Test WebSocket connection functionality
4. Verify QR code scanning works

### Local Testing
```bash
# Run on physical device
expo run:android --device

# Run on emulator
expo run:android --emulator
```

## Deployment Workflow

1. **Development**: Use `npm run build:android:dev` for rapid testing
2. **Testing**: Use `npm run build:android:preview` for QA
3. **Production**: Use `npm run build:android:production` for Play Store
4. **Submit**: Use `npm run submit:android` for automated submission

## Next Steps

1. Test builds on various Android devices
2. Set up automated testing pipeline
3. Configure Play Store listing
4. Plan update distribution strategy