import { Client } from '#/client/Client.js';

export default class JagException extends Error {
    static revision = 0;

    override message: string;
    override cause: unknown;

    constructor(cause: unknown, message: string) {
        super(message);
        this.cause = cause;
        this.message = message;
    }

    static report(error: unknown): string;
    static report(message: string | null, error: unknown): void;
    static report(error: unknown, message: string): JagException;
    static report(arg0: unknown, arg1?: unknown): string | void | JagException {
        const reportThrowable = (error: unknown): string => {
            let prefix = '';
            if (error instanceof JagException) {
                prefix = `${error.message} | `;
                error = error.cause;
            }
            if (!(error instanceof Error)) {
                return `${prefix}| ${String(error)}`;
            }
            const lines = (error.stack ?? '').split(/\r?\n/).filter(line => line.length > 0);
            const throwable = error.message.length > 0 ? `${error.name}: ${error.message}` : error.name;
            let first = lines.shift() ?? throwable;
            if (error.message.length > 0 && !first.includes(error.message)) {
                lines.unshift(first);
                first = throwable;
            }
            let out = prefix;
            for (const line of lines) {
                const source = line.match(/\(([^()]+)\.js:(\d+)\)/);
                if (source) {
                    out += `${source[1]}:${source[2]} `;
                    continue;
                }
                const trimmed = line.trim();
                const parts = trimmed.split(/\s+/);
                if (parts.length > 0) {
                    out += `${parts[parts.length - 1]} `;
                }
            }
            return `${out}| ${first}`;
        };

        if (typeof arg0 === 'string' || arg0 === null) {
            const message = arg0;
            const error = arg1;
            try {
                let text = '';
                if (error !== null && error !== undefined) {
                    text = reportThrowable(error);
                }
                if (message !== null) {
                    if (error !== null && error !== undefined) {
                        text += ' | ';
                    }
                    text += message;
                }
                console.log(`Error: ${text}`);
                const safe = text.replace(/[:@&#]/g, ch => (ch === ':' ? '.' : '_'));
                void fetch(`clienterror.ws?c=${JagException.revision}&u=${Client.userhash}&e=${safe}`).catch(() => {});
            } catch {}
            return;
        }

        if (typeof arg1 === 'string') {
            if (arg0 instanceof JagException) {
                arg0.message += ` ${arg1}`;
                return arg0;
            }
            return new JagException(arg0, arg1);
        }

        return reportThrowable(arg0);
    }
}
