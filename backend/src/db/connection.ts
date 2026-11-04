import mongoose from "mongoose";
import type { AppConfig } from "../config/env.js";

export async function connectMongo(
  config: AppConfig,
  serverSelectionTimeoutMS = 5_000,
  maxPoolSize = 10,
): Promise<void> {
  if (!config.mongoUri || !config.databaseName)
    throw new Error("Explicit MongoDB URI and database name are required.");
  await mongoose.connect(config.mongoUri, {
    dbName: config.databaseName,
    autoIndex: false,
    serverSelectionTimeoutMS,
    maxPoolSize,
    appName: "paniverse-lms-be-01",
  });

  const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
  if (!hello?.setName) {
    await mongoose.disconnect();
    throw new Error(
      "MongoDB replica set is required for session transactions.",
    );
  }
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export async function withTransaction<T>(
  operation: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    let completed = false;
    await session.withTransaction(async () => {
      result = await operation(session);
      completed = true;
    });
    if (!completed) throw new Error("Transaction completed without a result.");
    return result as T;
  } finally {
    await session.endSession();
  }
}

export function isMongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export function createLazyConnection(
  connect: () => Promise<void>,
  isReady: () => boolean,
): () => Promise<void> {
  let connectionAttempt: Promise<void> | undefined;

  return async () => {
    if (isReady()) return;
    if (!connectionAttempt) {
      connectionAttempt = Promise.resolve()
        .then(connect)
        .catch((error: unknown) => {
          connectionAttempt = undefined;
          throw error;
        });
    }
    await connectionAttempt;
  };
}

export function createVercelMongoConnection(
  config: AppConfig,
): () => Promise<void> {
  return createLazyConnection(
    () => connectMongo(config, 5_000, 5),
    isMongoReady,
  );
}
