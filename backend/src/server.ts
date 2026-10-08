import "reflect-metadata";

import app from "./app";
import { AppDataSource } from "./config/data-source";

const PORT = Number(process.env.PORT ?? 5000);




AppDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!");
        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
        server.on("error", (err) => {
            console.error("Server error:", err);
        });
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err);
    });