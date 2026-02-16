import {
  checkIsValidArray,
  checkIsValidObject,
  sortArr,
  sortStandardRoomMapsRooms,
} from './commons.js';

export const sortStandardRoomsOverall = (standardMap) => {
  const finalStandardRoomMap = new Map();

  const minimumPricedRateArrFromEachRoomStandard = standardMap
    .values()
    .reduce((prev, curr) => {
      prev.push(curr.rooms[0]);
      return prev;
    }, []);

  const sortRoomStandarsToShowLowestPrices = sortArr(
    minimumPricedRateArrFromEachRoomStandard,
    'currentRatePrice'
  );

  sortRoomStandarsToShowLowestPrices.forEach(({ stdRoomId }) => {
    finalStandardRoomMap.set(stdRoomId, standardMap.get(stdRoomId));
  });

  return finalStandardRoomMap;
};

export const deepCheckIfOccupancyAreSame = (
  currentOccupancy,
  userSelectedOccupancy,
  rateId
) => {
  const areAdultsAMatch =
    Number(currentOccupancy.numOfAdults) ===
    Number(userSelectedOccupancy.numOfAdults);
  const arechildAgesaMatch =
    Number(userSelectedOccupancy.childAges.length) ===
    Number(currentOccupancy.numOfChildren);

  const userSelectedOccupancyArrChildAges =
    userSelectedOccupancy.childAges.map(Number);

  const currentOccupancyArrChildAges = (currentOccupancy.childAges || []).map(
    Number
  );
  console.log(
    'Deepasdsadad',
    rateId,
    currentOccupancy,
    userSelectedOccupancy,
    userSelectedOccupancyArrChildAges,
    currentOccupancyArrChildAges
  );

  const childAgesArrDeepMatch = userSelectedOccupancyArrChildAges.every(
    (childAge) => {
      const findIndexOfCurrentChildAge = currentOccupancyArrChildAges.findIndex(
        (age) => age === childAge
      );
      if (findIndexOfCurrentChildAge !== -1) {
        currentOccupancyArrChildAges.splice(findIndexOfCurrentChildAge, 1);
        return true;
      }
      return false;
    }
  );
  return areAdultsAMatch && arechildAgesaMatch && childAgesArrDeepMatch;
};

export const getCurrentPriceForRecommendation = (
  ratesArr,
  zentrumHubRoomRates
) => {
  if (checkIsValidArray(ratesArr)) {
    return ratesArr.reduce((prev, curr) => {
      const ratesObj = zentrumHubRoomRates[curr];
      prev += Number(ratesObj.finalRate);
      return prev;
    }, 0);
  }
};

