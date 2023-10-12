const FilterValueOptions = {
    "is at least": "The search must be equal or larger than the given value",
    "is at most": "The search must be equal or smaller than the given value",
    "is": "The result must be equal to the given value",
    "is not": "The result must not be equal to the given value",
}

export class FilterValue {
    // Contains all the options that this type supports
    public static readonly operation = FilterValueOptions;

    /**
     *                  Checks if value matches the set rule
     * @param operation Operation to execute on the value
     * @param filter    Filter specified by the user
     * @param value     Value to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterValue.operation,
                          filter: number,
                          value: number): boolean{
        switch (operation) {
            case "is":
                return filter == value;

            case "is not":
                return filter != value;

            case "is at least":
                return value >= filter;

            case "is at most":
                return value <= filter;

            default:
                console.error(`FilterValue: Unknown operation '${operation}'`);
        }
    }
}
