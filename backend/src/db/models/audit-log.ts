import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const auditLogSchema = new Schema(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      immutable: true,
    },
    action: { type: String, required: true, immutable: true, maxlength: 120 },
    entityType: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 80,
    },
    entityId: { type: Schema.Types.Mixed, required: true, immutable: true },
    oldValue: { type: Schema.Types.Mixed, default: null, immutable: true },
    newValue: { type: Schema.Types.Mixed, default: null, immutable: true },
    ipAddress: { type: String, default: null, immutable: true, maxlength: 64 },
  },
  {
    collection: "audit_logs",
    timestamps: { createdAt: true, updatedAt: false },
    strict: "throw",
  },
);

auditLogSchema.index(
  { entityType: 1, entityId: 1, createdAt: -1 },
  { name: "ix_audit_logs_entity_timeline" },
);
auditLogSchema.index(
  { actorUserId: 1, createdAt: -1 },
  { name: "ix_audit_logs_actor_timeline" },
);
auditLogSchema.index(
  { createdAt: -1, _id: -1 },
  { name: "ix_audit_logs_admin_recent" },
);

export type AuditLogFields = InferSchemaType<typeof auditLogSchema>;
export const AuditLog: Model<AuditLogFields> =
  (models.AuditLog as Model<AuditLogFields> | undefined) ??
  model<AuditLogFields>("AuditLog", auditLogSchema, "audit_logs");
