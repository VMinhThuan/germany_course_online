import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type JsonObject = Record<string, unknown>;
const specification = parse(
  readFileSync(new URL("../../openapi.yaml", import.meta.url), "utf8"),
) as JsonObject;

function resolvePointer(pointer: string): unknown {
  if (!pointer.startsWith("#/"))
    throw new Error(
      `External reference is not allowed in this contract: ${pointer}`,
    );
  return pointer
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((value, key) => {
      if (typeof value !== "object" || value === null) return undefined;
      return (value as JsonObject)[key];
    }, specification);
}

function collectRefs(
  value: unknown,
  refs = new Set<string>(),
  visited = new WeakSet<object>(),
): Set<string> {
  if (typeof value !== "object" || value === null || visited.has(value))
    return refs;
  visited.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) collectRefs(entry, refs, visited);
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string") refs.add(child);
      else collectRefs(child, refs, visited);
    }
  }
  return refs;
}

describe("BE-01 OpenAPI contract", () => {
  it("parses as OpenAPI 3.1 and has no missing internal references", () => {
    expect(specification.openapi).toBe("3.1.0");
    for (const reference of collectRefs(specification))
      expect(resolvePointer(reference), reference).toBeDefined();
  });

  it("documents exactly the seven auth operations and four public operations", () => {
    const paths = specification.paths as JsonObject;
    const operations = Object.entries(paths).flatMap(([path, value]) => {
      if (typeof value !== "object" || value === null) return [];
      return Object.keys(value)
        .filter((method) => ["get", "post"].includes(method))
        .map((method) => `${method.toUpperCase()} ${path}`);
    });
    const expected = [
      "POST /auth/register",
      "POST /auth/login",
      "POST /auth/refresh",
      "POST /auth/logout",
      "POST /auth/password/forgot",
      "POST /auth/password/reset",
      "GET /auth/me",
      "GET /courses",
      "GET /courses/{slug}",
      "GET /site-settings/public",
      "GET /media/{assetId}/metadata",
    ];
    for (const operation of expected) expect(operations).toContain(operation);
  });

  it("uses one success envelope for auth and a safe profile response for registration", () => {
    const paths = specification.paths as JsonObject;
    const schemas = (specification.components as JsonObject)
      .schemas as JsonObject;
    const authResult = schemas.AuthResult as JsonObject;
    expect(Object.keys(authResult.properties as JsonObject)).toEqual([
      "accessToken",
      "expiresIn",
      "user",
    ]);
    expect(Object.keys(authResult.properties as JsonObject)).not.toContain(
      "success",
    );
    expect(Object.keys(authResult.properties as JsonObject)).not.toContain(
      "refreshToken",
    );

    const register = (
      (paths["/auth/register"] as JsonObject).post as JsonObject
    ).responses as JsonObject;
    const registerSchema = (
      ((register["201"] as JsonObject).content as JsonObject)[
        "application/json"
      ] as JsonObject
    ).schema as JsonObject;
    const registerData = (registerSchema.properties as JsonObject)
      .data as JsonObject;
    expect(registerData.$ref).toBe("#/components/schemas/UserProfile");

    const emptyResult = schemas.EmptyResult as JsonObject;
    const genericAccepted = schemas.GenericAccepted as JsonObject;
    expect(emptyResult.properties ?? {}).not.toHaveProperty("success");
    expect(genericAccepted.properties).not.toHaveProperty("success");

    for (const path of ["/auth/logout", "/auth/password/reset"]) {
      const operation = (paths[path] as JsonObject).post as JsonObject;
      const response = (operation.responses as JsonObject)["200"] as JsonObject;
      const schema = (
        (response.content as JsonObject)["application/json"] as JsonObject
      ).schema as JsonObject;
      const data = (schema.properties as JsonObject).data as JsonObject;
      expect(data.$ref).toBe("#/components/schemas/EmptyResult");
    }
    const forgotOperation = (paths["/auth/password/forgot"] as JsonObject)
      .post as JsonObject;
    const forgotResponse = (forgotOperation.responses as JsonObject)[
      "200"
    ] as JsonObject;
    const forgotSchema = (
      (forgotResponse.content as JsonObject)["application/json"] as JsonObject
    ).schema as JsonObject;
    expect(
      ((forgotSchema.properties as JsonObject).data as JsonObject).$ref,
    ).toBe("#/components/schemas/GenericAccepted");
  });

  it("uses explicit public section and lesson summaries with no open-ended lesson content", () => {
    const schemas = (specification.components as JsonObject)
      .schemas as JsonObject;
    const detail = schemas.CourseDetail as JsonObject;
    const sectionRef = (
      ((detail.properties as JsonObject).sections as JsonObject)
        .items as JsonObject
    ).$ref;
    expect(sectionRef).toBe("#/components/schemas/PublicCourseSection");
    const lesson = schemas.PublicLessonSummary as JsonObject;
    expect(lesson.additionalProperties).toBe(false);
    expect(lesson.properties).not.toHaveProperty("content");
    expect(lesson.properties).not.toHaveProperty("answerAssets");
  });
});

