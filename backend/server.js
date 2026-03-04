import express from "express";
import dotenv from "dotenv";
import auth from "./middlewares/auth.js";
import publicRoutes from "./routes/publicRoutes.js";
import taxRoutes from "./routes/taxRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import priorityRoutes from "./routes/priorityRoutes.js";
import expensesRoutes from "./routes/expensesRoutes.js";
import bankAccountRoutes from "./routes/bankAccountRoutes.js";
import distributionRoutes from "./routes/distributionRoutes.js";
import preferencesRoutes from "./routes/preferencesRoutes.js";
import recurringRoutes from "./routes/recurringRoutes.js";
import monthlyBudgetsRoutes from "./routes/monthlyBudgetsRoutes.js";
import planningRoutes from "./routes/planningRoutes.js";
import monthlySnapshotsRoutes from "./routes/monthlySnapshotsRoutes.js";
import surplusAllocationsRoutes from "./routes/surplusAllocationsRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import transactionsRoutes from "./routes/transactionsRoutes.js";

dotenv.config();

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use("/public", publicRoutes);
app.use("/users", auth, userRoutes);
app.use("/taxes", auth, taxRoutes);
app.use("/bank-accounts", auth, bankAccountRoutes);
app.use("/categories", auth, categoryRoutes);
app.use("/currencies", auth, currencyRoutes);
app.use("/distributions", auth, distributionRoutes);
app.use("/priorities", auth, priorityRoutes);
app.use("/recipes", auth, recipeRoutes);
app.use("/income", auth, recipeRoutes);
app.use("/resumes", auth, resumeRoutes);
app.use("/expenses", auth, expensesRoutes);
app.use("/preferences", auth, preferencesRoutes);
app.use("/recurring", auth, recurringRoutes);
app.use("/monthly-budgets", auth, monthlyBudgetsRoutes);
app.use("/planning", auth, planningRoutes);
app.use("/monthly-snapshots", auth, monthlySnapshotsRoutes);
app.use("/surplus-allocations", auth, surplusAllocationsRoutes);
app.use("/dashboard", auth, dashboardRoutes);
app.use("/transactions", auth, transactionsRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
