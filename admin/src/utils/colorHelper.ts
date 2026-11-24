/**
 * 智能颜色映射工具：将用户输入的自然语言（如“红色”、“纯白”、“深海蓝”）或十六进制转换为有效 CSS 色值
 */
export function resolveColorHex(colorText?: string): string {
  if (!colorText) return '#2563eb';
  const text = colorText.trim().toLowerCase();

  // 如果已经是十六进制或 rgb
  if (text.startsWith('#') || text.startsWith('rgb')) {
    return text;
  }

  if (text.includes('红')) return '#ef4444';
  if (text.includes('天蓝') || text.includes('浅蓝') || text.includes('蔚蓝')) return '#0ea5e9';
  if (text.includes('蓝')) return '#1a56db';
  if (text.includes('白')) return '#ffffff';
  if (text.includes('黄') || text.includes('金')) return '#f59e0b';
  if (text.includes('绿')) return '#10b981';
  if (text.includes('黑')) return '#1e293b';
  if (text.includes('紫')) return '#8b5cf6';
  if (text.includes('橙')) return '#f97316';
  if (text.includes('粉')) return '#ec4899';
  if (text.includes('灰')) return '#64748b';

  return '#2563eb';
}

/**
 * 判断背景色是否偏白/偏浅，用于决定文字用深色还是白色
 */
export function isLightColor(colorHex: string): boolean {
  if (colorHex === '#ffffff' || colorHex.toLowerCase() === '#fff') return true;
  return false;
}
