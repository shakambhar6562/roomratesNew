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
  consumedIndexes = [],
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
    idx: matchedIndex,
  };
};

/**
 * Builds room recommendations for a SINGLE occupancy.
 *
 * CORE RESPONSIBILITIES:
 * 1. Match required occupancy with valid rate occupancies
 * 2. Prevent reuse of the same occupancy per rate-position
 * 3. Aggregate total recommendation price
 * 4. Sort deterministically (engine invariant)
 *
 * IMPORTANT:
 * - Throws if no valid recommendation exists
 * - Pure function
 */
export const prepareRecommendationForOccupancy = ({
  occupancy,
  roomRatesJson,
  lockedRates = {},
}) => {
  if (!roomRatesJson || typeof roomRatesJson !== "object") {
    throw new Error("Please pass in proper roomRates json");
  }

  if (!occupancy || Number(occupancy?.numOfAdults) <= 0) {
    throw new Error("Invalid occupancy");
  }

  const clonedRatesJson = structuredClone(roomRatesJson);
  const { rates: RATES, recommendations: RECOMMENDATIONS } = clonedRatesJson;

  const consumedOccupancyTracker = new Map();
  const recommendationMap = new Map();

  for (const recommendation of Object.values(RECOMMENDATIONS)) {
    // 🔒 Respect locked rates
    if (
      lockedRates &&
      !Object.keys(lockedRates).every((rateId) =>
        recommendation.rates.includes(rateId),
      )
    ) {
      continue;
    }

    let totalRecommendationPrice = 0;
    let matchedRateId = null;

    for (let ratePos = 0; ratePos < recommendation.rates.length; ratePos++) {
      const rateId = recommendation.rates[ratePos];
      const rateData = RATES[rateId];
      if (!rateData) continue;

      totalRecommendationPrice += Number(rateData.finalRate || 0);

      const trackerKey = `${recommendation.id}~${rateId}~${ratePos}`;
      const usedIndexes = consumedOccupancyTracker.get(trackerKey) || [];

      const matchedOccupancy = findMatchingOccupancy(
        occupancy,
        rateData.occupancies,
        usedIndexes,
      );

      if (matchedOccupancy && !matchedRateId) {
        recommendationMap.set(`${recommendation.id}-${rateId}`, {
          rateId,
          reccomendationId: recommendation.id,
          roomId: matchedOccupancy.roomId,
          stdRoomId: matchedOccupancy.stdRoomId,
          finalRateOfRecommendation: totalRecommendationPrice,
        });

        consumedOccupancyTracker.set(trackerKey, [
          ...usedIndexes,
          matchedOccupancy.idx,
        ]);

        matchedRateId = rateId;
      }
    }

    if (!matchedRateId) {
      throw new Error("There is a mismatch");
    }
  }

  /**
   * SORTING (ENGINE GUARANTEE)
   * - Cheapest standardized room comes first
   * - Cheapest recommendation comes first inside it
   */
  const groupedByStdRoom = new Map();

  [...recommendationMap.values()]
    .sort((a, b) => a.finalRateOfRecommendation - b.finalRateOfRecommendation)
    .forEach((rec) => {
      const list = groupedByStdRoom.get(rec.stdRoomId) || [];
      list.push(rec);
      groupedByStdRoom.set(rec.stdRoomId, list);
    });

  return new Map(
    [...groupedByStdRoom.entries()].sort(([, a], [, b]) => {
      const minLen = Math.min(a.length, b.length);
      for (let i = 0; i < minLen; i++) {
        if (a[i].finalRateOfRecommendation !== b[i].finalRateOfRecommendation) {
          return (
            a[i].finalRateOfRecommendation - b[i].finalRateOfRecommendation
          );
        }
      }
      return 0;
    }),
  );
};

/**
 * Sequential auto-selection orchestrator.
 *
 * WHY THIS IS POWERFUL:
 * - Works occupancy-by-occupancy
 * - Supports manual override naturally
 * - No engine hacks
 * - Deterministic and debuggable
 */
export const autoSelectRoomRecommendations = ({
  occupancy,
  roomRatesJson,
  onAutoSelectionDone,
}) => {
  const finalRenderableResult = {};
  let lockedRates = {};

  occupancy.forEach((occ, occIdx) => {
    const stdRoomMap = prepareRecommendationForOccupancy({
      occupancy: occ,
      roomRatesJson,
      lockedRates,
    });

    // ✅ Store full structure for UI
    finalRenderableResult[occIdx] = stdRoomMap;

    // 🔒 Lock cheapest (engine invariant)
    const [[, cheapestRoomList]] = stdRoomMap.entries();
    const cheapest = cheapestRoomList[0];

    lockedRates = {
      ...lockedRates,
      [cheapest.rateId]: (lockedRates[cheapest.rateId] || 0) + 1,
    };
  });

  onAutoSelectionDone?.(finalRenderableResult);
};
