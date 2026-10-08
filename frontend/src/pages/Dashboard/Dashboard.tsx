import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Clock3, Loader2, Timer, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useEmployeeStore } from "../../store/employeeStore";
import { useTaskStore } from "../../store/taskStore";
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

  const counts = data?.counts ?? {
    employees: localEmployees.length,
    totalTasks: localTasks.length,
    pending: localTasks.filter((t: any) => t.status === "Pending").length,
    inProgress: localTasks.filter((t: any) => t.status === "In Progress").length,
    completed: localTasks.filter((t: any) => t.status === "Completed").length,
  };

  const recentEmployees = data?.recentEmployees ?? localEmployees.slice(-5).reverse();
  const recentTasks = data?.recentTasks ?? localTasks.slice(-5).reverse();

  const stats = [
    { title: "Employees", value: counts.employees, icon: Users, color: "#3b82f6" },
    { title: "Total Tasks", value: counts.totalTasks, icon: ClipboardList, color: "#a855f7" },
    { title: "Pending", value: counts.pending, icon: Clock3, color: "#f97316" },
    { title: "In Progress", value: counts.inProgress, icon: Timer, color: "#0284c7" },
    { title: "Completed", value: counts.completed, icon: CheckCircle2, color: "#22c55e" },
  ];

  return (
    <div className="min-h-full pt-0 px-4 pb-4 md:px-6 md:pb-6 space-y-4 bg-gray-50/50 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm">System Overview</p>
        </div>
        {/* <button
          onClick={handleTestNotification}
          disabled={testingNotification}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <Bell size={16} />
          {testingNotification ? "Sending..." : "Test Push Notification"}
        </button> */}
      </div>

      {/* Stats Grid - 5 cards in one row on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
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
                    className={`shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${t.status === "Completed"
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
