import { createServer, type Server } from "node:http";
import type { Express } from "express";
import type { Logger } from "pino";

export function listenHttp(
  app: Express,
  port: number,
  logger: Logger,
): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(port, () => {
      server.off("error", onError);
      const address = server.address();
      logger.info(
        { port: typeof address === "object" && address ? address.port : port },
        "http server listening",
      );
      resolve(server);
    });
  });
}

export async function closeHttpServer(
  server: Server,
  disconnect: () => Promise<void>,
  logger: Logger,
  signal: string,
  stopBackgroundWork: () => Promise<void> = async () => undefined,
): Promise<void> {
  logger.info({ signal }, "graceful shutdown started");
  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  } catch (error) {
    logger.error(
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      "http server close failed",
    );
    throw error;
  } finally {
    try {
      await stopBackgroundWork();
    } finally {
      await disconnect();
    }
  }
}
