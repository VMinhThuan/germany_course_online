import { readFileSync } from "node:fs";
import { parse } from "yaml";

type OpenApiObject = Record<string, unknown>;

const document = parse(
  readFileSync(new URL("../openapi.yaml", import.meta.url), "utf8"),
) as OpenApiObject;
const designContract = readFileSync(
  new URL("../../docs/backend-design/BE-00/openapi.yaml", import.meta.url),
  "utf8",
);
if (
  designContract !==
  readFileSync(new URL("../openapi.yaml", import.meta.url), "utf8")
) {
  throw new Error(
    "backend/openapi.yaml is out of sync with the BE-00 design source.",
  );
}
if (document.openapi !== "3.1.0")
  throw new Error("OpenAPI document must use version 3.1.0.");

function pointerValue(pointer: string): unknown {
  if (!pointer.startsWith("#/"))
    throw new Error(`External OpenAPI reference is not supported: ${pointer}`);
  return pointer
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((value, segment) => {
      if (typeof value !== "object" || value === null) return undefined;
      return (value as OpenApiObject)[segment];
    }, document);
}

function validateReferences(
  value: unknown,
  seen = new WeakSet<object>(),
): number {
  if (typeof value !== "object" || value === null || seen.has(value)) return 0;
  seen.add(value);
  if (Array.isArray(value))
    return value.reduce(
      (count, item) => count + validateReferences(item, seen),
      0,
    );
  let count = 0;
  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string") {
      if (pointerValue(child) === undefined)
        throw new Error(`Unresolved OpenAPI reference: ${child}`);
      count += 1;
    } else {
      count += validateReferences(child, seen);
    }
  }
  return count;
}

const referencesChecked = validateReferences(document);
const paths = document.paths as OpenApiObject;
const components = document.components as OpenApiObject;
const schemas = components.schemas as OpenApiObject;
const authResult = schemas.AuthResult as OpenApiObject;
const authProperties = authResult.properties as OpenApiObject;
if (
  Object.hasOwn(authProperties, "success") ||
  Object.hasOwn(authProperties, "data") ||
  Object.hasOwn(authProperties, "refreshToken")
) {
  throw new Error(
    "AuthResult must be the inner payload only and must not include a refresh token.",
  );
}

function responseData(
  path: string,
  method: string,
  statusCode: string,
): unknown {
  const operation = (paths[path] as OpenApiObject)[method] as OpenApiObject;
  const responses = operation.responses as OpenApiObject;
  const response = responses[statusCode] as OpenApiObject;
  const content = response.content as OpenApiObject;
  const json = content["application/json"] as OpenApiObject;
  const envelope = json.schema as OpenApiObject;
  return ((envelope.properties as OpenApiObject).data as OpenApiObject).$ref;
}

if (
  responseData("/auth/register", "post", "201") !==
  "#/components/schemas/UserProfile"
) {
  throw new Error("Registration must return the safe UserProfile DTO.");
}
for (const path of ["/auth/login", "/auth/refresh"]) {
  if (responseData(path, "post", "200") !== "#/components/schemas/AuthResult")
    throw new Error(`${path} must use the single AuthResult payload envelope.`);
}
const detail = schemas.CourseDetail as OpenApiObject;
const sections = (
  (detail.properties as OpenApiObject).sections as OpenApiObject
).items as OpenApiObject;
if (sections.$ref !== "#/components/schemas/PublicCourseSection")
  throw new Error("CourseDetail sections must use PublicCourseSection.");

const implemented = [
  ["post", "/auth/register"],
  ["post", "/auth/login"],
  ["post", "/auth/refresh"],
  ["post", "/auth/logout"],
  ["post", "/auth/password/forgot"],
  ["post", "/auth/password/reset"],
  ["get", "/auth/me"],
  ["get", "/courses"],
  ["get", "/courses/{slug}"],
  ["get", "/site-settings/public"],
  ["get", "/media/{assetId}/metadata"],
];
for (const [method, path] of implemented) {
  const operation = (paths[path] as OpenApiObject | undefined)?.[method];
  if (!operation)
    throw new Error(`Missing BE-01 operation: ${method.toUpperCase()} ${path}`);
}

