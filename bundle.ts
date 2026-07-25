import fs from 'fs';
import path from 'path';

import { minify } from 'terser';

import { nth_identifier } from './identifier.js';

const define = {
    'process.env.BUILD_DEV': JSON.stringify(true),
    'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
};

// ----

type BunOutput = {
    source: string;
    sourcemap: string;
};

async function bunBuild(entry: string, external: string[] = [], minify = true, drop: string[] = []): Promise<BunOutput> {
    const build = await Bun.build({
        entrypoints: [entry],
        sourcemap: 'external',
        define,
        external,
        minify,
        drop
    });

    if (!build.success) {
        build.logs.forEach((x: any) => console.log(x));
        process.exit(1);
    }

    return {
        source: await build.outputs[0].text(),
        sourcemap: build.outputs[0].sourcemap ? await build.outputs[0].sourcemap.text() : ''
    };
}

async function applyTerser(script: BunOutput): Promise<boolean> {
    const mini = await minify(script.source, {
        sourceMap: {
            content: script.sourcemap
        },
        toplevel: true,
        // format: {
        //     beautify: true
        // },
        compress: {
            ecma: 2020
        },
        mangle: {
            nth_identifier: nth_identifier,
            properties: {
                reserved: [
                    // stdlib
                    'willReadFrequently',
                    'usedJSHeapSize'
                ]
            }
        }
    });

    script.source = mini.code ?? '';
    script.sourcemap = mini.map?.toString() ?? '';
    return true;
}

// ----

if (!fs.existsSync('out')) {
    fs.mkdirSync('out');
}

const args = process.argv.slice(2);
const prod = args[0] !== 'dev';

const entrypoints = [
    'src/client/Client.ts'
];

process.env.BUILD_DEV = JSON.stringify(args[0] === 'dev');

for (const file of entrypoints) {
    const output = path.basename(file).replace('.ts', '.js').toLowerCase();

    const script = await bunBuild(file, [], prod, prod ? ['console'] : []);
    if (script) {
        if (prod) {
            await applyTerser(script);
        }

        fs.writeFileSync(`out/${output}`, script.source);
        fs.writeFileSync(`out/${output}.map`, script.sourcemap);
    }
}
