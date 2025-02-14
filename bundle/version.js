//@ts-check
import fs from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * @type {import('esbuild').Plugin}
 */
export default {
    name: 'version',
    setup(build) {
        build.onLoad({ filter: /\.html$/ }, async (args) => {
            let html = await fs.promises.readFile(args.path, 'utf8');

            html = html.replace(/<(?:script|link) .*(?:src|href)="(\/[^"]+)"[^>]*>/g, (match, href) => {
                const hash = createHash('md5').update((new Date).toString()).digest('hex');
                return match.replace(href, href + '?v=' + hash);
            });

            return {
                contents: html,
                loader: 'copy',
            };
        });
    },
};
