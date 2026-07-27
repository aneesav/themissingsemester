import {
  useCreateSession,
  useGetSession,
  useGetActiveSession,
  useStopSession,
  getGetActiveSessionQueryKey,
  getGetSessionQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, Play, CheckCircle2, AlertCircle, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Launches a fresh sandbox notebook — a clean Jupyter environment on the
 * standard course image, not attached to any lesson (lessonId is null).
 */
export function SandboxCard() {
  const queryClient = useQueryClient();

  const { data: activeSessionData } = useGetActiveSession();
  const activeSession = activeSessionData?.session;

  const isSandboxActive = !!activeSession && activeSession.lessonId == null;
  const isLessonActive = !!activeSession && activeSession.lessonId != null;

  const [pollingSessionId, setPollingSessionId] = useState<number | null>(null);

  const { data: polledSession } = useGetSession(pollingSessionId || 0, {
    query: {
      enabled: !!pollingSessionId,
      queryKey: getGetSessionQueryKey(pollingSessionId || 0),
      refetchInterval: (query) => {
        const data = query.state?.data as any;
        if (data?.status === "error" || data?.status === "stopped") return false;
        // Heartbeat while running so the reaper keeps the session alive.
        if (data?.status === "running") return 60_000;
        return 3000;
      },
      refetchIntervalInBackground: true,
    },
  });

  // Resume polling an already-active sandbox after a page reload.
  useEffect(() => {
    if (isSandboxActive && activeSession && !pollingSessionId) {
      setPollingSessionId(activeSession.id);
    }
  }, [isSandboxActive, activeSession, pollingSessionId]);

  const createSession = useCreateSession();
  const stopSession = useStopSession();

  const currentSession = pollingSessionId
    ? polledSession
    : isSandboxActive
      ? activeSession
      : null;
  const status = currentSession?.status;

  const handleLaunch = () => {
    createSession.mutate(
      { data: {} },
      {
        onSuccess: (newSession) => {
          setPollingSessionId(newSession.id);
          queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        },
      },
    );
  };

  const handleStop = () => {
    const sessionId = currentSession?.id ?? activeSession?.id;
    if (!sessionId) return;
    stopSession.mutate(
      { sessionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
          setPollingSessionId(null);
        },
      },
    );
  };

  return (
    <Card className="mb-10 border-dashed">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FlaskConical size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">Sandbox notebook</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Spin up a blank Jupyter environment with all course tools pre-installed —
                no lesson attached. Experiment freely with your own data and code.
              </p>
            </div>
          </div>

          <div className="shrink-0 md:text-right">
            {status === "starting" ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                Provisioning (~15 seconds)...
              </div>
            ) : status === "running" && currentSession?.containerUrl ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1 text-sm text-success mr-1">
                  <CheckCircle2 size={16} /> Ready
                </span>
                <a href={currentSession.containerUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="gap-2">
                    <Play size={16} className="fill-current" /> Open Notebook
                  </Button>
                </a>
                <Button variant="outline" onClick={handleStop} disabled={stopSession.isPending} className="gap-2">
                  <Square size={14} /> {stopSession.isPending ? "Stopping..." : "Stop"}
                </Button>
              </div>
            ) : status === "error" ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle size={16} /> Failed to start
                </span>
                <Button variant="outline" onClick={handleLaunch} disabled={createSession.isPending}>
                  Try Again
                </Button>
              </div>
            ) : isLessonActive ? (
              <span className="text-sm text-muted-foreground">
                Stop your active lesson session to launch a sandbox.
              </span>
            ) : (
              <Button onClick={handleLaunch} disabled={createSession.isPending} className="gap-2">
                <Play size={16} className="fill-current" />
                {createSession.isPending ? "Launching..." : "Launch Sandbox"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
