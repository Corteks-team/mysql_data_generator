import moment = require("moment");
import { Random, MersenneTwister19937 } from "random-js";

export class Randomizer {
    private random: Random;

    constructor(
        seed?: number
    ) {
        if (seed) {
            this.random = new Random(MersenneTwister19937.seed(seed));
        } else {
            this.random = new Random(MersenneTwister19937.autoSeed());
        }
    }

    public randomBit(length: number) {
        return this.randomInt(0, Math.pow(2, length));
    }

    public randomString(length: number) {
        return this.random.string(length);
    }

    public randomInt(min: number = -127, max: number = 128) {
        return this.random.integer(min, max);
    }

    public randomFloat(min: number = -127, max: number = 128) {
        return this.random.real(min, max);
    }

    public randomDate(start = new Date('01-01-1970'), end = new Date()) {
        return moment(this.random.date(start, end)).format('Y-MM-DD HH:mm:ss');
    }
}
