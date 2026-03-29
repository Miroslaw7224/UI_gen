"use client";

import { Loader2 } from "lucide-react";

type StrReplaceCommand = "view" | "create" | "str_replace" | "insert" | "undo_edit";
type FileManagerCommand = "rename" | "delete";

interface StrReplaceArgs {
  command: StrReplaceCommand;
  path: string;
  new_path?: string;
}

interface FileManagerArgs {
  command: FileManagerCommand;
  path: string;
  new_path?: string;
}

interface ToolInvocationBadgeProps {
  toolName: string;
  args: StrReplaceArgs | FileManagerArgs | Record<string, unknown>;
  isDone: boolean;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const path = typeof args.path === "string" ? args.path.split("/").pop() ?? args.path : "";

  if (toolName === "str_replace_editor") {
    const command = args.command as StrReplaceCommand;
    switch (command) {
      case "create": return `Tworzę plik: ${path}`;
      case "str_replace": return `Edytuję plik: ${path}`;
      case "insert": return `Wstawiam kod w: ${path}`;
      case "view": return `Czytam plik: ${path}`;
      default: return `Modyfikuję plik: ${path}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as FileManagerCommand;
    if (command === "rename") {
      const newPath = typeof args.new_path === "string" ? args.new_path.split("/").pop() ?? args.new_path : "";
      return `Zmieniam nazwę: ${path} → ${newPath}`;
    }
    if (command === "delete") return `Usuwam plik: ${path}`;
  }

  return toolName;
}

export function ToolInvocationBadge({ toolName, args, isDone }: ToolInvocationBadgeProps) {
  const label = getLabel(toolName, args as Record<string, unknown>);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
