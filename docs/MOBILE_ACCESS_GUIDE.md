# 📱 Mobile Access & Centralized Logging Setup Guide

## ✅ What's Been Configured

### 1. **Centralized Logging System** ✅
- Created `/lib/logger.ts` - Info-level logging only
- Disabled Prisma debug query logs
- Added API request logging middleware
- Clean, colorful terminal output

### 2. **ngrok Integration** ⏳
- ngrok installed via Homebrew
- Needs account setup (see below)

---

## 🚀 Step 1: Set Up ngrok Account (FREE)

### **1.1 Create Free Account**
1. Go to: **https://dashboard.ngrok.com/signup**
2. Sign up with Google/GitHub (instant, free)
3. No credit card required!

### **1.2 Get Your Authtoken**
1. After signup, visit: **https://dashboard.ngrok.com/get-started/your-authtoken**
2. Copy your authtoken (looks like: `2a...`)
3. Run this command in your terminal:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
   ```

---

## 🌐 Step 2: Start ngrok Tunnel

### **2.1 Start ngrok**
```bash
ngrok http 3000
```

**You'll see output like:**
```
Session Status                online
Account                       your-email@gmail.com
Version                       3.31.0
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123xyz.ngrok-free.app -> http://localhost:3000
```

### **2.2 Copy Your ngrok URL**
Copy the **Forwarding** URL (e.g., `https://abc123xyz.ngrok-free.app`)

---

## 🔧 Step 3: Update Environment Variables

### **3.1 Update `.env.local`**
```bash
cd /Users/kc/my_personalGit/cinemate
```

Edit `.env.local` and change:
```env
NEXTAUTH_URL="https://YOUR-NGROK-URL.ngrok-free.app"
```

**Example:**
```env
NEXTAUTH_URL="https://abc123xyz.ngrok-free.app"
```

### **3.2 Copy to `.env`**
```bash
cp .env.local .env
```

---

## 🔑 Step 4: Add ngrok URL to Google OAuth

### **4.1 Go to Google Cloud Console**
1. Visit: **https://console.cloud.google.com/apis/credentials**
2. Select your project
3. Click on your **OAuth 2.0 Client ID**

### **4.2 Add Authorized JavaScript Origins**
Add your ngrok URL:
```
https://abc123xyz.ngrok-free.app
```

### **4.3 Add Authorized Redirect URIs**
Add:
```
https://abc123xyz.ngrok-free.app/api/auth/callback/google
```

### **4.4 Click "Save"** ✅

**⚠️ Important**: Keep your existing `http://localhost:3000` entries for local development!

---

## 🎬 Step 5: Restart Dev Server

### **5.1 Stop Current Server**
In your terminal where `npm run dev` is running:
- Press `Ctrl + C`

### **5.2 Restart with ngrok URL**
```bash
npm run dev
```

---

## 📱 Step 6: Access from Mobile

### **Option A: Using ngrok URL (Recommended)**
On your mobile device, open:
```
https://abc123xyz.ngrok-free.app
```

**Benefits:**
- ✅ Works from anywhere (not just WiFi)
- ✅ HTTPS (secure)
- ✅ Google OAuth works perfectly

### **Option B: Using WiFi IP (Without OAuth)**
If you don't need login:
```
http://10.0.0.184:3000
```

**Limitations:**
- ⚠️ Only works on same WiFi
- ⚠️ HTTP (not secure)
- ❌ Google OAuth won't work (requires domain)

---

## 📊 Step 7: View Centralized Logs

### **What You'll See:**

**Before (Debug Logs):**
```
prisma:query SELECT * FROM Movie WHERE...
prisma:query INSERT INTO WatchlistItem...
GET /api/movies 200 in 92ms
```

**After (Info Logs Only):**
```
[2025-01-12 10:30:45] 📘 INFO [MOVIES_API] Fetching movies
  {
    "language": "en",
    "limit": 25,
    "sort": "rating"
  }
[2025-01-12 10:30:45] 📘 INFO [MOVIES_API] Found 25 movies (total: 168)
[2025-01-12 10:30:46] 📘 INFO [API] POST /api/watchlist (329ms)
```

**Clean, readable, info-level only!** 🎯

---

## 🛠️ Advanced: Keep ngrok URL Permanent (Paid)

### **Free Tier Limitation:**
- ngrok URL changes every time you restart
- Need to update `.env.local` and Google OAuth each time

### **Paid Plan ($10/month):**
- Static subdomain: `https://cinemate.ngrok.io`
- No need to update config each time
- Sign up: **https://ngrok.com/pricing**

---

## 📝 Quick Reference Commands

### **Start Everything:**
```bash
# Terminal 1: Start ngrok
ngrok http 3000

# Terminal 2: Copy ngrok URL, update .env.local, then:
npm run dev

# Terminal 3: View logs in real-time
tail -f /tmp/ngrok.log  # ngrok logs
```

### **Update Environment:**
```bash
# After getting new ngrok URL
echo 'NEXTAUTH_URL="https://new-url.ngrok-free.app"' >> .env.local
cp .env.local .env
```

### **Check Logs:**
```bash
# View app logs (already in terminal with npm run dev)

# View ngrok web interface (requests, replays, etc.)
open http://127.0.0.1:4040
```

---

## 🎯 Complete Flow

1. **Setup (One-time)**:
   - Sign up for ngrok
   - Add authtoken: `ngrok config add-authtoken YOUR_TOKEN`

2. **Each Session**:
   - Start ngrok: `ngrok http 3000`
   - Copy URL (e.g., `https://abc123.ngrok-free.app`)
   - Update `.env.local` with new URL
   - Update Google OAuth with new URL
   - Restart dev server: `npm run dev`

3. **Access**:
   - Mobile: `https://abc123.ngrok-free.app`
   - Laptop: `http://localhost:3000`

4. **View Logs**:
   - All in one terminal with clean formatting!

---

## ✅ Summary

### **Logging** ✅
- Info-level logs only
- No debug queries
- Centralized in one place
- Color-coded and readable

### **Mobile Access** ⏳
- ngrok installed
- Waiting for your account setup
- 5-minute setup

### **Next Steps:**
1. Create ngrok account (free, instant)
2. Add authtoken
3. Start `ngrok http 3000`
4. Update `.env.local` and Google OAuth
5. Access from mobile! 📱

**Need help?** Let me know and I'll guide you through any step! 🚀

