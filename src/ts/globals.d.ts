// index.html が <script> で先に読み込むグローバルの型宣言（型検査 npm run typecheck 用。実行時のコードは含まない）。
// 本体はそれぞれ public/vendor/ のライブラリと src/ts/emoji/index.ts が window に載せる。
declare const marked: any;
declare const DOMPurify: any;
declare const __LUCIVO_STRUCTURIZR__: boolean;

interface Window {
  LucivoEmoji: any;
  LucivoStructurizr: any;
  katex: any;
}
