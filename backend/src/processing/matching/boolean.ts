
const FilterBooleanOptions = {
    "True": "The filter should be true",
    "False": "The filter should not be true",
}

export class FilterBoolean {
    // Contains all the options that this type supports
    public static readonly operation = FilterBooleanOptions;

    /**
     *                  Checks if value matches the set rule
     * @param operation Operation to execute on the value
     * @param value     Value to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterBoolean.operation, value: boolean): boolean {
        switch (operation) {
            case "True":
                return value;

            case "False":
                return !value;

            default:
                throw Error(`Illegal Condition operation "${operation}"`);
        }
    }
}
