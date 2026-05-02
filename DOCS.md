# Nexus — توثيق تفصيلي شامل

> **نيكسس** هو مساحة عمل إنتاجية مدعومة بالذكاء الاصطناعي، مصممة كبديل متكامل لـ Notion، مع ميزات إضافية تخص المطورين والطلاب، ودعم كامل للغة العربية مع تخطيط RTL.

---

## 1. نظرة عامة على المشروع

### ما هو Nexus؟
تطبيق ويب متكامل (Full-Stack) يضم:
- **ملاحظات ذكية** مُنظَّمة في مساحات عمل (Workspaces)
- **مهام كانبان** مرتبطة بكل مساحة عمل
- **مكتبة أكواد** شخصية مع تمييز صياغي (Syntax highlighting)
- **وضع تركيز** مبني على تقنية بومودورو مع تسجيل الجلسات
- **مساعد ذكاء اصطناعي (نيكس)** مبني على Claude من Anthropic
- **متتبع عادات** يومي مع سلاسل متواصلة (Streaks)
- **إدارة أهداف** مع نسبة تقدم وحالة
- **متتبع مزاج** يومي
- **مفضلة (Bookmarks)** مع بحث وفلترة
- **قائمة قراءة** مع تتبع التقدم
- **بطاقات حفظ (Flashcards)** مع وضع مذاكرة تفاعلي
- **إحصائيات** أسبوعية للإنتاجية
- **دعم كامل للغتين** العربية (RTL) والإنجليزية (LTR)

---

## 2. بنية المشروع (Monorepo Architecture)

المشروع مبني كـ pnpm monorepo. جميع الحزم تحت مظلة واحدة:

```
workspace-root/
├── artifacts/
│   ├── nexus/              ← الواجهة الأمامية (React + Vite)
│   ├── api-server/         ← الخادم (Express 5 + Node)
│   └── mockup-sandbox/     ← بيئة معاينة المكونات (تطوير)
├── lib/
│   ├── db/                 ← Drizzle ORM: schema + migrations
│   ├── api-spec/           ← OpenAPI spec (openapi.yaml) + Orval codegen
│   ├── api-zod/            ← Zod schemas مولَّدة تلقائياً
│   ├── api-client-react/   ← React Query hooks مولَّدة تلقائياً
│   └── integrations-anthropic-ai/  ← Claude client via Replit AI proxy
├── scripts/                ← أدوات مساعدة (utility scripts)
├── pnpm-workspace.yaml     ← تعريف حزم المشروع + catalog
├── tsconfig.base.json      ← إعدادات TypeScript المشتركة
└── tsconfig.json           ← Solution file لـ libs فقط
```

### كيف يتواصل الـ Frontend مع الـ Backend؟
- الـ Frontend يشتغل على منفذ عشوائي (من متغير `$PORT`)
- الـ API Server يشتغل على منفذ 8080، مسار `/api`
- **Reverse Proxy** يوجّه الطلبات حسب المسار:
  - `/api/*` → API Server
  - `/` → Nexus Frontend
- الـ Frontend يستخدم URLs نسبية مثل `/api/workspaces` — لا يحتاج يعرف رقم المنفذ.

---

## 3. Stack التقني التفصيلي

### الواجهة الأمامية (Frontend) — `artifacts/nexus`

| الأداة | الإصدار | الغرض |
|---|---|---|
| React | 19 | UI Library |
| Vite | آخر إصدار | Build tool + Dev server |
| TailwindCSS | v4 | Styling |
| shadcn/ui | — | مكونات UI جاهزة |
| wouter | — | Client-side routing |
| TanStack Query | v5 | Server state management + caching |
| Clerk (React) | v6 | Authentication UI |
| Orval (generated) | — | React Query hooks مولَّدة من OpenAPI |
| Lucide React | — | أيقونات |
| Recharts | — | رسوم بيانية (Analytics page) |

### الخادم (Backend) — `artifacts/api-server`

| الأداة | الإصدار | الغرض |
|---|---|---|
| Node.js | 24 | Runtime |
| Express | 5 | HTTP Framework |
| Drizzle ORM | — | Database ORM |
| PostgreSQL | — | قاعدة البيانات |
| Clerk (Express) | v6 | Auth middleware |
| Pino | — | Structured logging |
| Zod | v4 | Input validation |
| drizzle-zod | — | توليد Zod schemas من DB schema |