const implementedLearning = [
  ["get", "/me/dashboard", "getStudentDashboard"],
  ["get", "/me/courses", "listMyCourses"],
  ["get", "/me/courses/{courseId}", "getMyCourseOverview"],
  [
    "get",
    "/learn/courses/{courseId}/sections/{sectionId}",
    "getLearningSection",
  ],
  ["get", "/learn/lessons/{lessonId}", "getLessonWorkspace"],
  ["get", "/learn/exercises/{exerciseId}", "getExercise"],
  ["post", "/learn/exercises/{exerciseId}/complete", "completeExercise"],
  ["post", "/learn/lessons/{lessonId}/complete", "completeLesson"],
  ["get", "/learn/courses/{courseId}/progress", "getCourseProgress"],
  ["get", "/learn/lessons/{lessonId}/notes", "getLessonNote"],
  ["put", "/learn/lessons/{lessonId}/notes", "saveLessonNote"],
  ["post", "/learn/media-access", "requestMediaAccess"],
  ["post", "/learn/exercises/{exerciseId}/quiz-attempts", "startQuizAttempt"],
  ["get", "/learn/quiz-attempts/{attemptId}", "getQuizAttempt"],
  [
    "put",
    "/learn/quiz-attempts/{attemptId}/answers/{questionId}",
    "selectQuizAnswer",
  ],
  ["post", "/learn/quiz-attempts/{attemptId}/submit", "submitQuizAttempt"],
  ["get", "/learn/quiz-attempts/{attemptId}/result", "getQuizResult"],
  ["post", "/learn/quiz-attempts/{attemptId}/retry", "retryQuizAttempt"],
];
for (const [method, path, operationId] of implementedLearning) {
  const operation = (paths[path] as OpenApiObject | undefined)?.[method] as
    OpenApiObject | undefined;
  if (!operation)
    throw new Error(`Missing BE-02 operation: ${method.toUpperCase()} ${path}`);
  if (operation.operationId !== operationId)
    throw new Error(
      `Unexpected operationId for ${method.toUpperCase()} ${path}`,
    );
  const security = operation.security as Array<OpenApiObject> | undefined;
  if (!security?.some((scheme) => Object.hasOwn(scheme, "AccessToken")))
    throw new Error(`${operationId} must require an access token.`);
}
if (implementedLearning.length !== 18)
  throw new Error("BE-02 must declare all 18 student learning operations.");

const implementedCommerce = [
  ["get", "/checkout/quote", "getCheckoutQuote"],
  ["post", "/orders", "createOrder"],
  ["get", "/orders", "listMyOrders"],
  ["get", "/orders/{orderId}", "getMyOrder"],
  ["post", "/orders/{orderId}/confirm-transfer", "confirmTransfer"],
  ["get", "/admin/orders", "adminListOrders"],
  ["get", "/admin/orders/{orderId}", "adminGetOrder"],
  ["post", "/admin/orders/{orderId}/approve", "approveOrder"],
  ["get", "/admin/site-settings", "adminGetSiteSettings"],
  ["patch", "/admin/site-settings", "updateSiteSettings"],
];
for (const [method, path, operationId] of implementedCommerce) {
  const operation = (paths[path] as OpenApiObject | undefined)?.[method] as
    OpenApiObject | undefined;
  if (!operation || operation.operationId !== operationId)
    throw new Error(
      `Missing or mismatched BE-03A operation: ${method.toUpperCase()} ${path}`,
    );
  const security = operation.security as Array<OpenApiObject> | undefined;
  if (!security?.some((scheme) => Object.hasOwn(scheme, "AccessToken")))
    throw new Error(`${operationId} must require an access token.`);
}
if (implementedCommerce.length !== 10)
  throw new Error("BE-03A must declare all ten commerce operations.");

