/**
 * Attempts to find an occupancy configuration from a rate
 * that matches the required occupancy (adults + children ages),
 * while skipping already-used occupancy indexes.
 *
 * WHY THIS EXISTS:
 * - A single rate can expose multiple occupancy options
 * - Each occupancy option can be consumed only once per recommendation-rate-position
 * - Children ages must match as a multiset (order doesn't matter)
 *
 * @param {Object} requiredOccupancy - Occupancy requested by the user
 * @param {Array<Object>} availableOccupancies - Occupancies exposed by a rate
 * @param {Array<number>} consumedIndexes - Occupancy indexes already used
 *
 * @returns {Object|null} Matched occupancy with its index, or null if none match
 */
const findMatchingOccupancy = (
    requiredOccupancy,
    availableOccupancies,
    consumedIndexes = []
) => {
    const requiredAdultCount = Number(requiredOccupancy.numOfAdults);

    // Normalize required child ages once for cheaper comparisons
    const requiredChildAges = Array.isArray(requiredOccupancy.childAges)
        ? requiredOccupancy.childAges.map(Number)
        : [];

    const matchedIndex = availableOccupancies.findIndex((occ, idx) => {
        // Skip occupancies that were already consumed earlier
        if (consumedIndexes.includes(idx)) return false;

        // Adult count must match exactly
        if (Number(occ.numOfAdults) !== requiredAdultCount) return false;

        const currentChildAges = Array.isArray(occ.childAges)
            ? occ.childAges.map(Number)
            : [];

        /**
         * Edge case:
         * - Requested childAges exists but rate occupancy does not
         * - Valid only when both represent "no children"
         */
        if (Array.isArray(requiredOccupancy.childAges) && !occ.childAges) {
            return requiredChildAges.length === 0 && Number(occ.numOfChildren) === 0;
        }

        // Child count mismatch → cannot be a match
        if (requiredChildAges.length !== currentChildAges.length) return false;

        /**
         * Multiset comparison for child ages
         * WHY:
         * - Order does not matter
         * - Duplicates must be respected (e.g., [5,5] ≠ [5,6])
         */
        const ageFrequencyMap = new Map();

        for (const age of currentChildAges) {
            ageFrequencyMap.set(age, (ageFrequencyMap.get(age) || 0) + 1);
        }

        for (const age of requiredChildAges) {
            const count = ageFrequencyMap.get(age);
            if (!count) return false;

            count === 1
                ? ageFrequencyMap.delete(age)
                : ageFrequencyMap.set(age, count - 1);
        }

        return ageFrequencyMap.size === 0;
    });

    if (matchedIndex === -1) return null;

    // Return matched occupancy + its index for tracking future consumption
    return {
        ...availableOccupancies[matchedIndex],
        idx: matchedIndex
    };
};



/**
 * Builds room recommendations for each requested occupancy.
 *
 * CORE RESPONSIBILITIES:
 * 1. Match each required occupancy with a valid rate occupancy
 * 2. Prevent reusing the same occupancy across rate positions
 * 3. Aggregate total recommendation price
 * 4. Sort recommendations deterministically by price
 *
 * IMPORTANT:
 * - Logic intentionally throws if any occupancy cannot be matched
 * - This keeps the engine strict and avoids silent partial results
 */