### الذكاء الاصطناعي

- **النموذج**: `claude-sonnet-4-6` من Anthropic
- **الوصول**: عبر Replit AI Integrations proxy (لا حاجة لـ API Key مباشر)
- **الاستخدامات**:
  1. محادثة عامة (Nex chat) — Streaming SSE
  2. اقتباس يومي ملهم (Daily Quote) — JSON response

---

## 4. قاعدة البيانات (Database Schema)

قاعدة البيانات PostgreSQL تضم **16 جدولاً**:

### جداول المحتوى الأساسي

#### `workspaces` — مساحات العمل
```
id          serial PRIMARY KEY
userId      text NOT NULL           ← Clerk User ID
name        text NOT NULL
icon        text                    ← إيموجي أو نص
color       text                    ← كود لون hex
createdAt   timestamp
updatedAt   timestamp
```

#### `pages` — الصفحات (الملاحظات)
```
id            serial PRIMARY KEY
workspaceId   int → workspaces(id)
userId        text NOT NULL
title         text NOT NULL
content       text                  ← محتوى Markdown
createdAt     timestamp
updatedAt     timestamp
```

#### `tasks` — المهام (كانبان)
```
id            serial PRIMARY KEY
workspaceId   int → workspaces(id)
userId        text NOT NULL
title         text NOT NULL
status        text                  ← 'todo' | 'in_progress' | 'done'
priority      text                  ← 'low' | 'medium' | 'high'
dueDate       timestamp
createdAt     timestamp
updatedAt     timestamp
```

#### `snippets` — الأكواد
```
id           serial PRIMARY KEY
userId       text NOT NULL
language     text NOT NULL          ← 'javascript' | 'python' | ...
description  text                   ← label/عنوان الكود
code         text NOT NULL
createdAt    timestamp
updatedAt    timestamp
```

#### `focus_sessions` — جلسات التركيز
```
id              serial PRIMARY KEY
userId          text NOT NULL
duration        int NOT NULL        ← بالدقائق
focusScore      int                 ← من 1 إلى 5
tasksCompleted  int
date            timestamp
createdAt       timestamp
```

### جداول الذكاء الاصطناعي (Nex Chat)

#### `conversations` — المحادثات
```
id        serial PRIMARY KEY
userId    text NOT NULL
title     text
createdAt timestamp
updatedAt timestamp
```

#### `messages` — الرسائل
```
id              serial PRIMARY KEY
conversationId  int → conversations(id)
role            text     ← 'user' | 'assistant'
content         text NOT NULL
createdAt       timestamp
```

### جداول الإنتاجية الجديدة

#### `habits` — العادات
```
id        serial PRIMARY KEY
userId    text NOT NULL
name      text NOT NULL
icon      text          ← إيموجي مثل 💪
color     text          ← hex مثل #3B82F6
createdAt timestamp
```

#### `habit_logs` — سجلات العادات اليومية
```
id        serial PRIMARY KEY
habitId   int → habits(id)
userId    text NOT NULL
date      text NOT NULL   ← 'YYYY-MM-DD'
createdAt timestamp
```
> ملاحظة: لمعرفة streak العادة، يتم حساب الأيام المتواصلة عبر habit_logs.

#### `goals` — الأهداف
```
id          serial PRIMARY KEY
userId      text NOT NULL
title       text NOT NULL
description text
targetDate  timestamp
progress    int DEFAULT 0   ← من 0 إلى 100 (نسبة مئوية)
status      text DEFAULT 'active'  ← 'active' | 'completed' | 'paused'
createdAt   timestamp
updatedAt   timestamp
```

#### `moods` — سجلات المزاج
```
id        serial PRIMARY KEY
userId    text NOT NULL
score     int NOT NULL    ← من 1 إلى 5
note      text
date      text NOT NULL   ← 'YYYY-MM-DD'
createdAt timestamp
```

### جداول المعرفة

#### `bookmarks` — المفضلة
```
id          serial PRIMARY KEY
userId      text NOT NULL
url         text NOT NULL
title       text
description text
tags        text[]          ← مصفوفة من التاجات
createdAt   timestamp
updatedAt   timestamp
```

