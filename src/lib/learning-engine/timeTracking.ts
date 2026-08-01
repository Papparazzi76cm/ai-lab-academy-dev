/**
  Class managing active lesson time tracking. Respects Page Visibility API and Window Focus events.
 */
export class ActiveTimeTracker {
  private isTracking = false;
  private isActive = true;
  private startTime: number | null = null;
  private accumulatedSeconds = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private onFlush: (seconds: number) => void;
  private flushIntervalMs: number;

  constructor(onFlush: (seconds: number) => void, flushIntervalMs = 30000) {
    this.onFlush = onFlush;
    this.flushIntervalMs = flushIntervalMs;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleWindowBlur = this.handleWindowBlur.bind(this);
    this.handleWindowFocus = this.handleWindowFocus.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
  }

  public start() {
    if (this.isTracking) return;
    this.isTracking = true;
    this.isActive = typeof document !== "undefined" ? document.visibilityState === "visible" : true;

    if (this.isActive) {
      this.startTime = Date.now();
    }

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
      window.addEventListener("blur", this.handleWindowBlur);
      window.addEventListener("focus", this.handleWindowFocus);
      window.addEventListener("beforeunload", this.handlePageHide);
      window.addEventListener("pagehide", this.handlePageHide);
    }

    this.timerId = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  public pause() {
    if (!this.isActive || !this.startTime) return;
    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    if (elapsedSeconds > 0) {
      this.accumulatedSeconds += elapsedSeconds;
    }
    this.startTime = null;
    this.isActive = false;
  }

  public resume() {
    if (this.isActive) return;
    this.isActive = true;
    this.startTime = Date.now();
  }

  public flush() {
    if (this.isActive && this.startTime) {
      const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      if (elapsedSeconds > 0) {
        this.accumulatedSeconds += elapsedSeconds;
      }
      this.startTime = Date.now();
    }

    if (this.accumulatedSeconds > 0) {
      const toFlush = this.accumulatedSeconds;
      this.accumulatedSeconds = 0;
      this.onFlush(toFlush);
    }
  }

  public stop() {
    if (!this.isTracking) return;

    this.flush();

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      window.removeEventListener("blur", this.handleWindowBlur);
      window.removeEventListener("focus", this.handleWindowFocus);
      window.removeEventListener("beforeunload", this.handlePageHide);
      window.removeEventListener("pagehide", this.handlePageHide);
    }

    this.isTracking = false;
    this.startTime = null;
  }

  private handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      this.resume();
    } else {
      this.pause();
    }
  }

  private handleWindowBlur() {
    this.pause();
  }

  private handleWindowFocus() {
    this.resume();
  }

  private handlePageHide() {
    this.stop();
  }
}
