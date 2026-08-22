import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([

  {
    ignores: ['dist/**', 'node_modules/**', 'jest.config.js']
  },

  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node }
  },

  tseslint.configs.recommended,

    {
      files: ['src/**/*.ts'],
      languageOptions: {
        globals: {...globals.node}
      },
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
        ],
        'no-console': 'off'
      }
    },

    {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,  // document, window, alert
        io: 'readonly'       // variable global que trae socket.io.js por <script>
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off' // este bloque es JS puro
    }
  },
  {
    files: ['**/*.test.ts'],
    rules: {
        '@typescript-eslint/no-explicit-any': 'off'
    }
  }
]);



