export const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
}

export const linearScale = (factor: number, minInput: number, maxInput: number, minOutput: number, maxOutput: number) => {
    factor = clamp(factor, minInput, maxInput);

    return minOutput + (maxOutput - minOutput) *
        (factor - minInput) / (maxInput - minInput);
}

export const roundNearest50 = (num: number) => {
    return Math.round(num / 50) * 50;
}

export const getKeyByValue = (object: any, value: any) => {
    return Object.keys(object).find(key => object[key] === value);
}
