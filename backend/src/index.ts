import { createVercelHandler } from "./runtime/vercel-app.js";

const app = createVercelHandler(process.env);

export default app;
