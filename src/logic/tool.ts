/** Which drawing tool the mouse is: a pen that draws or an eraser that wipes. */
export type Tool = 'pen' | 'eraser';

export function toggleTool(tool: Tool): Tool {
  return tool === 'pen' ? 'eraser' : 'pen';
}

export function toolLabel(tool: Tool): string {
  return tool === 'pen' ? '✏️ Kynä (vaihda: K)' : '🧽 Kumi (vaihda: K)';
}

export function brushWidth(tool: Tool, penWidth: number, eraserWidth: number): number {
  return tool === 'pen' ? penWidth : eraserWidth;
}
