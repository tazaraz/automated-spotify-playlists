
const FilterSpeechOptions = {
    "Speech": "The music contains speech",
    "No speech": "The music should not contain any speech",
    "Podcast-like": "The music is probably a podcast, talkshow, audio book, etc.",
}

export class FilterSpeech {
    // Contains all the options that this type supports
    public static readonly operation = FilterSpeechOptions;

    /**
     *                  Checks if input matches the set rule
     * @param operation Operation to execute on the input
     * @param filter    Filter to check the for in the input
     * @param input     Input to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterSpeech.operation, input: number): boolean {
        switch (operation) {
            case "Speech":
                return 0.33 <= input && input <= 0.66;

            case "No speech":
                return input < 0.33;

            case "Podcast-like":
                return input > 0.66;

            default:
                throw Error(`Illegal Condition operation "${operation}"`);
        }
    }
}
