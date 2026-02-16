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

export const sortArr = (arr, sortKey = '', sortNumber = true) => {
  if (sortKey) {
    if (sortNumber) {
      return arr.toSorted((a, b) => a?.[sortKey] - b?.[sortKey]);
    }
    return arr.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
  } else {
    if (sortNumber) {
      return arr.toSorted((a, b) => a - b);
    }
    return arr.toSorted();
  }
};