export const getRoomsRecommendation = (props) => {
  const {
    userOccupancyArr = [],
    roomsApiData = {},
    currentRoomSelectionIndex = 0,
    alreadySelectedRate = [],
  } = props;

  console.log('propspropsprops', props);

  const apiResults = roomsApiData?.results;

  if (checkIsValidArray(apiResults)) {
    const apiResultsData = apiResults[0].data;

    if (checkIsValidArray(apiResultsData)) {
      const apiResultsDataExtractFirstValueOfArr =
        apiResultsData[0].roomRate[0];

      if (checkIsValidObject(apiResultsDataExtractFirstValueOfArr)) {
        const ZENTRUM_HUB = {
          ZENTRUMHUB_RECCOMMENDATIONS:
            apiResultsDataExtractFirstValueOfArr.recommendations,
          ZENTRUMHUB_RATES: apiResultsDataExtractFirstValueOfArr.rates,

          ZENTRUMHUB_ROOMS: apiResultsDataExtractFirstValueOfArr.rooms,

          ZENTRUMHUB_STANDARDIZED_ROOMS:
            apiResultsDataExtractFirstValueOfArr.standardizedRooms,
        };

        if (checkIsValidArray(userOccupancyArr)) {
          const currentOccupancyToSatisfy =
            userOccupancyArr[currentRoomSelectionIndex];

          const standardRoomMap = new Map();

          if (checkIsValidObject(ZENTRUM_HUB.ZENTRUMHUB_RECCOMMENDATIONS)) {
            const recommedationsArr = Object.values(
              ZENTRUM_HUB.ZENTRUMHUB_RECCOMMENDATIONS
            );

            recommedationsArr.forEach((recomendationObj) => {
              const ratesInCurrentRecommendations =
                recomendationObj.rates || [];

              const doesCurrentRecommendationHavePreviouslySelectedRate =
                alreadySelectedRate.every((alreadySlectedRateId) =>
                  ratesInCurrentRecommendations.includes(alreadySlectedRateId)
                );
              if (doesCurrentRecommendationHavePreviouslySelectedRate) {
                ratesInCurrentRecommendations.forEach((ratesId) => {
                  const foundRateObjectFromRatesObj =
                    ZENTRUM_HUB.ZENTRUMHUB_RATES[ratesId];

                  if (checkIsValidObject(foundRateObjectFromRatesObj)) {
                    const occupancyArrInsideFoundRateObj =
                      foundRateObjectFromRatesObj.occupancies;

                    if (checkIsValidArray(occupancyArrInsideFoundRateObj)) {
                      occupancyArrInsideFoundRateObj.forEach((occupancyObj) => {
                        const isCurrentRateMatchingTheOccupancy =
                          deepCheckIfOccupancyAreSame(
                            occupancyObj,
                            currentOccupancyToSatisfy,
                            ratesId
                          );

                        if (isCurrentRateMatchingTheOccupancy) {
                          if (standardRoomMap.has(occupancyObj.stdRoomId)) {
                            const standardRoomMapObj = standardRoomMap.get(
                              occupancyObj.stdRoomId
                            );
                            const currentRatePrice =
                              getCurrentPriceForRecommendation(
                                ratesInCurrentRecommendations,
                                ZENTRUM_HUB.ZENTRUMHUB_RATES
                              );

                            const roomObj = {
                              ...ZENTRUM_HUB.ZENTRUMHUB_ROOMS[
                                occupancyObj.roomId
                              ],
                              currentRatePrice,
                              roomId: occupancyObj.roomId,
                              rateId: foundRateObjectFromRatesObj.id,
                              recommedationId: recomendationObj.id,
                              stdRoomId: occupancyObj.stdRoomId,
                            };
                            const rooms = [
                              ...standardRoomMapObj.rooms,
                              roomObj,
                            ];

                            const storedObj = {
                              ...standardRoomMapObj,
                              rooms,
                            };
                            standardRoomMap.set(
                              occupancyObj.stdRoomId,
                              storedObj
                            );
                          } else {
                            const name =
                              ZENTRUM_HUB.ZENTRUMHUB_STANDARDIZED_ROOMS[
                                occupancyObj.stdRoomId
                              ].name || '';

                            const images =
                              ZENTRUM_HUB.ZENTRUMHUB_STANDARDIZED_ROOMS[
                                occupancyObj.stdRoomId
                              ].images || [];

                            const facilitiesInRoom =
                              ZENTRUM_HUB.ZENTRUMHUB_STANDARDIZED_ROOMS[
                                occupancyObj.stdRoomId
                              ].facilities || [];

                            const currentRatePrice =
                              getCurrentPriceForRecommendation(
                                ratesInCurrentRecommendations,
                                ZENTRUM_HUB.ZENTRUMHUB_RATES
                              );

                            const roomObj = {
                              ...ZENTRUM_HUB.ZENTRUMHUB_ROOMS[
                                occupancyObj.roomId
                              ],
                              currentRatePrice,
                              roomId: occupancyObj.roomId,
                              rateId: foundRateObjectFromRatesObj.id,
                              recommedationId: recomendationObj.id,
                              stdRoomId: occupancyObj.stdRoomId,
                            };
                            standardRoomMap.set(occupancyObj.stdRoomId, {
                              name,
                              images,
                              facilitiesInRoom,
                              rooms: [roomObj],
                            });
                          }
                        }
                      });
                    }
                  }
                });
              }
            });
          }

          sortStandardRoomMapsRooms(standardRoomMap);

          const finalRoomMap = sortStandardRoomsOverall(standardRoomMap);

          console.log(
            'standardRoomMapstandardRoomMapstandardRoomMap',
            standardRoomMap,
            finalRoomMap
          );
        }
      }
    }
  }
};
