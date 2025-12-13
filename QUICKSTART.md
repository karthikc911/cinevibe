# 🚀 Quick Start Guide - CineMate

## Start Development Server

```bash
npm run dev
```

**Server will run at:** http://localhost:3000

---

## Keep Supabase Database Active

Run every 5-6 days to prevent auto-pause:

```bash
npm run db:ping
```

Or use any of these methods:
- `npx prisma db execute --stdin <<< "SELECT 1;"`
- `npm run db:studio` (opens GUI)
- Enable GitHub Actions workflow (automatic)

---

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run db:ping      # Ping Supabase
npm run db:studio    # Database GUI
npm run db:migrate   # Run migrations
```

---

📚 **Full docs:** [/docs](docs/) folder