export const prepareRecommendationJson = ({
    occupancy,
    roomRatesJson,
    previousSelectedRates = null,
    occupancyIndex = 0
}) => {
    if (!roomRatesJson || typeof roomRatesJson !== 'object') {
        throw new Error('Please pass in proper roomRates json');
    }

    if (
        !Array.isArray(occupancy) ||
        !occupancy.some(o => Number(o?.numOfAdults) > 0)
    ) {
        throw new Error('Occupancy needs to be an array with at least 1 adult');
    }

    // Clone to ensure this function remains side-effect free
    const clonedRatesJson = structuredClone(roomRatesJson);

    const {
        rates: RATES,
        recommendations: RECOMMENDATIONS
    } = clonedRatesJson;

    /**
     * Tracks which occupancy indexes are already consumed
     * Key format:
     *   recommendationId~rateId~ratePosition
     *
     * WHY:
     * - Same rate ID can appear multiple times in a recommendation
     * - Each occurrence must consume a unique occupancy
     */
    const consumedOccupancyTracker = new Map();

    /**
     * Final result structure:
     * Map<occupancyIndex, Map<recommendation-rateKey, recommendationData>>
     */
    const recommendationResult = new Map();

    occupancy.forEach((requiredOccupancy, occIdx) => {
        for (const recommendation of Object.values(RECOMMENDATIONS)) {
            /**
             * Filter recommendations when editing a specific occupancy
             * Ensures previously selected rates remain present
             */
            if (
                occIdx === occupancyIndex &&
                previousSelectedRates &&
                !Object.keys(previousSelectedRates).every(rateId =>
                    recommendation.rates.includes(rateId)
                )
            ) {
                continue;
            }

            let totalRecommendationPrice = 0;
            let matchedRateIdForThisOccupancy = null;

            for (let ratePos = 0; ratePos < recommendation.rates.length; ratePos++) {
                const rateId = recommendation.rates[ratePos];
                const rateData = RATES[rateId];
                if (!rateData) continue;

                // Accumulate price regardless of occupancy matching
                totalRecommendationPrice += Number(rateData.finalRate || 0);

                const trackerKey = `${recommendation.id}~${rateId}~${ratePos}`;
                const alreadyUsedIndexes =
                    consumedOccupancyTracker.get(trackerKey) || [];

                const matchedOccupancy = findMatchingOccupancy(
                    requiredOccupancy,
                    rateData.occupancies,
                    alreadyUsedIndexes
                );

                /**
                 * First valid match wins for this occupancy
                 * Remaining rates only contribute to pricing
                 */
                if (matchedOccupancy && !matchedRateIdForThisOccupancy) {
                    const recommendationEntry = {
                        rateId,
                        reccomendationId: recommendation.id,
                        roomId: matchedOccupancy.roomId,
                        stdRoomId: matchedOccupancy.stdRoomId,
                        finalRateOfRecommendation: totalRecommendationPrice
                    };

                    const occupancyMap =
                        recommendationResult.get(occIdx) || new Map();

                    occupancyMap.set(
                        `${recommendation.id}-${rateId}`,
                        recommendationEntry
                    );

                    recommendationResult.set(occIdx, occupancyMap);

                    consumedOccupancyTracker.set(trackerKey, [
                        ...alreadyUsedIndexes,
                        matchedOccupancy.idx
                    ]);

                    matchedRateIdForThisOccupancy = rateId;
                }
            }

            // Strict failure: a recommendation must satisfy all occupancies
            if (!matchedRateIdForThisOccupancy) {
                throw new Error('There is a mismatch');
            }
        }
    });

    /**
     * Final sorting:
     * 1. Sort by total recommendation price
     * 2. Group by standardized room
     * 3. Lexicographically compare price arrays per room
     */
    const sortedRecommendations = new Map(
        [...recommendationResult].map(([occIdx, recMap]) => {
            const groupedByStdRoom = new Map();

            [...recMap.values()]
                .sort(
                    (a, b) =>
                        a.finalRateOfRecommendation -
                        b.finalRateOfRecommendation
                )
                .forEach(rec => {
                    const list = groupedByStdRoom.get(rec.stdRoomId) || [];
                    list.push(rec);
                    groupedByStdRoom.set(rec.stdRoomId, list);
                });

            const sortedByRoom = new Map(
                [...groupedByStdRoom.entries()].sort(([, a], [, b]) => {
                    const minLen = Math.min(a.length, b.length);
                    for (let i = 0; i < minLen; i++) {
                        if (
                            a[i].finalRateOfRecommendation !==
                            b[i].finalRateOfRecommendation
                        ) {
                            return (
                                a[i].finalRateOfRecommendation -
                                b[i].finalRateOfRecommendation
                            );
                        }
                    }
                    return 0;
                })
            );

            return [occIdx, sortedByRoom];
        })
    );

    return Object.fromEntries(sortedRecommendations);
};



/**
 * Sequential auto-selection wrapper.
 *
 * WHY THIS EXISTS:
 * - Auto-select cheapest valid room per occupancy
 * - Lock selected rates before moving to next occupancy
 * - Produce a single renderable output
 * - Safe to call inside useEffect
 */
export const autoSelectRoomRecommendations = ({
    occupancy,
    roomRatesJson,
    onAutoSelectionDone
  }) => {
    let previousSelectedRates = {};
    const finalRenderableResult = {};
  
    occupancy.forEach((_, occIdx) => {
      const engineOutput = prepareRecommendationJson({
        occupancy,
        roomRatesJson,
        previousSelectedRates,
        occupancyIndex: occIdx
      });
  
      const stdRoomMap = engineOutput[occIdx];
  
      // ✅ STORE FULL STRUCTURE (THIS WAS MISSING)
      finalRenderableResult[occIdx] = stdRoomMap;
  
      // 🔒 ONLY use cheapest for locking
      const [[, cheapestRoomArr]] = stdRoomMap.entries();
      const cheapestSelection = cheapestRoomArr[0];
  
      previousSelectedRates = {
        ...previousSelectedRates,
        [cheapestSelection.rateId]:
          (previousSelectedRates[cheapestSelection.rateId] || 0) + 1
      };
    });
  
    onAutoSelectionDone?.(finalRenderableResult);
  };
  


