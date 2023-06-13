
const FilterStringOptions = {
    "contains": "The search contains the value specified. You can specify multiple values by separating them with a ','",
    "does not contain": "The search does not contain the value specified. You can specify multiple values by separating them with a ','",
    "is": "The search must match the value specified specified",
    "is not": "The search must not match the value specified",
    "begins with": "The search must begin with the given value specified",
    "ends with": "The search must end with the given value specified"
}

export class FilterString {
    // Contains all the options that this type supports
    public static readonly operation = FilterStringOptions;

    /**
     *                  Checks if input matches the set rule
     * @param operation Operation to execute on the input
     * @param filter    Filter to check the for in the input
     * @param input     Input to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterString.operation,
                          filter: string,
                          input: string): boolean{
        let data: string[],
            find: string[];

        switch (operation) {
            case "contains":
                // Split at every "," and trim
                data = input.split(",").map(value => value.trim().toLowerCase());
                find = filter.split(",").map(value => value.trim().toLowerCase());
                return data.some(d => find.some(f => d.includes(f)))

            case "does not contain":
                data = input.split(",").map(value => value.trim().toLowerCase());
                find = filter.split(",").map(value => value.trim().toLowerCase());
                return data.every(d => find.every(f => !d.includes(f)))

            case "is":
                return filter.toLowerCase() == input.toLowerCase();

            case "is not":
                return filter.toLowerCase() != input.toLowerCase();

            case "begins with":
                return filter.toLowerCase().startsWith(input.toLowerCase());

            case "ends with":
                return filter.toLowerCase().endsWith(input.toLowerCase());

            default:
                throw Error(`Illegal Condition operation "${operation}"`);
        }
    }
}