//@ts-check
import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * @type {import('esbuild').Plugin}
 */
export default {
    name: 'version',
    setup(build) {
        build.onLoad({ filter: /\.html$/ }, async (args) => {
            let dir = dirname(args.path);
            let html = await fs.promises.readFile(args.path, 'utf8');

            html = html.replace(/<(?:script|link) .*(?:src|href)="(\/[^"]+)"[^>]*>/g, (match, href) => {
                const path = resolve(dir, `.${href}`);
                const stat = fs.statSync(path);

                const hash = createHash('md5').update(stat.mtime.toString()).digest('hex');
                return match.replace(href, href + '?v=' + hash);
            });

            return {
                contents: html,
                loader: 'copy',
            };
        });
    },
};
