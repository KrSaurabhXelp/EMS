import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Task = {
  id: number;
  code: string;
  title: string;
  description: string;
  assignedTo: string;
  employeeId?: number;
  employeeEmail?: string;
  priority: "Low" | "Medium" | "High";
  dueDate: string;
  status: "Pending" | "In Progress" | "Completed";
};

type TaskStore = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: number) => void;
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) =>
        set((state) => ({ tasks: [...state.tasks, { ...task, id: Date.now() }] })),
      updateTask: (task) =>
        set((state) => ({
          tasks: state.tasks.map((item) => (item.id === task.id ? task : item)),
        })),
      deleteTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
    }),
    { name: "tasksData" },
  ),
);
