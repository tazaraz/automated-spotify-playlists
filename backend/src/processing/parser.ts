import { THROW_DEBUG_ERROR } from "../main";
import FilterTask from "../stores/filtertask";
import Fetch from "../tools/fetch";
import { Filters } from "../shared/types/filters";
import { PlaylistCondition, PlaylistStatement } from "../shared/types/playlist";
import { FilterItem, STrack, SUser } from "../shared/types/server";
import { FilterParserOptions } from "../shared/types/descriptions";
import { Track } from "./filters";
import { FilterBoolean } from "../shared/matching/boolean";
import { ProcessLevel } from ".";

export default class FilterParser {
    public static readonly mode = FilterParserOptions;

    /**
     *                  Finds filteritems match which the set rules.
     * @param statement The main automated playlist operation wrapper
     * @param items     Filteritems to check
     * @returns         Whether the rule is matched
     */
    public static async process(statement: PlaylistStatement,
                                items: FilterItem<any>[],
                                user: SUser,
                                task: FilterTask) {
        let result: FilterItem<any>[];

        // If the user specified no filters at all
        if (statement.filters.length === 0) {
            result = items
            task.log.filters.push("No filters specified");
        } else {
            result = await FilterParser.checkStatement(statement, items, user, task);
        }

        // Convert the FilterItems to STracks and flatten (FilterItem can always map to a STrack[])
        const tracks: FilterItem<STrack>[] = (await Promise.all(result.map(item => Track.convert(item)))).flat()
              tracks.forEach(item => (item as FilterItem<STrack>).kind = "track")

        task.log.filters.push(`Converted ${result.length} item${result.length == 1 ? '' : 's'} to ${tracks.length} track${tracks.length == 1 ? '' : 's'}`)

        // Now they are STracks but stored as a FilterItem
        return tracks;
    }

    /**
     *                  Parses a statement and returns the result
     * @param statement An statement
     * @param items     Filteritems to check
     * @param log       nD log array
     */
    private static async checkStatement(statement: PlaylistStatement,
                                        items: FilterItem<any>[],
                                        user: SUser,
                                        task: FilterTask
    ): Promise<FilterItem<any>[]>{
        // If the filter is not an object or does not have the required entries
        if (!FilterParser.isStatement(statement)) {
            task.log.filters.push(`Invalid statement: ${JSON.stringify(statement)}`)
            THROW_DEBUG_ERROR(`Invalid statement: ${JSON.stringify(statement)}`);
            return [];
        }

        // Store the matches and original input
        const matches = {} as { [key: string]: FilterItem<any> },
              original = items;

        let input = items;
        let result: FilterItem<any>[] | undefined;

        for (const f of statement.filters){
            // If the filter is an statement
            if ((f as PlaylistCondition).value === undefined){
                // the loop again
                task.log.filters.push(`Start Statement (${String((f as PlaylistStatement).mode)})`)
                result = await FilterParser.checkStatement(
                    f as PlaylistStatement,
                    input,
                    user,
                    task
                );

                task.log.filters.push(`End Statement: matched ${result.length}`);
            } else {
                // Execute the filter
                result = await FilterParser.checkCondition(
                    f as PlaylistCondition,
                    input,
                    user,
                    task
                )
                if (result === undefined)
                    continue;

                // Count the kinds of FilterItems
                const counts = {} as {[key: string]: number}
                result.forEach(item => counts[item.kind] = (counts[item.kind] || 0) + 1)

                task.log.filters.push(`Filter '${(f as any).category} ${(f as any).filter}' matched ${result.length}`);
            }

            /**Otherwise pipe the output into the next input, in effect filtering out all
             * which do not match, leaving the ones who do */
            switch (statement.mode) {
                // If only one filter needs be true
                case "any":
                    // Save all those who matched the filter, as only one filter needs be true
                    result.forEach(track => matches[track.id] = track);
                    break;

                case "all":
                    // If the filter actually did anything
                    input = [...result];
                    break;

                case "none":
                    // If the filter actually did anything
                    input = input.filter(track => !result.includes(track));
                    break;

                // Someone tried funky business with the filter
                default:
                    task.log.filters.push(`Illegal Statement operation "${String(statement.mode)}"`);
                    THROW_DEBUG_ERROR(`Illegal Statement operation "${String(statement.mode)}"`);
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
                                        input: FilterItem<any>[],
                                        user: SUser,
                                        task: FilterTask): Promise<FilterItem<any>[] | undefined> {
        if (!FilterParser.isCondition(condition)) {
            task.log.filters.push(`Invalid condition: ${JSON.stringify(condition)}`)
            THROW_DEBUG_ERROR(`Invalid condition: ${JSON.stringify(condition)}`);
        }

        // Someone tried funky business with the condition
        if (!Filters.hasOwnProperty(condition.category) ||
           (Filters as any)[condition.category][condition.filter] === undefined){
            task.log.filters.push(`Illegal Condition category "${condition.category}" or filter "${condition.filter}"`)
            THROW_DEBUG_ERROR(`Illegal Condition category "${condition.category}" or filter "${condition.filter}"`);
        }

        if (`${condition.category} ${condition.filter}` == "Track is Loved") {
            if (task.plevel == ProcessLevel.DRY_RUN) return input

            // Store the loved status of each track
            const loved: {[id: string]: boolean} = {}
            // Convert each FilterItem to a STrack and convert and store it again as FilterItem
            const tracks = (await Promise.all(input.map(item => Track.convert(item)))).flat() as FilterItem<any>[]
            tracks.forEach(item => (item as FilterItem<any>).kind = "track")

            for (let i = 0; i < tracks.length; i += 20) {
                // ids get sorted in Fetch. This is important as the response relative to the input.
                const ids = tracks.slice(i, i + 20).map(track => track.id).sort()
                // Spotify endpoint to check if a track is loved
                const response = await Fetch.get<boolean[]>('/me/tracks/contains', { user, ids })

                // Store more of the info
                ids.forEach((id, j) => loved[id] = response.data[j])
            }

            // Filter out the ids from loved which do not match the condition
            const loved_tracks = tracks.filter((_, i) => FilterBoolean.matches(condition.operation as keyof typeof FilterBoolean.operation, loved[tracks[i].id]))

            task.log.filters.push(`Is loved check present. Converted ${input.length} items to ${tracks.length} tracks and checked if they were loved, leaving ${loved_tracks.length} tracks.`)

            return loved_tracks
        } else {
            return (await Filters[condition.category][condition.filter]
                    .filter(input, condition.operation, condition.value, task)) as FilterItem<any>[];
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