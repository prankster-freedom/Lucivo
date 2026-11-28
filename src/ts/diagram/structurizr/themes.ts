/* ==========================================================================
   Structurizr 内蔵テーマプリセット（FR-071, ARC-STR-005）
   オフライン完結原則（NFR-001）を守りつつ、公式 Structurizr の `default`
   テーマをネットワーク通信なしで適用する。
   ========================================================================== */
import type { StructurizrStyles } from './types';

const DEFAULT_THEME: StructurizrStyles = {
  elements: [
    {
      tag: 'Element',
      color: '#ffffff'
    },
    {
      tag: 'Person',
      background: '#08427b',
      color: '#ffffff',
      shape: 'Person'
    },
    {
      tag: 'Software System',
      background: '#1168bd',
      color: '#ffffff'
    },
    {
      tag: 'Container',
      background: '#438dd5',
      color: '#ffffff'
    },
    {
      tag: 'Component',
      background: '#85bbf0',
      color: '#000000'
    }
  ],
  relationships: [
    {
      tag: 'Relationship',
      color: '#707070',
      dashed: true,
      thickness: 2
    }
  ]
};

/**
 * テーマ名が内蔵プリセットに一致する場合はそのコピーを返す。
 * 外部 URL（https://... 等）や未知のテーマ名は undefined を返す。
 */
export function resolveBuiltinTheme(themeName: string): StructurizrStyles | undefined {
  const normalized = themeName.trim().toLowerCase();
  if (normalized === 'default') {
    return {
      elements: DEFAULT_THEME.elements.map(s => ({ ...s })),
      relationships: DEFAULT_THEME.relationships.map(s => ({ ...s }))
    };
  }
  return undefined;
}
