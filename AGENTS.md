# Repository Guidelines

## Project Structure & Module Organization

`starter/` is the student editor: plain HTML, CSS, and classic JavaScript. It must open directly as `file://starter/index.html` without Node or network access. `directive-ai/plugin/src/artist.js` adds an optional browser panel; Vite builds its single classic script to `directive-ai/dist/artist.js`. `directive-ai/server/src/` contains the gateway and command validation. Tests live in `tests/` and `directive-ai/tests/`. Do not edit generated files in `directive-ai/dist/` by hand.

## Build, Test, and Development Commands

Run `npm ci` once for development tools. `npm run build` bundles the optional plugin. `npm run typecheck` checks gateway TypeScript. `npm run lint` checks JS/TS and CSS. `npm run format` applies Prettier; `npm run format:check` verifies it. `npm test` runs editor and gateway tests, while `npm run test:load` exercises gateway concurrency. `npm run check` runs the normal quality gate. The student editor itself needs none of these commands.

## Coding Style & Naming Conventions

Use two spaces, LF endings, semicolons, double quotes, and a 100-character print width. Prettier owns layout; ESLint and Stylelint own code and CSS rules. Use `const` by default and `let` for reassignment; never use `var`. Give every TypeScript parameter, return value, and state structure an explicit type. Use camelCase for functions and variables, PascalCase for types, and `*.test.ts` for gateway tests.

## Testing Guidelines

Add a focused regression test when behavior changes. Keep the offline smoke test independent of server packages. Rebuild before testing changes to the browser plugin because plugin tests read `dist/artist.js`.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries. Describe user-visible changes and test results in pull requests; include a screenshot when the editor layout changes. Avoid committing `.env`, keys, or `node_modules`.

## Constraints and do-not rules

<!-- Maintainer: add any further project-specific constraints here. -->

## What Done Means

Run `npm run check` and `npm run build` after changes. Confirm that `starter/index.html` still works offline and that the bundled plugin continues to call the actual student functions.
