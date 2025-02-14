#!/usr/bin/env node
//@ts-check
import { build } from 'esbuild';
import VersionPlugin from './bundle/version.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(
    fileURLToPath(import.meta.url)
);

build({
    entryPoints: [
        './*'
    ],
    absWorkingDir: `${__dirname}/src/`,
    outdir: `${__dirname}/build/webinterface`,
    bundle: true,
    minify: true,
    plugins: [
        VersionPlugin,
    ],
    loader: {
        '.ico': 'copy',
        '.json': 'copy',
        '.html': 'copy',
    }
});