const implementedBE03B = [
  ["get", "/admin/courses", "adminListCourses"],
  ["post", "/admin/courses", "createCourse"],
  ["get", "/admin/courses/{courseId}", "adminGetCourse"],
  ["patch", "/admin/courses/{courseId}", "updateCourse"],
  ["delete", "/admin/courses/{courseId}", "softDeleteCourse"],
  ["post", "/admin/courses/{courseId}/publish", "publishCourse"],
  ["get", "/admin/courses/{courseId}/sections", "adminListSections"],
  ["post", "/admin/courses/{courseId}/sections", "createSection"],
  ["patch", "/admin/sections/{sectionId}", "updateSection"],
  ["delete", "/admin/sections/{sectionId}", "softDeleteSection"],
  ["get", "/admin/sections/{sectionId}/lessons", "adminListLessons"],
  ["post", "/admin/sections/{sectionId}/lessons", "createLesson"],
  ["patch", "/admin/lessons/{lessonId}", "updateLesson"],
  ["delete", "/admin/lessons/{lessonId}", "softDeleteLesson"],
  ["get", "/admin/lessons/{lessonId}/exercises", "adminListExercises"],
  ["post", "/admin/lessons/{lessonId}/exercises", "createExercise"],
  ["patch", "/admin/exercises/{exerciseId}", "updateExercise"],
  ["delete", "/admin/exercises/{exerciseId}", "softDeleteExercise"],
  ["get", "/admin/exercises/{exerciseId}/quiz", "adminGetQuiz"],
  ["put", "/admin/exercises/{exerciseId}/quiz", "replaceQuiz"],
  ["post", "/admin/media-assets/upload-intents", "createMediaUploadIntent"],
  [
    "post",
    "/admin/media-assets/{assetId}/complete-upload",
    "completeMediaUpload",
  ],
  ["delete", "/admin/media-assets/{assetId}", "deleteMediaAsset"],
  ["get", "/me/profile", "getMyProfile"],
  ["patch", "/me/profile", "updateMyProfile"],
  ["put", "/me/password", "changeMyPassword"],
  ["get", "/me/sessions", "listMySessions"],
  ["delete", "/me/sessions/{sessionId}", "revokeMySession"],
  ["get", "/admin/students", "adminListStudents"],
  ["get", "/admin/students/{userId}", "adminGetStudent"],
  ["patch", "/admin/students/{userId}/status", "adminSetStudentStatus"],
  ["get", "/admin/enrollments", "adminListEnrollments"],
  ["get", "/admin/enrollments/{enrollmentId}", "adminGetEnrollment"],
  ["get", "/admin/audit-logs", "adminListAuditLogs"],
] as const;
for (const [method, path, operationId] of implementedBE03B) {
  const operation = (paths[path] as OpenApiObject | undefined)?.[method] as
    OpenApiObject | undefined;
  if (!operation || operation.operationId !== operationId)
    throw new Error(
      `Missing or mismatched BE-03B operation: ${method.toUpperCase()} ${path}`,
    );
  const security = operation.security as Array<OpenApiObject> | undefined;
  if (!security?.some((scheme) => Object.hasOwn(scheme, "AccessToken")))
    throw new Error(`${operationId} must require an access token.`);
}
if (implementedBE03B.length !== 34)
  throw new Error("BE-03B must declare all 34 existing API operations.");

const be03bExtensions = [
  ["get", "/admin/media-assets", "adminListMediaAssets"],
  ["get", "/admin/lessons/{lessonId}/assets", "adminListLessonAssets"],
  ["put", "/admin/lessons/{lessonId}/assets/{assetId}", "adminLinkLessonAsset"],
  [
    "delete",
    "/admin/lessons/{lessonId}/assets/{assetId}",
    "adminUnlinkLessonAsset",
  ],
  ["get", "/admin/exercises/{exerciseId}/assets", "adminListExerciseAssets"],
  [
    "put",
    "/admin/exercises/{exerciseId}/assets/{assetId}",
    "adminLinkExerciseAsset",
  ],
  [
    "delete",
    "/admin/exercises/{exerciseId}/assets/{assetId}",
    "adminUnlinkExerciseAsset",
  ],
] as const;
for (const [method, path, operationId] of be03bExtensions) {
  const operation = (paths[path] as OpenApiObject | undefined)?.[method] as
    OpenApiObject | undefined;
  if (!operation || operation.operationId !== operationId)
    throw new Error(
      `Missing or mismatched BE-03B contract extension: ${operationId}`,
    );
  const security = operation.security as Array<OpenApiObject> | undefined;
  if (!security?.some((scheme) => Object.hasOwn(scheme, "AccessToken")))
    throw new Error(`${operationId} must require an access token.`);
}

