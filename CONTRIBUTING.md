# Contributing

Sovereign Arcade is an internal showcase project of the VERITAS & Sovereign Ecosystem. External contributions are accepted under the following conditions.

---

## Standards

- All code must conform to the Gold-and-Obsidian design contract: Obsidian (`#050508`) background, Gold (`#FFD700`) primary accent, no external framework dependencies, vanilla HTML/JS only.
- New game modules must be self-contained within a single directory and runnable via `npx serve .` without a build step.
- Persistence changes must use only `localStorage`; no server-side or cloud storage may be introduced.
- Commits follow conventional format: `feat(module): description`, `fix(module): description`, `docs: description`.

---

## Pull Request Process

1. Fork the repository and create a feature branch from `main`.
2. Validate that your changes do not alter the behavior of existing game modules.
3. Run `npm test` and confirm it passes.
4. Open a pull request with a concise description of the change and its purpose within the Omega Universe.

---

## Design and Lore Alignment

Contributions must align with the VERITAS operator framing. Avoid informal language, emojis in headings, and framework dependencies. If in doubt, reference existing game module READMEs or the root `README.md` as the stylistic authority.
