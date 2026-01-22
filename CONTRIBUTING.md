# Contributing to ludomercatus

Thanks for your interest in contributing to **ludomercatus**! 
Contributions of all kinds are welcome: bug reports, feature requests, documentation improvements, and code changes.

Please read these guidelines before opening an issue or pull request.

## Ways to contribute

- Report bugs and problems you encounter  
- Propose or discuss new features and improvements  
- Improve documentation, comments, and examples  
- Submit pull requests for small fixes or larger enhancements  

If you are unsure whether an idea fits the project, open an issue first to discuss it.

## Getting started

1. **Fork** the repository on GitHub.  
2. **Clone** your fork locally and create a new branch for your work:  
   - Use a descriptive branch name, for example: `fix-order-bug`, `feature-market-screen`, `docs-typo`.  
3. **Install Bun** (if you have not already) by following the official Bun installation instructions for your platform.  
4. **Install dependencies** using Bun in the project root, for example:  
   - `bun install`  
5. **Run checks** locally before committing, for example:  
   - `bun test` (or any project-specific test script)  
   - `bun run lint` (or equivalent lint / type-check script)

Try to keep each pull request focused on a single change or closely related set of changes.

## Issues and bug reports

When opening an issue, include enough detail so problems can be reproduced and fixed.

For **bug reports**, please provide:

- A clear, concise description of the bug  
- Steps to reproduce (ideally minimal)  
- What you expected to happen  
- What actually happened (including any logs, error messages or screenshots, if relevant)  
- Your environment (OS, Bun version, package manager usage, etc.)

For **feature requests / enhancements**, please include:

- The problem you are trying to solve  
- Why it would be useful for this project  
- Any other rough ideas that you might have that would enhance or improve the game  

Before opening a new issue, check existing issues to avoid duplicates.

## Code changes

This project is primarily written in TypeScript, so consistency and type safety are important.

Please follow these guidelines when submitting code:

- Match the existing coding style (formatting, naming, and file structure).  
- Prefer small, focused commits with clear messages (for example: `fix: handle empty order list`, `feat: add trade summary view`).  
- Add or update tests when you change logic or add features.  
- Update documentation or comments if behavior or APIs change.

A typical workflow for a pull request:

1. Open or find an issue discussing the change.  
2. Implement the change on a feature branch.  
3. Run Bun-based scripts locally (tests, lint, type checks).  
4. Open a pull request against the default branch and describe:
   - What changed  
   - Why it changed  
   - Any follow-up work or limitations

If you add new Bun scripts (for example in `bunfig.toml` or the project’s configuration), briefly mention them in the pull request description.

## Code of conduct

Please be respectful and constructive in all interactions in issues, pull requests, and any project discussions.

- Be welcoming to newcomers.  
- Focus on the technical topic, not the person.  
- Assume good faith and be open to feedback.

Project maintainers may moderate discussions and, when necessary, edit or close issues and pull requests that do not follow these principles.
