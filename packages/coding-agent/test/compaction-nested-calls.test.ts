import type { ToolResultMessage } from "@earendil-works/pi-ai/compat";
import { describe, expect, it } from "vitest";
import { prepareBranchEntries } from "../src/core/compaction/branch-summarization.ts";
import { computeFileLists, createFileOps, extractFileOpsFromMessage } from "../src/core/compaction/utils.ts";
import type { SessionEntry } from "../src/core/session-manager.ts";

function createCodemodeResult(): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: "codemode-1",
		toolName: "codemode",
		content: [{ type: "text", text: "done" }],
		isError: false,
		timestamp: 0,
		nestedCalls: {
			calls: [
				{ id: "codemode-1/1", name: "read", arguments: { path: "a.ts" }, status: "ok" },
				{ id: "codemode-1/2", name: "edit", arguments: { path: "b.ts", edits: [] }, status: "ok" },
			],
			complete: true,
		},
	};
}

describe("compaction file operations", () => {
	it("branch summaries include files touched by nested calls recorded on tool results", () => {
		const entries: SessionEntry[] = [
			{
				type: "message",
				id: "user-1",
				parentId: null,
				timestamp: "2026-01-01T00:00:00.000Z",
				message: { role: "user", content: "refactor", timestamp: 0 },
			},
			{
				type: "message",
				id: "result-1",
				parentId: "user-1",
				timestamp: "2026-01-01T00:00:01.000Z",
				message: createCodemodeResult(),
			},
		];

		const preparation = prepareBranchEntries(entries);

		expect(computeFileLists(preparation.fileOps)).toEqual({ readFiles: ["a.ts"], modifiedFiles: ["b.ts"] });
		// Tool results still stay out of the summarized conversation.
		expect(preparation.messages.map((message) => message.role)).toEqual(["user"]);
	});

	it("include files touched by nested calls recorded on tool results", () => {
		const result: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "codemode-1",
			toolName: "codemode",
			content: [],
			isError: false,
			timestamp: 0,
			nestedCalls: {
				calls: [
					{ id: "codemode-1/1", name: "read", arguments: { path: "a.ts" }, status: "ok" },
					{ id: "codemode-1/2", name: "edit", arguments: { path: "b.ts", edits: [] }, status: "ok" },
					{ id: "codemode-1/3", name: "write", argumentsBytes: 40000, status: "ok" },
				],
				complete: false,
			},
		};
		const fileOps = createFileOps();
		extractFileOpsFromMessage(result, fileOps);
		expect(computeFileLists(fileOps)).toEqual({ readFiles: ["a.ts"], modifiedFiles: ["b.ts"] });
	});
});
