# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartTV is a hybrid application consisting of an Electron-based desktop UI for Smart TVs and a Python Flask backend server. The application provides video calling capabilities via Twilio and multiplayer trivia games, designed specifically for large screen TV interfaces with gesture-friendly navigation.

## Architecture

### Four-Component System
1. **Electron App** (`Electron_App/SmartTV-UI/`) - Main desktop application
2. **Flask Server** (`server_side/`) - Backend API services  
3. **Mobile App** (`MobileApp/SmartTVRemote/`) - Android remote control app
4. **Kiosk Configuration** (`kiosk/`) - Linux TV deployment setup

### Technology Stack
- **Frontend**: Electron 28.0.0 with vanilla HTML/CSS/JavaScript
- **Backend**: Flask 5.1.0 with Twilio SDK integration
- **Mobile**: React Native/Expo with EAS builds (Android-only)
- **Build**: Electron Forge with security fuses and cross-platform packaging
- **Deployment**: Linux kiosk mode with hardware acceleration

## Development Commands

### Electron Application
```bash
cd Electron_App/SmartTV-UI/

# Development
npm start                    # Start in development mode with Electron Forge
npm run dev                  # Alternative development command

# Building
npm run package             # Package application (no installer)
npm run make                # Build distributables (DMG, DEB, ZIP, AppImage)
npm run dist                # Build Linux distribution
```

### Flask Server
```bash
cd server_side/

# Install dependencies
pip install flask flask-cors python-dotenv twilio

# Run server
python app.py              # Starts on port 3001 by default
# or set custom port: PORT=5000 python app.py
```

### Mobile App (Android)
```bash
cd MobileApp/SmartTVRemote/

# Install dependencies
npm install

# Development
npm start                  # Start Expo development server
npm run android            # Run on Android device/emulator

# EAS Building
npm run build:dev          # Development APK build
npm run build:preview      # Preview APK build
npm run build:production   # Production AAB build
npm run submit             # Submit to Google Play Store
```

### Environment Setup
Create `server_side/.env` with:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
PORT=3001
```

## Key Application Architecture

### Electron Main Process (`main.js`)
- Creates 1280x800 window optimized for TV screens
- Supports fullscreen mode for kiosk deployment
- Security-hardened with context isolation and node integration disabled

### Frontend Pages
- **`homepage.html`** - Main dashboard/landing interface
- **`video-call.html`** - Twilio-powered video calling interface
- **`trivia-game.html`** - Multiplayer trivia game with WebSocket support
- **`gamepage.html`** - Game selection and navigation

### Backend API Structure
- **`app.py`** - Flask application factory with CORS enabled
- **`api/twilio_routes.py`** - Twilio API endpoints (`/api/token`, `/api/health`)
- **`services/twilio_service.py`** - Twilio business logic and service layer

### Build Configuration
The `forge.config.js` implements:
- Cross-platform packaging (macOS DMG, Linux DEB/AppImage, Windows)
- Security fuses for runtime hardening
- Auto-unpack natives for binary dependencies
- ASAR packaging with integrity verification

## Deployment Considerations

### Kiosk Mode (`kiosk/xinit.rc.md`)
Linux TV deployment script handles:
- D-Bus session management for system integration
- PipeWire audio setup for modern Linux audio
- Screen blanking prevention for always-on displays
- Hardware-accelerated video via VA-API
- Chromium browser launch with TV-optimized flags

### Security Features
- Electron Fuses enabled for runtime security
- Context isolation and disabled node integration
- CORS properly configured for cross-origin requests
- Environment variable management for secrets

## Communication Flow

1. Electron UI makes HTTP requests to Flask server (port 3001)
2. Flask server generates Twilio access tokens for video calls
3. Frontend establishes WebRTC connections via Twilio's infrastructure
4. Trivia games use WebSocket connections for real-time multiplayer

## File Organization Patterns

- Frontend assets and pages are in `Electron_App/SmartTV-UI/`
- Backend follows Flask blueprint pattern with `api/` and `services/` separation
- Build outputs go to `out/` directory (gitignored)
- Kiosk deployment scripts are in dedicated `kiosk/` directory

## Development Notes

- The app is designed for TV interfaces - UI elements are large and gesture-friendly
- Video calling requires Twilio credentials and internet connectivity
- Cross-platform builds are configured but primarily targets Linux for TV deployment
- The Flask server runs independently and can be deployed separately from the Electron app