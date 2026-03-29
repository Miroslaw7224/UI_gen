import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

describe("ToolInvocationBadge", () => {
  describe("str_replace_editor", () => {
    it("shows 'Tworzę plik' for create command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "/src/App.tsx" }}
          isDone={false}
        />
      );
      expect(screen.getByText("Tworzę plik: App.tsx")).toBeDefined();
    });

    it("shows 'Edytuję plik' for str_replace command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "str_replace", path: "/src/components/Button.tsx" }}
          isDone={false}
        />
      );
      expect(screen.getByText("Edytuję plik: Button.tsx")).toBeDefined();
    });

    it("shows 'Wstawiam kod w' for insert command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "insert", path: "/src/index.ts" }}
          isDone={false}
        />
      );
      expect(screen.getByText("Wstawiam kod w: index.ts")).toBeDefined();
    });

    it("shows 'Czytam plik' for view command", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "view", path: "/src/App.tsx" }}
          isDone={false}
        />
      );
      expect(screen.getByText("Czytam plik: App.tsx")).toBeDefined();
    });

    it("shows 'Modyfikuję plik' for undo_edit command (default case)", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "undo_edit", path: "/src/App.tsx" }}
          isDone={false}
        />
      );
      expect(screen.getByText("Modyfikuję plik: App.tsx")).toBeDefined();
    });

    it("handles path without directory slashes", () => {
      render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "App.tsx" }}
          isDone={false}
        />
      );
      expect(screen.getByText("Tworzę plik: App.tsx")).toBeDefined();
    });
  });

  describe("file_manager", () => {
    it("shows rename label with old and new filename", () => {
      render(
        <ToolInvocationBadge
          toolName="file_manager"
          args={{ command: "rename", path: "/src/Old.tsx", new_path: "/src/New.tsx" }}
          isDone={false}
        />
      );
      expect(screen.getByText("Zmieniam nazwę: Old.tsx → New.tsx")).toBeDefined();
    });

    it("shows 'Usuwam plik' for delete command", () => {
      render(
        <ToolInvocationBadge
          toolName="file_manager"
          args={{ command: "delete", path: "/src/Unused.tsx" }}
          isDone={false}
        />
      );
      expect(screen.getByText("Usuwam plik: Unused.tsx")).toBeDefined();
    });

    it("handles rename without new_path", () => {
      render(
        <ToolInvocationBadge
          toolName="file_manager"
          args={{ command: "rename", path: "/src/Old.tsx" }}
          isDone={false}
        />
      );
      expect(screen.getByText(/Zmieniam nazwę: Old\.tsx →/)).toBeDefined();
    });

    it("falls back to tool name for unknown file_manager command", () => {
      render(
        <ToolInvocationBadge
          toolName="file_manager"
          args={{ command: "unknown", path: "/src/File.tsx" }}
          isDone={false}
        />
      );
      expect(screen.getByText("file_manager")).toBeDefined();
    });
  });

  describe("status indicator", () => {
    it("shows spinner when not done", () => {
      const { container } = render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "/src/App.tsx" }}
          isDone={false}
        />
      );
      expect(container.querySelector(".animate-spin")).not.toBeNull();
    });

    it("shows green dot when done", () => {
      const { container } = render(
        <ToolInvocationBadge
          toolName="str_replace_editor"
          args={{ command: "create", path: "/src/App.tsx" }}
          isDone={true}
        />
      );
      expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
      expect(container.querySelector(".animate-spin")).toBeNull();
    });
  });

  it("falls back to tool name for unknown tools", () => {
    render(
      <ToolInvocationBadge
        toolName="unknown_tool"
        args={{}}
        isDone={false}
      />
    );
    expect(screen.getByText("unknown_tool")).toBeDefined();
  });
});
