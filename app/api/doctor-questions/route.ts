import { createClient } from "@/lib/supabase/server";
import { getClaudeClient } from "@/lib/claude/client";
import {
  DOCTOR_QUESTIONS_SYSTEM_PROMPT,
  DOCTOR_QUESTIONS_USER_PROMPT,
  formatDataForDoctorQuestions,
} from "@/lib/claude/doctor-prompts";
import { NextResponse } from "next/server";

const MAX_QUESTIONS = 10;

interface GeneratedQuestion {
  question: string;
  category: "clarifying" | "follow_up" | "lifestyle" | "medication";
  priority: "high" | "medium" | "low";
}

interface ClaudeQuestionsResponse {
  questions: GeneratedQuestion[];
  disclaimer: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: { parsed_result_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.parsed_result_id) {
    return NextResponse.json(
      { error: "parsed_result_id is required" },
      { status: 400 }
    );
  }

  // Fetch parsed result and verify ownership through report
  const { data: parsedResult, error: parsedError } = await supabase
    .from("parsed_results")
    .select("id, report_id, biomarkers")
    .eq("id", body.parsed_result_id)
    .single();

  if (parsedError || !parsedResult) {
    return NextResponse.json(
      { error: "Parsed result not found" },
      { status: 404 }
    );
  }

  // Verify ownership via report
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id")
    .eq("id", parsedResult.report_id)
    .single();

  if (reportError || !report) {
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 }
    );
  }

  if (report.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if questions already exist for this parsed result
  const { data: existingQuestions } = await supabase
    .from("doctor_questions")
    .select("id, question, category, priority")
    .eq("parsed_result_id", parsedResult.id);

  if (existingQuestions && existingQuestions.length > 0) {
    return NextResponse.json(
      {
        questions: existingQuestions,
        cached: true,
        disclaimer:
          "These questions are suggestions to help guide your conversation with your doctor. They are not medical advice.",
      },
      { status: 200 }
    );
  }

  // Fetch risk flags for context
  const { data: riskFlags } = await supabase
    .from("risk_flags")
    .select("biomarker_name, flag, trend")
    .eq("parsed_result_id", parsedResult.id);

  // Validate biomarkers exist
  const biomarkers = parsedResult.biomarkers as Array<{
    name: string;
    value: number;
    unit: string;
    reference_low: number | null;
    reference_high: number | null;
    flag: string;
  }>;

  if (!Array.isArray(biomarkers) || biomarkers.length === 0) {
    return NextResponse.json(
      { error: "No biomarkers found in parsed results" },
      { status: 422 }
    );
  }

  try {
    // Build prompt with biomarker and risk flag data
    const dataText = formatDataForDoctorQuestions(
      biomarkers,
      riskFlags || []
    );
    const userMessage = `${DOCTOR_QUESTIONS_USER_PROMPT}\n\n${dataText}`;

    // Call Claude for question generation
    const client = getClaudeClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: DOCTOR_QUESTIONS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON — handle markdown code blocks
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const generated = JSON.parse(jsonStr) as ClaudeQuestionsResponse;

    // Validate structure
    if (!Array.isArray(generated.questions)) {
      throw new Error("Invalid response: questions must be an array");
    }

    // Enforce maximum question limit
    const questions = generated.questions.slice(0, MAX_QUESTIONS);

    // Validate categories and priorities
    const validCategories = ["clarifying", "follow_up", "lifestyle", "medication"];
    const validPriorities = ["high", "medium", "low"];

    const validatedQuestions = questions.filter(
      (q) =>
        typeof q.question === "string" &&
        validCategories.includes(q.category) &&
        validPriorities.includes(q.priority)
    );

    // Store questions in database
    if (validatedQuestions.length > 0) {
      const { error: insertError } = await supabase
        .from("doctor_questions")
        .insert(
          validatedQuestions.map((q) => ({
            parsed_result_id: parsedResult.id,
            question: q.question,
            category: q.category,
            priority: q.priority,
          }))
        );

      if (insertError) {
        // Return questions even if DB persistence fails
        return NextResponse.json(
          {
            questions: validatedQuestions,
            cached: false,
            persisted: false,
            disclaimer:
              "These questions are suggestions to help guide your conversation with your doctor. They are not medical advice.",
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      {
        questions: validatedQuestions,
        cached: false,
        persisted: true,
        disclaimer:
          "These questions are suggestions to help guide your conversation with your doctor. They are not medical advice.",
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Question generation failed";
    return NextResponse.json(
      { error: `Question generation failed: ${message}` },
      { status: 500 }
    );
  }
}
