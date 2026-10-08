import express from "express";
import cors from "cors";
import designationRoutes from "./routes/Designations.route";
import employeesRoutes from "./routes/employees.route";
import tasksRoutes from "./routes/Tasks.route";
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/Dashboard.route";
import notificationRoutes from "./routes/notification.route";

const app = express();

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(express.json());

app.use("/api", dashboardRoutes);
app.use("/api", designationRoutes);
app.use("/api", employeesRoutes);
app.use("/api", tasksRoutes);
app.use("/api", notificationRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "API is Running",
    });
});

export default app;