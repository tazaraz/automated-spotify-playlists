const FilterStringOptions = {
    "contains": "Input contains the value specified. You can specify multiple values by separating them with a ','. The matching is case insensitive, and if the input contains multiple values (separated by a ',') only one of them has to fullfill the condition.",
    "does not contain": "Input does not contain the value specified. You can specify multiple values by separating them with a ','. The matching is case insensitive.",
    "begins with": "The input must begin with the given value",
    "ends with": "The input must end with the given value",
    "is": "The input must exactly match the given value. Case insensitive",
    "is not": "The input must not match the given value",
}

export class FilterString {
    // Contains all the options that this type supports
    public static readonly operation = FilterStringOptions;

    /**
     *                  Checks if value matches the set rule
     * @param operation Operation to execute on the value
     * @param filter    Filter specified by the user
     * @param value     Value to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterString.operation,
                          filter: string,
                          value: string): boolean{
        let data: string[],
            find: string[];

        switch (operation) {
            case "contains":
                // Split at every "," and trim
                data = value.split(",").map(value => value.trim().toLowerCase());
                find = filter.split(",").map(value => value.trim().toLowerCase());
                return data.some(d => find.some(f => d.includes(f)))

            case "does not contain":
                data = value.split(",").map(value => value.trim().toLowerCase());
                find = filter.split(",").map(value => value.trim().toLowerCase());
                return data.every(d => find.every(f => !d.includes(f)))

            case "is":
                return filter.toLowerCase() == value.toLowerCase();

            case "is not":
                return filter.toLowerCase() != value.toLowerCase();

            case "begins with":
                return filter.toLowerCase().startsWith(value.toLowerCase());

            case "ends with":
                return filter.toLowerCase().endsWith(value.toLowerCase());

            default:
                console.error(`FilterString: Unknown operation '${operation}'`);
        }
    }
}