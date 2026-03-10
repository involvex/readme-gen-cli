# readme-gen

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

> Auto-generate a README.md from your package.json and project structure. Because devs hate writing READMEs.

Run `readme-gen` in any Node.js project and get a complete, professional README instantly. It reads your `package.json` for metadata and scans your directory structure to produce a well-formatted document.

## Installation

```bash
# npm
npm install -g readme-gen-cli

# yarn
yarn global add readme-gen-cli

# pnpm
pnpm add -g readme-gen-cli
```

## Usage

```bash
# Preview README (prints to stdout)
readme-gen

# Write to file
readme-gen -o README.md

# Overwrite existing README
readme-gen -o README.md --force

# Generate a shorter version
readme-gen --minimal

# Run against a different directory
readme-gen /path/to/project
```

## What It Generates

The generated README includes:

- **Title + badges** from package name, version, and license
- **Description** from package.json
- **Installation section** with npm, yarn, and pnpm commands
- **Usage section** -- CLI usage if `bin` is defined, or `require()` example for libraries
- **Available Scripts** table from `package.json` scripts
- **Project Structure** -- tree-like view of your project (respects `.gitignore`)
- **Dependencies** tables (production and development, separated)
- **License** section with copyright
- **Contributing** boilerplate with fork/PR workflow

Use `--minimal` to skip the table of contents, project structure, and contributing sections.

## Options

```
-o, --output <file>   Write output to a file (default: stdout)
--force               Overwrite existing file
--minimal             Generate a shorter, minimal README
-h, --help            Show help
```

## Example Output

Running `readme-gen` in a project produces markdown like:

```markdown
# my-awesome-tool

![Version](https://img.shields.io/badge/version-2.1.0-blue) ![License](...)

> A tool that does awesome things

## Installation

npm install -g my-awesome-tool

## Usage

my-awesome-tool --help

## Available Scripts

| Script | Command |
| ------ | ------- |
| npm run build | tsc |
| npm run test | jest |

## Project Structure

my-awesome-tool/
|-- src/
|   |-- index.ts
|   |-- utils.ts
|-- bin/
|   |-- cli.js
|-- package.json
|-- tsconfig.json

## Dependencies
...
```

## Zero Dependencies

This tool has **no dependencies**. It uses only Node.js built-in modules (`fs`, `path`). Install it and it just works.

## License

[MIT](./LICENSE) -- Tate Lyman
