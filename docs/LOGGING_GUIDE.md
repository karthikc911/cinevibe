# 📋 CineVibe Logging Guide

## ✅ File-Based Production Logging

Your app now has **production-ready file-based logging** that persists across server restarts!

---

## 📂 Log Files Location

```
/Users/kc/my_personalGit/cinemate/logs/
```

### File Naming Convention
- **Daily logs**: `app-YYYY-MM-DD.log`
- **Example**: `app-2025-11-12.log`

---

## 🎯 Features

✅ **Dual Output**
- Console (colored, formatted, easy to read)
- Files (plain text, permanent, searchable)

✅ **Log Rotation**
- Automatically rotates when a file exceeds **10MB**
- Keeps **7 days** of logs (older logs auto-deleted)

✅ **Log Levels** (Info-only, no debug noise)
- `INFO` - General information, API requests, operations
- `WARN` - Warnings, non-critical issues
- `ERROR` - Errors with full stack traces

✅ **Smart Logging**
- Server-side only (no file logging from browser)
- Timestamped entries
- Contextual tags (`[API]`, `[DATABASE]`, `[AUTH]`, etc.)

---

## 🔍 Viewing Logs

### Real-Time Monitoring
```bash
# Watch logs as they happen
tail -f logs/app-$(date +%Y-%m-%d).log

# Follow all logs with color
tail -f logs/*.log
```

### Search Logs
```bash
# Find all errors
grep "ERROR" logs/*.log

# Find specific API calls
grep "/api/movies" logs/*.log

# Search by date
cat logs/app-2025-11-12.log | grep "01:47"
```

### View Last 50 Lines
```bash
tail -50 logs/app-$(date +%Y-%m-%d).log
```

### List All Log Files
```bash
ls -lh logs/
```

---

## 📊 Log Format

### Console Output (Colored)
```
[2025-11-12 01:47:53] 📘 INFO [MOVIES_API] Fetching movies
{
  "language": "en",
  "limit": 3,
  "sort": "rating"
}
```

### File Output (Plain Text)
```
[2025-11-12 01:47:53] INFO [MOVIES_API] Fetching movies
{
  "language": "en",
  "limit": 3,
  "sort": "rating"
}
```

---

## 🛠️ Using the Logger in Your Code

The logger is available globally via `@/lib/logger`:

### Basic Usage
```typescript
import { logger } from '@/lib/logger';

// Info level
logger.info('CONTEXT', 'Your message here');
logger.info('CONTEXT', 'Message with data', { key: 'value' });

// Warning level
logger.warn('CONTEXT', 'Warning message', { details: 'info' });

// Error level
logger.error('CONTEXT', 'Error occurred', error);
```

### Specialized Loggers
```typescript
// API requests
logger.apiRequest('GET', '/api/movies', 200);

// Database operations
logger.dbOperation('SELECT', 'Movie', 'filtering by language');

// Authentication
logger.auth('User logged in', 'user@example.com');

// Client-side (console only, no file)
logger.client('COMPONENT', 'Button clicked', { buttonId: 'submit' });
```

---

## 🗂️ Log Rotation

### Automatic Rotation
- **When**: File exceeds 10MB
- **How**: Renamed to `app-YYYY-MM-DD-HH-MM-SS.log`
- **New file**: Created with original name

### Retention Policy
- **Keeps**: Last 7 log files (by modification date)
- **Deletes**: Files older than 7 days automatically

---

## 🔧 Configuration

Edit `/lib/logger.ts` to customize:

```typescript
private maxLogSize = 10 * 1024 * 1024; // 10MB (change to adjust rotation size)
private maxLogFiles = 7;                // Keep 7 days (change to keep more/less)
```

---

## 📦 What Gets Logged?

### API Requests
```
[API] GET /api/movies?language=hi&limit=2
```

### Database Operations
```
[MOVIES_API] Fetching movies
[MOVIES_API] Found 2 movies (total: 25)
```

### Authentication
```
[API] GET /api/auth/session (0ms)
```

### Errors (with full stack trace)
```
[ERROR] [API] Failed to fetch movies
{
  "name": "PrismaClientKnownRequestError",
  "message": "Connection failed",
  "stack": "..."
}
```

---

## 🚫 What's NOT Logged?

- Sensitive data (passwords, API keys, tokens)
- Debug-level verbose output
- Client-side browser console logs (unless using `logger.client()`)

---

## 💡 Tips

### Debugging Production Issues
1. Check today's log: `cat logs/app-$(date +%Y-%m-%d).log`
2. Search for errors: `grep "ERROR" logs/*.log`
3. Find specific user: `grep "user@example.com" logs/*.log`

### Performance Monitoring
```bash
# Find slow API calls (> 1000ms)
grep "in [0-9][0-9][0-9][0-9]ms" logs/*.log
```

### Log Analysis
```bash
# Count API calls by endpoint
grep "\[API\]" logs/*.log | awk '{print $5}' | sort | uniq -c | sort -nr

# Count errors by context
grep "ERROR" logs/*.log | awk '{print $4}' | sort | uniq -c
```

---

## ✅ Status Check

Your logging system is **ACTIVE** and working! 🎉

- ✅ Logs to console (colored)
- ✅ Logs to files (persistent)
- ✅ Auto-rotation enabled
- ✅ Retention policy active
- ✅ Info-level only (no debug spam)

---

## 🆘 Troubleshooting

### No log files appearing?
- Check if `/logs` directory exists: `ls -la logs/`
- Logs are created on first API call/log entry
- Make sure server is running

### Log files too large?
- Reduce `maxLogSize` in `/lib/logger.ts`
- Check for infinite loops or excessive logging

### Need more history?
- Increase `maxLogFiles` in `/lib/logger.ts`
- Consider archiving old logs to external storage

---

## 🔒 Security Note

Log files are **excluded from Git** (added to `.gitignore`), so sensitive data in logs won't be committed to version control.

However, **never log**:
- Passwords
- API keys
- OAuth tokens
- Session secrets
- Credit card numbers
- Personal identifiable information (PII) without consent

---

**Happy Logging! 📝**

