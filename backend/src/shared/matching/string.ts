const FilterStringOptions = {
    "contains": "Input contains the value specified",
    "does not contain": "Input does not contain the value specified",
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
                data = value.split(",").map(value => value.trim());
                find = filter.split(",").map(value => value.trim());
                return data.some(d => find.some(f => FilterString.matchRegex(f, d)))

            case "does not contain":
                data = value.split(",").map(value => value.trim());
                find = filter.split(",").map(value => value.trim());
                return data.every(d => find.every(f => !FilterString.matchRegex(f, d)))

            case "is":
                return FilterString.matchRegex(filter, `^${value}$`);

            case "is not":
                return !FilterString.matchRegex(filter, `^${value}$`);

            case "begins with":
                return FilterString.matchRegex(filter, `^${value}`);

            case "ends with":
                return FilterString.matchRegex(filter, `${value}$`);

            default:
                console.error(`FilterString: Unknown operation '${operation}'`);
        }
    }

    private static matchRegex(filter: string, value: string): boolean {
        // Convert "-" to a space
        filter = filter.replace(/-/g, " ");
        value = value.replace(/-/g, " ");
        // Remove special characters from the find and data string, convert to lowercase
        filter = filter.replace(":", "").toLowerCase();
        value = value.replace(":", "").toLowerCase();
        // Convert every "*" to a regex which matches any single word
        let regex = filter.replace(/(?<=^|\s)\*(?=$|\s)/, "(?<=^|\\s)[^\\s]+?(?=$|\\s)")
        return new RegExp(regex).test(value);
    }
}