const learningOperations = [
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
] as const;

describe("BE-02 OpenAPI contract", () => {
  it("documents each learning operation as authenticated and returns its declared success envelope", () => {
    const paths = specification.paths as JsonObject;
    for (const [method, path, operationId] of learningOperations) {
      const operation = (paths[path] as JsonObject)[method] as JsonObject;
      expect(operation.operationId).toBe(operationId);
      expect(operation.security).toEqual([{ AccessToken: [] }]);
      const responses = operation.responses as JsonObject;
      const successCode =
        operationId === "startQuizAttempt" || operationId === "retryQuizAttempt"
          ? "201"
          : "200";
      expect(responses).toHaveProperty(successCode);
      const response = responses[successCode] as JsonObject;
      const schema = (
        (response.content as JsonObject)["application/json"] as JsonObject
      ).schema as JsonObject;
      expect(
        ((schema.properties as JsonObject).data as JsonObject).$ref,
      ).toBeTruthy();
    }
    expect(learningOperations).toHaveLength(18);
  });

  it("uses closed typed learning DTOs and keeps answer keys out of attempt responses", () => {
    const schemas = (specification.components as JsonObject)
      .schemas as JsonObject;
    for (const name of [
      "StudentCourseSection",
      "StudentCourseLesson",
      "LearningSection",
      "LessonWorkspace",
      "LessonAssetSummary",
      "ExerciseAssetSummary",
      "Exercise",
      "ExerciseProgress",
      "LessonProgress",
      "LessonCompletion",
      "LessonNote",
      "QuizAttempt",
      "QuizResult",
      "QuizAnswerReview",
    ]) {
      expect((schemas[name] as JsonObject).additionalProperties, name).not.toBe(
        true,
      );
    }

    const attemptProperties = (schemas.QuizAttempt as JsonObject)
      .properties as JsonObject;
    for (const key of [
      "isCorrect",
      "correctOption",
      "correctOptionId",
      "explanation",
      "points",
    ]) {
      expect(attemptProperties).not.toHaveProperty(key);
    }
    const question = (
      (attemptProperties.questions as JsonObject).items as JsonObject
    ).properties as JsonObject;
    expect(question).not.toHaveProperty("isCorrect");
    const option = ((question.options as JsonObject).items as JsonObject)
      .properties as JsonObject;
    expect(option).not.toHaveProperty("isCorrect");

    const mediaRequest = schemas.MediaAccessRequest as JsonObject;
    expect(mediaRequest.oneOf).toHaveLength(2);
    const noteRequest = schemas.LessonNoteRequest as JsonObject;
    expect(
      ((noteRequest.properties as JsonObject).content as JsonObject).maxLength,
    ).toBe(10_000);
  });

  it("documents media-provider unavailability as 503", () => {
    const paths = specification.paths as JsonObject;
    const operation = (paths["/learn/media-access"] as JsonObject)
      .post as JsonObject;
    expect(operation.responses).toHaveProperty("503");
  });
});

const commerceOperations = [
  ["get", "/checkout/quote", "getCheckoutQuote", "OrderQuote"],
  ["post", "/orders", "createOrder", "OrderDetail"],
  ["get", "/orders", "listMyOrders", "OrderPage"],
  ["get", "/orders/{orderId}", "getMyOrder", "OrderDetail"],
  [
    "post",
    "/orders/{orderId}/confirm-transfer",
    "confirmTransfer",
    "OrderDetail",
  ],
  ["get", "/admin/orders", "adminListOrders", "AdminOrderPage"],
  ["get", "/admin/orders/{orderId}", "adminGetOrder", "AdminOrderDetail"],
  ["post", "/admin/orders/{orderId}/approve", "approveOrder", "ApprovedOrder"],
  ["get", "/admin/site-settings", "adminGetSiteSettings", "SiteSettingsAdmin"],
  ["patch", "/admin/site-settings", "updateSiteSettings", "SiteSettingsAdmin"],
] as const;