#### `reading_items` — قائمة القراءة
```
id        serial PRIMARY KEY
userId    text NOT NULL
title     text NOT NULL
author    text
url       text
status    text DEFAULT 'want_to_read'  ← 'want_to_read' | 'reading' | 'completed'
progress  int DEFAULT 0    ← من 0 إلى 100
notes     text
createdAt timestamp
updatedAt timestamp
```

#### `flashcard_sets` — مجموعات بطاقات الحفظ
```
id          serial PRIMARY KEY
userId      text NOT NULL
name        text NOT NULL
description text
createdAt   timestamp
updatedAt   timestamp
```

#### `flashcards` — البطاقات الفردية
```
id        serial PRIMARY KEY
setId     int → flashcard_sets(id)
userId    text NOT NULL
front     text NOT NULL    ← السؤال أو المصطلح
back      text NOT NULL    ← الإجابة أو التعريف
createdAt timestamp
updatedAt timestamp
```

---

## 5. الـ API Endpoints التفصيلية

جميع الـ endpoints تبدأ بـ `/api` وتتطلب مصادقة Clerk (عدا `/api/healthz`).

### Health
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/healthz` | فحص صحة الخادم |

### Workspaces
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/workspaces` | جلب كل مساحات عمل المستخدم |
| POST | `/api/workspaces` | إنشاء مساحة عمل جديدة |
| GET | `/api/workspaces/:id` | جلب مساحة عمل محددة |
| PATCH | `/api/workspaces/:id` | تعديل مساحة عمل |
| DELETE | `/api/workspaces/:id` | حذف مساحة عمل |

### Pages (ملاحظات)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/workspaces/:workspaceId/pages` | جلب صفحات مساحة عمل |
| POST | `/api/workspaces/:workspaceId/pages` | إنشاء صفحة جديدة |
| GET | `/api/pages/:id` | جلب صفحة محددة |
| PATCH | `/api/pages/:id` | تعديل صفحة |
| DELETE | `/api/pages/:id` | حذف صفحة |

### Tasks (مهام كانبان)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/workspaces/:workspaceId/tasks` | جلب مهام مساحة عمل |
| POST | `/api/workspaces/:workspaceId/tasks` | إنشاء مهمة |
| PATCH | `/api/tasks/:id` | تعديل مهمة (status, priority, ...) |
| DELETE | `/api/tasks/:id` | حذف مهمة |

### Snippets (أكواد)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/snippets` | جلب كل أكواد المستخدم |
| POST | `/api/snippets` | إضافة كود جديد |
| DELETE | `/api/snippets/:id` | حذف كود |

### Focus Sessions (جلسات التركيز)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/sessions` | جلب كل جلسات المستخدم |
| POST | `/api/sessions` | تسجيل جلسة جديدة |

### Dashboard
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/dashboard/stats` | إحصائيات عامة (مهام، جلسات، صفحات) |
| GET | `/api/dashboard/today-tasks` | مهام اليوم |
| GET | `/api/dashboard/recent-pages` | آخر الصفحات المعدّلة |

### Nex AI
| Method | Path | الوصف |
|---|---|---|
| POST | `/api/nex/chat` | إرسال رسالة، الرد Streaming SSE |
| GET | `/api/nex/conversations` | جلب قائمة المحادثات |
| GET | `/api/nex/conversations/:id/messages` | جلب رسائل محادثة |
| DELETE | `/api/nex/conversations/:id` | حذف محادثة |
| GET | `/api/nex/daily-quote` | اقتباس يومي من Claude |

### Habits (عادات)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/habits` | جلب عادات المستخدم |
| POST | `/api/habits` | إنشاء عادة جديدة |
| DELETE | `/api/habits/:id` | حذف عادة |
| POST | `/api/habits/:id/log` | تسجيل إنجاز عادة اليوم |
| DELETE | `/api/habits/:id/log/today` | إلغاء إنجاز اليوم |

### Bookmarks (مفضلة)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/bookmarks` | جلب مفضلة المستخدم |
| POST | `/api/bookmarks` | إضافة رابط جديد |
| DELETE | `/api/bookmarks/:id` | حذف رابط |

