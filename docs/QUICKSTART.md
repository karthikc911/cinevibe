# 🚀 Cinemate - Quick Start Guide

## ⚡ Start the Server

```bash
npm run dev
```

**Access the app at:** http://localhost:3000

*(Unauthenticated users will be redirected to the Discover page with login/signup options.)*

---

## 🎯 Key Pages

| Page | URL | Description |
|------|-----|-------------|
| **Discover** | `/discover` | Browse movies with login/signup options |
| **Rate Movies** | `/rate` | Rate movies to build your profile |
| **My Ratings** | `/my-ratings` | View all your ratings with filters (NEW!) |
| **Search** | `/search` | AI-powered search |
| **Watchlist** | `/watchlist` | Manage your watchlist |
| **Profile** | `/profile` | View stats and preferences |
| **Friends** | `/friends` | Connect with friends |

---

## 🎬 New Feature: My Ratings Page

### Access
1. Go to `/rate` page
2. Click **"View My Ratings"** button (top-right)
3. Or navigate to: http://localhost:3000/my-ratings

### Features
- ✅ View ALL rated movies with posters
- ✅ Filter by rating type (Amazing, Good, Meh, Awful, Not Interested)
- ✅ Pagination (12 movies per page)
- ✅ Rating breakdown statistics
- ✅ Color-coded badges with emojis

---

## 🔧 Supabase Keep-Alive

### Automatic (Recommended)
GitHub Actions runs daily to ping the database.

### Manual
```bash
npm run db:ping
```

Run this once per week to prevent Supabase account inactivity.

---

## 📚 Documentation

- **Full Setup**: `README.md`
- **My Ratings Feature**: `docs/MY_RATINGS_PAGE.md`
- **Visual Guide**: `docs/MY_RATINGS_VISUAL_GUIDE.md`
- **Recent Fixes**: `docs/FIXES_DEC_13_2024.md`

---

## 🆘 Quick Troubleshooting

### Server not starting
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process if needed
kill -9 <PID>
```

### Database connection issues
```bash
# Check DATABASE_URL in .env
# Verify Supabase is active
npm run db:ping
```

### Movie posters not loading
- Check TMDB_API_KEY in `.env`
- Verify image domains in `next.config.js`

---

**Happy movie discovery!** 🎉
