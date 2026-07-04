export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_SHEET_SYNC === "true") return;

  const { runSyncWithErrorHandling } = await import("./lib/sync-sheets");

  const intervalMs = Number(process.env.SYNC_INTERVAL_MS ?? 120_000);

  const run = async () => {
    try {
      await runSyncWithErrorHandling();
      console.log("[sync] completed");
    } catch (err) {
      console.error("[sync] failed", err);
    }
  };

  // Delay first run so DB is ready after container start
  setTimeout(() => {
    void run();
    setInterval(() => void run(), intervalMs);
  }, 15_000);
}
