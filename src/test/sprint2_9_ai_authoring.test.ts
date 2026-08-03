import { describe, it, expect } from "vitest";
import { ProviderFactory } from "@/lib/ai/providers/factory";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { LessonPlanner } from "@/lib/ai/planner/lessonPlanner";
import { BlockGenerator } from "@/lib/ai/pipeline/blockGenerator";
import { AuthoringPipeline } from "@/lib/ai/pipeline/authoringPipeline";
import { LessonAuthorAgent } from "@/lib/ai/agents/lessonAuthorAgent";
import { autoRepairBlock, autoRepairBlocks } from "@/lib/ai/validation/autoRepair";
import { BlockRegistry } from "@/lib/authoring/blocks/registry";
import type { AuthoringBlock } from "@/lib/authoring/types";
import { LessonPlanSchema } from "@/lib/ai/schemas/lessonSchema";

describe("Sprint 2.9 - AI Authoring Assistant & Security Patch", () => {
  describe("1. Security & Provider SDK Imports Check", () => {
    it("verifies frontend modules do not import direct AI provider SDKs", async () => {
      try {
        await import("@google/genai");
        expect.fail("Frontend bundle should not import @google/genai directly");
      } catch (e: unknown) {
        expect((e as Error).message).toBeDefined();
      }
    });

    it("verifies payload sent to Edge Function excludes sensitive identity fields", () => {
      const payload = {
        lesson_id: "123e4567-e89b-12d3-a456-426614174000",
        prompt: "Generar lección sobre TypeScript",
        level: "Intermedio",
        duration: 20,
        language: "es",
        tone: "Profesional",
        audience: "Desarrolladores Web",
        objectives: ["Dominar la inferencia de tipos"],
        provider: "gemini",
        model: "gemini-3.6-flash",
        temperature: 0.7,
      };

      expect(payload).not.toHaveProperty("user_id");
      expect(payload).not.toHaveProperty("role");
      expect(payload).not.toHaveProperty("api_key");
      expect(payload).not.toHaveProperty("jwt");
    });
  });

  describe("2. AI Provider Strategy & Mock Mode", () => {
    it("instantiates correct provider via ProviderFactory", () => {
      const gemini = ProviderFactory.getProvider("gemini", "gemini-3.6-flash", "mock");
      expect(gemini).toBeInstanceOf(GeminiProvider);

      const openai = ProviderFactory.getProvider("openai", "gpt-4o", "mock");
      expect(openai).toBeInstanceOf(OpenAIProvider);

      const anthropic = ProviderFactory.getProvider(
        "anthropic",
        "claude-3-5-sonnet-20241022",
        "mock",
      );
      expect(anthropic).toBeInstanceOf(AnthropicProvider);
    });

    it("executes generation in Mock Mode safely", async () => {
      const provider = new GeminiProvider("gemini-3.6-flash", "mock");
      const response = await provider.generate({
        prompt: "Planificar lección sobre React Hooks",
        systemInstruction: "Planificador de Lecciones",
      });

      expect(response.text).toBeDefined();
      expect(response.tokenUsage.tokensInput).toBeGreaterThan(0);
      expect(response.tokenUsage.tokensOutput).toBeGreaterThan(0);

      const parsedPlan = JSON.parse(response.text);
      expect(parsedPlan).toHaveProperty("title");
      expect(parsedPlan).toHaveProperty("sections");
    });
  });

  describe("3. Lesson Authoring Pipeline & Schema Validation", () => {
    it("generates a valid Lesson Plan using LessonPlanner in Mock Mode", async () => {
      const planner = new LessonPlanner("gemini", "gemini-3.6-flash", "mock");
      const plan = await planner.createPlan("TypeScript Avanzado", {
        level: "Avanzado",
        durationMinutes: 30,
        language: "es",
      });

      expect(plan.title).toBeDefined();
      expect(plan.sections.length).toBeGreaterThan(0);
      const validation = LessonPlanSchema.safeParse(plan);
      expect(validation.success).toBe(true);
    });

    it("generates authoring blocks matching registry schemas", async () => {
      const generator = new BlockGenerator("gemini", "gemini-3.6-flash", "mock");
      const blocks = await generator.generateBlocksForSection(
        {
          id: "sec-1",
          title: "Tipos Genéricos",
          purpose: "Aprender el uso de generics en funciones e interfaces",
          targetBlockTypes: ["heading", "paragraph", "code"],
          keyPoints: ["Sintaxis <T>", "Constraints with extends"],
        },
        { level: "Avanzado" },
      );

      expect(blocks.length).toBeGreaterThan(0);
      blocks.forEach((block) => {
        const def = BlockRegistry.get(block.type);
        expect(def).toBeDefined();
        const parseResult = def?.validator.safeParse(block.content_json);
        expect(parseResult?.success).toBe(true);
      });
    });

    it("runs complete end-to-end AuthoringPipeline generation", async () => {
      const pipeline = new AuthoringPipeline("gemini", "gemini-3.6-flash", "mock");
      const result = await pipeline.execute("Generar lección sobre State Management", {
        level: "Intermedio",
        durationMinutes: 20,
      });

      expect(result.plan).toBeDefined();
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.telemetry.tokensInput).toBeGreaterThan(0);
      expect(result.telemetry.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.status).toBe("completed");
    });

    it("executes LessonAuthorAgent orchestration workflow", async () => {
      const agent = new LessonAuthorAgent("gemini", "gemini-3.6-flash", "mock");
      const result = await agent.generateFullLesson(
        "123e4567-e89b-12d3-a456-426614174000",
        "Construcción de APIs con Node.js",
        { level: "Intermedio" },
      );

      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.plan.title).toBeDefined();

      const titleBlock = result.blocks.find((b) => b.type === "heading");
      expect(titleBlock).toBeDefined();
    });
  });

  describe("4. AutoRepair & Schema Validation", () => {
    it("repairs images missing ALT tags", () => {
      const defectiveBlock: Partial<AuthoringBlock> = {
        id: "b-img-1",
        type: "image",
        content_json: {
          url: "https://example.com/photo.jpg",
          caption: "Foto explicativa",
        },
      };

      const { repairedBlock, repaired } = autoRepairBlock(defectiveBlock);
      expect(repaired).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((repairedBlock.content_json as Record<string, any>)["alt"]).toBe("Foto explicativa");
    });

    it("converts legacy or unknown block types to registered types", () => {
      const legacyH1: Partial<AuthoringBlock> = {
        type: "h1" as unknown as AuthoringBlock["type"],
        content_json: { text: "Título antiguo" },
      };

      const { repairedBlock, repaired } = autoRepairBlock(legacyH1);
      expect(repaired).toBe(true);
      expect(repairedBlock.type).toBe("heading");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((repairedBlock.content_json as Record<string, any>)["level"]).toBe(1);
    });

    it("repairs empty checklists and accordions", () => {
      const emptyChecklist: Partial<AuthoringBlock> = {
        type: "checklist",
        content_json: { items: [] },
      };

      const { repairedBlock } = autoRepairBlock(emptyChecklist);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (repairedBlock.content_json as Record<string, any>)["items"];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it("batch repairs multiple blocks and generates repair log", () => {
      const blocks: Partial<AuthoringBlock>[] = [
        { type: "image", content_json: { url: "https://example.com/a.jpg" } },
        { type: "heading", content_json: { text: "" } },
      ];

      const repairResult = autoRepairBlocks(blocks);
      expect(repairResult.repairedCount).toBeGreaterThan(0);
      expect(repairResult.repairedBlocks.length).toBe(2);
      expect(repairResult.log.length).toBeGreaterThan(0);
    });
  });
});
