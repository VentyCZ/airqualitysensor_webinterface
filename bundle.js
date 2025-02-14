#!/usr/bin/env node
const { buildSync } = require('esbuild');

buildSync({
    entryPoints: [
        './*'
    ],
    absWorkingDir: `${__dirname}/src/`,
    outdir: `${__dirname}/build/webinterface`,
    bundle: true,
    minify: true,
    loader: {
        '.ico': 'copy',
        '.json': 'copy',
        '.html': 'copy',
    }
});
