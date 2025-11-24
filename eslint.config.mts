import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: { globals: globals.browser },
        rules: {
            ...js.configs.recommended.rules,

            "no-useless-escape": "off",
            "no-case-declarations": "off",
            "no-console": "warn",
            "no-debugger": "error",
            "no-duplicate-imports": "error",
            "no-unused-expressions": "error",
            "prefer-const": "error",
            "no-var": "error",
            "object-shorthand": "error",
            "prefer-arrow-callback": "error",
            "prefer-template": "error",
            "quotes": ["error", "double", { avoidEscape: true }],
            "semi": ["error", "always"],
            "comma-dangle": ["error", "never"],
            "indent": ["error", 4],
            "max-len": ["warn", { code: 300, ignoreUrls: true }],
            "eol-last": ["error", "always"],

            // Configure TypeScript unused vars rule to ignore variables starting with underscore
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "destructuredArrayIgnorePattern": "^_"
                }
            ],
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-empty-object-type": "off"
        }
    },

    tseslint.configs.recommended,

    // Overrides preceding configurations for test files only.
    {
        files: ["**/*.test.{js,ts}", "**/*.spec.{js,ts}", "**/tests/**/*.{js,ts}", "api/routes/test_routes/*.{js,ts}"],
        rules: {
            "no-console": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "no-undef": "off"
        }
    },

    globalIgnores([
        "node_modules/",
        "dist/",
        "coverage/",
        "*.js.map",
        "*.d.ts",
        ".env",
        ".env.*",
        "!.env.example",
        "prisma_client/",
        "public/",
        "no_git/",
        "*.log",
        ".git/",
        ".vscode/",
        ".kiro/",
        "jest.config.js"
    ])
]);
