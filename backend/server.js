import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import taxRoutes from "./routes/taxRoutes.js";
import bankAccountRoutes from "./routes/bankAccountRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import distributionRoutes from "./routes/distributionRoutes.js";
import priorityRoutes from "./routes/priorityRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import expensesRoutes from "./routes/expensesRoutes.js";

dotenv.config();

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use("/users", userRoutes);
app.use("/taxes", taxRoutes);
app.use("/bank-accounts", bankAccountRoutes);
app.use("/categories", categoryRoutes);
app.use("/currencies", currencyRoutes);
app.use("/distributions", distributionRoutes);
app.use("/priorities", priorityRoutes);
app.use("/recipes", recipeRoutes);
app.use("/resumes", resumeRoutes);
app.use("/expenses", expensesRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
