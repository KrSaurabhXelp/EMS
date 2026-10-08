import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Plus, Search, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../../api/employeeApi";
import { getDesignations } from "../../api/designationApi";
import { useEmployeeStore } from "../../store/employeeStore";
import { useAuthStore } from "../../store/authStore";

// Shadcn UI Imports
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

// 1. Zod Schema
const employeeSchema = z.object({
  code: z.string().min(1, "Employee code is required."),
  name: z.string().min(2, "Name must be at least 2 characters."),
  designationId: z.string().min(1, "Please select a designation."),
  email: z.string().email("Invalid email address."),
  password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
  }),
  mobile: z.string().min(10, "Mobile must be at least 10 digits."),
  status: z.enum(["Active", "Inactive"]),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export type EmployeeItem = {
  employeeId: number;
  employeeCode: number | string;
  employeeName: string;
  employeeEmail: string;
  employeeMobile: string;
  employeeStatus: boolean;
  designation?: {
    id: number;
    name: string;
  } | null;
};

type DesignationOption = {
  id: number;
  name: string;
};

const Employee = () => {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "admin";
  const isHR = currentUser?.role === "hr";
  const isRegularUser = currentUser?.role === "user" || currentUser?.role === "employee";

  const [employeesList, setEmployeesList] = useState<EmployeeItem[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { setEmployees } = useEmployeeStore();

  const loadData = async () => {
    try {
      setLoading(true);
      const [empData, desigRes] = await Promise.all([
        getEmployees(),
        getDesignations(),
      ]);

      const emps: EmployeeItem[] = Array.isArray(empData) ? empData : [];
      setEmployeesList(emps);

      // Keep Zustand store in sync for Dashboard and Tasks
      setEmployees(
        emps.map((e) => ({
          id: e.employeeId,
          code: String(e.employeeCode),
          name: e.employeeName,
          designation: e.designation?.name || "N/A",
          email: e.employeeEmail,
          mobile: e.employeeMobile,
          status: e.employeeStatus ? "Active" : "Inactive",
        }))
      );

      const rawDesigs = Array.isArray(desigRes.data) ? desigRes.data : desigRes.data?.data || [];
      const desigs: DesignationOption[] = rawDesigs.map((d: any) => ({
        id: d.id,
        name: d.name,
      }));
      setDesignations(desigs);
    } catch (err) {
      console.error("Failed to load employees:", err);
      toast.error("Failed to load employee data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      code: "",
      name: "",
      designationId: "",
      email: "",
      password: "",
      mobile: "",
      status: "Active",
    },
  });

  const handleOpenAddModal = () => {
    reset({
      code: "",
      name: "",
      designationId: "",
      email: "",
      password: "",
      mobile: "",
      status: "Active",
    });
    setShowPassword(false);
    setEditId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: EmployeeItem) => {
    setEditId(item.employeeId);
    reset({
      code: String(item.employeeCode),
      name: item.employeeName,
      designationId: item.designation ? String(item.designation.id) : "",
      email: item.employeeEmail,
      password: "",
      mobile: item.employeeMobile,
      status: item.employeeStatus ? "Active" : "Inactive",
    });
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (employeeToDelete === null) return;
    try {
      await deleteEmployee(employeeToDelete);
      toast.success("Employee deleted successfully.");
      await loadData();
    } catch (err: any) {
      console.error("Failed to delete employee:", err);
      toast.error(err.response?.data?.message || "Failed to delete employee.");
    } finally {
      setEmployeeToDelete(null);
    }
  };

  const onSubmit = async (data: EmployeeFormValues) => {
    if (editId === null) {
      if (!data.password || data.password.trim().length < 6) {
        setError("password", {
          type: "manual",
          message: "Password is required and must be at least 6 characters.",
        });
        return;
      }
    } else if (data.password && data.password.trim().length > 0) {
      if (data.password.trim().length < 6) {
        setError("password", {
          type: "manual",
          message: "Password must be at least 6 characters.",
        });
        return;
      }
    }

    // Check if employee code already exists (for other employees)
    const exists = employeesList.some(
      (item) =>
        String(item.employeeCode).toLowerCase() === data.code.trim().toLowerCase() &&
        item.employeeId !== editId
    );

    if (exists) {
      setError("code", {
        type: "manual",
        message: "This employee code already exists!",
      });
      toast.error("Code already exists!");
      return;
    }

    const payload: any = {
      employeeCode: Number(data.code) || data.code,
      employeeName: data.name,
      designationId: Number(data.designationId),
      employeeEmail: data.email,
      employeeMobile: data.mobile,
      employeeStatus: data.status === "Active",
    };

    if (editId === null) {
      payload.password = data.password?.trim();
    } else if (data.password && data.password.trim().length > 0) {
      payload.password = data.password.trim();
    }

    try {
      setSubmitting(true);
      if (editId !== null) {
        await updateEmployee(editId, payload);
        toast.success("Employee updated successfully.");
      } else {
        await createEmployee(payload);
        toast.success("Employee added successfully.");
      }
      await loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to save employee:", err);
      toast.error(err.response?.data?.message || "Failed to save employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = employeesList.filter((item) => {
    const query = search.toLowerCase();
    const designationName = item.designation?.name?.toLowerCase() || "";
    return (
      item.employeeName.toLowerCase().includes(query) ||
      String(item.employeeCode).toLowerCase().includes(query) ||
      item.employeeEmail.toLowerCase().includes(query) ||
      item.employeeMobile.toLowerCase().includes(query) ||
      designationName.includes(query)
    );
  });

  return (
    <div className="bg-gray-50/50 min-h-full p-4 md:p-6 text-left">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          Employee Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your organization's employees, contact details, and designations.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 sm:p-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {isAdmin && (
              <Button onClick={handleOpenAddModal} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            )}
          </div>

          {/* Add / Edit Dialog */}
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditId(null);
                setShowPassword(false);
                reset({
                  code: "",
                  name: "",
                  designationId: "",
                  email: "",
                  password: "",
                  mobile: "",
                  status: "Active",
                });
              }
            }}
          >
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editId !== null ? "Edit Employee" : "Add Employee"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 py-4"
                autoComplete="off"
              >
                {/* Hidden trap inputs to prevent browser password managers from autofilling admin credentials */}
                <div
                  style={{
                    position: "absolute",
                    opacity: 0,
                    height: 0,
                    width: 0,
                    zIndex: -1,
                    overflow: "hidden",
                  }}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <input
                    type="text"
                    name="fake_prevent_autofill_email"
                    tabIndex={-1}
                    autoComplete="username"
                  />
                  <input
                    type="password"
                    name="fake_prevent_autofill_password"
                    tabIndex={-1}
                    autoComplete="current-password"
                  />
                </div>

                {/* Employee Code */}
                <div className="space-y-1">
                  <Label>Employee Code</Label>
                  <Input
                    autoComplete="off"
                    {...register("code")}
                    placeholder="e.g. 1001"
                    className={errors.code ? "border-red-500" : ""}
                  />
                  {errors.code && (
                    <p className="text-red-500 text-xs">{errors.code.message}</p>
                  )}
                </div>

                {/* Employee Name */}
                <div className="space-y-1">
                  <Label>Employee Name</Label>
                  <Input
                    autoComplete="off"
                    {...register("name")}
                    placeholder="e.g. Rahul Sharma"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs">{errors.name.message}</p>
                  )}
                </div>

                {/* Designation Dropdown */}
                <div className="space-y-1">
                  <Label>Designation</Label>
                  <Controller
                    name="designationId"
                    control={control}
                    render={({ field }) => {
                      const selected = designations.find(
                        (d) => String(d.id) === String(field.value)
                      );
                      return (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger
                            className={`w-full ${errors.designationId ? "border-red-500" : ""}`}
                          >
                            <SelectValue placeholder="Select Designation">
                              {selected ? `${selected.id} - ${selected.name}` : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="w-full">
                            {designations.map((d) => (
                              <SelectItem key={d.id} value={String(d.id)}>
                                {d.id} - {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }}
                  />
                  {errors.designationId && (
                    <p className="text-red-500 text-xs">
                      {errors.designationId.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    {...register("email")}
                    placeholder="e.g. rahul.sharma@example.com"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <Label>
                    {editId !== null ? "Password (optional)" : "Password *"}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      {...register("password")}
                      placeholder={
                        editId !== null
                          ? "Leave blank to keep unchanged"
                          : "Enter password (min 6 characters)"
                      }
                      className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs">{errors.password.message}</p>
                  )}
                </div>

                {/* Mobile */}
                <div className="space-y-1">
                  <Label>Mobile Number</Label>
                  <Input
                    autoComplete="off"
                    {...register("mobile")}
                    placeholder="e.g. 9876543210"
                    className={errors.mobile ? "border-red-500" : ""}
                  />
                  {errors.mobile && (
                    <p className="text-red-500 text-xs">{errors.mobile.message}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : editId !== null ? (
                      "Update"
                    ) : (
                      "Save"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-500">
                Loading employees...
              </span>
            </div>
          )}

          {/* Mobile View (Cards) */}
          {!loading && (
            <div className="space-y-3 md:hidden">
              {filteredData.map((emp) => {
                const statusActive = emp.employeeStatus;
                return (
                  <Card key={emp.employeeId} className="border shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{emp.employeeName}</p>
                          <p className="text-sm text-muted-foreground">
                            Code: {emp.employeeCode}
                          </p>
                        </div>
                        <Badge
                          className="shrink-0"
                          variant={statusActive ? "default" : "secondary"}
                        >
                          {statusActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Designation</p>
                          <p className="truncate font-medium">
                            {emp.designation?.name || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Mobile</p>
                          <p className="truncate font-medium">{emp.employeeMobile}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-muted-foreground text-xs">Email</p>
                        <p className="truncate text-sm">{emp.employeeEmail}</p>
                      </div>

                      {(() => {
                        const isOwn = emp.employeeEmail === currentUser?.email;
                        const canEdit = isAdmin || isHR || (isRegularUser && isOwn);
                        const canDelete = isAdmin;

                        if (!canEdit && !canDelete) return null;

                        return (
                          <div className="flex gap-2 pt-2">
                            {canEdit && (
                              <Button
                                className="flex-1"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(emp)}
                              >
                                <Edit2 className="mr-1.5 h-4 w-4" /> Edit
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                className="flex-1"
                                variant="destructive"
                                size="sm"
                                onClick={() => setEmployeeToDelete(emp.employeeId)}
                              >
                                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
              {filteredData.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No employees found.
                </p>
              )}
            </div>
          )}

          {/* Desktop View (Table with all requested fields) */}
          {!loading && (
            <div className="hidden md:block border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[110px]">Employee Code</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((emp) => {
                      const statusActive = emp.employeeStatus;
                      return (
                        <TableRow key={emp.employeeId}>
                          <TableCell className="font-medium">
                            {emp.employeeCode}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">
                            {emp.employeeName}
                          </TableCell>
                          <TableCell>
                            {emp.designation?.name ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                {emp.designation.name}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {emp.employeeEmail}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {emp.employeeMobile}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusActive ? "default" : "secondary"}
                              className={
                                statusActive
                                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                                  : ""
                              }
                            >
                              {statusActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          {(() => {
                            const isOwn = emp.employeeEmail === currentUser?.email;
                            const canEdit = isAdmin || isHR || (isRegularUser && isOwn);
                            const canDelete = isAdmin;

                            return (
                              <TableCell className="text-right space-x-1">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(emp)}
                                    title="Edit Employee"
                                  >
                                    <Edit2 className="h-4 w-4 text-blue-600" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEmployeeToDelete(emp.employeeId)}
                                    title="Delete Employee"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                                {!canEdit && !canDelete && (
                                  <span className="text-xs text-gray-400 italic">Read-only</span>
                                )}
                              </TableCell>
                            );
                          })()}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No employees found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={employeeToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setEmployeeToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The employee will be permanently removed
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Employee;
