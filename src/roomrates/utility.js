export const checkIsValidArray = (arr) => {
  return Array.isArray(arr) && arr.length > 0;
};

export const checkIsValidObject = (obj) => {
  return (
    !Array.isArray(obj) &&
    obj !== null &&
    typeof obj === 'object' &&
    Object.keys(obj).length > 0
  );
};

export const sortStandardRoomMapsRooms = (standardMap) => {
  standardMap.forEach((value, key) => {
    const roomsArr = value.rooms || [];
    const newSortedRoomsOnprice = roomsArr.toSorted(
      (a, b) => a.currentRatePrice - b.currentRatePrice
    );
    standardMap.set(key, {
      ...value,
      rooms: newSortedRoomsOnprice,
    });
  });
};

export const sortStandardRoomsOverall = (standardMap) => {
  const finalStandardRoomMap = new Map();
  const arr = [];
  standardMap.forEach((value, key) => {
    arr.push(value.rooms[0]);
  });

  const sortOrder = arr.toSorted(
    (a, b) => a.currentRatePrice - b.currentRatePrice
  );

  sortOrder.forEach(({ stdRoomId }) => {
    finalStandardRoomMap.set(stdRoomId, standardMap.get(stdRoomId));
  });

  return finalStandardRoomMap;
};

export const deepCheckIfOccupancyAreSame = (
  currentOccupancy,
  userSelectedOccupancy
) => {
  const areAdultsAMatch =
    Number(currentOccupancy.numOfAdults) ===
    Number(userSelectedOccupancy.numOfAdults);
  const arechildAgesaMatch =
    Number(userSelectedOccupancy.childAges.length) ===
    Number(currentOccupancy.numOfChildren);

  console.log(
    'deepCheckIfOccupancyAreSame',

    {
      currentOccupancy,
      userSelectedOccupancy,
    }
  );

  const userSelectedOccupancyArrChildAges =
    userSelectedOccupancy.childAges.map(Number);

  const currentOccupancyArrChildAges = (currentOccupancy.childAges || []).map(
    Number
  );

  const childAgesArrDeepMatch = userSelectedOccupancyArrChildAges.every(
    (childAge) => {
      const findIndexOfCurrentChildAge = currentOccupancyArrChildAges.findIndex(
        (age) => age === childAge
      );
      if (findIndexOfCurrentChildAge !== -1) {
        currentOccupancyArrChildAges.splice(findIndexOfCurrentChildAge, 1);
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
  const { occupancyArr = [], roomsApiData = {}, currentRoomIndex = 0 } = props;
  const apiResults = roomsApiData?.results;
  if (checkIsValidArray(apiResults)) {
    const apiResultsData = apiResults[0].data;
    if (checkIsValidArray(apiResultsData)) {
      const apiResultsDataExtractFirstValueOfArr =
        apiResultsData[0].roomRate[0];

      if (checkIsValidObject(apiResultsDataExtractFirstValueOfArr)) {
        const zentrumHubRoomRecommendations =
          apiResultsDataExtractFirstValueOfArr.recommendations;
        const zentrumHubRoomRates = apiResultsDataExtractFirstValueOfArr.rates;
        const zentrumHubRooms = apiResultsDataExtractFirstValueOfArr.rooms;
        const zentrumHubStandardizedRooms =
          apiResultsDataExtractFirstValueOfArr.standardizedRooms;

        if (checkIsValidArray(occupancyArr)) {
          const currentOccupancyToSatisfy = occupancyArr[currentRoomIndex];

          const standardRoomMap = new Map();

          if (checkIsValidObject(zentrumHubRoomRecommendations)) {
            const recommedationsArr = Object.values(
              zentrumHubRoomRecommendations
            );

            recommedationsArr.forEach((recomendationObj) => {
              const ratesInCurrentRecommendations =
                recomendationObj.rates || [];

              ratesInCurrentRecommendations.forEach((ratesId) => {
                const foundRateObjectFromRatesObj =
                  zentrumHubRoomRates[ratesId];
                if (checkIsValidObject(foundRateObjectFromRatesObj)) {
                  const occupancyArrInsideFoundRateObj =
                    foundRateObjectFromRatesObj.occupancies;

                  console.log(
                    'propsss',
                    props,
                    apiResultsDataExtractFirstValueOfArr
                  );

                  if (checkIsValidArray(occupancyArrInsideFoundRateObj)) {
                    occupancyArrInsideFoundRateObj.forEach((occupancyObj) => {
                      const isCurrentRateMatchingTheOccupancy =
                        deepCheckIfOccupancyAreSame(
                          occupancyObj,
                          currentOccupancyToSatisfy
                        );
                      if (isCurrentRateMatchingTheOccupancy) {
                        if (standardRoomMap.has(occupancyObj.stdRoomId)) {
                          const standardRoomMapObj = standardRoomMap.get(
                            occupancyObj.stdRoomId
                          );
                          const currentRatePrice =
                            getCurrentPriceForRecommendation(
                              ratesInCurrentRecommendations,
                              zentrumHubRoomRates
                            );

                          const roomObj = {
                            ...zentrumHubRooms[occupancyObj.roomId],
                            stdRoomId: occupancyObj.stdRoomId,
                            currentRatePrice,
                          };
                          const rooms = [...standardRoomMapObj.rooms, roomObj];

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
                            zentrumHubStandardizedRooms[occupancyObj.stdRoomId]
                              .name || '';
                          const images =
                            zentrumHubStandardizedRooms[occupancyObj.stdRoomId]
                              .images || [];
                          const roomId = occupancyObj.roomId;
                          const rateId = ratesId;
                          const recommedationId = recomendationObj.id;

                          const currentRatePrice =
                            getCurrentPriceForRecommendation(
                              ratesInCurrentRecommendations,
                              zentrumHubRoomRates
                            );

                          const roomObj = {
                            ...zentrumHubRooms[occupancyObj.roomId],
                            stdRoomId: occupancyObj.stdRoomId,
                            currentRatePrice,
                          };
                          standardRoomMap.set(occupancyObj.stdRoomId, {
                            name,
                            images,
                            roomId,
                            rateId,
                            recommedationId,
                            rooms: [roomObj],
                          });
                        }
                      }
                    });
                  }
                }
              });
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
