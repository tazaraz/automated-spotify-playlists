
const FilterValueOptions = {
    "is": "The result must be equal to the given value",
    "is not": "The result must not be equal to the given value",
    "is at least": "The search must be equal or larger than the given value",
    "is at most": "The search must be equal or smaller than the given value",
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
                          filter: number,
                          input: number): boolean{
        switch (operation) {
            case "is":
                return filter == input;

            case "is not":
                return filter != input;

            case "is at least":
                return input >= filter;

            case "is at most":
                return input <= filter;

            default:
                throw Error(`Illegal Condition operation "${operation}"`);
        }
    }
}
