#!/bin/bash

echo "🌐 CineMate Network Access Setup"
echo "================================"
echo ""
echo "To allow WiFi users to authenticate with Google OAuth,"
echo "you need to use a public domain or tunnel service."
echo ""
echo "Choose an option:"
echo ""
echo "1. ngrok (Recommended - Free, Easy)"
echo "2. LocalTunnel (Alternative)"
echo "3. Show current network info"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo ""
    echo "📦 Setting up ngrok..."
    echo ""
    if ! command -v ngrok &> /dev/null; then
      echo "❌ ngrok not found. Installing via Homebrew..."
      brew install ngrok
    fi
    
    echo ""
    echo "🚀 Starting ngrok tunnel..."
    echo ""
    echo "⚠️  IMPORTANT: After ngrok starts, copy the HTTPS URL"
    echo "    Then follow these steps:"
    echo ""
    echo "    1. Add the URL to Google OAuth:"
    echo "       https://console.cloud.google.com/apis/credentials"
    echo ""
    echo "    2. Update .env.local:"
    echo "       NEXTAUTH_URL=\"https://your-ngrok-url.ngrok-free.app\""
    echo ""
    echo "    3. Restart Next.js: npm run dev"
    echo ""
    echo "Press Enter to start ngrok..."
    read
    
    ngrok http 3000
    ;;
    
  2)
    echo ""
    echo "📦 Setting up LocalTunnel..."
    echo ""
    if ! command -v lt &> /dev/null; then
      echo "Installing LocalTunnel..."
      npm install -g localtunnel
    fi
    
    echo ""
    echo "🚀 Starting LocalTunnel..."
    echo ""
    echo "Your URL will be: https://cinemate-dev.loca.lt"
    echo ""
    echo "⚠️  IMPORTANT: Add this to Google OAuth and .env.local"
    echo ""
    
    lt --port 3000 --subdomain cinemate-dev
    ;;
    
  3)
    echo ""
    echo "📊 Current Network Info:"
    echo "========================"
    echo ""
    echo "🖥️  Hostname: $(hostname)"
    echo "🌐 Local IP: $(ipconfig getifaddr en0 || ipconfig getifaddr en1)"
    echo "🔗 Localhost: http://localhost:3000"
    echo "🔗 Network: http://$(ipconfig getifaddr en0 || ipconfig getifaddr en1):3000"
    echo ""
    echo "⚠️  Note: Google OAuth does NOT accept IP addresses."
    echo "   You must use a tunnel service (ngrok/localtunnel)"
    echo "   or a custom domain."
    echo ""
    ;;
    
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

