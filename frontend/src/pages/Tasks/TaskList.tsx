import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Eye, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useTaskStore } from "../../store/taskStore";
import { useAuthStore } from "../../store/authStore";
import {
  getTasks,
  createTasks,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
} from "../../api/taskApi";

// Shadcn UI Components
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Textarea } from "../../components/ui/textarea";

const taskSchema = z.object({
  code: z.string().min(1, "Required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description is too short"),
  assignedTo: z.string().min(1, "Please assign an employee"),
  priority: z.enum(["Low", "Medium", "High"]),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["Pending", "In Progress", "Completed"]),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const Task = ({ employees = [] }: any) => {
  const currentUser = useAuthStore((state) => state.user);
  const canCreateTask = currentUser?.role === "admin" || currentUser?.role === "hr";
  const canDeleteTask = currentUser?.role === "admin" || currentUser?.role === "hr";
  const isRegularUser = currentUser?.role === "user" || currentUser?.role === "employee";

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { tasks, setTasks } = useTaskStore();

  const fetchBackendTasks = async () => {
    try {
      const data = await getTasks();
      if (Array.isArray(data)) {
        const mapped = data.map((t: any) => ({
          id: t.id,
          code: String(t.taskCode),
          title: t.taskTitle,
          description: t.taskDescription || "",
          assignedTo: t.employee?.employeeName || "",
          employeeId: t.employee?.employeeId,
          employeeEmail: t.employee?.employeeEmail,
          priority: t.priority,
          dueDate: t.dueDate ? String(t.dueDate).split("T")[0] : "",
          status: t.status,
        }));
        setTasks(mapped);
      }
    } catch (err) {
      console.error("Failed to load tasks from backend:", err);
    }
  };

  useEffect(() => {
    fetchBackendTasks();
  }, []);

  const isTaskAssignedToCurrent = (t: any) => {
    if (!currentUser) return false;
    const userEmail = currentUser.email?.toLowerCase();
    const userName = currentUser.name?.toLowerCase();

    if (t.employeeEmail && userEmail && t.employeeEmail.toLowerCase() === userEmail) {
      return true;
    }

    if (t.employee?.employeeEmail && userEmail && t.employee.employeeEmail.toLowerCase() === userEmail) {
      return true;
    }

    const matchedEmp = employees.find(
      (e: any) =>
        (e.id && t.employeeId && String(e.id) === String(t.employeeId)) ||
        (e.employeeId && t.employeeId && String(e.employeeId) === String(t.employeeId)) ||
        (e.name && t.assignedTo && e.name.toLowerCase() === t.assignedTo.toLowerCase()) ||
        (e.employeeName && t.assignedTo && e.employeeName.toLowerCase() === t.assignedTo.toLowerCase())
    );

    if (matchedEmp) {
      const empEmail = matchedEmp.email || matchedEmp.employeeEmail;
      if (empEmail && userEmail && empEmail.toLowerCase() === userEmail) {
        return true;
      }
    }

    if (t.assignedTo && userName && t.assignedTo.toLowerCase() === userName) {
      return true;
    }

    return false;
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { code: "", title: "", description: "", assignedTo: "", priority: "Medium", dueDate: "", status: "Pending" }
  });

  const { control, handleSubmit, reset, formState: { errors } } = form;

  const handleOpenCreate = () => {
    reset({
      code: "",
      title: "",
      description: "",
      assignedTo: "",
      priority: "Medium",
      dueDate: "",
      status: "Pending",
    });
    setEditId(null);
    setIsViewOnly(false);
    setShowForm(true);
  };

  const handleEdit = (t: any) => {
    setEditId(t.id);
    reset(t);
    setIsViewOnly(false);
    setShowForm(true);
  };

  const handleView = (t: any) => {
    setEditId(t.id);
    reset(t);
    setIsViewOnly(true);
    setShowForm(true);
  };

  const onSubmit = async (values: TaskFormValues) => {
    try {
      setSubmitting(true);
      const emp = employees.find(
        (e: any) =>
          (e.name || e.employeeName) === values.assignedTo ||
          String(e.id || e.employeeId) === String(values.assignedTo)
      );
      const selectedEmpId = emp ? (emp.employeeId || emp.id) : (Number(values.assignedTo) || 1);
      const taskCodeNum = Number(String(values.code).replace(/\D/g, "")) || 1001;

      if (editId !== null) {
        if (isRegularUser) {
          await updateTaskApi(editId, { status: values.status });
        } else {
          await updateTaskApi(editId, {
            taskCode: taskCodeNum,
            taskTitle: values.title,
            taskDescription: values.description,
            employeeId: selectedEmpId,
            priority: values.priority,
            dueDate: values.dueDate,
            status: values.status,
          });
        }
        toast.success(values.status === "Completed" ? "Task completed! Notification sent to Admin 🎉" : "Task updated!");
      } else {
        await createTasks({
          taskCode: taskCodeNum,
          taskTitle: values.title,
          taskDescription: values.description,
          employeeId: selectedEmpId,
          priority: values.priority,
          dueDate: values.dueDate,
          status: values.status,
        });
        toast.success("Task assigned! Firebase notification dispatched to employee 🚀");
      }

      await fetchBackendTasks();
      setShowForm(false);
      reset();
    } catch (err: any) {
      console.error("Task save error:", err);
      toast.error(err?.response?.data?.message || "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (taskToDelete !== null) {
      try {
        await deleteTaskApi(taskToDelete);
        toast.success("Task deleted successfully");
        await fetchBackendTasks();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to delete task");
      }
      setTaskToDelete(null);
    }
  };

  return (
    <div className="bg-gray-50/50 min-h-full p-4 md:p-6 text-left">
      <h1 className="text-2xl font-bold mb-6">Task Management</h1>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6">
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64 h-9" />
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value ?? "All")}>
              <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            {canCreateTask && (
              <Button onClick={handleOpenCreate} className="h-9 w-full sm:ml-auto sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Create Task
              </Button>
            )}
          </div>

          <div className="space-y-3 md:hidden">
            {tasks.filter((t: any) => (filterStatus === "All" || t.status === filterStatus) && (t.title.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()) || (t.description && t.description.toLowerCase().includes(search.toLowerCase())))).map((t: any) => {
              const isAssigned = isTaskAssignedToCurrent(t);
              const canEdit = !isRegularUser || isAssigned;

              return (
                <Card key={t.id} className="border shadow-none">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.title}</p>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{t.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Code: {t.code}</p>
                      </div>
                      <Badge className="shrink-0">{t.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Assigned to</p>
                        <p className="truncate font-medium">{t.assignedTo || "Unassigned"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Due date</p>
                        <p className="font-medium">{t.dueDate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Priority</p>
                        <p className="font-medium">{t.priority}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {canEdit ? (
                        <Button className="flex-1" variant="outline" size="sm" onClick={() => handleEdit(t)}>
                          <Edit2 className="mr-1.5 h-4 w-4" /> Edit
                        </Button>
                      ) : (
                        <Button className="flex-1" variant="secondary" size="sm" onClick={() => handleView(t)}>
                          <Eye className="mr-1.5 h-4 w-4" /> View
                        </Button>
                      )}
                      {canDeleteTask && (
                        <Button className="flex-1" variant="destructive" size="sm" onClick={() => setTaskToDelete(t.id)}>
                          <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="hidden md:block border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.filter((t: any) => (filterStatus === "All" || t.status === filterStatus) && (t.title.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()) || (t.description && t.description.toLowerCase().includes(search.toLowerCase())))).map((t: any) => {
                  const isAssigned = isTaskAssignedToCurrent(t);
                  const canEdit = !isRegularUser || isAssigned;

                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.code}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{t.title}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground text-sm" title={t.description}>
                        {t.description || "-"}
                      </TableCell>
                      <TableCell>{t.assignedTo || "Unassigned"}</TableCell>
                      <TableCell><Badge>{t.status}</Badge></TableCell>
                      <TableCell>{t.priority}</TableCell>
                      <TableCell>{t.dueDate}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {canEdit ? (
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(t)} title="Edit Task">
                            <Edit2 className="h-4 w-4 text-blue-600" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handleView(t)} title="View Task Details">
                            <Eye className="h-4 w-4 text-gray-600" />
                          </Button>
                        )}
                        {canDeleteTask && (
                          <Button variant="ghost" size="icon" onClick={() => setTaskToDelete(t.id)} title="Delete Task">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isViewOnly ? "View Task Details" : isRegularUser ? "Update Task Status" : editId ? "Edit Task" : "Create Task"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">

            {["code", "title", "dueDate"].map((field) => (
              <div key={field} className="space-y-1">
                <Label className="capitalize">{field === "code" ? "Task Code" : field}</Label>
                <Input 
                  type={field === "dueDate" ? "date" : "text"} 
                  disabled={isRegularUser || isViewOnly}
                  {...form.register(field as any)} 
                  className={errors[field as keyof TaskFormValues] ? "border-red-500" : ""} 
                />
                {errors[field as keyof TaskFormValues] && <p className="text-xs text-red-500">{errors[field as keyof TaskFormValues]?.message}</p>}
              </div>
            ))}

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea 
                disabled={isRegularUser || isViewOnly}
                {...form.register("description")} 
                className={errors.description ? "border-red-500" : ""} 
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Assigned To</Label>
                <Controller name="assignedTo" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isRegularUser || isViewOnly}>
                    <SelectTrigger className={errors.assignedTo ? "border-red-500" : ""}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => {
                        const val = e.name || e.employeeName;
                        const key = e.id || e.employeeId || val;
                        return (
                          <SelectItem key={key} value={val}>
                            {val}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )} />
                {errors.assignedTo && <p className="text-xs text-red-500">{errors.assignedTo.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Priority</Label>
                <Controller name="priority" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isRegularUser || isViewOnly}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            {/* Status Select */}
            <div className="space-y-1">
              <Label>Status</Label>
              <Controller name="status" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isViewOnly}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>

            <DialogFooter className="pt-2">
              {isViewOnly ? (
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Close
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : (isRegularUser ? "Update Status" : "Save Task")}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={taskToDelete !== null} onOpenChange={(open) => { if (!open) setTaskToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The task will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Task;