### Reading List (قراءة)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/reading` | جلب قائمة القراءة |
| POST | `/api/reading` | إضافة كتاب/مقال |
| PATCH | `/api/reading/:id` | تحديث التقدم أو الحالة |
| DELETE | `/api/reading/:id` | حذف من القائمة |

### Flashcards (بطاقات حفظ)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/flashcard-sets` | جلب كل المجموعات |
| POST | `/api/flashcard-sets` | إنشاء مجموعة |
| GET | `/api/flashcard-sets/:id/cards` | جلب بطاقات مجموعة |
| POST | `/api/flashcard-sets/:id/cards` | إضافة بطاقة |
| DELETE | `/api/flashcard-sets/:id` | حذف مجموعة |
| DELETE | `/api/flashcards/:id` | حذف بطاقة |

### Moods (مزاج)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/moods` | جلب سجلات المزاج |
| POST | `/api/moods` | تسجيل مزاج |

### Goals (أهداف)
| Method | Path | الوصف |
|---|---|---|
| GET | `/api/goals` | جلب أهداف المستخدم |
| POST | `/api/goals` | إنشاء هدف |
| PATCH | `/api/goals/:id` | تحديث هدف (progress, status) |
| DELETE | `/api/goals/:id` | حذف هدف |

---

## 6. الصفحات والـ Routing

### صفحات عامة (بدون تسجيل دخول)
| المسار | الملف | الوصف |
|---|---|---|
| `/` | `landing.tsx` | الصفحة الرئيسية — موجَّهة للـ Dashboard إذا مسجّل |
| `/sign-in` | داخل `App.tsx` | صفحة تسجيل الدخول (Clerk) |
| `/sign-up` | داخل `App.tsx` | صفحة إنشاء حساب (Clerk) |

### صفحات محمية (تتطلب تسجيل دخول)
| المسار | الملف | الوصف |
|---|---|---|
| `/dashboard` | `dashboard.tsx` | لوحة التحكم الرئيسية |
| `/workspaces` | `workspaces.tsx` | قائمة مساحات العمل |
| `/workspaces/:id/pages` | `pages.tsx` | ملاحظات مساحة عمل |
| `/workspaces/:id/tasks` | `tasks.tsx` | كانبان مساحة عمل |
| `/snippets` | `snippets.tsx` | مكتبة الأكواد |
| `/focus` | `focus.tsx` | وضع التركيز (بومودورو) |
| `/nex` | `nex.tsx` | محادثة مع المساعد الذكي |
| `/habits` | `habits.tsx` | متتبع العادات |
| `/goals` | `goals.tsx` | الأهداف |
| `/mood` | `mood.tsx` | متتبع المزاج |
| `/analytics` | `analytics.tsx` | الإحصائيات |
| `/bookmarks` | `bookmarks.tsx` | المفضلة |
| `/reading` | `reading.tsx` | قائمة القراءة |
| `/flashcards` | `flashcards.tsx` | بطاقات الحفظ |

### آلية الحماية
```
ProtectedRoute (في App.tsx):
  ├── إذا مسجّل دخول → يعرض <Layout>{children}</Layout>
  └── إذا لم يسجّل → يحوّل لـ /sign-in
```

---

## 7. نظام المصادقة (Authentication)

المصادقة تعتمد على **Clerk v6** بالكامل.

### الطريقة
1. Clerk يوفر UI جاهز لـ Sign In / Sign Up
2. بعد تسجيل الدخول، Clerk يعطي **JWT Token**
3. كل طلب API يحمل هذا التوكن في الـ `Authorization: Bearer ...` header
4. الـ API Server يتحقق من التوكن عبر `clerkMiddleware()` و `getAuth(req)` من `@clerk/express`
5. كل route محمي يسحب `userId` من `getAuth(req).userId`

### مكونات Clerk المستخدمة
- `<ClerkProvider>` — Wrapper رئيسي في `App.tsx`
- `<SignIn>` و `<SignUp>` — صفحات جاهزة بتصميم مخصص
- `<Show when="signed-in/signed-out">` — إظهار/إخفاء محتوى
- `<UserButton>` — زرار حساب المستخدم في الـ sidebar
- `publishableKeyFromHost()` — لاكتشاف الـ publishable key تلقائياً
- `ClerkQueryInvalidator` — component مخصص يمسح React Query cache عند تغيير المستخدم

