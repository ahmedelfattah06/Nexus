import { useState, useEffect, useRef } from "react";
import { useCreateSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Pause, RotateCcw, Coffee, Brain, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Pomodoro", minutes: 25, icon: Brain, color: "text-primary" },
  { label: "Short Break", minutes: 5, icon: Coffee, color: "text-accent-foreground" },
  { label: "Long Break", minutes: 15, icon: Coffee, color: "text-accent-foreground" },
  { label: "Deep Work", minutes: 90, icon: Zap, color: "text-amber-500" },
];

export default function FocusPage() {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [quality, setQuality] = useState(80);
  const [sessionName, setSessionName] = useState("Focus Session");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();
  const createSession = useCreateSession();

  useEffect(() => {
    if (running) {
      if (!startTimeRef.current) startTimeRef.current = new Date();
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDone(true);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function setPreset(minutes: number) {
    setRunning(false);
    setDone(false);
    setTotalSeconds(minutes * 60);
    setRemaining(minutes * 60);
    startTimeRef.current = null;
  }

  function handleReset() {
    setRunning(false);
    setDone(false);
    setRemaining(totalSeconds);
    startTimeRef.current = null;
  }

  async function handleSaveSession() {
    try {
      await createSession.mutateAsync({
        data: {
          duration: Math.round((totalSeconds - remaining) / 60) || Math.round(totalSeconds / 60),
          focusScore: quality,
          tasksCompleted: 0,
          date: new Date().toISOString(),
        },
      });
      qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      setDone(false);
      setRemaining(totalSeconds);
      startTimeRef.current = null;
      toast({ title: "Session recorded! Great work! 🎉" });
    } catch {
      toast({ title: "Failed to save session", variant: "destructive" });
    }
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-serif">Focus Mode</h1>
        <p className="text-muted-foreground mt-1">Deep work, one session at a time</p>
      </div>

      <div className="flex gap-2 mb-10 flex-wrap">
        {PRESETS.map(({ label, minutes, icon: Icon, color }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            onClick={() => setPreset(minutes)}
            className="gap-2"
            data-testid={`preset-${label.toLowerCase().replace(/\s/g, "-")}`}
          >
            <Icon className={cn("w-3.5 h-3.5", color)} />
            {label} · {minutes}m
          </Button>
        ))}
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-64 h-64 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {done ? (
              <CheckCircle2 className="w-12 h-12 text-primary" />
            ) : (
              <>
                <span className="font-mono text-5xl font-medium tabular-nums" data-testid="timer-display">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground mt-1">{running ? "Stay focused" : "Ready"}</span>
              </>
            )}
          </div>
        </div>

        {done ? (
          <Card className="w-full mb-6">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-serif text-xl text-center">Session complete! 🎉</h3>
              <div>
                <label className="text-sm font-medium mb-2 block">Session name</label>
                <input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-transparent outline-none focus:ring-2 focus:ring-ring"
                  data-testid="session-name-input"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Focus quality</span>
                  <span className="text-muted-foreground">{quality}%</span>
                </div>
                <Slider
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  min={0}
                  max={100}
                  step={5}
                  data-testid="quality-slider"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSaveSession} disabled={createSession.isPending} data-testid="save-session-button">
                  {createSession.isPending ? "Saving..." : "Save Session"}
                </Button>
                <Button variant="outline" onClick={handleReset} data-testid="reset-after-done">
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              variant="outline"
              onClick={handleReset}
              className="w-12 h-12 rounded-full"
              data-testid="reset-timer"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setRunning((r) => !r)}
              className="w-16 h-16 rounded-full text-lg"
              data-testid="start-pause-timer"
            >
              {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </Button>
            <div className="w-12 h-12" />
          </div>
        )}
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">
          "The key is not to prioritize what's on your schedule, but to schedule your priorities."
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">— Stephen Covey</p>
      </div>
    </div>
  );
}
