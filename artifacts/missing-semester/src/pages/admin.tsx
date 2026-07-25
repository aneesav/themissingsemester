import { Layout } from "@/components/layout";
import { useGetAdminStats, useListAdminUsers, useGetLessonFunnel, useListAdminSessions, useGetCurrentUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Play, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { formatDistanceToNow, format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Admin() {
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const { data: stats, isLoading: isLoadingStats } = useGetAdminStats();
  const { data: users, isLoading: isLoadingUsers } = useListAdminUsers();
  const { data: funnel, isLoading: isLoadingFunnel } = useGetLessonFunnel();
  const { data: sessions, isLoading: isLoadingSessions } = useListAdminSessions();

  const [search, setSearch] = useState("");

  if (isLoadingUser) return <Layout><div className="animate-pulse">Loading admin access...</div></Layout>;

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
          <ShieldAlert size={48} className="text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You must be an administrator to view this page.</p>
        </div>
      </Layout>
    );
  }

  const isLoading = isLoadingStats || isLoadingUsers || isLoadingFunnel || isLoadingSessions;

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground mb-2">Platform Admin</h1>
        <p className="text-muted-foreground">Monitor platform usage, active sessions, and learner progression.</p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Stats Row */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Learners" 
              value={stats?.totalLearners.toString() || "0"} 
              icon={<Users size={20} className="text-primary" />} 
            />
            <StatCard 
              title="Sessions Today" 
              value={stats?.sessionsToday.toString() || "0"} 
              icon={<Play size={20} className="text-primary" />} 
            />
            <StatCard 
              title="Active Sessions" 
              value={stats?.activeSessions.toString() || "0"} 
              icon={<Clock size={20} className="text-primary" />} 
            />
            <StatCard 
              title="Lessons Completed" 
              value={stats?.lessonsCompleted.toString() || "0"} 
              icon={<CheckCircle2 size={20} className="text-success" />} 
            />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle>Lesson Funnel</CardTitle>
                <CardDescription>Started vs Completed per lesson</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="lessonTitle" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(val) => val.substring(0, 15) + "..."}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Bar dataKey="started" name="Started" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>Live & recent activity</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="max-h-[300px] overflow-y-auto px-6">
                  {sessions?.slice(0, 10).map((session) => (
                    <div key={session.id} className="py-3 border-b last:border-0 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">{session.lessonTitle}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <Badge variant={session.status === 'running' ? 'success' : 'secondary'} className="text-[10px] h-4 px-1.5 mb-1">
                          {session.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!sessions?.length && (
                    <p className="text-center text-sm text-muted-foreground py-4">No recent sessions.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learners Table */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>Learners Directory</CardTitle>
                <CardDescription>All registered users</CardDescription>
              </div>
              <div className="w-64">
                <Input 
                  placeholder="Search name or email..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={u.role === 'admin' ? 'border-primary text-primary' : ''}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(u.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.lastActiveAt ? formatDistanceToNow(new Date(u.lastActiveAt), { addSuffix: true }) : "Never"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {u.lessonsCompleted} <span className="text-muted-foreground font-normal text-xs">/ {u.lessonsStarted}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredUsers?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <p className="text-3xl font-serif font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
