import { createServer } from "http";

const PORT = Number(process.env.PORT) || 8080;

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "ai-visibility-tool-worker",
        timestamp: new Date().toISOString(),
        message:
          "Vercel Cron Jobs handle scheduling. This is a health endpoint.",
      }),
    );
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("AI Visibility Tool - Railway Service Running");
});

server.listen(PORT, () => {
  console.log(`[railway-server] Health server running on port ${PORT}`);
  console.log("[railway-server] Vercel Cron Jobs handle all scheduling");
  console.log("[railway-server] Status: HEALTHY");
});

process.on("SIGTERM", () => {
  console.log("[railway-server] Shutting down gracefully...");
  server.close(() => {
    console.log("[railway-server] Closed");
    process.exit(0);
  });
});
