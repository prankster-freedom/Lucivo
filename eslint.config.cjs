// 既存のコードへの大量の指摘を避けるため、規則は壊れた文字列の検出に絞る
module.exports = [
  {
    ignores: ['public/vendor/**', 'dist/**', 'node_modules/**', 'work/**']
  },
  {
    files: ['public/js/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script' },
    rules: {
      // 正規表現に紛れ込んだ制御文字（\b が 0x08 に変わるなど）
      'no-control-regex': 'error',
      // 文字列や正規表現の中の不正な空白文字
      'no-irregular-whitespace': ['error', { skipStrings: false, skipRegExps: false, skipTemplates: false }]
    }
  },
  {
    files: ['src/js/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'no-control-regex': 'error',
      'no-irregular-whitespace': ['error', { skipStrings: false, skipRegExps: false, skipTemplates: false }]
    }
  },
  {
    files: ['tests/**/*.cjs', 'tools/**/*.cjs', 'agents-support-tools/**/*.cjs', 'eslint.config.cjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs' },
    rules: {
      'no-control-regex': 'error',
      'no-irregular-whitespace': ['error', { skipStrings: false, skipRegExps: false, skipTemplates: false }]
    }
  }
];
