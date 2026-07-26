import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { 
  useGetLesson, 
  useGetLessonProgress, 
  useCreateSession, 
  useGetSession,
  useGetActiveSession,
  useStopSession,
  getGetActiveSessionQueryKey,
  getGetSessionQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, SquareSquare, Terminal, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function LessonDetail() {
  const { id } = useParams();
  const lessonId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();

  const { data: lesson, isLoading: isLoadingLesson } = useGetLesson(lessonId);
  const { data: progress } = useGetLessonProgress(lessonId);
  
  // Try to find if we have an active session for THIS lesson
  const { data: activeSessionData } = useGetActiveSession();
  const activeSession = activeSessionData?.session;
  
  const isThisLessonActive = activeSession?.lessonId === lessonId;
  const isOtherLessonActive = activeSession && activeSession.lessonId !== lessonId;
  
  // Track the actual session we're polling
  const [pollingSessionId, setPollingSessionId] = useState<number | null>(null);
  
  const { data: polledSession } = useGetSession(pollingSessionId || 0, {
    query: {
      enabled: !!pollingSessionId,
      queryKey: getGetSessionQueryKey(pollingSessionId || 0),
      refetchInterval: (query) => {
        const data = query.state?.data as any;
        if (data?.status === "error" || data?.status === "stopped") return false;
        // While running, keep polling slowly as a heartbeat so the server
        // knows the tab is still open (the reaper stops abandoned containers).
        if (data?.status === "running") return 60_000;
        return 3000;
      },
      // Keep heartbeating even when this tab is unfocused (e.g. the learner
      // is working in the Jupyter tab) so the reaper doesn't kill the session.
      refetchIntervalInBackground: true
    }
  });

  // If a session for this lesson is already active (e.g. page reload),
  // start polling it so the heartbeat keeps it alive.
  useEffect(() => {
    if (isThisLessonActive && activeSession && !pollingSessionId) {
      setPollingSessionId(activeSession.id);
    }
  }, [isThisLessonActive, activeSession, pollingSessionId]);

  const createSession = useCreateSession();
  const stopSession = useStopSession();

  // Determine current effective session
  const currentSession = pollingSessionId ? polledSession : (isThisLessonActive ? activeSession : null);
  const status = currentSession?.status;

  const handleLaunch = () => {
    createSession.mutate({ data: { lessonId } }, {
      onSuccess: (newSession) => {
        setPollingSessionId(newSession.id);
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
      }
    });
  };

  const handleStop = () => {
    if (activeSession) {
      stopSession.mutate({ sessionId: activeSession.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
          setPollingSessionId(null);
        }
      });
    }
  };

  if (isLoadingLesson || !lesson) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Layout>
    );
  }

  const isCompleted = progress?.completedAt;

  return (
    <Layout>
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
        </Link>
        
        <div className="flex items-center gap-3 mb-3">
          <Badge variant="secondary" className="font-mono">MOD {lesson.moduleNum}.{lesson.lessonNum}</Badge>
          {isCompleted && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 size={12} />
              Completed
            </Badge>
          )}
        </div>
        
        <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-4">{lesson.title}</h1>
        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed mb-8">
          {lesson.description}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Main Action Area */}
          <Card className="border-primary/20 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-muted/30 p-8 flex flex-col items-center justify-center min-h-[240px] text-center">
                {isOtherLessonActive ? (
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                      <AlertCircle size={24} />
                    </div>
                    <h3 className="text-lg font-semibold">Another session is running</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      You already have an active notebook running for Lesson {activeSession.lessonId}. 
                      You must stop it before launching this one.
                    </p>
                    <Button variant="outline" onClick={handleStop} disabled={stopSession.isPending} className="mt-2">
                      {stopSession.isPending ? "Stopping..." : "Stop Current Session"}
                    </Button>
                  </div>
                ) : status === "starting" ? (
                  <div className="space-y-6 flex flex-col items-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Terminal size={20} className="text-primary animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Setting up your environment</h3>
                      <p className="text-muted-foreground text-sm">Provisioning cloud container (~15 seconds)...</p>
                    </div>
                  </div>
                ) : status === "running" && currentSession?.containerUrl ? (
                  <div className="space-y-6 w-full flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-success/10 text-success flex items-center justify-center mb-2">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">Environment Ready</h3>
                      <p className="text-muted-foreground mb-6">Your Jupyter notebook is running and ready for analysis.</p>
                    </div>
                    <div className="flex gap-4">
                      <a href={currentSession.containerUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="lg" className="h-12 px-8 text-base">Open Notebook</Button>
                      </a>
                      <Button variant="outline" size="lg" onClick={handleStop} disabled={stopSession.isPending}>
                        Stop Session
                      </Button>
                    </div>
                  </div>
                ) : status === "error" ? (
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                      <AlertCircle size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-destructive">Failed to start session</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      There was a problem provisioning your container. Please try again.
                    </p>
                    <Button onClick={handleLaunch} disabled={createSession.isPending} className="mt-2">
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 shadow-inner">
                      <Terminal size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Launch Cloud Notebook</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
                        Start an isolated Jupyter environment pre-configured with all required dependencies for this lesson.
                      </p>
                    </div>
                    <Button 
                      size="lg" 
                      onClick={handleLaunch} 
                      disabled={createSession.isPending}
                      className="h-12 px-8 text-base"
                    >
                      {createSession.isPending ? "Launching..." : (
                        <>
                          <Play size={18} className="mr-2 fill-current" />
                          Launch Environment
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Objectives */}
          <div>
            <h2 className="font-serif text-2xl font-semibold mb-4">What you'll learn</h2>
            <ul className="space-y-3">
              {lesson.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/90">{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <SquareSquare size={18} className="text-muted-foreground" />
                Lesson Details
              </h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Notebook Path</div>
                  <code className="bg-muted px-2 py-1 rounded text-xs break-all">{lesson.notebookPath}</code>
                </div>
                
                {lesson.requiresApiKeys && (
                  <div>
                    <div className="text-muted-foreground mb-1">Required Services</div>
                    <div className="flex gap-2 flex-wrap">
                      {lesson.requiredServices.map(svc => (
                        <Badge key={svc} variant="outline" className="capitalize">{svc}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
