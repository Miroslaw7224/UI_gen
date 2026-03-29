import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock server actions
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

// Mock anon-work-tracker
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

// Mock project actions
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

import { useAuth } from "@/hooks/use-auth";

const ANON_WORK = {
  messages: [{ role: "user", content: "hello" }],
  fileSystemData: { "/": { type: "directory" }, "/App.tsx": { type: "file" } },
};

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "proj_new" });
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("sets isLoading during execution and clears it after", async () => {
      let resolveAction!: (v: { success: boolean }) => void;
      mockSignIn.mockReturnValue(new Promise((r) => (resolveAction = r)));
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "proj_1" }]);

      const { result } = renderHook(() => useAuth());

      let signInPromise!: Promise<unknown>;
      act(() => {
        signInPromise = result.current.signIn("user@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveAction({ success: true });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signInAction with correct credentials", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "secret"));

      expect(mockSignIn).toHaveBeenCalledWith("a@b.com", "secret");
    });

    test("returns result from signInAction", async () => {
      const expected = { success: false, error: "Invalid credentials" };
      mockSignIn.mockResolvedValue(expected);

      const { result } = renderHook(() => useAuth());
      const returned = await act(() => result.current.signIn("a@b.com", "wrong"));

      expect(returned).toEqual(expected);
    });

    test("does not navigate on failed sign-in", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Wrong password" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "bad"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("isLoading resets to false even when signInAction throws", async () => {
      mockSignIn.mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pass").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with correct credentials", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@b.com", "pass123"));

      expect(mockSignUp).toHaveBeenCalledWith("new@b.com", "pass123");
    });

    test("returns result from signUpAction", async () => {
      const expected = { success: false, error: "Email taken" };
      mockSignUp.mockResolvedValue(expected);

      const { result } = renderHook(() => useAuth());
      const returned = await act(() => result.current.signUp("x@y.com", "pass"));

      expect(returned).toEqual(expected);
    });

    test("isLoading resets to false even when signUpAction throws", async () => {
      mockSignUp.mockRejectedValue(new Error("server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "pass").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post-sign-in navigation — anon work present", () => {
    beforeEach(() => {
      mockGetAnonWorkData.mockReturnValue(ANON_WORK);
      mockCreateProject.mockResolvedValue({ id: "proj_anon" });
    });

    test("creates project with anon work data after successful signIn", async () => {
      mockSignIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "pass"));

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: ANON_WORK.messages,
          data: ANON_WORK.fileSystemData,
        })
      );
    });

    test("clears anon work after creating project", async () => {
      mockSignIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "pass"));

      expect(mockClearAnonWork).toHaveBeenCalled();
    });

    test("navigates to new project created from anon work", async () => {
      mockSignIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "pass"));

      expect(mockPush).toHaveBeenCalledWith("/proj_anon");
    });

    test("does not call getProjects when anon work exists", async () => {
      mockSignIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "pass"));

      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    test("same behavior after successful signUp", async () => {
      mockSignUp.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@b.com", "pass"));

      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj_anon");
    });
  });

  describe("post-sign-in navigation — no anon work, existing projects", () => {
    beforeEach(() => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "proj_recent" }, { id: "proj_old" }]);
    });

    test("navigates to most recent project", async () => {
      mockSignIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "pass"));

      expect(mockPush).toHaveBeenCalledWith("/proj_recent");
    });

    test("does not create a new project when existing ones are found", async () => {
      mockSignIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "pass"));

      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });

  describe("post-sign-in navigation — no anon work, no projects", () => {
    beforeEach(() => {
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj_brand_new" });
    });

    test("creates a new project when user has none", async () => {
      mockSignIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "pass"));

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
    });

    test("navigates to the newly created project", async () => {
      mockSignIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "pass"));

      expect(mockPush).toHaveBeenCalledWith("/proj_brand_new");
    });
  });

  describe("edge case — anon work with empty messages", () => {
    test("does not create project from anon work when messages array is empty", async () => {
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue([{ id: "proj_existing" }]);
      mockSignIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "pass"));

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj_existing");
    });
  });
});
