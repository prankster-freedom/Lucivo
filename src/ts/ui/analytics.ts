// Web 版の利用状況計測（FR-063, ARC-ANA-001〜004）
// 正式版・プレビュー版でのデザインスタイル・トーン・発表モードの選択回数のみを dataLayer へ送信する。
// ローカル開発ビルド、スタンドアロン版（file://）、E2E 自動テスト（webdriver）では送信しない。
import { APP_VERSION } from './update-check';

export type ReleaseChannel = 'production' | 'preview';

export interface AnalyticsEnv {
  version: string;
  protocol: string;
  webdriver: boolean;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * 埋め込み済みバージョン文字列から配布種別（production / preview）を判定する。
 * ローカル開発ビルド（`X.Y.Z` のみで `(build id:` を含まない）は null を返す。
 */
export function getReleaseChannel(version: string): ReleaseChannel | null {
  if (typeof version !== 'string' || !version.includes('(build id:')) {
    return null;
  }
  return version.includes('-canary') ? 'preview' : 'production';
}

function getDefaultAnalyticsEnv(): AnalyticsEnv {
  return {
    version: APP_VERSION,
    protocol: typeof window !== 'undefined' && window.location ? window.location.protocol : '',
    webdriver: typeof navigator !== 'undefined' ? Boolean(navigator.webdriver) : false
  };
}

export function resolveReleaseChannel(env: AnalyticsEnv = getDefaultAnalyticsEnv()): ReleaseChannel | null {
  if (env.protocol === 'file:' || env.webdriver) {
    return null;
  }
  return getReleaseChannel(env.version);
}

/**
 * 選択された ID と配布種別のみを dataLayer へ送信する。
 * 文書内容・ファイル名・URL パス等は一切送信しない。
 */
export function trackWebEvent(
  eventName: string,
  params: Record<string, string>,
  env?: AnalyticsEnv
): boolean {
  const channel = resolveReleaseChannel(env);
  if (!channel || typeof window === 'undefined') {
    return false;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    release_channel: channel,
    ...params
  });
  return true;
}
