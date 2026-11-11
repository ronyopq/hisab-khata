# Hisab Khata — হিসাব খাতা

Personal finance (income / expense / accounting) web app. Mobile-first PWA + desktop dashboard.

**Live (planned):** https://ronymoney.vercel.app  
**Stack:** Next.js 16 (App Router) + TypeScript strict + Supabase + Tailwind v4 + shadcn/ui + next-intl (bn/en)

---

## বাংলা — সেটআপ

### ১. Supabase প্রজেক্ট তৈরি
1. https://supabase.com/dashboard → New Project → নাম `hisab-khata`, region `ap-south-1` (Mumbai)
2. Project Settings → API থেকে URL + anon key কপি করুন
3. Authentication → Providers → Google OAuth চালু করুন (Client ID/Secret Google Cloud থেকে)
4. Authentication → URL Configuration → Site URL: `http://localhost:3000`, Redirect URLs: `http://localhost:3000/auth/callback`, `https://ronymoney.vercel.app/auth/callback`

### ২. লোকালে চালানো
```bash
git clone https://github.com/ronyopq/hisab-khata.git
cd hisab-khata
npm install
cp .env.example .env.local
# .env.local-এ Supabase keys বসান
npm run dev
# http://localhost:3000
```

### ৩. ডাটাবেস (Phase 2)
```bash
# Supabase SQL Editor-এ supabase/migrations/*.sql ক্রমানুসারে চালান
# অথবা Supabase CLI:
supabase link --project-ref <ref>
supabase db push
```

### ৪. Vercel ডিপ্লয়
1. GitHub repo → Vercel → Add New Project → `ronymoney`
2. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`
3. Deploy → `ronymoney.vercel.app`

### ৫. Cron (Recurring)
- Vercel Cron: `vercel.json`-এ `/api/cron` daily 00:00 UTC
- Header: `Authorization: Bearer $CRON_SECRET`
- অথবা Supabase pg_cron

---

## English — Setup

### 1. Create Supabase Project
1. New Project `hisab-khata`, region `ap-south-1`
2. Copy URL + anon key from Settings → API
3. Enable Google OAuth, set redirect URLs (localhost + `https://ronymoney.vercel.app`)

### 2. Run Locally
```bash
npm install
cp .env.example .env.local
npm run dev
```

### 3. Database (Phase 2)
Run `supabase/migrations/*.sql` in order via SQL Editor or `supabase db push`.

### 4. Deploy to Vercel
Import GitHub repo as project `ronymoney`, add env vars, deploy.

### 5. Cron
Vercel Cron calls `/api/cron` daily with `CRON_SECRET`.

---

## Project Structure

```
app/(auth)/login, signup, forgot-password, reset-password
app/(app)/dashboard, transactions, wallets, categories, budgets, recurring, loans, goals, reports, books, settings, more
app/invite/[token], app/admin, app/api/cron
components/ui (shadcn), components/layout (Sidebar, BottomNav, TopBar, Fab)
lib/supabase, lib/i18n, lib/format, lib/validators
messages/bn.json, messages/en.json
supabase/migrations/*.sql
```

## UI Base
Adapted from [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) (MIT) — sidebar, command palette, tables, charts patterns. Mobile shell (bottom nav + FAB + Vaul sheet) custom per spec.

## License
MIT
