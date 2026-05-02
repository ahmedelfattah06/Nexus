import { useListSessions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, TrendingUp, Star, Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export default function AnalyticsPage() {
  const { t, lang } = useLanguage();
  const sessions = useListSessions();

  const data = sessions.data || [];
  const totalMinutes = data.reduce((acc, s) => acc + s.duration, 0);
  const totalSessions = data.length;
  const avgScore = totalSessions > 0 ? Math.round(data.reduce((acc, s) => acc + s.focusScore, 0) / totalSessions) : 0;

  const dayLabels = lang === "ar" ? DAYS_AR : DAYS;

  const now = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const daySessions = data.filter(s => s.date.startsWith(dateStr));
    return {
      label: dayLabels[d.getDay()],
      minutes: daySessions.reduce((acc, s) => acc + s.duration, 0),
      sessions: daySessions.length,
    };
  });

  const maxMinutes = Math.max(...last7.map(d => d.minutes), 1);
  const bestDay = last7.reduce((best, d) => d.minutes > best.minutes ? d : best, last7[0]);

  const stats = [
    { label: t.analytics.totalSessions, value: totalSessions, icon: Calendar, color: "text-primary" },
    { label: t.analytics.focusTime, value: `${totalMinutes}m`, icon: Timer, color: "text-blue-500" },
    { label: t.analytics.avgScore, value: `${avgScore}%`, icon: TrendingUp, color: "text-green-500" },
    { label: t.analytics.bestDay, value: bestDay?.label || "—", icon: Star, color: "text-amber-500" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-serif">{t.analytics.title}</h1>
        <p className="text-muted-foreground mt-1">{t.analytics.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-semibold">{sessions.isLoading ? "—" : value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{t.analytics.weeklyChart}</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <Timer className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t.analytics.noData}</p>
              <p className="text-muted-foreground/60 text-xs mt-1">{t.analytics.noDataHint}</p>
            </div>
          ) : (
            <div className="flex items-end gap-3 h-48 pt-4">
              {last7.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">{day.minutes > 0 ? `${day.minutes}m` : ""}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                    <div
                      className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
                      style={{ height: `${(day.minutes / maxMinutes) * 100}%`, minHeight: day.minutes > 0 ? "4px" : "0" }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.slice(-5).reverse().map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{s.duration} {t.analytics.minutes}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>Focus: {s.focusScore}%</span>
                    <span className="text-xs">{s.date.split("T")[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
