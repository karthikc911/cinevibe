# ✅ LLM Prompt Templates - Now Centralized!

All LLM prompt templates have been moved to `/config/prompts/` for easy review and updates.

---

## 📁 **Quick Access**

| File | Purpose | Lines |
|------|---------|-------|
| [`prompts/QUICK_START.md`](./prompts/QUICK_START.md) | **⚡ Start here!** Quick guide | 120 |
| [`prompts/README.md`](./prompts/README.md) | Full documentation | 400+ |
| [`prompts/movie-recommendations.ts`](./prompts/movie-recommendations.ts) | Movie AI prompts | 160 |
| [`prompts/tvshow-recommendations.ts`](./prompts/tvshow-recommendations.ts) | TV show AI prompts | 130 |
| [`prompts/search.ts`](./prompts/search.ts) | Search prompts | 70 |

---

## 🎯 **What Changed?**

### **Before:**
```
❌ Prompts scattered across 3+ API files
❌ ~220 lines of hardcoded prompts
❌ Need to edit backend code
❌ No documentation
```

### **After:**
```
✅ All prompts in config/prompts/
✅ ~160 lines (reusable functions)
✅ Edit config files only
✅ 500+ lines of documentation
```

---

## 🚀 **Start Here:**

1. **Read:** [`prompts/QUICK_START.md`](./prompts/QUICK_START.md) (2 min)
2. **Review prompts:**
   - Movie recommendations: `prompts/movie-recommendations.ts`
   - TV show recommendations: `prompts/tvshow-recommendations.ts`
   - Search: `prompts/search.ts`
3. **Edit and test!**

---

## 📊 **Files Updated**

| API Route | Status |
|-----------|--------|
| `/api/search/smart-picks/route.ts` | ✅ Using config |
| `/api/search/perplexity/route.ts` | ✅ Using config |
| `/api/search/analyze-query/route.ts` | ✅ Using config |

All APIs continue to work exactly as before, but prompts are now easy to update!

---

## 🎉 **Benefits**

- ✅ **Easy to review** - All prompts in one place
- ✅ **Easy to update** - Edit config files, not API code
- ✅ **Safe** - No risk of breaking API logic
- ✅ **Documented** - 500+ lines of guides and examples
- ✅ **Testable** - Hot-reload in development

---

**For full details, see:** [`/PROMPT_CONFIGURATION_MIGRATION.md`](../PROMPT_CONFIGURATION_MIGRATION.md)

