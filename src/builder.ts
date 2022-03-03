
export class Builder<T> {
    private obj: T;
    constructor(className: new () => T) {
        this.obj = new className();
    }

    set<K extends keyof T>(key: K, value: T[K]): Builder<T> {
        this.obj[key] = value;
        return this;
    }

    build(): T {
        return this.obj;
    }
}
