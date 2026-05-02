# تشغيل Nexus على جهازك خطوة بخطوة

---

## أولاً — التحميل

**في Replit:**
1. اضغط على اسم البروجكت في أعلى الشاشة
2. اختار **"Download as zip"**
3. افتح الملف وفك الضغط في أي مكان على جهازك

---

## ثانياً — ايه اللي تمسحه

بعد الفك، احذف المجلدات والملفات دي لأنها مش محتاجها:

```
❌ node_modules/              ← هيتعمل تاني بعدين
❌ artifacts/nexus/node_modules/
❌ artifacts/api-server/node_modules/
❌ lib/db/node_modules/
❌ (أي مجلد اسمه node_modules في أي مكان)

❌ .local/                    ← خاص بـ Replit
❌ .cache/                    ← خاص بـ Replit
❌ .agents/                   ← خاص بـ Replit
❌ attached_assets/           ← صور مش محتاجها
❌ replit.md                  ← ملف ملاحظات Replit
❌ DOCS.md                    ← اختياري (توثيق)
```

**ابقي على كل الباقي بدون تعديل.**

---

## ثالثاً — البرامج اللي تثبّتها على جهازك

### 1. Node.js
- روح: https://nodejs.org
- حمّل النسخة **LTS** (الأحدث المستقرة)
- بعد التثبيت تأكد: افتح Terminal واكتب `node --version` — المفروض يظهر `v20.x.x` أو أحدث

### 2. pnpm
```bash
npm install -g pnpm
```
تأكد: `pnpm --version`

### 3. PostgreSQL
**خيار أ — محلي (أصعب):**
- روح: https://www.postgresql.org/download
- ثبّته واتذكر الـ password اللي هتحطه للـ `postgres` user

**خيار ب — على الإنترنت مجاناً (أسهل وأنصح بيه):**
- روح: https://supabase.com
- اعمل حساب مجاني
- اعمل Project جديد
- من **Settings → Database** هتلاقي الـ Connection String جاهز (شكله: `postgresql://postgres:...@...supabase.co:5432/postgres`)

---

## رابعاً — إعداد مفاتيح Clerk (المصادقة)

1. روح: https://clerk.com وسجّل حساب مجاني
2. اعمل **Application** جديد
3. من **API Keys** في الـ Dashboard:
   - انسخ **Publishable Key** (بيبدأ بـ `pk_test_...`)
   - انسخ **Secret Key** (بيبدأ بـ `sk_test_...`)

---

## خامساً — إعداد ملفات البيئة (.env)

### للـ API Server:
انسخ الملف:
```bash
cd artifacts/api-server
cp .env.example .env
```
افتح ملف `artifacts/api-server/.env` وعدّل:
```env
PORT=8080
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/nexus
SESSION_SECRET=اكتب-اي-نص-طويل-عشوائي-هنا-مش-مهم-ايه-هو
CLERK_PUBLISHABLE_KEY=pk_test_الكي-بتاعك
CLERK_SECRET_KEY=sk_test_الكي-بتاعك
```

> لو بتستخدم Supabase، الـ DATABASE_URL هيكون اللي نسخته من الـ dashboard مباشرة.

### للـ Frontend:
```bash
cd artifacts/nexus
cp .env.example .env
```
افتح `artifacts/nexus/.env` وعدّل:
```env
PORT=5173
BASE_PATH=/
VITE_CLERK_PUBLISHABLE_KEY=pk_test_الكي-بتاعك
VITE_CLERK_PROXY_URL=
```

---

## سادساً — تثبيت الحزم

افتح Terminal في مجلد البروجكت الرئيسي وشغّل:
```bash
pnpm install
```
هياخد دقيقة أو اتنين. هيثبّت كل الحزم لكل الـ packages تلقائياً.

---

## سابعاً — إنشاء جداول قاعدة البيانات

```bash
pnpm --filter @workspace/db run push
```
هذا الأمر بيقرأ الـ schema ويعمل كل الجداول في قاعدة البيانات تلقائياً.

---

## ثامناً — تشغيل المشروع

محتاج **تيرمينالَين (2 نوافذ)** في نفس الوقت:

**التيرمينال الأول — الخادم (Backend):**
```bash
pnpm --filter @workspace/api-server run dev
```
هتشوف رسالة زي: `Server listening { port: 8080 }`

**التيرمينال الثاني — الواجهة (Frontend):**
```bash
pnpm --filter @workspace/nexus run dev
```
هتشوف رسالة زي: `Local: http://localhost:5173/`

---

## تاسعاً — افتح التطبيق

افتح المتصفح على:
```
http://localhost:5173
```

---

## مشاكل شائعة وحلها

| المشكلة | الحل |
|---|---|
| `pnpm: command not found` | `npm install -g pnpm` |
| `Cannot connect to database` | تأكد إن PostgreSQL شغّال وإن الـ DATABASE_URL صح |
| `Invalid Clerk key` | تأكد إنك نسخت الـ key صح من clerk.com |
| `Port already in use` | غيّر الـ PORT في الـ .env لرقم تاني مثلاً 3000 |
| صفحة بيضاء في المتصفح | افتح الـ developer console وشوف الـ error |

---

## ملخص سريع (للمتقدمين)

```bash
# 1. فك الـ zip وادخل المجلد
cd nexus-project

# 2. ثبّت الحزم
pnpm install

# 3. اعمل ملفات البيئة
cp artifacts/api-server/.env.example artifacts/api-server/.env
cp artifacts/nexus/.env.example artifacts/nexus/.env
# عدّل الملفين بالـ keys بتاعتك

# 4. اعمل جداول قاعدة البيانات
pnpm --filter @workspace/db run push

# 5. شغّل (تيرمينالَين)
pnpm --filter @workspace/api-server run dev   # تيرمينال 1
pnpm --filter @workspace/nexus run dev        # تيرمينال 2

# 6. افتح http://localhost:5173
```