---

## 8. نظام اللغة والـ RTL

### كيف يعمل؟

1. **`LanguageContext.tsx`** (`artifacts/nexus/src/contexts/`) — React Context يخزّن اللغة الحالية
2. عند تغيير اللغة:
   - يُحفظ في `localStorage` بمفتاح `nexus-lang`
   - يُضاف `dir="rtl"` أو `dir="ltr"` على `<html>`
   - يُضاف `lang="ar"` أو `lang="en"` على `<html>`
   - تُضاف/تُزال class اسمها `rtl` على `<html>`
3. **`translations.ts`** يحتوي على كل النصوص في اللغتين
4. كل component يستخدم `const { t, isRTL } = useLanguage()` لجلب الترجمة والاتجاه

### الخطوط
- **إنجليزي**: Inter (body) + Cormorant Garamond (عناوين serif)
- **عربي**: Cairo (يُفعَّل عبر CSS: `html[lang="ar"] body { font-family: 'Cairo' }`)
- الخطوط تُحمَّل من Google Fonts في `index.css`

### الـ RTL Layout
- الـ sidebar يظهر على اليمين في العربي (عبر `dir="rtl"` على الـ flex container)
- أيقونات الـ navigation تنعكس (`flex-row-reverse` على عناصر الـ nav)
- الحدود المنطقية (`border-e`) تنعكس تلقائياً مع `dir`

---

## 9. نظام الذكاء الاصطناعي (Nex)

### مساعد الدردشة

- المستخدم يكتب رسالة في صفحة `/nex`
- الـ Frontend يرسل `POST /api/nex/chat` بـ `{ conversationId, message }`
- الـ API Server يسترجع تاريخ المحادثة من DB، يبني `messages[]` ويرسلها لـ Claude
- Claude يرد بـ **Streaming** — الخادم يبث الرد كـ Server-Sent Events (SSE)
- الـ Frontend يستقبل الـ stream ويظهر الرد حرفاً حرفاً
- بعد انتهاء الـ stream، الرسالتان (user + assistant) تُحفظان في DB

### الاقتباس اليومي
- عند فتح الـ Dashboard، يُرسَل `GET /api/nex/daily-quote`
- الخادم يطلب من Claude اقتباساً ملهماً موجزاً بـ JSON format
- `{ quote: "...", author: "..." }` يُعرض في بطاقة "إلهام اليوم"

---

## 10. توليد الكود (Code Generation)

### OpenAPI → React Query Hooks
1. OpenAPI spec محفوظة في `lib/api-spec/openapi.yaml`
2. أداة **Orval** تقرأ هذا الـ spec وتولّد تلقائياً:
   - **Zod schemas** في `lib/api-zod/src/generated/`
   - **React Query hooks** في `lib/api-client-react/src/generated/`
3. كل hook اسمه مشتق من `operationId` في الـ spec:
   - `listWorkspaces` → `useListWorkspaces()`
   - `createWorkspace` → `useCreateWorkspace()`
   - `deleteWorkspace` → `useDeleteWorkspace()`
4. الصفحات تستخدم هذه الـ hooks مباشرة بدلاً من كتابة fetch يدوياً

```bash
# أمر إعادة توليد الـ hooks بعد تعديل openapi.yaml
pnpm --filter @workspace/api-spec run codegen
```

---

## 11. ميزات كل صفحة بالتفصيل

### 11.1 Dashboard (لوحة التحكم)
- **تحية ذكية**: صباح الخير / مساء الخير حسب الوقت
- **4 إحصائيات سريعة**: مهام منجزة، جلسات تركيز، ملاحظات مكتوبة، أيام متواصلة
- **اقتباس يومي**: يُولَّد بـ Claude ويُخزَّن في cache لساعة
- **آخر الصفحات**: آخر 5 صفحات تم تعديلها
- **روابط سريعة**: بطاقات للوصول السريع للميزات الجديدة

