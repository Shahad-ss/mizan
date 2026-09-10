import { Db, MongoClient } from "mongodb";

let dbPromise: Promise<Db> | undefined;

export function getMongoDb(): Promise<Db> {
  if (!dbPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is required");
    }

    dbPromise = MongoClient.connect(uri, {
      appName: "Mizan",
      maxPoolSize: 10,
    }).then(async (client) => {
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