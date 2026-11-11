import type { Model, PipelineStage } from "mongoose";
import { indexedModels } from "./ensure-indexes.js";

type IndexKey = Record<string, number | string>;
type IndexOptions = Record<string, unknown>;
type IndexSpec = { key: IndexKey; options: IndexOptions };
type ExistingIndex = {
  key?: IndexKey;
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: unknown;
  collation?: unknown;
  weights?: Record<string, number>;
};

export type IndexPlanStatus =
  | "CREATE"
  | "PRESENT"
  | "CONFLICT"
  | "DUPLICATES"
  | "MANUAL_REVIEW"
  | "RETAINED";

export type IndexPlanEntry = {
  model: string;
  collection: string;
  name: string;
  key: IndexKey;
  status: IndexPlanStatus;
  note: string;
};

export type IndexPlan = {
  entries: IndexPlanEntry[];
  canApply: boolean;
};

const indexModels = indexedModels as unknown as readonly Model<
  Record<string, unknown>
>[];

export async function createIndexPlan(): Promise<IndexPlan> {
  const entries: IndexPlanEntry[] = [];

  for (const model of indexModels) {
    const desired = model.schema.indexes().map(([key, options]) => ({
      key: key as unknown as IndexKey,
      options: options as unknown as IndexOptions,
    }));
    let collectionExists = true;
    let existing: ExistingIndex[];
    try {
      existing = (await model.collection
        .listIndexes()
        .toArray()) as ExistingIndex[];
    } catch (error) {
      if (errorCode(error) !== 26) throw error;
      collectionExists = false;
      existing = [];
    }
    const matchedExisting = new Set<string>();

    for (const index of desired) {
      const name =
        typeof index.options.name === "string"
          ? index.options.name
          : defaultIndexName(index.key);
      const namedIndex = existing.find((candidate) => candidate.name === name);
      if (namedIndex) {
        matchedExisting.add(name);
        const expected = normalizedOptions(index.options);
        const actual = normalizedOptions(namedIndex);
        const compatible =
          namedIndex.key !== undefined &&
          sameIndexKey(index.key, namedIndex) &&
          stableStringify(expected) === stableStringify(actual);
        entries.push({
          model: model.modelName,
          collection: model.collection.collectionName,
          name,
          key: index.key,
          status: compatible ? "PRESENT" : "CONFLICT",
          note: compatible
            ? "Desired index exists with matching keys and supported options."
            : "Same index name exists with different keys or options; manual review required.",
        });
        continue;
      }

      const sameKeyIndexes = existing.filter(
        (candidate) => candidate.key && sameIndexKey(index.key, candidate),
      );

      if (sameKeyIndexes.length > 0) {
        for (const candidate of sameKeyIndexes) {
          if (candidate.name) matchedExisting.add(candidate.name);
        }
        entries.push({
          model: model.modelName,
          collection: model.collection.collectionName,
          name,
          key: index.key,
          status: "CONFLICT",
          note: "Same key pattern exists under a different index name; manual review required.",
        });
        continue;
      }

      if (index.options.unique === true) {
        const arrayFields = Object.keys(index.key).filter(
          (field) => model.schema.path(field)?.instance === "Array",
        );
        if (
          arrayFields.length > 0 ||
          index.options.collation !== undefined ||
          index.options.sparse === true
        ) {
          entries.push({
            model: model.modelName,
            collection: model.collection.collectionName,
            name,
            key: index.key,
            status: "MANUAL_REVIEW",
            note: "Unique-index duplicate analysis is not supported for this index shape.",
          });
          continue;
        }

        const duplicates =
          collectionExists && (await hasDuplicateKeys(model, index));
        if (duplicates) {
          entries.push({
            model: model.modelName,
            collection: model.collection.collectionName,
            name,
            key: index.key,
            status: "DUPLICATES",
            note: "Duplicate key values exist; resolve them before creating this unique index.",
          });
          continue;
        }
      }

      entries.push({
        model: model.modelName,
        collection: model.collection.collectionName,
        name,
        key: index.key,
        status: "CREATE",
        note: "Desired index is missing and no supported unique-key conflict was found.",
      });
    }

    for (const candidate of existing) {
      if (!candidate.name || candidate.name === "_id_") continue;
      if (matchedExisting.has(candidate.name)) continue;
      if (!candidate.key) continue;
      entries.push({
        model: model.modelName,
        collection: model.collection.collectionName,
        name: candidate.name,
        key: candidate.key,
        status: "RETAINED",
        note: "Existing index is not in the current schema and will not be dropped.",
      });
    }
  }

  return {
    entries,
    canApply: entries.every(
      (entry) =>
        entry.status === "CREATE" ||
        entry.status === "PRESENT" ||
        entry.status === "RETAINED",
    ),
  };
}

function errorCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("code" in error))
    return undefined;
  return typeof error.code === "number" ? error.code : undefined;
}

async function hasDuplicateKeys(
  model: Model<Record<string, unknown>>,
  index: IndexSpec,
): Promise<boolean> {
  const match = index.options.partialFilterExpression;
  const pipeline: PipelineStage[] = [];
  if (match && typeof match === "object") {
    pipeline.push({ $match: match as Record<string, unknown> });
  }
  pipeline.push(
    {
      $group: {
        _id: Object.fromEntries(
          Object.keys(index.key).map((field) => [field, `$${field}`]),
        ),
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  );
  return (await model.aggregate(pipeline).exec()).length > 0;
}

function normalizedOptions(options: ExistingIndex | IndexOptions) {
  return {
    unique: options.unique === true,
    sparse: options.sparse === true,
    expireAfterSeconds: options.expireAfterSeconds ?? null,
    partialFilterExpression: options.partialFilterExpression ?? null,
    collation: options.collation ?? null,
  };
}

function sameOrderedObject(left: object, right: object): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameIndexKey(desired: IndexKey, existing: ExistingIndex): boolean {
  if (!existing.key) return false;
  const desiredTextFields = Object.entries(desired)
    .filter(([, direction]) => direction === "text")
    .map(([field]) => field);
  if (desiredTextFields.length > 0 || existing.key._fts === "text") {
    if (desiredTextFields.length === 0 || existing.key._fts !== "text")
      return false;
    const expectedWeights = Object.fromEntries(
      desiredTextFields.map((field) => [field, 1]),
    );
    return (
      stableStringify(expectedWeights) ===
      stableStringify(existing.weights ?? {})
    );
  }
  return sameOrderedObject(existing.key, desired);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries
      .map(
        ([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function defaultIndexName(key: IndexKey): string {
  return Object.entries(key)
    .map(([field, direction]) => `${field}_${direction}`)
    .join("_");
}
