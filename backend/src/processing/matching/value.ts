
const FilterValueOptions = {
    "is": "The result must be equal to the value specified",
    "is not": "The result must not be equal to the value specified",
    "is at least": "The search must be equal or larger than the value specified",
    "is at most": "The search must be equal or smaller than the value specified",
    "is in the range": "The search must be larger than the first value and smaller than the second",
    "is outside the range": "The search must be smaller than the first value and larger than the second",
}

export class FilterValue {
    // Contains all the options that this type supports
    public static readonly operation = FilterValueOptions;

    /**
     *                  Checks if input matches the set rule
     * @param operation Operation to execute on the input
     * @param filter    Filter to check the for in the input
     * @param input     Input to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterValue.operation,
                          filter: number | [number, number],
                          input: number): boolean{
        switch (operation) {
            case "is":
                return filter == input;

            case "is not":
                return filter != input;

            case "is at least":
                return input >= (filter as number);

            case "is at most":
                return input <= (filter as number);

            case "is in the range":
                return input >= (filter as any)[0] && input <= (filter as any)[1];

            case "is outside the range":
                return input < (filter as any)[0] && input > (filter as any)[1];

            default:
                throw Error(`Illegal Condition operation "${operation}"`);
        }
    }
}
