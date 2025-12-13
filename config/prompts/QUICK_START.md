# Quick Start - Prompt Configuration 🚀

## 📍 **Where Are All The Prompts?**

```
config/prompts/
├── movie-recommendations.ts    ← Movie AI prompts
├── tvshow-recommendations.ts   ← TV show AI prompts
└── search.ts                   ← Search prompts
```

---

## 🎯 **Common Tasks**

### **1. Change Movie Exclusion Rules**

**File:** `movie-recommendations.ts`  
**Section:** Look for `🚨 CRITICAL RULES`

```typescript
// Line ~183
userPrompt += `🚨 CRITICAL RULES - YOU MUST FOLLOW THESE:\n`;
userPrompt += `1. DO NOT recommend ANY movies listed above...\n`;
// ↑ Edit these rules
```

---

### **2. Update Language Names**

**File:** `movie-recommendations.ts`  
**Section:** `LANGUAGE_DESCRIPTIONS`

```typescript
// Line ~154
export const LANGUAGE_DESCRIPTIONS: Record<string, string> = {
  English: 'Hollywood/English',
  Hindi: 'Bollywood/Hindi',
  // ↑ Add more languages here
  French: 'French Cinema',  // NEW
};
```

---

### **3. Change Search JSON Format**

**File:** `search.ts`  
**Function:** `buildSearchQueryPrompt()`

```typescript
// Line ~21
Return your response in the following JSON format ONLY:
{
  "results": [
    {
      "title": "Movie or Show Title",
      "year": 2023,
      // ↑ Add more fields here
      "director": "Name",  // NEW
    }
  ]
}
```

---

### **4. Adjust Recency Bias (Newer Movies)**

**File:** `movie-recommendations.ts`  
**Section:** Critical Rules → Rule 5

```typescript
// Line ~188
userPrompt += `5. Focus on newer movies (2020-2024) and highly rated films...\n`;
// ↑ Change years here
```

---

## 🧪 **Test Your Changes**

### **Quick Test:**
1. Edit prompt file
2. Save (hot-reload in dev)
3. Go to browser
4. Test feature (AI picks / search)
5. Check if it works ✅

### **Check Logs:**
```bash
tail -100 logs/app-2025-11-15.log | grep "SMART_PICKS\|PERPLEXITY"
```

---

## 📚 **Full Documentation**

- **Comprehensive guide:** [`README.md`](./README.md)
- **Migration details:** [`/PROMPT_CONFIGURATION_MIGRATION.md`](../../PROMPT_CONFIGURATION_MIGRATION.md)

---

## 🆘 **Need Help?**

| Issue | Solution |
|-------|----------|
| **Prompt not updating** | Restart dev server |
| **Import error** | Check `index.ts` exports |
| **TypeScript error** | Run `npx tsc --noEmit config/prompts/*.ts` |
| **API broken** | Check logs for error messages |

---

## ✨ **Example: Add Streaming Info**

### **Before:**
```typescript
userPrompt += `- Movie title\n`;
userPrompt += `- Release year\n`;
userPrompt += `- IMDb rating\n`;
```

### **After:**
```typescript
userPrompt += `- Movie title\n`;
userPrompt += `- Release year\n`;
userPrompt += `- IMDb rating\n`;
userPrompt += `- Streaming platforms (Netflix, Prime, etc.)\n`; // ✅ NEW
```

### **Test:**
1. Save `movie-recommendations.ts`
2. Go to Home → "AI Picks"
3. Check if AI returns streaming info

---

**Happy prompt engineering! 🎉**

