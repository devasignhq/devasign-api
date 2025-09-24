const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

module.exports = [
    // Apply to TypeScript files only
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
                project: "./tsconfig.json"
            },
            globals: {
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                require: "readonly",
                exports: "readonly",
                global: "readonly"
            }
        },
        plugins: {
            "@typescript-eslint": tseslint
        },
        rules: {
            // ESLint recommended rules
            ...js.configs.recommended.rules,

            // TypeScript specific rules
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            // "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-var-requires": "error",

            // General ESLint rules
            // "no-unused-vars": "off",
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
            "eol-last": ["error", "always"]
        }
    },

    // Apply to JavaScript files without TypeScript parser
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                require: "readonly",
                exports: "readonly",
                global: "readonly"
            }
        },
        rules: {
            // ESLint recommended rules for JS files
            ...js.configs.recommended.rules,
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
            "eol-last": ["error", "always"]
        }
    },

    // Special rules for test files
    {
        files: ["**/*.test.{js,ts}", "**/*.spec.{js,ts}", "**/tests/**/*.{js,ts}"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "no-console": "off",
            "no-undef": "off"
        }
    },

    // Ignore patterns
    {
        ignores: [
            "node_modules/",
            "dist/",
            "coverage/",
            "*.js.map",
            "*.d.ts",
            ".env",
            ".env.*",
            "!.env.example",
            "api/generated/",
            "public/",
            "no-git/",
            "*.log",
            ".git/",
            ".vscode/",
            ".kiro/"
        ]
    }
];
