import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRouter from "./routes/health";
import chatRouter from "./routes/chat";
import modelsRouter from "./routes/models";
import notesRouter from "./routes/notes";
import activityRouter from "./routes/activity";
import quizRouter from "./routes/quiz";
import videosRouter from "./routes/videos";
import dataRouter from "./routes/data";
import tasksRouter from "./routes/tasks";
import devlogRouter from "./routes/devlog";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use("/api/health", healthRouter);
app.use("/api/chat", chatRouter);
app.use("/api/models", modelsRouter);
app.use("/api/notes", notesRouter);
app.use("/api/activity", activityRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/videos", videosRouter);
app.use("/api/data", dataRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/devlog", devlogRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] Wisector LearnLM API running at http://localhost:${PORT}`);
});
