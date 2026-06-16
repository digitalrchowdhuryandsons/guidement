

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface CourseContext {
  courseTitle?: string | null;
  sectionTitle?: string | null;
  lectureTitle?: string | null;
  lectureDescription?: string | null;
  progressPercent?: number | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== "object") return false;
      const maybeMessage = item as Record<string, unknown>;
      return (
        (maybeMessage.role === "user" || maybeMessage.role === "assistant") &&
        typeof maybeMessage.content === "string" &&
        maybeMessage.content.trim().length > 0
      );
    })
    .slice(-6)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 1200),
    }));
}

function sanitizeContext(value: unknown): CourseContext {
  if (!value || typeof value !== "object") return {};
  const context = value as Record<string, unknown>;

  return {
    courseTitle:
      typeof context.courseTitle === "string" ? context.courseTitle.slice(0, 200) : null,
    sectionTitle:
      typeof context.sectionTitle === "string" ? context.sectionTitle.slice(0, 200) : null,
    lectureTitle:
      typeof context.lectureTitle === "string" ? context.lectureTitle.slice(0, 200) : null,
    lectureDescription:
      typeof context.lectureDescription === "string"
        ? context.lectureDescription.slice(0, 1200)
        : null,
    progressPercent:
      typeof context.progressPercent === "number" ? context.progressPercent : null,
  };
}

function extractResponseText(data: Record<string, unknown>): string {
  if (typeof data.output_text === "string") return data.output_text;

  const output = data.output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) return [];
      return content.flatMap((contentItem) => {
        if (!contentItem || typeof contentItem !== "object") return [];
        const text = (contentItem as Record<string, unknown>).text;
        return typeof text === "string" ? [text] : [];
      });
    })
    .join("\n")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return json({ error: "OpenAI API key is not configured" }, 500);
    }

    const body = await req.json().catch(() => null);
    const prompt = typeof body?.message === "string" ? body.message.trim() : "";
    if (!prompt) {
      return json({ error: "Message is required" }, 400);
    }

    const history = sanitizeMessages(body?.history);
    const context = sanitizeContext(body?.context);
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5.2";

    const contextSummary = [
      context.courseTitle ? `Course: ${context.courseTitle}` : null,
      context.sectionTitle ? `Section: ${context.sectionTitle}` : null,
      context.lectureTitle ? `Current lecture: ${context.lectureTitle}` : null,
      context.lectureDescription
        ? `Lecture description: ${context.lectureDescription}`
        : null,
      typeof context.progressPercent === "number"
        ? `Learner progress: ${context.progressPercent}% complete`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const input = [
      {
        role: "developer",
        content:
          "You are an AI course assistant embedded in a learning platform. " +
          "Answer clearly, concisely, and helpfully. Use the provided course context when relevant. " +
          "If the learner asks for answers to graded quizzes or certificates, guide them to study concepts instead of giving direct answers.",
      },
      ...(contextSummary
        ? [
            {
              role: "developer",
              content: `Course context:\n${contextSummary}`,
            },
          ]
        : []),
      ...history,
      {
        role: "user",
        content: prompt.slice(0, 2000),
      },
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input,
        max_output_tokens: 500,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage =
        typeof data?.error?.message === "string"
          ? data.error.message
          : "OpenAI request failed";
      return json({ error: errorMessage }, response.status);
    }

    const reply = extractResponseText(data as Record<string, unknown>);
    return json({ reply });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Could not generate chat response",
      },
      500
    );
  }
});
