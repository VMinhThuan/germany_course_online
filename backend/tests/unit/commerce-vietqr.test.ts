import { describe, expect, it } from "vitest";
import { buildVietQrUrl } from "../../src/modules/commerce/dto.js";

describe("VietQR Quick Link", () => {
  it("uses the server-side amount and order code", () => {
    const url = new URL(
      buildVietQrUrl(
        {
          bankBin: "970418",
          accountNumber: "4210541181",
          accountName: "Verified Account",
          template: "compact2",
        },
        "495000",
        "PAN20261113ABC1234567",
      ),
    );
    expect(url.origin).toBe("https://img.vietqr.io");
    expect(url.pathname).toBe("/image/970418-4210541181-compact2.png");
    expect(url.searchParams.get("amount")).toBe("495000");
    expect(url.searchParams.get("addInfo")).toBe("PAN20261113ABC1234567");
    expect(url.searchParams.get("accountName")).toBe("Verified Account");
  });

  it("rejects invalid or unsafe transfer content", () => {
    expect(() =>
      buildVietQrUrl(
        {
          bankBin: "970418",
          accountNumber: "4210541181",
          template: "compact2",
        },
        "0",
        "PAN-INVALID-CONTENT-WITH-TOO-MANY-CHARS",
      ),
    ).toThrow();
  });
});
