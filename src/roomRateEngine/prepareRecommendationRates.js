
const hasMatchingOccupancy = (target, occupancies) => {
    const isMatched = occupancies.find(({ numOfAdults, childAges, numOfChildren }) => {
        if (Number(numOfAdults) !== Number(target.numOfAdults)) return false;

        const targetAges = target.childAges ?? [];
        const currentAges = childAges ?? [];

        if (Array.isArray(target.childAges) && !childAges) {
            return target.childAges.length === 0 && Number(numOfChildren) === 0
        }

        if (targetAges.length !== currentAges.length) return false;

        // Compare as multisets
        const ageCount = new Map();

        for (const age of currentAges) {
            ageCount.set(Number(age), (ageCount.get(Number(age)) || 0) + 1);
        }

        for (const age of targetAges) {
            if (!ageCount.has(Number(age))) return false;
            ageCount.set(Number(age), ageCount.get(Number(age)) - 1);
            if (ageCount.get(Number(age)) === 0) ageCount.delete(Number(age));
        }

        return ageCount.size === 0;
    });
    return isMatched;
};



export const prepareRecommendationJson = ({ occupancy, roomRatesJson }) => {
    if (!roomRatesJson || typeof roomRatesJson !== 'object') throw new Error('Please pass in proper roomRates json');
    const ROOM_RATES_JSON_FINAL = JSON.parse(JSON.stringify(roomRatesJson));

    if (!occupancy || !Array.isArray(occupancy) || !occupancy?.some((i) => i?.numOfAdults > 0)) throw new Error('Occupancy needs to be a array  or should have atleast 1 adult');


    const { rooms: ROOMS, rates: RATES, recommendations: RECOMMENDATIONS, standardizedRooms: STANDARD_ROOM_INFO } = ROOM_RATES_JSON_FINAL;

    const finalRoomRecommendation = new Map();

    occupancy.forEach((currentRequiredOccupancy, idx) => {
        Object.values(RECOMMENDATIONS).forEach((reccomendationItem) => {
            let finalRateOfRecommendation = 0;

            const { id: reccomendationId, rates: ratesArr = [] } = reccomendationItem;

            let isFoundRateId = null;

            let currentOccupancyMatch = null;

            ratesArr?.forEach((rateId) => {
                const rateIdItem = RATES?.[rateId];
                finalRateOfRecommendation += Number(rateIdItem?.finalRate || 0);

                const isOccupancyMatch = hasMatchingOccupancy(currentRequiredOccupancy, rateIdItem?.occupancies)
                if (isOccupancyMatch) {
                    if (finalRoomRecommendation.has(idx)) {
                        const presentMapEntries = finalRoomRecommendation.get(idx);
                        presentMapEntries.set(`${reccomendationId}-${rateId}`, { rateId, reccomendationId, roomId: isOccupancyMatch.roomId, stdRoomId: isOccupancyMatch.stdRoomId })
                        finalRoomRecommendation.set(idx, presentMapEntries)
                    }
                    else {
                        finalRoomRecommendation.set(idx, new Map([[`${reccomendationId}-${rateId}`, { rateId, reccomendationId, roomId: isOccupancyMatch.roomId, stdRoomId: isOccupancyMatch.stdRoomId }]]))

                    }
                    isFoundRateId = rateId
                    currentOccupancyMatch = true;
                }

            });

            if (!currentOccupancyMatch) {
                throw new Error('There is a mismatch');
            }
            else {
                if (isFoundRateId) {
                    const internalMap = finalRoomRecommendation.get(idx)
                    internalMap.set(`${reccomendationId}-${isFoundRateId}`, { ...internalMap.get(`${reccomendationId}-${isFoundRateId}`), finalRateOfRecommendation })
                }
            }

        });

    })

    const sortedReccomendations = new Map(Array.from(finalRoomRecommendation).map(([key, map]) => {
        const finalMap = new Map();
        Array.from(map).sort(([, val1], [val2]) => {
            return val1.finalRateOfRecommendation - val2.finalRateOfRecommendation
        }).forEach(([key, value]) => {
            console.log('valuevaluevalue', value)
            if (finalMap.has(value.stdRoomId)) {
                finalMap.set(value.stdRoomId, [...finalMap.get(value.stdRoomId), value]);
            }
            else {
                finalMap.set(value.stdRoomId, [value]);
            }
        })
        return [key, finalMap]
    }))

    return Object.fromEntries(sortedReccomendations)

}