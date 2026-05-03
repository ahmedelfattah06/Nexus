# Nexus — دليل التشغيل السريع

## Nexus هو إيه؟
Nexus مساحة عمل إنتاجية ذكية بتجمع الملاحظات، المهام، العادات، الأهداف، المفضلة، القراءة، البطاقات التعليمية، وAI في مكان واحد.

## عشان تشغله على جهازك
1. ثبّت Node.js و pnpm.
2. جهّز PostgreSQL.
3. جهّز Clerk.
4. انسخ ملفات البيئة واملأها بالقيم المطلوبة.
5. شغّل قاعدة البيانات.
6. شغّل الـ backend والـ frontend.

## ملفات البيئة المطلوبة
### api-server
- `DATABASE_URL`
- `SESSION_SECRET`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### nexus frontend
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL`
- `BASE_PATH` وغالبًا يكون `/`

## خطوات التشغيل
```bash
pnpm install
pnpm --filter @workspace/db run push
```

ثم شغّل:
- `pnpm --filter @workspace/api-server run dev`
- `pnpm --filter @workspace/nexus run dev`

## الروابط المهمة
- الصفحة الرئيسية: `/`
- تسجيل الدخول: `/sign-in`
- إنشاء حساب: `/sign-up`
- لوحة الأدمن: `/admin`

## الـ AI شغال إزاي؟
- صفحة الـ AI هي `/nex`
- الردود بتظهر بشكل streaming
- الاقتباس اليومي بيتجاب من نفس منظومة الـ AI
- لو ظهر 429 فده غالبًا rate limit طبيعي

## الأدمن
- أول مستخدم يدخل `/admin` يقدر يضغط `Claim First Admin Role`
- بعدها الحساب ده يبقى الأدمن الأول
- بعد وجود أدمن، الوصول للوحة بيبقى محمي

## لو حصلت مشكلة
- راجع `DATABASE_URL`
- راجع Clerk keys
- تأكد إن قاعدة البيانات اتعملت لها push
- تأكد إن workflow شغال
