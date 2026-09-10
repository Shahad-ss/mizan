import { Db, MongoClient, type ClientSession } from "mongodb";

let clientPromise: Promise<MongoClient> | undefined;
let dbPromise: Promise<Db> | undefined;

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    const configuredUri = process.env.MONGODB_URI;
    if (!configuredUri) {
      throw new Error("MONGODB_URI is required");
    }

    const uri = new URL(configuredUri);
    if (username && password) {
      uri.username = username;
      uri.password = password;
    }

    clientPromise = MongoClient.connect(uri.toString(), {
      appName: "Mizan",
      maxPoolSize: 10,
    });
  }

  return clientPromise;
}

export function getMongoDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = getMongoClient().then(async (client) => {
      const db = client.db("mizan");
      await Promise.all([
        db.collection("profiles").createIndex({ userId: 1 }, { unique: true }),
        db.collection("bills").createIndex({ userId: 1, id: 1 }, { unique: true }),
        db.collection("debts").createIndex({ userId: 1, id: 1 }, { unique: true }),
        db
          .collection("savings_goals")
          .createIndex({ userId: 1, id: 1 }, { unique: true }),
      ]);
      return db;
    });
  }

  return dbPromise;
}

export async function withMongoTransaction<T>(
  operation: (db: Db, session: ClientSession) => Promise<T>,
): Promise<T> {
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await operation(client.db("mizan"), session);
    });
    if (result === undefined) {
      throw new Error("MongoDB transaction completed without a result");
    }
    return result;
  } finally {
    await session.endSession();
  }
}