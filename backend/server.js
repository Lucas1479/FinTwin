import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { startScheduler } from "./jobs/snapshotScheduler.js";
import app from "./app.js";

// Load environment variables (always from backend/.env, independent of CWD)
dotenv.config();

//  Only run side effects when NOT testing
if (process.env.NODE_ENV !== "test") {
  // Connect to Database
  connectDB();

  // Start Snapshot Scheduler (automated snapshot generation)
  startScheduler();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
