import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { useListLessons, useListProgress, useListApiKeys } from "@workspace/api-client-react";
import { BookOpen, Lock, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: modules, isLoading: isLoadingModules } = useListLessons();
  const { data: progresses, isLoading: isLoadingProgress } = useListProgress();
  const { data: apiKeys, isLoading: isLoadingKeys } = useListApiKeys();

  const hasOpenAIKey = apiKeys?.some(k => k.service === "openai") ?? false;
  const hasPineconeKey = apiKeys?.some(k => k.service === "pinecone") ?? false;
  const hasRequiredKeys = hasOpenAIKey && hasPineconeKey;

  const getProgress = (lessonId: number) => {
    return progresses?.find(p => p.lessonId === lessonId);
  };

  const getOverallProgress = () => {
    if (!modules || !progresses) return 0;
    const totalLessons = modules.flatMap(m => m.lessons).length;
    if (totalLessons === 0) return 0;
    const completed = progresses.filter(p => p.completedAt).length;
    return Math.round((completed / totalLessons) * 100);
  };

  // Find the last active lesson to show "Continue"
  const lastActiveProgress = progresses?.slice().sort((a, b) => 
    new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  )[0];

  let continueLessonId = lastActiveProgress?.lessonId;
  // If no progress, start with first lesson
  if (!continueLessonId && modules?.[0]?.lessons?.[0]) {
    continueLessonId = modules[0].lessons[0].id;
  }

  const isLoading = isLoadingModules || isLoadingProgress || isLoadingKeys;

  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground mb-2">Curriculum</h1>
          <p className="text-muted-foreground">Master modern bioinformatics through hands-on, cloud-native notebooks.</p>
        </div>
        
        {continueLessonId && (
          <Link href={`/lessons/${continueLessonId}`}>
            <Button className="shrink-0 gap-2">
              <BookOpen size={16} />
              Continue Learning
            </Button>
          </Link>
        )}
      </div>

      <Card className="mb-10 bg-primary text-primary-foreground border-primary shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-48 h-48"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a2 2 0 0 0 1.8 2.95h10.96a2 2 0 0 0 1.8-2.95L14.21 10.423A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M14 16H5.3"/></svg>
        </div>
        <CardContent className="p-8 relative z-10">
          <div className="max-w-xl">
            <h2 className="text-xl font-medium mb-2">Your Progress</h2>
            <div className="flex items-center gap-4 mb-3">
              <Progress value={getOverallProgress()} className="h-2 bg-primary-foreground/20 [&>div]:bg-primary-foreground" />
              <span className="text-sm font-bold min-w-10">{getOverallProgress()}%</span>
            </div>
            <p className="text-primary-foreground/80 text-sm">
              Keep pushing! You're making steady progress through the curriculum.
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-8">
          {modules?.map((module) => (
            <div key={module.moduleNum} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <Badge variant="secondary" className="font-mono text-xs tracking-widest bg-secondary text-secondary-foreground border-border">MOD {module.moduleNum}</Badge>
                <h2 className="text-xl font-serif font-semibold">{module.title}</h2>
              </div>
              
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {module.lessons.map((lesson) => {
                  const progress = getProgress(lesson.id);
                  const isCompleted = !!progress?.completedAt;
                  const inProgress = progress && !progress.completedAt;
                  
                  const isLocked = lesson.requiresApiKeys && !hasRequiredKeys;
                  
                  return (
                    <Link key={lesson.id} href={isLocked ? "/settings" : `/lessons/${lesson.id}`}>
                      <Card className={`h-full transition-all hover:shadow-md hover:border-primary/30 cursor-pointer group ${isLocked ? 'bg-muted/50 border-dashed' : ''}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="text-xs font-medium text-muted-foreground">Lesson {lesson.moduleNum}.{lesson.lessonNum}</div>
                            {isLocked ? (
                              <Lock size={16} className="text-muted-foreground" />
                            ) : isCompleted ? (
                              <CheckCircle2 size={18} className="text-success" />
                            ) : inProgress ? (
                              <Clock size={16} className="text-primary" />
                            ) : null}
                          </div>
                          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                            {lesson.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {lesson.description}
                          </p>
                          
                          {isLocked ? (
                            <Badge variant="outline" className="text-xs font-normal border-destructive/30 text-destructive bg-destructive/5 flex gap-1 w-fit">
                              <Lock size={12} />
                              API Keys Required
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              {progress ? (
                                <div className="w-full flex items-center gap-2">
                                  <Progress value={isCompleted ? 100 : ((progress.cellsRun / progress.totalCells) * 100)} className="h-1.5" />
                                  <span className="text-[10px] text-muted-foreground min-w-8">
                                    {isCompleted ? '100%' : `${Math.round((progress.cellsRun / progress.totalCells) * 100)}%`}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Not started</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
