import { getClaudeClient } from "./client";
import { PARSE_REPORT_USER_PROMPT, buildParsePrompt } from "./prompts";
import Anthropic from "@anthropic-ai/sdk";

export interface ParsedBiomarker {
  name: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  flag: "green" | "yellow" | "red";
  confidence: number;
}

export interface ParsedReportResult {
  biomarkers: ParsedBiomarker[];
  summary: string;
  report_date: string | null;
  /** Lab provider identified by Claude from document header/footer (#134) */
  report_source?: string | null;
}

/**
 * Sends a medical report (as base64 image or PDF) to Claude Vision
 * and returns structured extraction results.
 *
 * @param fileBase64 - Base64-encoded file content
 * @param mediaType - MIME type of the file
 * @param labHints - Optional format-specific hints from lab detection (#134)
 */
export async function parseReportWithClaude(
  fileBase64: string,
  mediaType: "image/jpeg" | "image/png" | "application/pdf",
  labHints?: string
): Promise<ParsedReportResult> {
  const client = getClaudeClient();

  const imageContent: Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam =
    mediaType === "application/pdf"
      ? {
          type: "document",
          source: {
            type: "base64",
            media_type: mediaType,
            data: fileBase64,
          },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: fileBase64,
          },
        };

  const systemPrompt = buildParsePrompt(labHints);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          imageContent,
          {
            type: "text",
            text: PARSE_REPORT_USER_PROMPT,
          },
        ],
      },
    ],
  });

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON from response — handle markdown code blocks
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as ParsedReportResult;

  // Validate structure
  if (!Array.isArray(parsed.biomarkers)) {
    throw new Error("Invalid response: biomarkers must be an array");
  }
  if (typeof parsed.summary !== "string") {
    throw new Error("Invalid response: summary must be a string");
  }

  // Default confidence to 1.0 for backward compatibility
  parsed.biomarkers = parsed.biomarkers.map((b) => ({
    ...b,
    confidence: typeof b.confidence === "number" ? b.confidence : 1.0,
  }));

  return parsed;
}
