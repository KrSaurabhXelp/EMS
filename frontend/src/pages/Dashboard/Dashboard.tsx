import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  Mail,
  Phone,
  Timer,
  User,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useEmployeeStore } from "../../store/employeeStore";
import { useTaskStore } from "../../store/taskStore";
import { useAuthStore } from "../../store/authStore";
import { type DashboardStatsResponse, getDashboardStats } from "../../api/dashboardApi";

const StatCard = ({ title, value, icon: Icon, color, loading }: any) => (
  <Card className="hover:shadow-md transition-all border-l-4 w-full" style={{ borderLeftColor: color }}>
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
        <h3 className="text-2xl font-bold mt-1">
          {loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : value}
        </h3>
      </div>
      <div className="p-2.5 bg-slate-100 rounded-lg">
        <Icon size={20} style={{ color }} />
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const currentUser = useAuthStore((state) => state.user);
  const isEmployeeRole = currentUser?.role === "employee" || currentUser?.role === "user";

  const localEmployees = useEmployeeStore((state) => state.employees);
  const localTasks = useTaskStore((state) => state.tasks);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardStatsResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await getDashboardStats();
        if (isMounted) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load dashboard stats from backend:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const isEmployee = Boolean(data?.isEmployee || isEmployeeRole);

  // Employee-specific details
  const employeeProfile = data?.employee || localEmployees.find(
    (e: any) =>
      (currentUser?.email && e.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.employeeId && e.id === currentUser.employeeId)
  ) || localEmployees[0];

  const employeeName = employeeProfile?.name || currentUser?.name || "Employee";

  // Counts calculation
  const counts = data?.counts ?? {
    employees: localEmployees.length,
    totalTasks: isEmployee
      ? localTasks.filter((t: any) =>
          currentUser?.email
            ? t.employeeEmail?.toLowerCase() === currentUser.email.toLowerCase() ||
              t.assignedTo?.toLowerCase() === currentUser.name?.toLowerCase()
            : true
        ).length
      : localTasks.length,
    pending: isEmployee
      ? localTasks.filter((t: any) => t.status === "Pending").length
      : localTasks.filter((t: any) => t.status === "Pending").length,
    inProgress: isEmployee
      ? localTasks.filter((t: any) => t.status === "In Progress").length
      : localTasks.filter((t: any) => t.status === "In Progress").length,
    completed: isEmployee
      ? localTasks.filter((t: any) => t.status === "Completed").length
      : localTasks.filter((t: any) => t.status === "Completed").length,
  };

  const recentEmployees = data?.recentEmployees ?? localEmployees.slice(-5).reverse();
  const recentTasks = data?.recentTasks ?? localTasks.slice(-5).reverse();

  // Admin stats vs Employee stats
  const adminStats = [
    { title: "Employees", value: counts.employees ?? 0, icon: Users, color: "#3b82f6" },
    { title: "Total Tasks", value: counts.totalTasks, icon: ClipboardList, color: "#a855f7" },
    { title: "Pending", value: counts.pending, icon: Clock3, color: "#f97316" },
    { title: "In Progress", value: counts.inProgress, icon: Timer, color: "#0284c7" },
    { title: "Completed", value: counts.completed, icon: CheckCircle2, color: "#22c55e" },
  ];

  const employeeStats = [
    { title: "My Tasks", value: counts.totalTasks, icon: ClipboardList, color: "#a855f7" },
    { title: "Pending", value: counts.pending, icon: Clock3, color: "#f97316" },
    { title: "In Progress", value: counts.inProgress, icon: Timer, color: "#0284c7" },
    { title: "Completed", value: counts.completed, icon: CheckCircle2, color: "#22c55e" },
  ];

  if (isEmployee) {
    return (
      <div className="min-h-full pt-0 px-4 pb-4 md:px-6 md:pb-6 space-y-5 bg-gray-50/50 text-left">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Welcome, {employeeName}! 👋
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Here is your personal overview and assigned tasks.
            </p>
          </div>
          <Link to="/tasks">
            <Button variant="outline" size="sm" className="gap-1.5 shadow-sm">
              <ClipboardList className="h-4 w-4 text-purple-600" />
              View All My Tasks
              <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </Link>
        </div>

        {/* 4 Task Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {employeeStats.map((stat, i) => (
            <StatCard key={i} {...stat} loading={loading && !data} />
          ))}
        </div>

        {/* Employee Info & Tasks Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Employee Profile Card */}
          <Card className="xl:col-span-1 shadow-sm border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">My Profile</CardTitle>
                <Badge variant={employeeProfile?.status === "Active" || employeeProfile?.status ? "default" : "secondary"}>
                  {employeeProfile?.status === "Active" || employeeProfile?.status ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="h-12 w-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
                  {employeeName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{employeeName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Briefcase className="h-3 w-3 text-gray-400" />
                    {employeeProfile?.designation || currentUser?.designation || "Employee"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-gray-400" /> Employee Code
                  </span>
                  <span className="font-medium text-gray-900">
                    {employeeProfile?.code || currentUser?.employeeCode || "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" /> Email
                  </span>
                  <span className="font-medium text-gray-900 truncate max-w-[200px]" title={employeeProfile?.email || currentUser?.email}>
                    {employeeProfile?.email || currentUser?.email || "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400" /> Mobile
                  </span>
                  <span className="font-medium text-gray-900">
                    {employeeProfile?.mobile || "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-gray-400" /> Role
                  </span>
                  <span className="capitalize font-medium text-gray-900">
                    {currentUser?.role || "Employee"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Tasks Card */}
          <Card className="xl:col-span-2 shadow-sm border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">My Recent Tasks</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Tasks assigned directly to you</p>
              </div>
              <Link to="/tasks" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                View All
              </Link>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {recentTasks.length > 0 ? (
                recentTasks.map((t: any) => (
                  <div
                    key={t.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-gray-100 hover:bg-gray-50/80 transition-all text-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-gray-500">
                          #{t.code}
                        </span>
                        <p className="font-medium text-gray-900 truncate">{t.title}</p>
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
                          {t.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {t.dueDate && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {t.dueDate}
                        </span>
                      )}
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          t.status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : t.status === "In Progress"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 space-y-2">
                  <ClipboardList className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500 font-medium">No tasks assigned yet</p>
                  <p className="text-xs text-muted-foreground">
                    When tasks are assigned to you by Admin or HR, they will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin / HR View
  return (
    <div className="min-h-full pt-0 px-4 pb-4 md:px-6 md:pb-6 space-y-4 bg-gray-50/50 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm">System Overview</p>
        </div>
      </div>

      {/* Stats Grid - 5 cards in one row on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
        {adminStats.map((stat, i) => (
          <StatCard key={i} {...stat} loading={loading && !data} />
        ))}
      </div>

      {/* Recent Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Employees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEmployees.length > 0 ? (
              recentEmployees.map((e: any) => (
                <div
                  key={e.id}
                  className="flex min-w-0 justify-between items-center gap-3 text-sm border-b pb-2 last:border-0 last:pb-0"
                >
                  <span className="min-w-0 truncate font-medium">{e.name}</span>
                  <span className="shrink-0 text-[10px] bg-gray-100 px-2 py-0.5 rounded uppercase">
                    {e.designation}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No employees found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.map((t: any) => (
                <div
                  key={t.id}
                  className="flex min-w-0 justify-between items-center gap-3 text-sm border-b pb-2 last:border-0 last:pb-0"
                >
                  <span className="min-w-0 truncate font-medium">{t.title}</span>
                  <span
                    className={`shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      t.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : t.status === "In Progress"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No tasks found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
