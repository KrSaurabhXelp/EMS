import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Employees } from "./Employees";

@Entity()
export class Tasks {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  taskCode: number;

  @Column()
  taskTitle: string;

  @Column()
  taskDescription: string;

  @ManyToOne(() => Employees, (employee) => employee.tasks)
  employee: Employees;

  @Column()
  priority: string;

  @Column({ type: "datetime" })
  dueDate: Date;

  @Column()
  status: string;
}