### 11.2 Workspaces (مساحات العمل)
- قائمة مساحات العمل بأيقونات وألوان
- إنشاء مساحة جديدة بنموذج popup
- كل مساحة عمل لها رابط لـ Pages ورابط لـ Tasks

### 11.3 Pages (ملاحظات)
- قائمة صفحات المساحة + محرر Markdown
- حفظ تلقائي عند الكتابة (debounced)
- إنشاء وحذف الصفحات

### 11.4 Tasks (كانبان)
- 3 أعمدة: Todo / In Progress / Done
- سحب وإفلات بين الأعمدة
- إضافة مهام مع الأولوية وتاريخ الانتهاء

### 11.5 Code Snippets (مكتبة الأكواد)
- فلترة حسب لغة البرمجة
- نسخ الكود بزرار واحد
- إضافة وحذف الأكواد

### 11.6 Focus Mode (التركيز)
- **4 أوضاع جاهزة**:
  - بومودورو: 25 دقيقة
  - استراحة قصيرة: 5 دقائق
  - استراحة طويلة: 15 دقيقة
  - عمل عميق: 90 دقيقة
- عداد تنازلي بصري
- بعد انتهاء الجلسة: تقييم جودة التركيز (1–5) ثم حفظها

### 11.7 Nex AI (المساعد)
- محادثة مستمرة مع تاريخ محفوظ
- دعم Streaming (الرد يظهر تدريجياً)
- إنشاء محادثة جديدة
- قائمة بالمحادثات السابقة

### 11.8 Habit Tracker (العادات)
- إضافة عادة بأيقونة ولون مخصصَين
- تسجيل إنجاز العادة اليوم بضغطة زر
- عرض السلسلة المتواصلة (Streak) بعدد الأيام
- جدول إنجازات مرئي لكل عادة

### 11.9 Goals (الأهداف)
- إضافة هدف بعنوان، وصف، وتاريخ مستهدف
- شريط تقدم قابل للتعديل (0–100%)
- 3 حالات: نشط / منجز / متوقف
- عرض التاريخ المستهدف مع حساب الأيام المتبقية

### 11.10 Mood Tracker (المزاج)
- تقييم المزاج من 1 إلى 5 مع إيموجي وعنوان (سيء جداً → رائع)
- إضافة ملاحظة نصية مع كل تسجيل
- سجل تاريخي بكل التسجيلات السابقة

### 11.11 Analytics (الإحصائيات)
- **4 بطاقات ملخص**: إجمالي وقت التركيز، عدد الجلسات، متوسط درجة التركيز، أفضل يوم
- **رسم بياني أسبوعي**: بار تشارت يعرض دقائق التركيز لكل يوم (Recharts)

### 11.12 Bookmarks (المفضلة)
- حفظ روابط مع عنوان ووصف وتاجات
- عرض favicon الموقع تلقائياً (`favicon.ico`)
- بحث في العنوان والوصف والتاجات

### 11.13 Reading List (قراءة)
- إضافة كتاب/مقال مع اسم المؤلف ورابط (اختياري)
- 3 حالات: أريد القراءة / أقرأ الآن / انتهيت
- شريط تقدم قابل للسحب (0–100%)
- ملاحظات شخصية لكل كتاب

### 11.14 Flashcards (بطاقات الحفظ)
- إنشاء مجموعات (Sets) بأسماء وأوصاف
- إضافة بطاقات لكل مجموعة (وجه + ظهر)
- **وضع المذاكرة**: يعرض بطاقة واحدة، اضغط "اقلب" للإجابة، ثم التالي/السابق
- عرض عدد البطاقات في كل مجموعة

---

## 12. Design System التفصيلي

### الألوان (CSS Variables)
```css
/* الوضع الفاتح (Default) */
--background:    hsl(36, 22%, 97%)    /* كريمي فاتح */
--foreground:    hsl(25, 18%, 12%)    /* بني داكن */
--primary:       hsl(38, 72%, 46%)    /* ذهبي دافئ */
--sidebar:       hsl(36, 18%, 94%)    /* رمادي فاتح */
--muted:         hsl(36, 14%, 88%)    /* رمادي أفتح */
--border:        hsl(36, 14%, 85%)    /* حدود رمادية */
--card:          hsl(0, 0%, 100%)     /* أبيض */

/* الوضع الداكن */
--background:    hsl(25, 18%, 8%)     /* بني داكن جداً */
--primary:       hsl(38, 72%, 52%)    /* ذهبي أكثر إشراقاً */
```

