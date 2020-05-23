import moment = require("moment");
import { Random, MersenneTwister19937 } from "random-js";
const random = new Random(MersenneTwister19937.autoSeed());

export class Randomizer {
    static randomBit(length: number) {
        return Randomizer.randomInt(0, Math.pow(2, length));
    }

    static randomString(length: number) {
        return random.string(length);
    }

    static randomInt(min: number = -127, max: number = 128) {
        const tmpMin = Math.ceil(min);
        const tmpMax = Math.floor(max);
        return Math.floor(Math.random() * (tmpMax - tmpMin + 1)) + tmpMin;
    }

    static randomFloat(min: number = -127, max: number = 128) {
        const tmpMin = Math.ceil(min);
        const tmpMax = Math.floor(max);
        return Math.random() * (tmpMax - tmpMin + 1) + tmpMin;
    }

    static randomDate(start = new Date('01-01-1970'), end = new Date()) {
        return moment(new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))).format('Y-MM-DD HH:mm:ss');
    }
}
