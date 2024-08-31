const prettierConfig = require('./.prettierrc.js');


module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    sourceType: "module"
  },
  plugins: [
    'prettier',
    '@typescript-eslint/eslint-plugin',
    'simple-import-sort'
  ],
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    'prettier/prettier': [
      2,
      prettierConfig,
    ],
    '@typescript-eslint/no-floating-promises':
      'error',
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      { assertionStyle: 'never' },
    ],
    'import/prefer-default-export': 0,
    'class-methods-use-this': 0,
    'implicit-arrow-linebreak': 0,
    'operator-linebreak': 0,
    'import/order': 0,
    'sort-imports': 0,
    'simple-import-sort/exports': 1,
    'simple-import-sort/imports': [
      2,
      {
        groups: [
          // Nest modules
          ['^@nestjs'],
          // Side effect imports
          ['^\\u0000'],
          // Packages
          ['^@?[a-zA-Z0-9]'],
          //tests
          ['^test(/.*|$)'],
          // Internal base modules
          ['^src/config(/.*|$)'],
          ['^src/domain(/.*|$)'],
          ['^src/health(/.*|$)'],
          ['^src/infra(/.*|$)'],
          // Internal packages
          ['^src/common(/.*|$)'],
          ['^src/common/decorators(/.*|$)'],
          ['^src/common/dtos(/.*|$)'],
          ['^src/common/helpers(/.*|$)'],
          ['^src/common/interceptors(/.*|$)'],
          ['^src/common/interfaces(/.*|$)'],
          // Other relative imports. Put same-folder imports and `.` last
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
          // Parent imports. Put `..` last
          ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
        ],
      },
    ],
  },
};
