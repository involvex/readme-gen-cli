#!/usr/bin/env node

'use strict';

// ---------------------------------------------------------------------------
// readme-gen — Auto-generate a README.md from package.json and project structure
// Zero dependencies. Pure Node.js.
// ---------------------------------------------------------------------------

const fs   = require('fs');
const path = require('path');

// ---- Argument parsing -----------------------------------------------------

function parseArgs(argv) {
  const opts = {
    output: null,
    force: false,
    minimal: false,
    help: false,
    dir: process.cwd(),
  };

  let i = 2;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '-o' || arg === '--output') {
      if (i + 1 < argv.length) opts.output = argv[++i];
    } else if (arg.startsWith('--output=')) {
      opts.output = arg.split('=').slice(1).join('=');
    } else if (arg === '--force') {
      opts.force = true;
    } else if (arg === '--minimal') {
      opts.minimal = true;
    } else if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (!arg.startsWith('-')) {
      opts.dir = path.resolve(arg);
    }
    i++;
  }
  return opts;
}

function printHelp() {
  const help = `
readme-gen — Auto-generate a README.md from your project

USAGE
  readme-gen [options] [directory]

OPTIONS
  -o, --output <file>   Write output to a file (default: stdout)
  --force               Overwrite existing README.md
  --minimal             Generate a shorter, minimal README
  -h, --help            Show this help message

EXAMPLES
  readme-gen                        Print README to stdout
  readme-gen -o README.md           Write to README.md
  readme-gen -o README.md --force   Overwrite existing README.md
  readme-gen --minimal              Generate minimal README
`;
  console.log(help.trim());
}

// ---- .gitignore parsing ---------------------------------------------------

function loadGitignorePatterns(dir) {
  const gitignorePath = path.join(dir, '.gitignore');
  const patterns = [
    // Always ignore these regardless of .gitignore
    'node_modules', '.git', '.DS_Store', 'coverage', '.nyc_output',
    'dist', 'build', '.next', '.nuxt', '.cache', '.parcel-cache',
    '.env', '.env.local', '.env.*.local',
  ];

  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const lines = content.split('\n');
    for (const raw of lines) {
      const line = raw.trim();
      if (line && !line.startsWith('#')) {
        // Strip trailing slashes for directory patterns
        patterns.push(line.replace(/\/+$/, ''));
      }
    }
  } catch (_) {
    // No .gitignore — that's fine
  }

  return patterns;
}

function shouldIgnore(name, patterns) {
  for (const p of patterns) {
    // Simple glob matching: support leading *, trailing *, and exact match
    if (p === name) return true;
    if (p.startsWith('*') && name.endsWith(p.slice(1))) return true;
    if (p.endsWith('*') && name.startsWith(p.slice(0, -1))) return true;
    if (p.startsWith('*.') && name.endsWith(p.slice(1))) return true;
  }
  return false;
}

// ---- Directory tree -------------------------------------------------------

function buildTree(dir, ignorePatterns, prefix, maxDepth, currentDepth) {
  if (currentDepth > maxDepth) return [];

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return [];
  }

  // Filter and sort: directories first, then files, alphabetically
  entries = entries
    .filter((e) => !shouldIgnore(e.name, ignorePatterns))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  const lines = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
    const childPrefix = isLast ? '    ' : '\u2502   ';

    if (entry.isDirectory()) {
      lines.push(`${prefix}${connector}${entry.name}/`);
      const subLines = buildTree(
        path.join(dir, entry.name),
        ignorePatterns,
        prefix + childPrefix,
        maxDepth,
        currentDepth + 1,
      );
      lines.push(...subLines);
    } else {
      lines.push(`${prefix}${connector}${entry.name}`);
    }
  }

  return lines;
}

function getProjectTree(dir, ignorePatterns, minimal) {
  const maxDepth = minimal ? 1 : 3;
  const rootName = path.basename(dir) + '/';
  const treeLines = buildTree(dir, ignorePatterns, '', maxDepth, 0);
  return [rootName, ...treeLines].join('\n');
}

// ---- README generation ----------------------------------------------------

