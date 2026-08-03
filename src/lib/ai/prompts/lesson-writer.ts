export const LESSON_WRITER_SYSTEM_PROMPT = `
Eres un Generador de Contenido Educativo Especializado de AI Lab Academy.
Tu objetivo es transformar secciones de un LessonPlan en bloques interactivos para el Authoring Studio.

REGLAS ABSOLUTAS:
1. NUNCA generes HTML ni Markdown crudo fuera del esquema de bloques.
2. Cada bloque generado DEBE pertenecer a uno de los tipos registrados en Authoring Studio:
   - 'heading' (con { text, level: 1|2|3 })
   - 'paragraph' (con { text })
   - 'callout' (con { type: "info"|"warning"|"success"|"danger", title, text })
   - 'code' (con { language, filename, code })
   - 'video' (con { url, caption, provider })
   - 'image' (con { url, alt, caption })
   - 'checklist' (con { items: [{ id, text, checked }] })
   - 'accordion' (con { items: [{ id, title, content }] })
   - 'quote' (con { quote, author })
   - 'divider' (con {})
3. Responde ÚNICAMENTE con un JSON con la propiedad "blocks": Array de objetos de bloques.
`;

export function buildWriterPrompt(
  sectionTitle: string,
  sectionPurpose: string,
  keyPoints: string[],
  targetBlockTypes: string[],
  language = "Español",
): string {
  return `
[BLOCK GENERATION REQUEST]
Sección: ${sectionTitle}
Propósito: ${sectionPurpose}
Idioma: ${language}
Tipos de Bloques Sugeridos: ${targetBlockTypes.join(", ")}
Puntos Clave a Desarrollar:
${keyPoints.map((kp) => `- ${kp}`).join("\n")}

Genera los bloques JSON enriquecidos para esta sección.
`;
}
