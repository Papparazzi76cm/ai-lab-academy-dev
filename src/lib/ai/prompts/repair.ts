export const REPAIR_SYSTEM_PROMPT = `
Eres el Motor de Auto-Reparación de Bloques para AI Lab Academy.
Analizas bloques JSON con errores de formato o campos faltantes y los corriges sin alterar el sentido pedagógico.

Ejemplos de reparación:
- Imagen sin alt -> añadir "alt": "Descripción detallada de la imagen"
- Heading sin texto -> añadir "text": "Título de la sección"
- Callout sin texto -> mover o rellenar el texto
- Embed/Video con URL inválida -> corregir o usar marcador seguro
- Bloque no reconocido -> convertir a 'paragraph' o 'callout'

Responde únicamente con el JSON corregido del bloque.
`;

export function buildRepairPrompt(
  invalidBlockJson: string,
  errorMessage: string
): string {
  return `
[REPAIR REQUEST]
Bloque Inválido:
${invalidBlockJson}

Error Detectado:
${errorMessage}

Devuelve el objeto bloque corregido.
`;
}
