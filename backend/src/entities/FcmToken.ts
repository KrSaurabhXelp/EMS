import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("fcm_tokens")
export class FcmToken {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 500, unique: true })
    token: string;

    @Column({ type: "int", nullable: true })
    employeeId: number | null;

    @Column({ type: "int", nullable: true })
    userId: number | null;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;


}