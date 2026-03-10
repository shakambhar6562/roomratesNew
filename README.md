# Room Recommendation Engine

## Overview

This project is a room recommendation engine for a hotel booking system. It takes user requests for rooms (like number of adults and children's ages) and matches them to available room rates and packages (called recommendations). The goal is to suggest the best room options with accurate prices, ensuring no double-booking of rooms and consistent results every time.

The main logic is in `src/roomRateEngine/PrepEngineNew.js`. This file has functions that handle matching rooms to user needs, building suggestions, auto-selecting options, and checking if selections are valid.

Imagine you're at a hotel front desk. A family wants 2 rooms: one for 2 adults, one for 2 adults and 2 kids (ages 5 and 7). The engine finds available rooms that match these exactly, calculates total costs, and suggests the cheapest options without overlapping bookings.

## Key Concepts

- **Occupancy**: What the user wants in a room, e.g., 2 adults and 1 child aged 5.
- **Rate**: A price for a room type, with details on who can stay (occupancies) and the cost.
- **Recommendation**: A bundle of rates that together make a full booking suggestion.
- **Standardized Room ID**: A code for room types (e.g., "DELUXE") to group similar rooms.
- **Consumed Occupancy**: Once a room's occupancy is used for a suggestion, it can't be used again for the same rate in that suggestion.

## How It Works: Step-by-Step

### 1. Matching a Single Room Occupancy (`findMatchingOccupancy`)

This function checks if a specific rate (room price) has an available occupancy that fits the user's needs.

**What it does:**
- Looks for a room setup in the rate that matches the number of adults and children's ages exactly.
- Skips rooms already used in this suggestion.
- Handles cases where there are no children.

**Inputs:**
- `requiredOccupancy`: User's request, e.g., `{ numOfAdults: 2, childAges: [5] }`.
- `availableOccupancies`: List of room setups from the rate, each with adults, children count, ages, room ID, etc.
- `consumedIndexes`: List of room indexes already taken (to avoid reuse).

**Step-by-Step Logic:**
1. Check if the number of adults matches exactly.
2. For children: Compare the list of ages as a set (order doesn't matter, but duplicates count). E.g., [5,5] matches [5,5] but not [5,6].
3. If no children are requested and the rate has none, it's a match.
4. Skip any room already used (from `consumedIndexes`).
5. If a match is found, return the room details plus its position in the list.

**Example:**
- User wants: 2 adults, 1 child aged 5.
- Rate has rooms: [ {adults:2, children:1, ages:[5], roomId:"A1"}, {adults:2, children:0, ages:[], roomId:"A2"} ]
- Match: First room, since ages match.

**Output:** The matching room object with its index, or `null` if none.

### 2. Building Recommendations for One Occupancy (`prepareRecommendationForOccupancy`)

This creates all possible room suggestions for a single user request (one occupancy).

**What it does:**
- Goes through each recommendation (bundle of rates).
- For each rate in the bundle, finds a matching room and adds up the prices.
- Ensures rooms aren't reused within the same suggestion.
- Sorts results by room type and price.

**Inputs:**
- `occupancy`: The user's room request.
- `roomRatesJson`: Data with all rates and recommendations.
- `lockedRates`: Rates that must be included (for multi-room bookings).

**Step-by-Step Process:**
1. Make a copy of the data to avoid changing the original.
2. For each recommendation:
   - If locked rates are specified, skip if not all are in this recommendation.
   - Start total price at 0.
   - For each rate in the recommendation:
     - Add the rate's `finalRate` to the total price.
     - Try to find a matching room occupancy (using the function above).
     - If found, mark it as used and note the rate.
   - If no room matched for any rate, stop (error).
   - Save the suggestion with total price, room details.
3. Group suggestions by room type (standardized ID).
4. Sort: Cheapest room types first, then cheapest suggestions within each type.

**Example:**
- User: 2 adults, no children.
- Recommendation: Rates A ($100) and B ($150), total $250.
- Matching rooms found, suggestion created.

**Output:** A map of room types to lists of suggestions, sorted by price.

**Errors:** Throws if no valid suggestion can be made.

### 3. Auto-Selecting for Multiple Occupancies (`autoSelectRoomRecommendations`)

Handles booking multiple rooms at once, picking the best options without conflicts.

**What it does:**
- Processes each occupancy one by one.
- For each, picks the cheapest suggestion.
- Locks the rates used so they can't be used for later occupancies.

**Inputs:**
- `occupancy`: List of user requests, e.g., [ {adults:2}, {adults:2, children:2, ages:[5,7]} ].
- `roomRatesJson`: Rates and recommendations.
- `onAutoSelectionDone`: Function to call with results.

**Step-by-Step Process:**
1. Start with no locked rates.
2. For each occupancy in order:
   - Get suggestions using the function above.
   - Save the suggestions for display.
   - Pick the cheapest suggestion's rate and lock it (add to locked list).
3. Call the callback with all suggestions.

**Why:** Prevents the same rate from being used twice, like not selling the same room to two families.

**Example:**
- First occupancy: Picks cheapest, locks rate X.
- Second occupancy: Can't use rate X, picks next best.

### 4. Checking Final Selection (`getFinalSelectedRecommendation`)

Verifies if the user's chosen rooms make a complete, valid booking.

**What it does:**
- Checks if every occupancy has a selection.
- Ensures all rates in the final recommendation are selected.

**Inputs:**
- `selectedRoomsAndRates`: User's choices, e.g., {0: {rateId: "A"}, 1: {rateId: "B"}}.
- `recommendationObj`: The recommendations data.
- `occupancyData`: List of occupancies.

**Logic:**
1. If not all occupancies selected, return empty.
2. Get all selected rate IDs.
3. Check if the last recommendation's rates are all in the selections.

**Output:** { isValidSelection: true/false, finalSelectedRecommendation: "recId" }

## Data Structures

### Room Rates JSON Example
```json
{
  "rates": {
    "rate1": {
      "finalRate": 100,
      "occupancies": [
        {
          "numOfAdults": 2,
          "numOfChildren": 1,
          "childAges": [5],
          "roomId": "deluxe1",
          "stdRoomId": "DELUXE"
        }
      ]
    }
  },
  "recommendations": {
    "rec1": {
      "id": "rec1",
      "rates": ["rate1", "rate2"]
    }
  }
}
```

### Occupancy Example
```json
{
  "numOfAdults": 2,
  "childAges": [5, 10]
}
```

## Important Rules and Edge Cases

- **Exact Matches Only:** Adults must match exactly; children ages must match as a multiset.
- **No Reuse:** A room occupancy can't be used twice in the same suggestion.
- **Price Addition:** Always add all `finalRate` values for the total.
- **Sorting:** Ensures the same results every time, cheapest first.
- **Errors:** Clear messages for bad data or no matches.

## Usage

To use:
1. Import functions from `PrepEngineNew.js`.
2. Call `prepareRecommendationForOccupancy` for single suggestions.
3. Use `autoSelectRoomRecommendations` for multiple rooms.
4. Validate with `getFinalSelectedRecommendation`.

This should make the logic clear for anyone new to the project.