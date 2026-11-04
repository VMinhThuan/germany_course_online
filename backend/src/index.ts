import express from "express";
import { createVercelHandler } from "./runtime/vercel-app.js";

const app = express();
app.use(createVercelHandler(process.env));

export default app;
