import { describe, it, expect, vi } from "vitest";
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

describe("Sprint 2.9 - AI Authoring Assistant (Fase 1)", () => {
  describe("1. Provider Abstraction & Factory", () => {
    it("instantiates GeminiProvider by default", () => {
      const provider = ProviderFactory.create({ provider: "gemini" });
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(provider.type).toBe("gemini");
      expect(provider.model).toBe("gemini-3.6-flash");
    });

    it("instantiates OpenAIProvider correctly", () => {
      const provider = ProviderFactory.create({ provider: "openai", model: "gpt-4o" });
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.type).toBe("openai");
      expect(provider.model).toBe("gpt-4o");
    });

    it("instantiates AnthropicProvider correctly", () => {
      const provider = ProviderFactory.create({
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
      });
      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.type).toBe("anthropic");
    });

    it("calculates token counts and cost estimates", async () => {
      const provider = ProviderFactory.create({ provider: "gemini" });
      const tokensIn = await provider.countTokens("Esta es una prueba de conteo de tokens.");
      expect(tokensIn).toBeGreaterThan(0);

      const cost = provider.estimateCost(1000, 500);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe("2. LessonPlanner", () => {
    it("generates a structured LessonPlan with sections and objectives", async () => {
      const provider = new GeminiProvider("gemini-3.6-flash", "mock");
      const planner = new LessonPlanner(provider);

      const { plan, tokensInput, tokensOutput } = await planner.plan(
        "Introducción a React Server Components",
        { level: "Intermedio", durationMinutes: 20 },
      );

      expect(plan).toBeDefined();
      expect(plan.title).toBeTruthy();
      expect(Array.isArray(plan.objectives)).toBe(true);
      expect(plan.objectives.length).toBeGreaterThan(0);
      expect(Array.isArray(plan.sections)).toBe(true);
      expect(plan.sections.length).toBeGreaterThan(0);
      expect(tokensInput).toBeGreaterThan(0);
      expect(tokensOutput).toBeGreaterThan(0);
    });
  });

  describe("3. BlockGenerator", () => {
    it("converts a LessonPlan into valid AuthoringBlock items", async () => {
      const provider = new GeminiProvider("gemini-3.6-flash", "mock");
      const blockGen = new BlockGenerator(provider);

      const mockPlan = {
        title: "Lección de Prueba React",
        objectives: ["Aprender RSC", "Escribir Server Actions"],
        level: "Intermedio",
        estimatedDurationMinutes: 15,
        sections: [
          {
            id: "sec-1",
            title: "Visión General",
            purpose: "Explicar conceptos de servidor",
            targetBlockTypes: ["heading", "paragraph", "code"],
            keyPoints: ["Server Components", "Client Components"],
          },
        ],
        estimatedBlocksCount: 4,
      };

      const { blocks } = await blockGen.generateBlocks(mockPlan);

      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);

      // Verify header block exists
      const titleBlock = blocks.find((b) => b.type === "heading");
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
      expect(repairedBlock.content_json.alt).toBe("Foto explicativa");
    });

    it("converts legacy or unknown block types to registered types", () => {
      const legacyH1: Partial<AuthoringBlock> = {
        type: "h1" as unknown as AuthoringBlock["type"],
        content_json: { text: "Título antiguo" },
      };

      const { repairedBlock, repaired } = autoRepairBlock(legacyH1);
      expect(repaired).toBe(true);
      expect(repairedBlock.type).toBe("heading");
      expect(repairedBlock.content_json.level).toBe(1);
    });

    it("repairs empty checklists and accordions", () => {
      const emptyChecklist: Partial<AuthoringBlock> = {
        type: "checklist",
        content_json: { items: [] },
      };

      const { repairedBlock } = autoRepairBlock(emptyChecklist);
      expect(Array.isArray(repairedBlock.content_json.items)).toBe(true);
      expect(repairedBlock.content_json.items.length).toBeGreaterThan(0);
    });

    it("batch repairs multiple blocks and generates repair log", () => {
      const blocks: Partial<AuthoringBlock>[] = [
        { type: "image", content_json: { url: "https://example.com/a.jpg" } },
        { type: "heading", content_json: { text: "" } },
      ];

      const repairResult = autoRepairBlocks(blocks);
      expect(repairResult.repairedCount).toBe(2);
      expect(repairResult.log.length).toBe(2);
      expect(repairResult.repairedBlocks.length).toBe(2);
    });
  });

  describe("5. End-to-End Pipeline & Agent Execution", () => {
    it("executes the full AuthoringPipeline and returns telemetry", async () => {
      const provider = new GeminiProvider("gemini-3.6-flash", "mock");
      const pipeline = new AuthoringPipeline(provider);

      const result = await pipeline.execute("Construyendo un Agente de IA con TypeScript");

      expect(result.status).toBe("completed");
      expect(result.plan).toBeDefined();
      expect(Array.isArray(result.blocks)).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.telemetry).toBeDefined();
      expect(result.telemetry.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.telemetry.estimatedCost).toBeGreaterThanOrEqual(0);
    });

    it("verifies every generated block passes BlockRegistry validation", async () => {
      const agent = new LessonAuthorAgent({ provider: "gemini", apiKey: "mock" });
      const result = await agent.generateLesson("lesson-123", "Estructura de Datos en TypeScript");

      for (const block of result.blocks) {
        const def = BlockRegistry.get(block.type);
        expect(def).toBeDefined();
        if (def?.validator) {
          const valRes = def.validator.safeParse(block.content_json);
          expect(valRes.success).toBe(true);
        }
      }
    });

    it("handles user cancellation signal gracefully", async () => {
      const agent = new LessonAuthorAgent({ provider: "gemini", apiKey: "mock" });
      const controller = new AbortController();
      controller.abort(); // Cancel immediately

      await expect(
        agent.generateLesson(
          "lesson-123",
          "Prompt cancelado",
          undefined,
          undefined,
          controller.signal,
        ),
      ).rejects.toThrow("cancelada");
    });
  });
});
