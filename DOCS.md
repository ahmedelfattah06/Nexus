# Nexus — دليل التشغيل والإعداد

## ما هو Nexus؟
Nexus هو workspace إنتاجي ذكي يشبه Notion، يجمع الملاحظات، المهام، العادات، الأهداف، القراءة، البطاقات التعليمية، والذكاء الاصطناعي في مكان واحد.

## المتطلبات
- Node.js 24+
- pnpm
- PostgreSQL
- Clerk
- إعدادات AI الخاصة بـ Replit/Anthropic

## ملفات البيئة المطلوبة
### api-server
- `DATABASE_URL`
- `SESSION_SECRET`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### nexus frontend
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL`
- `BASE_PATH` غالبًا `/`

## التشغيل محليًا أو على Replit
1. ثبّت الحزم:
```bash
pnpm install
```
2. ادفع الـ schema لقاعدة البيانات:
```bash
pnpm --filter @workspace/db run push
```
3. شغّل الـ workflows:
- `artifacts/api-server`
- `artifacts/nexus`

## الروابط الأساسية
- الصفحة الرئيسية: `/`
- تسجيل الدخول: `/sign-in`
- إنشاء حساب: `/sign-up`
- لوحة الأدمن: `/admin`

## تشغيل الـ AI
- صفحة الـ AI هي `/nex`
- الردود بتوصل streaming عبر SSE
- الاقتباس اليومي في الـ dashboard
- لو ظهر 429 في اليومية فده بسبب rate limiting الطبيعي

## الأدمن
- الأدمن مش يوزر/باسورد منفصل
- أول مستخدم يفتح `/admin` ويضغط `Claim First Admin Role` يبقى admin
- بعد وجود admin، باقي الوصول للأدمن يظل محمي

## أوامر مفيدة
```bash
pnpm run typecheck
pnpm run typecheck:libs
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
```
