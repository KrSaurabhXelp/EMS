import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Employees } from "./Employees";

@Entity()
export class Designation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  status: boolean;

  @OneToMany(() => Employees, (employee) => employee.designation)
  employees: Employees[];
}