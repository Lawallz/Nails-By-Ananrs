import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// The consultation endpoint is implemented by the Supabase Edge Function.
// Keep no alternate provider endpoint that could bypass its controls.
app.post("/api/consult", (_req, res) => {
  res.status(410).json({ error: "Use o formulário atualizado de consultoria." });
});

async function startServer() {
  // Vite integration in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware applied.");
  } else {
    // Production ready bundle serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production build static server configuration applied.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LuxeNail Studio server running smoothly on http://0.0.0.0:${PORT}`);
  });
}

startServer();
