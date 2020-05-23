import yargs from 'yargs';

const metadata: { [key: string]: any; } = {};

export function Option(options: yargs.Options) {
    return (target: any, propertyKey: string) => {
        metadata[propertyKey] = options;
    };
}

export function Cli<T extends { new(...args: any[]): {}; }>(constructor: T) {
    return class extends constructor {
        constructor(...rest: any[]) {
            super();
            for (let propertyKey in metadata) {
                metadata[propertyKey].default = (this as any)[propertyKey];
            }
            const args = yargs.options(metadata).argv;
            for (let propertyKey in metadata) {
                if (metadata[propertyKey])
                    (this as any)[propertyKey] = args[propertyKey];
            }
        }
    };
}