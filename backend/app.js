import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import routes from "./routes/index.js";

// Load environment variables (always from backend/.env, independent of CWD)
dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Logging Middleware
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Routes
app.get("/", (req, res) => {
  res.send("API is running...");
});

// API routes
app.use(routes);

// 404 handler for unknown routes
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  next(error);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  const statusCode =
    err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const code = err.code || "INTERNAL_ERROR";

  res.status(statusCode).json({
    message: err.message || "Server error",
    code,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
});

export default app;
