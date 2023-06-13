
const FilterBooleanOptions = {
    "True": "The filter should be true",
    "False": "The filter should not be true",
}

export class FilterBoolean {
    // Contains all the options that this type supports
    public static readonly operation = FilterBooleanOptions;

    /**
     *                  Checks if input matches the set rule
     * @param operation Operation to execute on the input
     * @param input     Input to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterBoolean.operation, input: boolean): boolean {
        switch (operation) {
            case "True":
                return input;

            case "False":
                return !input;

            default:
                throw Error(`Illegal Condition operation "${operation}"`);
        }
    }
}
