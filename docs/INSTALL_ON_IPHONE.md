# 📱 Install CineVibe on Your iPhone

## 3 Ways to Test on Real iPhone

---

## Option 1: Expo Go App (Fastest - No Build Required) ⚡

### Step 1: Install Expo Go
1. Open **App Store** on your iPhone
2. Search for **"Expo Go"**
3. Download and install it (it's free)

### Step 2: Connect to Same Network
- Make sure your iPhone and Mac are on the **same WiFi network**

### Step 3: Start the Development Server
```bash
cd /Users/kc/code/personal/cinemate/cinemate-ios
npx expo start
```

### Step 4: Open on iPhone
**Method A - QR Code:**
1. Look at your terminal - you'll see a QR code
2. Open **Camera app** on iPhone
3. Point at the QR code
4. Tap the notification to open in Expo Go

**Method B - Manual URL:**
1. Open **Expo Go** app on iPhone
2. Tap "Enter URL manually"
3. Enter: `exp://YOUR_MAC_IP:8081`
   - Find your Mac's IP: Run `ipconfig getifaddr en0` in terminal

### ✅ That's it! The app will load on your iPhone.

---

## Option 2: iOS Simulator (See iPhone UI on Mac) 🖥️

### Prerequisites
1. **Install Xcode** from Mac App Store (free, ~12GB)
2. Open Xcode once to complete installation
3. Install iOS Simulator:
   ```bash
   xcode-select --install
   sudo xcode-select -s /Applications/Xcode.app
   ```

### Run in Simulator
```bash
cd /Users/kc/code/personal/cinemate/cinemate-ios
npx expo start --ios
```

This will:
1. Open iOS Simulator automatically
2. Install Expo Go in the simulator
3. Launch your app

### Choose Different iPhone Models
Press `Shift + i` in terminal to select device:
- iPhone 15 Pro Max
- iPhone 15
- iPhone SE
- iPad Pro
- etc.

---

## Option 3: Build Standalone App (For App Store) 📦

### Prerequisites
1. **Apple Developer Account** ($99/year) - [developer.apple.com](https://developer.apple.com)
2. **EAS CLI** installed:
   ```bash
   npm install -g eas-cli
   eas login
   ```

### Step 1: Configure Build
```bash
cd /Users/kc/code/personal/cinemate/cinemate-ios
eas build:configure
```

### Step 2: Build for iOS
```bash
# Development build (for testing)
eas build --profile development --platform ios

# Production build (for App Store)
eas build --profile production --platform ios
```

### Step 3: Install on iPhone

**For Development Build:**
1. Build generates a `.ipa` file
2. Download from the link EAS provides
3. Install via:
   - **Apple Configurator 2** (Mac App Store)
   - **Xcode** → Window → Devices and Simulators → Drag .ipa

**For App Store:**
```bash
eas submit --platform ios
```

---

## Quick Comparison

| Method | Time | Cost | Real Device | App Store |
|--------|------|------|-------------|-----------|
| **Expo Go** | 2 min | Free | ✅ Yes | ❌ No |
| **iOS Simulator** | 10 min | Free | ❌ Mac only | ❌ No |
| **EAS Build** | 20 min | $99/yr | ✅ Yes | ✅ Yes |

---

## 🚀 Fastest Way Right Now

### On Your iPhone:

1. **Download Expo Go** from App Store

2. **On your Mac, run:**
   ```bash
   cd /Users/kc/code/personal/cinemate/cinemate-ios
   npx expo start
   ```

3. **Scan the QR code** with your iPhone camera

4. **App opens in Expo Go** - looks exactly like a native app!

---

## Troubleshooting

### "Network request failed"
- iPhone and Mac must be on same WiFi
- Try: `npx expo start --tunnel` (uses internet instead of local network)

### "Unable to resolve module"
```bash
npx expo start --clear
```

### QR Code not working
1. In terminal, press `s` to switch to Expo Go
2. Or enter URL manually: `exp://192.168.x.x:8081`

### Find Your Mac's IP Address
```bash
ipconfig getifaddr en0
```

---

## What You'll See on iPhone

### Login Screen
- Full-screen gradient background
- CineVibe logo
- Email/password inputs with iOS keyboard
- Touch ID / Face ID ready buttons

### Home Screen
- Native iOS navigation
- Smooth 60fps scrolling
- Movie cards with posters
- Pull-to-refresh gesture
- Tab bar at bottom

### Rating Experience
- Full-screen movie posters
- Haptic feedback on buttons
- Swipe gestures
- Native iOS animations

---

## App Store Checklist (When Ready)

1. ✅ Apple Developer Account ($99/year)
2. ✅ App icons (1024x1024)
3. ✅ Screenshots for different iPhone sizes
4. ✅ App description and keywords
5. ✅ Privacy policy URL
6. ✅ Build with `eas build --platform ios`
7. ✅ Submit with `eas submit --platform ios`

---

## Commands Reference

```bash
# Start development server
npx expo start

# Start with tunnel (works across networks)
npx expo start --tunnel

# Start iOS simulator
npx expo start --ios

# Clear cache and restart
npx expo start --clear

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