describe("BE-03A commerce OpenAPI contract", () => {
  it("documents all ten protected purchase and approval operations", () => {
    const paths = specification.paths as JsonObject;
    for (const [method, path, operationId, schemaName] of commerceOperations) {
      const operation = (paths[path] as JsonObject)[method] as JsonObject;
      expect(operation.operationId).toBe(operationId);
      expect(operation.security).toEqual([{ AccessToken: [] }]);
      const responses = operation.responses as JsonObject;
      const status = operationId === "createOrder" ? "201" : "200";
      const successResponse = responses[status] as JsonObject;
      const envelope = (
        (successResponse.content as JsonObject)[
          "application/json"
        ] as JsonObject
      ).schema as JsonObject;
      expect(
        ((envelope.properties as JsonObject).data as JsonObject).$ref,
      ).toBe(`#/components/schemas/${schemaName}`);
    }
    expect(commerceOperations).toHaveLength(10);
    const create = (paths["/orders"] as JsonObject).post as JsonObject;
    expect(create.responses).toHaveProperty("200");
    expect(create.responses).toHaveProperty("503");
  });

  it("uses typed, closed order and payment settings DTOs", () => {
    const schemas = (specification.components as JsonObject)
      .schemas as JsonObject;
    for (const name of [
      "Order",
      "AdminOrder",
      "OrderCreateRequest",
      "AdminOrderDetail",
      "AdminOrderSummary",
      "BankTransferSettings",
      "BankTransferSettingsPatch",
      "SiteSettingsAdmin",
      "SiteSettingsWriteRequest",
    ]) {
      expect((schemas[name] as JsonObject).additionalProperties, name).toBe(
        false,
      );
    }
    const order = schemas.Order as JsonObject;
    const orderProperties = order.properties as JsonObject;
    expect(orderProperties).toHaveProperty("coursePriceSnapshot");
    expect(orderProperties).toHaveProperty("paymentSubmittedAt");
    expect(orderProperties).not.toHaveProperty("reviewNote");
    expect(orderProperties).not.toHaveProperty("reviewedById");
    const quote = schemas.OrderQuote as JsonObject;
    expect(quote.properties).toHaveProperty("coursePrice");
    const adminOrders = (specification.paths as JsonObject)[
      "/admin/orders"
    ] as JsonObject;
    const parameters = (adminOrders.get as JsonObject)
      .parameters as JsonObject[];
    expect(
      parameters.some((parameter) => parameter.name === "paymentSubmitted"),
    ).toBe(true);
    expect(
      parameters.some((parameter) => parameter.name === "transferSubmitted"),
    ).toBe(false);
  });
});

