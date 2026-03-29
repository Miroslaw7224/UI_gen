// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock server-only so it doesn't throw in test environment
vi.mock("server-only", () => ({}));

// Mock next/headers cookies
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockGet, set: mockSet, delete: mockDelete })),
}));

// Mock next/server NextRequest (used by verifySession)
import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

const TEST_USER_ID = "user_123";
const TEST_EMAIL = "test@example.com";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no token in cookie store
    mockGet.mockReturnValue(undefined);
  });

  describe("createSession", () => {
    test("sets httpOnly cookie with JWT token", async () => {
      await createSession(TEST_USER_ID, TEST_EMAIL);

      expect(mockSet).toHaveBeenCalledOnce();
      const [cookieName, token, options] = mockSet.mock.calls[0];
      expect(cookieName).toBe("auth-token");
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // valid JWT format
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe("lax");
      expect(options.path).toBe("/");
    });

    test("sets cookie expiry ~7 days in the future", async () => {
      const before = Date.now();
      await createSession(TEST_USER_ID, TEST_EMAIL);
      const after = Date.now();

      const [, , options] = mockSet.mock.calls[0];
      const expiresMs = options.expires.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
      expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
    });
  });

  describe("getSession", () => {
    test("returns null when no cookie present", async () => {
      mockGet.mockReturnValue(undefined);
      const session = await getSession();
      expect(session).toBeNull();
    });

    test("returns null for an invalid/tampered token", async () => {
      mockGet.mockReturnValue({ value: "invalid.token.value" });
      const session = await getSession();
      expect(session).toBeNull();
    });

    test("returns session payload for a valid token", async () => {
      // Create a real token via createSession, capture it, then verify
      await createSession(TEST_USER_ID, TEST_EMAIL);
      const token = mockSet.mock.calls[0][1];

      mockGet.mockReturnValue({ value: token });
      const session = await getSession();

      expect(session).not.toBeNull();
      expect(session?.userId).toBe(TEST_USER_ID);
      expect(session?.email).toBe(TEST_EMAIL);
    });
  });

  describe("deleteSession", () => {
    test("deletes the auth-token cookie", async () => {
      await deleteSession();
      expect(mockDelete).toHaveBeenCalledWith("auth-token");
    });
  });

  describe("verifySession", () => {
    function makeRequest(token?: string): NextRequest {
      const req = new NextRequest("http://localhost/api/test");
      if (token) {
        req.cookies.set("auth-token", token);
      }
      return req;
    }

    test("returns null when no cookie in request", async () => {
      const session = await verifySession(makeRequest());
      expect(session).toBeNull();
    });

    test("returns null for an invalid token in request", async () => {
      const session = await verifySession(makeRequest("bad.token.here"));
      expect(session).toBeNull();
    });

    test("returns session payload for a valid token in request", async () => {
      await createSession(TEST_USER_ID, TEST_EMAIL);
      const token = mockSet.mock.calls[0][1];

      const session = await verifySession(makeRequest(token));

      expect(session).not.toBeNull();
      expect(session?.userId).toBe(TEST_USER_ID);
      expect(session?.email).toBe(TEST_EMAIL);
    });
  });
});
