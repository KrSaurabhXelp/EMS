import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "varchar", length: 50, default: "general" })
  type: string; // "task_assigned" | "task_completed" | "general"

  @Column({ type: "int", nullable: true })
  employeeId: number | null;

  @Column({ type: "int", nullable: true })
  userId: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  forRole: string | null; // "admin", "hr", "employee", "all"

  @Column({ type: "boolean", default: false })
  isRead: boolean;

  @Column({ type: "text", nullable: true })
  metadata: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