const be03cOperations = [
  ["post", "/coupons/validate", "validateCoupon", "STUDENT"],
  ["get", "/renewals/courses/{courseId}/plans", "listRenewalPlans", "STUDENT"],
  [
    "get",
    "/admin/courses/{courseId}/renewal-plans",
    "adminListRenewalPlans",
    "ADMIN",
  ],
  [
    "post",
    "/admin/courses/{courseId}/renewal-plans",
    "createRenewalPlan",
    "ADMIN",
  ],
  ["patch", "/admin/renewal-plans/{planId}", "updateRenewalPlan", "ADMIN"],
  ["delete", "/admin/renewal-plans/{planId}", "deactivateRenewalPlan", "ADMIN"],
  ["get", "/admin/coupons", "adminListCoupons", "ADMIN"],
  ["post", "/admin/coupons", "createCoupon", "ADMIN"],
  ["patch", "/admin/coupons/{couponId}", "updateCoupon", "ADMIN"],
  ["delete", "/admin/coupons/{couponId}", "deactivateCoupon", "ADMIN"],
  [
    "post",
    "/admin/enrollments/{enrollmentId}/revoke",
    "revokeEnrollment",
    "ADMIN",
  ],
  [
    "post",
    "/admin/enrollments/{enrollmentId}/restore",
    "restoreEnrollment",
    "ADMIN",
  ],
] as const;
for (const [method, path, operationId, access] of be03cOperations) {
  const operation = (paths[path] as OpenApiObject | undefined)?.[method] as
    OpenApiObject | undefined;
  if (!operation || operation.operationId !== operationId)
    throw new Error(`Missing or mismatched BE-03C operation: ${operationId}`);
  const security = operation.security as Array<OpenApiObject> | undefined;
  if (!security?.some((scheme) => Object.hasOwn(scheme, "AccessToken")))
    throw new Error(`${operationId} must require an access token.`);
  if ((operation["x-contract"] as OpenApiObject | undefined)?.access !== access)
    throw new Error(
      `${operationId} must declare ${access} access in x-contract.`,
    );
}
if (be03cOperations.length !== 12)
  throw new Error("BE-03C must preserve the 12 planned BE-00 operations.");

const be03cExtensions = [
  ["post", "/orders/{orderId}/cancel", "cancelMyOrder", "STUDENT"],
  ["post", "/admin/orders/{orderId}/cancel", "adminCancelOrder", "ADMIN"],
  ["post", "/admin/enrollments", "grantEnrollment", "ADMIN"],
  [
    "post",
    "/admin/enrollments/{enrollmentId}/extend",
    "extendEnrollment",
    "ADMIN",
  ],
] as const;
for (const [method, path, operationId, access] of be03cExtensions) {
  const operation = (paths[path] as OpenApiObject | undefined)?.[method] as
    OpenApiObject | undefined;
  if (!operation || operation.operationId !== operationId)
    throw new Error(
      `Missing or mismatched BE-03C contract extension: ${operationId}`,
    );
  const security = operation.security as Array<OpenApiObject> | undefined;
  if (!security?.some((scheme) => Object.hasOwn(scheme, "AccessToken")))
    throw new Error(`${operationId} must require an access token.`);
  if ((operation["x-contract"] as OpenApiObject | undefined)?.access !== access)
    throw new Error(
      `${operationId} must declare ${access} access in x-contract.`,
    );
}
if (be03cExtensions.length !== 4)
  throw new Error("BE-03C must document exactly four contract extensions.");