### الخطوط
```css
/* Cormorant Garamond — للعناوين الرئيسية */
.font-serif { font-family: var(--app-font-serif); }

/* Inter — جسم النص الإنجليزي */
html[lang="en"] body { font-family: 'Inter', system-ui, sans-serif; }

/* Cairo — جسم النص العربي */
html[lang="ar"] body { font-family: 'Cairo', system-ui, sans-serif; }
```

### Dark/Light Mode
- يُحكَم بـ `data-theme` attribute على `<html>`
- يُخزَّن في `localStorage` بمفتاح `theme`
- Toggle بزرار الشمس/القمر في أسفل الـ sidebar

---

## 13. أوامر التشغيل والتطوير

```bash
# تشغيل كل شيء (عبر Replit Workflows — لا تشغّل يدوياً)
# - API Server: pnpm --filter @workspace/api-server run dev
# - Frontend:   pnpm --filter @workspace/nexus run dev

# TypeScript
pnpm run typecheck           # فحص كامل (libs + artifacts)
pnpm run typecheck:libs      # بناء libs فقط

# توليد الكود من OpenAPI
pnpm --filter @workspace/api-spec run codegen

# قاعدة البيانات
pnpm --filter @workspace/db run push      # دفع الـ schema للـ DB
pnpm --filter @workspace/db run generate  # توليد migration files
```

---

## 14. متغيرات البيئة (Environment Variables)

| المتغير | مكان الاستخدام | الغرض |
|---|---|---|
| `DATABASE_URL` | api-server | سلسلة اتصال PostgreSQL |
| `SESSION_SECRET` | api-server | تشفير الجلسات |
| `PORT` | nexus, api-server | منفذ الخادم (يُعيَّن تلقائياً) |
| `VITE_CLERK_PUBLISHABLE_KEY` | nexus | مفتاح Clerk للواجهة |
| `VITE_CLERK_PROXY_URL` | nexus | proxy URL لـ Clerk |

---

## 15. هيكل ملفات الواجهة الأمامية

```
artifacts/nexus/src/
├── App.tsx                     ← Routing + Clerk + QueryClient
├── main.tsx                    ← Entry point + LanguageProvider
├── index.css                   ← Global styles + Google Fonts + CSS variables
├── components/
│   ├── Layout.tsx              ← Sidebar + navigation + RTL support
│   └── ui/                     ← shadcn/ui components (button, input, card...)
├── contexts/
│   └── LanguageContext.tsx     ← i18n Context (EN/AR + RTL)
├── hooks/
│   └── use-theme.ts            ← Dark/light mode hook
├── i18n/
│   └── translations.ts         ← كل نصوص EN + AR
├── lib/
│   └── utils.ts                ← cn() utility + helpers
└── pages/
    ├── landing.tsx
    ├── dashboard.tsx
    ├── workspaces.tsx
    ├── pages.tsx
    ├── tasks.tsx
    ├── snippets.tsx
    ├── focus.tsx
    ├── nex.tsx
    ├── habits.tsx
    ├── goals.tsx
    ├── mood.tsx
    ├── analytics.tsx
    ├── bookmarks.tsx
    ├── reading.tsx
    ├── flashcards.tsx
    └── not-found.tsx
```

---

## 16. هيكل ملفات الخادم

```
artifacts/api-server/src/
├── index.ts                    ← Express app setup + middleware
├── middleware/
│   └── auth.ts                 ← Clerk auth middleware
└── routes/
    ├── index.ts                ← يجمع كل الـ routers
    ├── health.ts
    ├── workspaces.ts
    ├── pages.ts
    ├── tasks.ts
    ├── snippets.ts
    ├── sessions.ts
    ├── dashboard.ts
    ├── anthropic.ts            ← Nex chat + daily quote
    ├── habits.ts
    ├── bookmarks.ts
    ├── reading.ts
    ├── flashcards.ts
    ├── moods.ts
    └── goals.ts
```

---

*آخر تحديث: مايو 2026*
