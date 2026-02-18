import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    security.configs.recommended,
    {
        rules: {
            // Security - eslint-plugin-security overrides
            "security/detect-object-injection": "warn",
            "security/detect-non-literal-regexp": "warn",
            "security/detect-unsafe-regex": "error",
            "security/detect-buffer-noassert": "error",
            "security/detect-child-process": "error",
            "security/detect-disable-mustache-escape": "error",
            "security/detect-eval-with-expression": "error",
            "security/detect-new-buffer": "error",
            "security/detect-no-csrf-before-method-override": "error",
            "security/detect-non-literal-fs-filename": "warn",
            "security/detect-non-literal-require": "warn",
            "security/detect-possible-timing-attacks": "error",
            "security/detect-pseudoRandomBytes": "error",
            // TypeScript - Strict Mode
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/ban-ts-comment": "error",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/consistent-type-imports": [
                "warn",
                {
                    prefer: "type-imports",
                    fixStyle: "inline-type-imports",
                },
            ],

            // Next.js
            "@next/next/no-html-link-for-pages": ["error", "app"],
            "@next/next/no-img-element": "error",

            // React Best Practices
            "react/self-closing-comp": "warn",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // Code Quality
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "prefer-const": "warn",
            "no-debugger": "error",
            eqeqeq: ["error", "always"], // บังคับ === แทน ==
        },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        "scripts/**",
        "tests/**",
    ]),
]);

export default eslintConfig;
