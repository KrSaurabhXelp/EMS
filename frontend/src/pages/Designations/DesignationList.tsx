import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Plus, Search, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import {
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from "../../api/designationApi";
import { useAuthStore } from "../../store/authStore";

// Shadcn UI Imports
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
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
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
import { Textarea } from "../../components/ui/textarea";

// 1. Zod Schema
const designationSchema = z.object({
  name: z.string().min(1, "Please enter a designation name."),
  description: z.string().min(5, "Description must be at least 5 characters."),
  status: z.enum(["Active", "Inactive"]),
});

type DesignationFormValues = z.infer<typeof designationSchema>;

export type DesignationItem = {
  id: number;
  name: string;
  description: string;
  status: "Active" | "Inactive";
};

// const defaultOptions = [
//   "Admin",
//   "HR",
//   "Nurse",
//   "Caregiver",
//   "Housekeeping",
//   "Receptionist",
//   "Developer",
//   "Software Engineer",
//   "Project Manager",
//   "QA Engineer",
// ];

const Designation = () => {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "admin";

  const [designations, setDesignations] = useState<DesignationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editId, setEditId] = useState<number | null>(null);
  const [designationToDelete, setDesignationToDelete] = useState<number | null>(null);
  const [apiError, setApiError] = useState("");
  const isFirstRender = useRef(true);

  const loadDesignations = async (targetPage = page, searchQuery = search) => {
    try {
      setLoading(true);
      const res = await getDesignations({
        page: targetPage,
        limit: 10,
        search: searchQuery,
      });

      const responseData = res.data;
      const rawItems = Array.isArray(responseData)
        ? responseData
        : responseData?.data || [];

      const mapped: DesignationItem[] = rawItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        status:
          typeof item.status === "boolean"
            ? item.status
              ? "Active"
              : "Inactive"
            : item.status || "Active",
      }));
      setDesignations(mapped);

      if (responseData && typeof responseData.totalPages === "number") {
        setTotalPages(responseData.totalPages || 1);
        setTotalCount(responseData.total ?? 0);
      } else {
        setTotalPages(1);
        setTotalCount(rawItems.length);
      }
    } catch (err) {
      console.error("Failed to fetch designations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      loadDesignations(1, "");
      return;
    }

    const timer = setTimeout(() => {
      loadDesignations(page, search);
    }, 300);

    return () => clearTimeout(timer);
  }, [page, search]);

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<DesignationFormValues>({
    resolver: zodResolver(designationSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Active",
    },
  });

  const handleOpenAddModal = () => {
    setApiError("");
    reset({ name: "", description: "", status: "Active" });
    setEditId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: DesignationItem) => {
    setApiError("");
    setEditId(item.id);
    reset({
      name: item.name,
      description: item.description,
      status: item.status,
    });
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (designationToDelete === null) return;
    try {
      await deleteDesignation(designationToDelete);
      const newPage = designations.length === 1 && page > 1 ? page - 1 : page;
      if (newPage !== page) {
        setPage(newPage);
      } else {
        await loadDesignations(newPage, search);
      }
    } catch (err: any) {
      console.error("Failed to delete designation:", err);
      alert(err.response?.data?.message || "Failed to delete designation");
    } finally {
      setDesignationToDelete(null);
    }
  };

  const onSubmit = async (data: DesignationFormValues) => {
    setApiError("");
    // Check for duplicates
    const exists = designations.some(
      (item) =>
        item.name.toLowerCase() === data.name.toLowerCase() &&
        item.id !== editId
    );

    if (exists) {
      setError("name", {
        type: "manual",
        message: "This designation already exists!",
      });
      return;
    }

    try {
      setSubmitting(true);
      if (editId !== null) {
        await updateDesignation(editId, data);
      } else {
        await createDesignation(data);
      }
      await loadDesignations(page, search);
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error("Error saving designation:", err);
      setApiError(
        err.response?.data?.message || "Failed to save designation. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50/50 min-h-full p-4 md:p-6 text-left">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          Designation Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage employee designations for your organization.
        </p>
      </div>

      {/* Main Content Container */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0 sm:p-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 p-4 sm:p-0">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search designations..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            {isAdmin && (
              <Button onClick={handleOpenAddModal} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Designation
              </Button>
            )}
          </div>

          {/* Dialog / Modal */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editId !== null ? "Edit Designation" : "Add Designation"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
                {/* Name - Input */}
                <div className="space-y-2">
                  <Label>Designation Name</Label>
                  <Input
                    {...register("name")}
                    placeholder="Enter designation name (e.g. Software Engineer)"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs">{errors.name.message}</p>
                  )}
                </div>

                {/* Description - Textarea */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    {...register("description")}
                    placeholder="Enter description..."
                    rows={4}
                    className={errors.description ? "border-red-500" : ""}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-xs">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Status - Select */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {apiError && (
                  <p className="text-red-500 text-sm text-center">{apiError}</p>
                )}

                <DialogFooter className="pt-4">
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
              <span className="ml-2 text-sm text-gray-500">Loading designations...</span>
            </div>
          )}

          {/* Mobile View (Cards) */}
          {!loading && (
            <div className="space-y-4 md:hidden p-4 sm:p-0">
              {designations.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant={item.status === "Active" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {item.description}
                    </p>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="h-4 w-4 mr-1.5" /> Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDesignationToDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {designations.length === 0 && (
                <p className="text-center text-muted-foreground py-6">
                  No designations found.
                </p>
              )}
            </div>
          )}

          {/* Desktop View (Table) */}
          {!loading && (
            <div className="hidden md:block border rounded-lg">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {designations.length > 0 ? (
                    designations.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.status === "Active" ? "default" : "secondary"}
                            className={
                              item.status === "Active"
                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                : ""
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDesignationToDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No designations found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t px-4 sm:px-0">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium">
                  {(page - 1) * 10 + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(page * 10, totalCount)}
                </span>{" "}
                of <span className="font-medium">{totalCount}</span> designations
              </p>

              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
                      )
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push("...");
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        typeof item === "number" ? (
                          <Button
                            key={idx}
                            variant={page === item ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setPage(item)}
                          >
                            {item}
                          </Button>
                        ) : (
                          <span
                            key={idx}
                            className="px-1 text-sm text-muted-foreground"
                          >
                            {item}
                          </span>
                        )
                      )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={designationToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setDesignationToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete designation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The designation will be permanently
              removed from the database.
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

export default Designation;
