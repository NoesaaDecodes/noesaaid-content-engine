import { NextResponse } from "next/server";
import { z } from "zod";
import { mimo } from "@/app/lib/mimo";
import { defaultPresetId, getPresetById } from "@/app/lib/presets";

type GeneratedResult = {
  hook: string;
  title: string;
  script: string[];
  caption: string;
  hashtags: string[];
};

const GenerateScriptSchema = z.object({
  presetId: z.string().min(2).default(defaultPresetId),
  topic: z.string().min(3),
  category: z.string().min(2),
  platform: z.string().min(2),
  tone: z.string().min(2),
  batchCount: z
    .preprocess((value) => {
      const count = Number(value);
      return [1, 3, 5, 10].includes(count) ? count : 1;
    }, z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10)]))
    .default(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsedInput = GenerateScriptSchema.parse(body);
    const preset = getPresetById(parsedInput.presetId);
    const input = {
      ...parsedInput,
      presetId: preset.id,
      category: preset.categories.includes(parsedInput.category)
        ? parsedInput.category
        : preset.categories[0],
      platform: preset.platforms.includes(parsedInput.platform)
        ? parsedInput.platform
        : preset.platforms[0],
      tone: preset.tones.includes(parsedInput.tone)
        ? parsedInput.tone
        : preset.tones[0],
    };
    const isBatch = input.batchCount > 1;

    const completion = await mimo.chat.completions.create({
      model: process.env.MIMO_MODEL || "mimo-v2.5-pro",
      messages: [
        {
          role: "system",
          content: preset.systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify({
            task: isBatch
              ? `Generate ${input.batchCount} distinct short-form video content concepts`
              : "Generate short-form video content",
            topic: input.topic,
            category: input.category,
            platform: input.platform,
            tone: input.tone,
            preset: {
              id: preset.id,
              name: preset.name,
              description: preset.description,
              visualStyle: preset.visualStyle,
              defaultHashtags: preset.defaultHashtags,
            },
            requiredOutput: {
              ...(isBatch
                ? {
                    results: [
                      {
                        hook: "string",
                        title: "string",
                        script: ["line 1", "line 2", "line 3"],
                        caption: "string",
                        hashtags: ["string"],
                      },
                    ],
                  }
                : {
                    hook: "string",
                    title: "string",
                    script: ["line 1", "line 2", "line 3"],
                    caption: "string",
                    hashtags: ["string"],
                  }),
            },
            constraints: isBatch
              ? {
                  count: input.batchCount,
                  keepEachScriptConcise: true,
                  maxScriptLinesPerConcept: 5,
                  makeEachConceptUnique: true,
                }
              : undefined,
          }),
        },
      ],
      temperature: 0.9,
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      throw new Error("Empty MiMo response");
    }

    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (isBatch) {
      const results = normalizeBatchResults(parsed, input.batchCount);

      if (results.length === 0) {
        throw new Error("MiMo returned no valid batch results");
      }

      return NextResponse.json({
        success: true,
        input,
        results,
      });
    }

    const result = normalizeGeneratedResult(
      Array.isArray(parsed) ? parsed[0] : parsed.result || parsed
    );

    if (!result) {
      throw new Error("MiMo returned no valid script result");
    }

    return NextResponse.json({
      success: true,
      input,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Generate script error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate script",
        detail: message,
      },
      { status: 500 }
    );
  }
}

function normalizeBatchResults(parsed: unknown, batchCount: number) {
  const candidate =
    Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          "results" in parsed &&
          Array.isArray((parsed as { results: unknown }).results)
        ? (parsed as { results: unknown[] }).results
        : [];

  return candidate
    .map((item) => normalizeGeneratedResult(item))
    .filter((item): item is GeneratedResult => Boolean(item))
    .slice(0, batchCount);
}

function normalizeGeneratedResult(value: unknown): GeneratedResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const script = normalizeStringArray(record.script);

  if (script.length === 0) {
    return null;
  }

  return {
    hook: toStringValue(record.hook),
    title: toStringValue(record.title) || "Untitled reel",
    script,
    caption: toStringValue(record.caption),
    hashtags: normalizeStringArray(record.hashtags),
  };
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter(Boolean)
      .slice(0, 18);
  }

  return toStringValue(value)
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 18);
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
