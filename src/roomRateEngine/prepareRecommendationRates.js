
const hasMatchingOccupancy = (target, occupancies, skipList = [], rateCounter) => {
    const isMatched = occupancies.findIndex(({ numOfAdults, childAges, numOfChildren }, idx) => {
        if (skipList.includes(idx)) return false;
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
    if (isMatched !== -1) {
        return {
            ...occupancies[isMatched],
            idx: isMatched
        }
    }
    return null;
};



export const prepareRecommendationJson = ({ occupancy, roomRatesJson, previousSelectedRates = null, occupancyIndex = 0 }) => {
    if (!roomRatesJson || typeof roomRatesJson !== 'object') throw new Error('Please pass in proper roomRates json');
    const ROOM_RATES_JSON_FINAL = JSON.parse(JSON.stringify(roomRatesJson));

    if (!occupancy || !Array.isArray(occupancy) || !occupancy?.some((i) => i?.numOfAdults > 0)) throw new Error('Occupancy needs to be a array  or should have atleast 1 adult');


    const { rooms: ROOMS, rates: RATES, recommendations: RECOMMENDATIONS, standardizedRooms: STANDARD_ROOM_INFO } = ROOM_RATES_JSON_FINAL;

    const usedRateCounter = new Map();

    const finalRoomRecommendation = new Map();

    occupancy.forEach((currentRequiredOccupancy, idx) => {

        Object.values(RECOMMENDATIONS).filter((reccItem) => {
            if (occupancyIndex !== idx) {
                return true;
            }
            if (!previousSelectedRates) {
                return true;
            }
            else {
                const allRatesPresent = Object.keys(previousSelectedRates).every((rateKey) => reccItem.rates.includes(rateKey));
                return allRatesPresent
                // else {
                //     const countMap = new Map();
                //     for (let i = 0; i < reccItem.rates.length; i++) {
                //         countMap.set(reccItem.rates[i], (countMap.get(reccItem.rates[i]) || 0) + 1)
                //     }
                //     return Object.entries(previousSelectedRates).every(([rateId, count]) => {
                //         if (countMap.has(rateId)) {
                //             const getRateCount = countMap.get(rateId);
                //             if (getRateCount >= count) {
                //                 return true;
                //             }
                //             return false

                //         }
                //         return false;
                //     })
                // }

            }


        }).forEach((reccomendationItem) => {

            let finalRateOfRecommendation = 0;

            const { id: reccomendationId, rates: ratesArr = [] } = reccomendationItem;

            let isFoundRateId = null;

            let currentOccupancyMatch = null;

            ratesArr?.forEach((rateId, rateIdx) => {
                const rateIdItem = RATES?.[rateId];
                finalRateOfRecommendation += Number(rateIdItem?.finalRate || 0);

                // const isNotConsumedRateOcc = () => {

                //     if (usedRateCounter.has(`${reccomendationId}~${rateId}~${rateIdx}`)) {
                //         console.log('coming hereee', `${reccomendationId}~${rateId}~${rateIdx}`)
                //         const consumedRateOccList = usedRateCounter.get(`${reccomendationId}~${rateId}~${rateIdx}`);
                //         if (consumedRateOccList.includes(getOccupancyMatchingData.idx)) {
                //             return true;
                //         }
                //         return false;
                //     }
                //     return false;
                // }


                const getOccupancyMatchingData = hasMatchingOccupancy(currentRequiredOccupancy, rateIdItem?.occupancies, usedRateCounter.get(`${reccomendationId}~${rateId}~${rateIdx}`) || [], usedRateCounter);

                const isOccupancyMatch = getOccupancyMatchingData


                if (isOccupancyMatch && !currentOccupancyMatch) {
                    if (finalRoomRecommendation.has(idx)) {
                        const presentMapEntries = finalRoomRecommendation.get(idx);
                        presentMapEntries.set(`${reccomendationId}-${rateId}`, { rateId, reccomendationId, roomId: getOccupancyMatchingData.roomId, stdRoomId: getOccupancyMatchingData.stdRoomId })
                        finalRoomRecommendation.set(idx, presentMapEntries)
                    }
                    else {
                        finalRoomRecommendation.set(idx, new Map([[`${reccomendationId}-${rateId}`, { rateId, reccomendationId, roomId: getOccupancyMatchingData.roomId, stdRoomId: getOccupancyMatchingData.stdRoomId }]]))

                    }
                    if (usedRateCounter.has(`${reccomendationId}~${rateId}~${rateIdx}`)) {
                        usedRateCounter.set(`${reccomendationId}~${rateId}~${rateIdx}`, [...usedRateCounter.get(`${reccomendationId}~${rateId}~${rateIdx}`), getOccupancyMatchingData.idx])
                    }
                    else {
                        usedRateCounter.set(`${reccomendationId}~${rateId}~${rateIdx}`, [getOccupancyMatchingData.idx])
                    }
                    isFoundRateId = rateId
                    currentOccupancyMatch = true;
                }

            });

            // console.log('usedRateCounterusedRateCounter', usedRateCounter)

            if (!currentOccupancyMatch) {
                console.log('this was the error', reccomendationItem, usedRateCounter)
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
            if (finalMap.has(value.stdRoomId)) {
                finalMap.set(value.stdRoomId, [...finalMap.get(value.stdRoomId), value]);
            }
            else {
                finalMap.set(value.stdRoomId, [value]);
            }
        })
        const lastMap = new Map(Array.from(finalMap).sort(([key1, itemA], [key2, itemB]) => {
            const minLen = Math.min(itemA.length, itemB.length)

            for (let i = 0; i < minLen; i++) {
                if (itemA[i].finalRateOfRecommendation < itemB[i].finalRateOfRecommendation) return -1;
                if (itemA[i].finalRateOfRecommendation > itemB[i].finalRateOfRecommendation) return 1

            }
            return 0;
        }));
        return [key, lastMap]
    }))

    console.log('usedRateCounterusedRateCounter', usedRateCounter)

    return Object.fromEntries(sortedReccomendations)

}