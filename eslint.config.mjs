import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
 { ignores: ["_legacy/**", "node_modules/**", ".next/**"] },
 ...nextCoreWebVitals,
 ...nextTypescript,
];

export default eslintConfig;