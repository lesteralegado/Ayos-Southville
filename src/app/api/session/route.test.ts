import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const createSessionCookie = vi.fn();
const profileGet = vi.fn();
const aliasSet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdmin: () => ({
    auth: { verifyIdToken, createSessionCookie },
    db: {
      collection: (name: string) => ({
        doc: () => name === "residentProfiles" ? { get: profileGet } : { set: aliasSet },
      }),
    },
  }),
}));

import { POST } from "./route";

function sessionRequest() {
  return new Request("https://ayos.test/api/session", {
    method: "POST",
    headers: { origin: "https://ayos.test", "content-type": "application/json" },
    body: JSON.stringify({ idToken: "verified-token" }),
  });
}

describe("verified resident sessions", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    createSessionCookie.mockReset();
    profileGet.mockReset();
    aliasSet.mockReset();
    profileGet.mockResolvedValue({ exists: true, data: () => ({ publicAlias: "Mapagmasid" }) });
    aliasSet.mockResolvedValue(undefined);
  });

  it("issues a protected session cookie after a recent verified sign-in", async () => {
    verifyIdToken.mockResolvedValue({ email_verified: true, auth_time: Math.floor(Date.now() / 1000) });
    createSessionCookie.mockResolvedValue("firebase-session");

    const response = await POST(sessionRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("ayos_session=firebase-session");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(aliasSet).toHaveBeenCalledWith({ publicAlias: "Mapagmasid" });
  });

  it("rejects a session for an unverified email", async () => {
    verifyIdToken.mockResolvedValue({ email_verified: false, auth_time: Math.floor(Date.now() / 1000) });

    const response = await POST(sessionRequest());

    expect(response.status).toBe(401);
    expect(createSessionCookie).not.toHaveBeenCalled();
  });

  it("rejects cross-origin session requests", async () => {
    const request = sessionRequest();
    request.headers.set("origin", "https://attacker.test");

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("rejects verified users who do not have a resident profile", async () => {
    verifyIdToken.mockResolvedValue({ uid: "outsider", email_verified: true, auth_time: Math.floor(Date.now() / 1000) });
    profileGet.mockResolvedValue({ exists: false, data: () => undefined });

    const response = await POST(sessionRequest());

    expect(response.status).toBe(403);
    expect(createSessionCookie).not.toHaveBeenCalled();
  });

  it("returns a controlled error for malformed JSON", async () => {
    const response = await POST(new Request("https://ayos.test/api/session", {
      method: "POST",
      headers: { origin: "https://ayos.test", "content-type": "application/json" },
      body: "{not-json",
    }));

    expect(response.status).toBe(400);
  });
});