for (const operationId of [
  "grantEnrollment",
  "revokeEnrollment",
  "restoreEnrollment",
  "extendEnrollment",
]) {
  const operation = Object.values(paths)
    .flatMap((path) =>
      typeof path === "object" && path !== null
        ? Object.values(path as OpenApiObject)
        : [],
    )
    .find(
      (candidate) =>
        typeof candidate === "object" &&
        candidate !== null &&
        (candidate as OpenApiObject).operationId === operationId,
    ) as OpenApiObject | undefined;
  const parameters = operation?.parameters as OpenApiObject[] | undefined;
  if (
    !parameters?.some(
      (parameter) =>
        parameter.name === "Idempotency-Key" && parameter.required === true,
    )
  )
    throw new Error(`${operationId} must require Idempotency-Key.`);
}

const couponSchema = schemas.Coupon as OpenApiObject;
if (couponSchema.additionalProperties !== false)
  throw new Error("Coupon must be a closed DTO schema.");
const couponValidation = schemas.CouponValidation as OpenApiObject;
const couponValidationProperties = couponValidation.properties as OpenApiObject;
for (const key of ["usageLimit", "reservedCount", "redemptionCount"])
  if (Object.hasOwn(couponValidationProperties, key))
    throw new Error(
      `CouponValidation must not expose private ${key} metadata.`,
    );
const renewalPlanList = schemas.RenewalPlanList as OpenApiObject;
if (!renewalPlanList || renewalPlanList.additionalProperties !== false)
  throw new Error("RenewalPlanList must be defined as a closed DTO.");

const quizAttempt = schemas.QuizAttempt as OpenApiObject;
const attemptProperties = quizAttempt.properties as OpenApiObject;
for (const key of [
  "isCorrect",
  "correctOption",
  "correctOptionId",
  "explanation",
  "points",
]) {
  if (Object.hasOwn(attemptProperties, key))
    throw new Error(`QuizAttempt must not expose ${key}.`);
}
const mediaAccess = (paths["/learn/media-access"] as OpenApiObject)
  .post as OpenApiObject;
if (!Object.hasOwn(mediaAccess.responses as OpenApiObject, "503"))
  throw new Error(
    "Media access must document 503 when protected storage is unavailable.",
  );
const mediaRequest = schemas.MediaAccessRequest as OpenApiObject;
if (!Array.isArray(mediaRequest.oneOf) || mediaRequest.oneOf.length !== 2)
  throw new Error(
    "MediaAccessRequest must require exactly one resource association.",
  );
const noteRequest = schemas.LessonNoteRequest as OpenApiObject;
const noteProperties = noteRequest.properties as OpenApiObject;
if (((noteProperties.content as OpenApiObject).maxLength as number) !== 10_000)
  throw new Error("LessonNoteRequest must enforce the 10,000-character limit.");

const be07aOperations = [
  ["get", "/admin/media-assets/capabilities", "adminMediaCapabilities"],
  ["get", "/admin/media-assets/{assetId}", "adminGetMediaAsset"],
  [
    "post",
    "/admin/media-assets/{assetId}/preview-access",
    "createAdminMediaPreviewAccess",
  ],
] as const;
for (const [method, path, operationId] of be07aOperations) {
  const operation = (paths[path] as OpenApiObject | undefined)?.[method] as
    OpenApiObject | undefined;
  if (!operation || operation.operationId !== operationId)
    throw new Error(`Missing or mismatched BE-07A operation: ${operationId}`);
  const security = operation.security as Array<OpenApiObject> | undefined;
  if (!security?.some((scheme) => Object.hasOwn(scheme, "AccessToken")))
    throw new Error(`${operationId} must require an access token.`);
}

