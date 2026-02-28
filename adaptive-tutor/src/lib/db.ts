import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Prisma-backed persistence layer
//
// Provides the same generic interface as the old JSON-file implementation so
// existing API routes can be migrated incrementally or left untouched.
//
// Table name → Prisma model mapping:
//   "users"             → prisma.user
//   "studyPlans"        → prisma.studyPlan
//   "concepts"          → prisma.concept
//   "unitGraphs"        → prisma.unitGraph
//   "graphMemberships"  → prisma.graphMembership
//   "graphLinks"        → prisma.graphLink
//   "conceptNodes"      → prisma.conceptNode (legacy, for migration)
//   "conceptEdges"      → prisma.conceptEdge
//   "questions"         → prisma.question
//   "attemptRecords"    → prisma.attemptRecord
//   "sessionRecords"    → prisma.sessionRecord
//   "chatThreads"       → prisma.chatThread
//   "chatMessages"      → prisma.chatMessage
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = any;

function getModel(table: string): AnyModel {
  const map: Record<string, AnyModel> = {
    users: prisma.user,
    studyPlans: prisma.studyPlan,
    concepts: prisma.concept,
    unitGraphs: prisma.unitGraph,
    graphMemberships: prisma.graphMembership,
    graphLinks: prisma.graphLink,
    conceptNodes: prisma.conceptNode,
    conceptEdges: prisma.conceptEdge,
    questions: prisma.question,
    attemptRecords: prisma.attemptRecord,
    sessionRecords: prisma.sessionRecord,
    chatThreads: prisma.chatThread,
    chatMessages: prisma.chatMessage,
    sourceChunks: prisma.sourceChunk,
  };
  const model = map[table];
  if (!model) {
    throw new Error(`Unknown table: ${table}`);
  }
  return model;
}

// ---------------------------------------------------------------------------
// Generic CRUD helpers (synchronous-looking API backed by Prisma)
//
// NOTE: These functions are async but consume sites were originally sync.
// The API routes (Next.js server functions) are async so awaiting works.
// ---------------------------------------------------------------------------

export async function findMany<T>(
  table: string,
  filter?: Partial<T>
): Promise<T[]> {
  const model = getModel(table);
  return model.findMany({
    where: filter ?? undefined,
  }) as Promise<T[]>;
}

export async function findUnique<T extends { id: string }>(
  table: string,
  id: string
): Promise<T | null> {
  const model = getModel(table);
  return model.findUnique({ where: { id } }) as Promise<T | null>;
}

export async function findFirst<T>(
  table: string,
  filter: Partial<T>
): Promise<T | null> {
  const model = getModel(table);
  return model.findFirst({ where: filter }) as Promise<T | null>;
}

export async function create<T extends { id?: string }>(
  table: string,
  data: Omit<T, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  }
): Promise<T> {
  const model = getModel(table);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = { ...data };

  // Strip undefined values — Prisma rejects them for optional fields
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  }

  // Convert ISO string dates to Date objects for DateTime fields
  const dateFields = [
    "createdAt",
    "updatedAt",
    "targetDate",
    "startTime",
    "endTime",
    "lastPracticed",
    "nextDue",
  ];
  for (const field of dateFields) {
    if (typeof payload[field] === "string") {
      payload[field] = new Date(payload[field]);
    }
  }

  return model.create({ data: payload }) as Promise<T>;
}

export async function update<T extends { id: string }>(
  table: string,
  id: string,
  data: Partial<T>
): Promise<T | null> {
  try {
    const model = getModel(table);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = { ...data };

    // Strip undefined values
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    }

    // Convert ISO string dates to Date objects
    const dateFields = [
      "createdAt",
      "updatedAt",
      "targetDate",
      "startTime",
      "endTime",
      "lastPracticed",
      "nextDue",
    ];
    for (const field of dateFields) {
      if (typeof payload[field] === "string") {
        payload[field] = new Date(payload[field]);
      }
    }

    return model.update({ where: { id }, data: payload }) as Promise<T>;
  } catch {
    return null;
  }
}

export async function remove(table: string, id: string): Promise<boolean> {
  try {
    const model = getModel(table);
    await model.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function removeMany(
  table: string,
  filter: Record<string, unknown>
): Promise<number> {
  const model = getModel(table);
  const result = await model.deleteMany({ where: filter });
  return result.count;
}

// ---------------------------------------------------------------------------
// Seed helper (kept for compatibility; primary seed is in prisma/seed.ts)
// ---------------------------------------------------------------------------

export async function seed(): Promise<void> {
  await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      displayName: "Learner",
    },
  });
  console.log("Seeded demo user");
}
