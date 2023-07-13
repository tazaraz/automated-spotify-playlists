import FilterLog from "../stores/filterlog";
import Fetch from "../tools/fetch";
import { FilterParserOptions } from "../types/descriptions";
import { Filters } from "../types/filters";
import { PlaylistCondition, PlaylistStatement } from "../types/playlist";
import { FilterItem, STrack, SUser } from "../types/server";
import { Track } from "./filters";
import { FilterBoolean } from "./matching/boolean";

export default class FilterParser {
    public static readonly mode = FilterParserOptions;

    /**
     *                  Checks if input matches the set rules.
     * @param statement The main smart playlist operation wrapper
     * @param input     Input to check
     * @returns         Whether the rule is matched
     */
    public static async process(statement: PlaylistStatement,
                                input: FilterItem[],
                                user: SUser,
                                log: FilterLog,
                                dryrun=false): Promise<FilterItem[]> {
        let result: FilterItem[];

        // If the user specified no filters at all
        if (statement.filters.length === 0) {
            result = input
            log.filters.push("No filters specified");
        } else {
            result = await FilterParser.checkStatement(statement, input, user, log, dryrun);
        }

        // Convert the FilterItems to STracks and flatten (FilterItem can always map to a STrack[])
        const tracks = ([] as STrack[]).concat(...await Promise.all(result.map(item => Track.convert(item))))
              tracks.forEach(item => (item as FilterItem).kind = "track")

        log.filters.push(`Converted ${result.length} items to ${tracks.length} tracks`)

        // Now they are STracks but stored as a FilterItem
        return tracks as FilterItem[]
    }

    /**
     *                  Checks if the operation is valid
     * @param statement An statement
     * @param input     The input specified
     * @param log       nD log array
     */
    private static async checkStatement(statement: PlaylistStatement,
                                        input: FilterItem[],
                                        user: SUser,
                                        log: FilterLog,
                                        dryrun=false
    ): Promise<FilterItem[]>{
        // If the filter is not an object or does not have the required entries
        if (!FilterParser.isStatement(statement))
            throw Error("Invalid playlist statement")

        // Store the matches and original input
        const matches = {} as { [key: string]: FilterItem },
              original = input;

        let result: FilterItem[] | undefined;

        for (const f of statement.filters){
            // If the filter is an statement
            if ((f as PlaylistCondition).value === undefined){
                // the loop again
                const result = await FilterParser.checkStatement(
                    f as PlaylistStatement,
                    input,
                    user,
                    log,
                    dryrun
                );

                log.filters.push(`Statement filtered ${result.length} of ${input.length} items (change: ${result.length - input.length})`);

                // Pipe it into the output set. The correct action will be taken after the for loop
                result.forEach(track => matches[track.id] = track);
            } else {
                // Execute the filter
                result = await FilterParser.checkCondition(
                    f as PlaylistCondition,
                    input,
                    user,
                    log,
                    dryrun
                )

                if (result === undefined)
                    continue

                log.filters.push(`Filter matched ${result.length} of ${input.length} items (change: ${result.length - input.length})`);

                /**Otherwise pipe the output into the next input, in effect filtering out all
                 * which do not match, leaving the ones who do */
                switch (statement.mode) {
                    // If only one filter needs be true
                    case "any":
                        // Save all those who matched the filter, as only one filter needs be true
                        result.forEach(track => matches[track.id] = track);
                        break;

                    case "all":
                    case "none":
                        // If the filter actually did anything
                        input = result;
                        break;

                    // Someone tried funky business with the filter
                    default:
                        throw Error(`Illegal Statement operation "${statement.mode}"`);
                }
            }
        }

        switch (statement.mode) {
            case "any":
                break;

            case "all":
                // Pipe it into the output set
                input.forEach(track => matches[track.id] = track);
                break;

            case "none":
                // Original - matches = non-matches
                original.forEach(track => { if (!input.includes(track)) matches[track.id] = track });
        }

        return Object.values(matches);
    }

    /**
     *                  Checks whether the input is valid
     * @param condition The condition
     * @param input     The input to be checked
     * @returns         Whether the condition rule is valid on the given input
     */
    private static async checkCondition(condition: PlaylistCondition,
                                        input: FilterItem[],
                                        user: SUser,
                                        log: FilterLog,
                                        dryrun=false): Promise<FilterItem[] | undefined> {
        if (!FilterParser.isCondition(condition))
            throw Error("Invalid playlist condition")

        // Someone tried funky business with the condition
        if (!Filters.hasOwnProperty(condition.category) ||
           (Filters as any)[condition.category][condition.filter] === undefined){
            throw Error(`Unknown filter "${condition.category}.${condition.filter}"`)
        }

        if (`${condition.category} ${condition.filter}` == "Track is Loved") {
            if (dryrun) return input

            // Store the loved status of each track
            const loved: boolean[] = []
            // Convert each FilterItem to a STrack and convert and store it again as FilterItem
            const tracks = (await Promise.all(input.map(item => Track.convert(item)))).flat() as FilterItem[]
            tracks.forEach(item => (item as FilterItem).kind = "track")



            for (let i = 0; i < tracks.length; i += 50) {
                // Spotify endpoint to check if a track is loved
                const response = await Fetch.get<boolean[]>('/me/tracks/contains', {
                    user,
                    ids: tracks.slice(i, i + 50).map(track => track.id),
                })

                // Store more of the info
                loved.push(...response.data)
            }

            // Filter out the tracks which are loved
            const loved_tracks = tracks.filter((_, i) => FilterBoolean.matches(condition.operation as keyof typeof FilterBoolean.operation, loved[i]))

            log.filters.push(`Is loved check present. Converted ${input.length} items to ${tracks.length} tracks and checked if they were loved, leaving ${loved_tracks.length} tracks.`)

            return loved_tracks
        } else {
            return (await (Filters as any)[condition.category][condition.filter]
                    .filter(input, condition.operation, condition.value, dryrun)) as FilterItem[];
        }
    }

    private static isStatement(statement: PlaylistStatement): statement is PlaylistStatement {
        return statement.mode !== undefined && statement.filters !== undefined
    }

    private static isCondition(condition: PlaylistCondition): condition is PlaylistCondition {
        return condition.category !== undefined &&
               condition.filter !== undefined &&
               condition.operation !== undefined &&
               condition.value !== undefined;
    }
}