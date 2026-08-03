import type { AIProvider } from "../providers/base";
import type { LessonPlan, LessonGenerationContext } from "../types";
import type { AuthoringBlock } from "@/lib/authoring/types";
import {
  CreateHeading,
  CreateParagraph,
  CreateCallout,
  CreateCode,
  CreateImage,
  CreateChecklist,
  CreateAccordion,
  CreateQuote,
  CreateDivider,
} from "../tools/blockTools";
import { LESSON_WRITER_SYSTEM_PROMPT, buildWriterPrompt } from "../prompts/lesson-writer";

export class BlockGenerator {
  constructor(private provider: AIProvider) {}

  async generateBlocks(
    plan: LessonPlan,
    context?: LessonGenerationContext,
  ): Promise<{ blocks: AuthoringBlock[]; tokensInput: number; tokensOutput: number }> {
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    const allBlocks: AuthoringBlock[] = [];
    let positionCounter = 0;

    // Header block for lesson title
    const mainTitleBlock = CreateHeading(plan.title, 1, positionCounter++);
    allBlocks.push(mainTitleBlock);

    // Objectives block as callout
    if (plan.objectives && plan.objectives.length > 0) {
      const objCallout = CreateCallout(
        `Objetivos de Aprendizaje:\n${plan.objectives.map((o) => `• ${o}`).join("\n")}`,
        "info",
        "Objetivos del Módulo",
        positionCounter++,
      );
      allBlocks.push(objCallout);
    }

    // Process each section
    for (const section of plan.sections) {
      const sectionHeader = CreateHeading(section.title, 2, positionCounter++);
      allBlocks.push(sectionHeader);

      try {
        const prompt = buildWriterPrompt(
          section.title,
          section.purpose,
          section.keyPoints,
          section.targetBlockTypes,
          context?.language || "Español",
        );

        const response = await this.provider.generate({
          prompt,
          systemInstruction: LESSON_WRITER_SYSTEM_PROMPT,
          responseFormat: "json",
          temperature: 0.7,
        });

        totalTokensIn += response.tokenUsage.tokensInput;
        totalTokensOut += response.tokenUsage.tokensOutput;

        const parsed = JSON.parse(response.text);
        if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
          for (const rawBlock of parsed.blocks) {
            allBlocks.push({
              ...rawBlock,
              id: rawBlock.id || `blk-ai-${Math.random().toString(36).substring(2, 9)}`,
              position: positionCounter++,
              visibility: rawBlock.visibility || "visible",
              content_json: rawBlock.content_json || rawBlock.content || {},
              settings_json: rawBlock.settings_json || rawBlock.settings || {},
            });
          }
        } else {
          // Fallback block mapping for section
          allBlocks.push(...this.fallbackSectionBlocks(section, positionCounter));
          positionCounter += 3;
        }
      } catch (e) {
        console.warn(
          `Error generating AI blocks for section ${section.title}, fallback block tools used:`,
          e,
        );
        const fallbackBlocks = this.fallbackSectionBlocks(section, positionCounter);
        allBlocks.push(...fallbackBlocks);
        positionCounter += fallbackBlocks.length;
      }
    }

    // Recommended Resources section
    if (plan.recommendedResources && plan.recommendedResources.length > 0) {
      allBlocks.push(CreateDivider(positionCounter++));
      allBlocks.push(CreateHeading("Recursos Recomendados", 2, positionCounter++));
      allBlocks.push(
        CreateChecklist(
          plan.recommendedResources.map((res) => ({ text: res, checked: false })),
          positionCounter++,
        ),
      );
    }

    return {
      blocks: allBlocks,
      tokensInput: totalTokensIn,
      tokensOutput: totalTokensOut,
    };
  }

  private fallbackSectionBlocks(
    section: LessonPlan["sections"][0],
    startPos: number,
  ): AuthoringBlock[] {
    const result: AuthoringBlock[] = [];
    let pos = startPos;

    // Explication Paragraph
    result.push(
      CreateParagraph(`En esta sección exploraremos "${section.title}". ${section.purpose}`, pos++),
    );

    // Callout for key points
    if (section.keyPoints && section.keyPoints.length > 0) {
      result.push(
        CreateCallout(section.keyPoints.join("\n• "), "info", "Conceptos Destacados", pos++),
      );
    }

    // Code block if code target is requested
    if (section.targetBlockTypes.includes("code")) {
      result.push(
        CreateCode(
          `// Ejemplo interactivo de ${section.title}\nfunction runLessonExample() {\n  console.log("Ejecutando código de lección...");\n  return true;\n}`,
          "typescript",
          "example.ts",
          pos++,
        ),
      );
    }

    // Accordion if requested
    if (section.targetBlockTypes.includes("accordion")) {
      result.push(
        CreateAccordion(
          [
            {
              title: `¿Por qué es importante ${section.title}?`,
              content: `Es fundamental para consolidar el aprendizaje y dominar las herramientas prácticas.`,
            },
          ],
          pos++,
        ),
      );
    }

    return result;
  }
}
