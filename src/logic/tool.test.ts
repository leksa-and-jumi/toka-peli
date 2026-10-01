import { describe, expect, it } from 'vitest';
import { brushWidth, toggleTool, toolLabel } from './tool';

describe('toggleTool', () => {
  it('switches between pen and eraser', () => {
    expect(toggleTool('pen')).toBe('eraser');
    expect(toggleTool('eraser')).toBe('pen');
  });
});

describe('toolLabel', () => {
  it('names the tool in Finnish', () => {
    expect(toolLabel('pen')).toContain('Kynä');
    expect(toolLabel('eraser')).toContain('Kumi');
  });
});

describe('brushWidth', () => {
  it('uses the width of the current tool', () => {
    expect(brushWidth('pen', 6, 30)).toBe(6);
    expect(brushWidth('eraser', 6, 30)).toBe(30);
  });
});