const be03bOperations = [
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

describe("BE-03B Admin CMS and account contract", () => {
  it("documents the 34 scoped operations and the seven explicit media extensions", () => {
    const paths = specification.paths as JsonObject;
    for (const [method, path, operationId] of [
      ...be03bOperations,
      ...be03bExtensions,
    ]) {
      const operation = (paths[path] as JsonObject)[method] as JsonObject;
      expect(operation.operationId).toBe(operationId);
      expect(operation.security).toEqual([{ AccessToken: [] }]);
    }
    expect(be03bOperations).toHaveLength(34);
    expect(be03bExtensions).toHaveLength(7);
    for (const path of [
      "/admin/media-assets/upload-intents",
      "/admin/media-assets/{assetId}/complete-upload",
      "/admin/media-assets/{assetId}",
    ]) {
      const operation = (paths[path] as JsonObject).post as
        JsonObject | undefined;
      if (operation) expect(operation.responses).toHaveProperty("503");
    }
  });

  it("uses bounded closed CMS DTOs and versioned plain-text lesson content", () => {
    const schemas = (specification.components as JsonObject)
      .schemas as JsonObject;
    for (const name of [
      "CourseAdmin",
      "CourseCreateRequest",
      "CoursePatchRequest",
      "AdminSection",
      "AdminLesson",
      "AdminLessonContent",
      "AdminExercise",
      "QuizWriteRequest",
      "QuizAdmin",
      "AdminMediaAsset",
      "AdminStudentSummary",
      "AdminEnrollmentSummary",
      "AdminAuditLog",
      "AssociationWriteRequest",
    ]) {
      expect((schemas[name] as JsonObject).additionalProperties, name).toBe(
        false,
      );
    }
    const lessonContent = schemas.AdminLessonContent as JsonObject;
    expect((lessonContent.properties as JsonObject).version).toMatchObject({
      const: 1,
    });
    const quiz = schemas.QuizAdmin as JsonObject;
    const quizProperties = quiz.properties as JsonObject;
    expect(quizProperties).toHaveProperty("showCorrectAnswers");
    expect(quizProperties).toHaveProperty("questions");
    expect(
      (schemas.AdminMediaAsset as JsonObject).properties,
    ).not.toHaveProperty("storageKey");
    expect((schemas.AdminMediaAsset as JsonObject).properties).toHaveProperty(
      "provider",
      {
        type: "string",
        enum: ["S3_COMPATIBLE", "CLOUDINARY", "UNKNOWN"],
      },
    );
  });
});

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

describe("BE-03C LMS business logic contract", () => {
  it("preserves twelve BE-00 operations and declares four scoped extensions", () => {
    const paths = specification.paths as JsonObject;
    for (const [method, path, operationId, access] of [
      ...be03cOperations,
      ...be03cExtensions,
    ]) {
      const operation = (paths[path] as JsonObject)[method] as JsonObject;
      expect(operation.operationId).toBe(operationId);
      expect(operation.security).toEqual([{ AccessToken: [] }]);
      expect((operation["x-contract"] as JsonObject).access).toBe(access);
    }
    expect(be03cOperations).toHaveLength(12);
    expect(be03cExtensions).toHaveLength(4);

    for (const operationId of [
      "grantEnrollment",
      "revokeEnrollment",
      "restoreEnrollment",
      "extendEnrollment",
    ]) {
      const operation = [...be03cOperations, ...be03cExtensions]
        .map(
          ([method, path]) => (paths[path] as JsonObject)[method] as JsonObject,
        )
        .find((entry) => entry.operationId === operationId);
      expect(operation?.parameters).toContainEqual(
        expect.objectContaining({
          name: "Idempotency-Key",
          in: "header",
          required: true,
        }),
      );
    }
  });

  it("defines strict renewal, coupon, cancellation, and enrollment DTOs", () => {
    const schemas = (specification.components as JsonObject)
      .schemas as JsonObject;
    for (const name of [
      "RenewalPlan",
      "RenewalPlanList",
      "RenewalPlanWriteRequest",
      "RenewalPlanPatchRequest",
      "Coupon",
      "CouponValidation",
      "CouponWriteRequest",
      "CouponPatchRequest",
      "CouponReservation",
      "CouponOutstandingReservation",
      "EnrollmentGrantRequest",
      "EnrollmentRestoreRequest",
      "EnrollmentExtendRequest",
      "AdminOrderCancelRequest",
    ]) {
      expect((schemas[name] as JsonObject).additionalProperties, name).toBe(
        false,
      );
    }
    const plan = schemas.RenewalPlan as JsonObject;
    expect(plan.properties).toHaveProperty("price");
    const publicPlanList = schemas.RenewalPlanList as JsonObject;
    expect(
      ((publicPlanList.properties as JsonObject).items as JsonObject).items,
    ).toMatchObject({ $ref: "#/components/schemas/StudentRenewalPlan" });
    const coupon = schemas.Coupon as JsonObject;
    expect(coupon.properties).toHaveProperty("reservedCount");
    expect(coupon.properties).toHaveProperty("outstandingReservations");
    const validation = schemas.CouponValidation as JsonObject;
    expect(validation.properties).toHaveProperty("discountSource");
    expect(validation.properties).not.toHaveProperty("usageLimit");
    expect(validation.properties).not.toHaveProperty("reservedCount");

    const order = schemas.Order as JsonObject;
    for (const key of [
      "renewalPlanTitleSnapshot",
      "renewalPlanPriceSnapshot",
      "discountSource",
      "cancelledAt",
      "cancellationReason",
    ]) {
      expect(order.properties).toHaveProperty(key);
    }
    expect(schemas.AdminOrderDetail).toMatchObject({
      properties: { couponReservation: expect.any(Object) },
    });
  });

  it("documents score-independent Quiz completion and non-stacking discount selection", () => {
    const paths = specification.paths as JsonObject;
    const submit = (
      paths["/learn/quiz-attempts/{attemptId}/submit"] as JsonObject
    ).post as JsonObject;
    expect(submit.description).toContain("completionSource=QUIZ");
    expect(submit.description).toContain("regardless of score");
    const quote = (schemasOf(specification).OrderQuote as JsonObject)
      .properties as JsonObject;
    expect(quote.discountSource).toMatchObject({
      enum: ["NONE", "COUPON", "AUTOMATIC_5_PERCENT"],
    });
  });
});

function schemasOf(document: JsonObject): JsonObject {
  return (document.components as JsonObject).schemas as JsonObject;
}
