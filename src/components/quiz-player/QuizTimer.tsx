import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuizTimerProps {
  expiresAt: string;
  onExpire: () => void;
}

export function QuizTimer({ expiresAt, onExpire }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: number;
    seconds: number;
    totalSeconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));

      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, totalSeconds: 0 });
        onExpire();
        return;
      }

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setTimeLeft({ minutes, seconds, totalSeconds: diff });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (!timeLeft) return null;

  const isWarning = timeLeft.totalSeconds <= 120; // 2 minutes remaining
  const formattedMinutes = String(timeLeft.minutes).padStart(2, "0");
  const formattedSeconds = String(timeLeft.seconds).padStart(2, "0");

  return (
    <div aria-live="polite" aria-atomic="true" className="flex items-center gap-1.5">
      <Badge
        variant={isWarning ? "destructive" : "outline"}
        className={`flex items-center gap-1.5 font-mono text-sm px-3 py-1 ${
          isWarning ? "animate-pulse" : "bg-card text-foreground"
        }`}
      >
        <Clock className="size-4" />
        <span>
          {formattedMinutes}:{formattedSeconds}
        </span>
      </Badge>
    </div>
  );
}