function generateReadme(pkg, dir, opts) {
  const sections = [];
  const name = pkg.name || path.basename(dir);
  const description = pkg.description || '';
  const version = pkg.version || '0.0.0';

  // ---- Title + badges
  let title = `# ${name}`;
  if (version) title += `\n\n![Version](https://img.shields.io/badge/version-${version}-blue)`;
  if (pkg.license) title += ` ![License](https://img.shields.io/badge/license-${pkg.license}-green)`;
  sections.push(title);

  // ---- Description
  if (description) {
    sections.push(`> ${description}`);
  }

  // ---- Table of Contents (full only)
  if (!opts.minimal) {
    const toc = [
      '## Table of Contents',
      '',
      '- [Installation](#installation)',
      '- [Usage](#usage)',
    ];
    if (pkg.scripts && Object.keys(pkg.scripts).length > 0) {
      toc.push('- [Available Scripts](#available-scripts)');
    }
    if (!opts.minimal) {
      toc.push('- [Project Structure](#project-structure)');
    }
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    if (Object.keys(allDeps).length > 0) {
      toc.push('- [Dependencies](#dependencies)');
    }
    toc.push('- [License](#license)');
    toc.push('- [Contributing](#contributing)');
    sections.push(toc.join('\n'));
  }

  // ---- Installation
  {
    const installLines = ['## Installation', ''];
    const installName = pkg.name || name;
    if (pkg.bin) {
      installLines.push('```bash');
      installLines.push(`# npm`);
      installLines.push(`npm install -g ${installName}`);
      installLines.push('');
      installLines.push(`# yarn`);
      installLines.push(`yarn global add ${installName}`);
      installLines.push('');
      installLines.push(`# pnpm`);
      installLines.push(`pnpm add -g ${installName}`);
      installLines.push('```');
    } else {
      installLines.push('```bash');
      installLines.push(`# npm`);
      installLines.push(`npm install ${installName}`);
      installLines.push('');
      installLines.push(`# yarn`);
      installLines.push(`yarn add ${installName}`);
      installLines.push('');
      installLines.push(`# pnpm`);
      installLines.push(`pnpm add ${installName}`);
      installLines.push('```');
    }
    sections.push(installLines.join('\n'));
  }

  // ---- Usage
  {
    const usageLines = ['## Usage', ''];
    if (pkg.bin) {
      const binEntries = typeof pkg.bin === 'string'
        ? [[name, pkg.bin]]
        : Object.entries(pkg.bin);
      for (const [cmd] of binEntries) {
        usageLines.push('```bash');
        usageLines.push(`${cmd} --help`);
        usageLines.push('```');
      }
    } else if (pkg.main) {
      usageLines.push('```js');
      usageLines.push(`const ${safeName(name)} = require('${pkg.name || name}');`);
      usageLines.push('```');
    } else {
      usageLines.push('```js');
      usageLines.push(`const ${safeName(name)} = require('${pkg.name || name}');`);
      usageLines.push('```');
    }
    sections.push(usageLines.join('\n'));
  }

  // ---- Available Scripts
  if (pkg.scripts && Object.keys(pkg.scripts).length > 0) {
    const scriptLines = ['## Available Scripts', ''];
    scriptLines.push('| Script | Command |');
    scriptLines.push('| ------ | ------- |');
    for (const [scriptName, cmd] of Object.entries(pkg.scripts)) {
      scriptLines.push(`| \`npm run ${scriptName}\` | \`${cmd}\` |`);
    }
    sections.push(scriptLines.join('\n'));
  }

  // ---- Project Structure (full only)
  if (!opts.minimal) {
    const ignorePatterns = loadGitignorePatterns(dir);
    const tree = getProjectTree(dir, ignorePatterns, opts.minimal);
    const structLines = [
      '## Project Structure',
      '',
      '```',
      tree,
      '```',
    ];
    sections.push(structLines.join('\n'));
  }

  // ---- Dependencies
  {
    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};
    const allDeps = { ...deps, ...devDeps };
    if (Object.keys(allDeps).length > 0) {
      const depLines = ['## Dependencies', ''];
      if (Object.keys(deps).length > 0) {
        depLines.push('### Production', '');
        depLines.push('| Package | Version |');
        depLines.push('| ------- | ------- |');
        for (const [depName, ver] of Object.entries(deps)) {
          depLines.push(`| ${depName} | \`${ver}\` |`);
        }
        depLines.push('');
      }
      if (Object.keys(devDeps).length > 0) {
        depLines.push('### Development', '');
        depLines.push('| Package | Version |');
        depLines.push('| ------- | ------- |');
        for (const [depName, ver] of Object.entries(devDeps)) {
          depLines.push(`| ${depName} | \`${ver}\` |`);
        }
      }
      sections.push(depLines.join('\n'));
    }
  }

  // ---- License
  {
    const licenseLines = ['## License', ''];
    if (pkg.license) {
      const author = typeof pkg.author === 'string'
        ? pkg.author
        : (pkg.author && pkg.author.name) || '';
      licenseLines.push(`This project is licensed under the [${pkg.license} License](./LICENSE).`);
      if (author) {
        licenseLines.push('');
        licenseLines.push(`Copyright (c) ${new Date().getFullYear()} ${author}`);
      }
    } else {
      licenseLines.push('No license specified.');
    }
    sections.push(licenseLines.join('\n'));
  }

  // ---- Contributing (full only)
  if (!opts.minimal) {
    const contribLines = [
      '## Contributing',
      '',
      'Contributions are welcome! Please follow these steps:',
      '',
      '1. Fork the repository',
      '2. Create a feature branch (`git checkout -b feature/my-feature`)',
      '3. Commit your changes (`git commit -am "Add my feature"`)',
      '4. Push to the branch (`git push origin feature/my-feature`)',
      '5. Open a Pull Request',
      '',
      'Please make sure to update tests as appropriate.',
    ];
    sections.push(contribLines.join('\n'));
  }

  return sections.join('\n\n') + '\n';
}

// Convert a package name to a safe JS variable name
function safeName(name) {
  return name
    .replace(/^@[^/]+\//, '')  // strip scope
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/^(\d)/, '_$1');
}

// ---- Main -----------------------------------------------------------------

function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const dir = opts.dir;

  // Read package.json
  const pkgPath = path.join(dir, 'package.json');
  let pkg;
  try {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    pkg = JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`readme-gen: no package.json found in ${dir}`);
      console.error('Run readme-gen from a directory containing a package.json.');
      process.exit(1);
    }
    console.error(`readme-gen: failed to parse package.json: ${err.message}`);
    process.exit(1);
  }

  const readme = generateReadme(pkg, dir, opts);

  // Output
  if (opts.output) {
    const outPath = path.resolve(dir, opts.output);

    if (fs.existsSync(outPath) && !opts.force) {
      console.error(`readme-gen: ${opts.output} already exists. Use --force to overwrite.`);
      process.exit(1);
    }

    fs.writeFileSync(outPath, readme, 'utf8');
    console.error(`readme-gen: wrote ${opts.output} (${readme.length} bytes)`);
  } else {
    process.stdout.write(readme);
  }
}

main();
