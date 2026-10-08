import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Employee = {
  id: number;
  code: string;
  name: string;
  designation: string;
  email: string;
  mobile: string;
  status: "Active" | "Inactive";
};

type EmployeeStore = {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  addEmployee: (employee: Omit<Employee, "id">) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (id: number) => void;
};

export const useEmployeeStore = create<EmployeeStore>()(
  persist(
    (set) => ({
      employees: [
        { id: 1, code: "EMP001", name: "Rahul Sharma", designation: "Admin", email: "rahul@gmail.com", mobile: "9876543210", status: "Active" },
      ],
      setEmployees: (employees) => set({ employees }),
      addEmployee: (employee) => set((state) => ({ employees: [...state.employees, { ...employee, id: Date.now() }] })),
      updateEmployee: (employee) => set((state) => ({ employees: state.employees.map((item) => item.id === employee.id ? employee : item) })),
      deleteEmployee: (id) => set((state) => ({ employees: state.employees.filter((employee) => employee.id !== id) })),
    }),
    { name: "employeesData" },
  ),
);
