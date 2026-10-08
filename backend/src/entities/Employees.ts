import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Designation } from "./Designations";
import { Tasks } from "./Tasks";

@Entity()
export class Employees {
    @PrimaryGeneratedColumn()
    employeeId: number;

    @Column({ unique: true })
    employeeCode: number;

    @Column()
    employeeName: string;

    @ManyToOne(() => Designation, (designation) => designation.employees)
    designation: Designation;

    @Column()
    employeeEmail: string;

    @Column()
    employeeMobile: string;

    @Column()
    employeeStatus: boolean;

    @OneToMany(() => Tasks, (task) => task.employee)
    tasks: Tasks[];
}
