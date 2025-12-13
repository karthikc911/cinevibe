# 📱 ngrok Quick Reference Card

## 🚀 Quick Start

```bash
# 1. Start your dev server
npm run dev

# 2. Start ngrok in a new terminal
ngrok http 3000
```

## 🔄 Restart ngrok (when offline)

### One-Line Restart
```bash
pkill ngrok; sleep 2; ngrok http 3000
```

### Step-by-Step
```bash
# Step 1: Stop ngrok
pkill ngrok

# Step 2: Wait a moment
sleep 2

# Step 3: Start ngrok
ngrok http 3000
```

## 🔍 Check Status

### Is ngrok running?
```bash
ps aux | grep ngrok | grep -v grep
```

### Get current URL
```bash
curl -s http://localhost:4040/api/tunnels | python3 -m json.tool | grep public_url
```

### View dashboard
```
http://localhost:4040
```

## ⚠️ Common Errors

| Error | Solution |
|-------|----------|
| `ERR_NGROK_3200` | Tunnel offline - restart ngrok |
| `tunnel session failed: Your account is limited to 1` | Kill existing: `pkill ngrok` |
| `Port 3000 already in use` | Start dev server: `npm run dev` |
| "You are about to visit..." warning | Normal for free accounts - click "Visit Site" |

## 💡 Pro Tips

### Run in Background
```bash
nohup ngrok http 3000 > /tmp/ngrok.log 2>&1 &
```

### Check Background Logs
```bash
cat /tmp/ngrok.log
```

### Stop Background ngrok
```bash
pkill ngrok
```

## 🌐 Get Permanent Domain (Optional)

1. Sign up: [ngrok.com](https://ngrok.com)
2. Get auth token: `ngrok config add-authtoken YOUR_TOKEN`
3. Reserve domain: [dashboard.ngrok.com/cloud-edge/domains](https://dashboard.ngrok.com/cloud-edge/domains)
4. Use it: `ngrok http --domain=your-domain.ngrok-free.app 3000`

---

## 📝 Your Current Setup

**Current URL:** `https://tina-unwandering-beneficially.ngrok-free.dev`

**Remember:**
- Free URLs change on restart
- Sessions timeout after ~2 hours of inactivity
- Computer sleep/hibernate will kill the tunnel
- Always check dashboard at `http://localhost:4040`

---

**Need help?** Check the full documentation in [README.md](README.md#-mobile-access-with-ngrok)

