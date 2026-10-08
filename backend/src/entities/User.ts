import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export type RoleType = "admin" | "hr" | "user" | "employee";

@Entity("User")
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column({
        type: "enum",
        enum: ["admin", "hr", "user", "employee"],
        default: "user"
    })
    role: RoleType;

    @CreateDateColumn()
    createdAt: Date;
}