const be10Operations = [
  [
    "get",
    "/learn/lessons/{lessonId}/comments",
    "listLessonComments",
    "STUDENT",
  ],
  [
    "post",
    "/learn/lessons/{lessonId}/comments",
    "createLessonComment",
    "STUDENT",
  ],
  [
    "get",
    "/learn/comments/{commentId}/replies",
    "listLessonCommentReplies",
    "STUDENT",
  ],
  ["patch", "/learn/comments/{commentId}", "editLessonComment", "STUDENT"],
  ["delete", "/learn/comments/{commentId}", "deleteLessonComment", "STUDENT"],
  [
    "put",
    "/learn/comments/{commentId}/reaction",
    "setLessonCommentReaction",
    "STUDENT",
  ],
  [
    "delete",
    "/learn/comments/{commentId}/reaction",
    "removeLessonCommentReaction",
    "STUDENT",
  ],
  [
    "get",
    "/learn/comments/{commentId}/history",
    "getLessonCommentHistory",
    "STUDENT",
  ],
  [
    "get",
    "/admin/lesson-comments/summary",
    "getAdminLessonCommentSummary",
    "ADMIN",
  ],
  ["get", "/admin/lesson-comments", "listAdminLessonComments", "ADMIN"],
  [
    "get",
    "/admin/lesson-comments/{commentId}",
    "getAdminLessonComment",
    "ADMIN",
  ],
  [
    "get",
    "/admin/lesson-comments/{commentId}/history",
    "getAdminLessonCommentHistory",
    "ADMIN",
  ],
  [
    "post",
    "/admin/lessons/{lessonId}/comments",
    "createAdminLessonComment",
    "ADMIN",
  ],
  [
    "patch",
    "/admin/lesson-comments/{commentId}",
    "adminEditLessonComment",
    "ADMIN",
  ],
  [
    "delete",
    "/admin/lesson-comments/{commentId}",
    "adminDeleteLessonComment",
    "ADMIN",
  ],
  [
    "put",
    "/admin/lesson-comments/{commentId}/reaction",
    "adminSetLessonCommentReaction",
    "ADMIN",
  ],
  [
    "delete",
    "/admin/lesson-comments/{commentId}/reaction",
    "adminRemoveLessonCommentReaction",
    "ADMIN",
  ],
] as const;
for (const [method, path, operationId, access] of be10Operations) {
  const operation = (paths[path] as OpenApiObject | undefined)?.[method] as
    OpenApiObject | undefined;
  if (!operation || operation.operationId !== operationId)
    throw new Error(`Missing or mismatched BE-10 operation: ${operationId}`);
  if ((operation["x-contract"] as OpenApiObject | undefined)?.access !== access)
    throw new Error(`${operationId} must declare ${access} access.`);
  const security = operation.security as Array<OpenApiObject> | undefined;
  if (!security?.some((scheme) => Object.hasOwn(scheme, "AccessToken")))
    throw new Error(`${operationId} must require an access token.`);
}

const studentComment = schemas.StudentLessonComment as OpenApiObject;
const studentCommentProperties = studentComment.properties as OpenApiObject;
for (const key of ["authorId", "userId", "email", "phone", "fullName"])
  if (Object.hasOwn(studentCommentProperties, key))
    throw new Error(`StudentLessonComment must not expose ${key}.`);
const studentAuthor = studentCommentProperties.author as OpenApiObject;
const studentAuthorProperties = studentAuthor.properties as OpenApiObject;
for (const key of ["id", "email", "phone", "fullName", "authorId"])
  if (Object.hasOwn(studentAuthorProperties, key))
    throw new Error(`StudentLessonComment.author must not expose ${key}.`);
const adminComment = schemas.AdminLessonComment as OpenApiObject;
const adminAuthor = (adminComment.properties as OpenApiObject)
  .author as OpenApiObject;
if (!Array.isArray(adminAuthor.oneOf))
  throw new Error(
    "AdminLessonComment must expose a separate full-identity author DTO.",
  );
const adminAuthorFields = (adminAuthor.oneOf[0] as OpenApiObject)
  .properties as OpenApiObject;
if (
  !Object.hasOwn(adminAuthorFields, "email") ||
  !Object.hasOwn(adminAuthorFields, "id")
)
  throw new Error(
    "AdminLessonComment.author must include the private user identity.",
  );
if (be10Operations.length !== 17)
  throw new Error(
    "BE-10 must document exactly 17 Student and Admin operations.",
  );

process.stdout.write(
  `OpenAPI 3.1 valid: ${Object.keys(paths).length} paths, ${referencesChecked} internal references, 11 BE-01 operations, 18 BE-02 operations, 10 BE-03A operations, 34 BE-03B operations, 7 BE-03B extensions, 12 BE-03C operations, 4 BE-03C extensions.\n`,
);
