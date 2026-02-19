import { useEffect, useState } from "react";
import "./App.css";

import comboRate from "./roomRateEngine/RatesJson/comboRate.json";
import uniqueRate from "./roomRateEngine/RatesJson/unique.json";
import hybridRate from "./roomRateEngine/RatesJson/hybridRate.json";
import duplicateRate from "./roomRateEngine/RatesJson/duplicateRate.json";
import {
  autoSelectRoomRecommendations,
  prepareRecommendationForOccupancy,
} from "./roomRateEngine/PrepEngineNew";

const RATE_CASES = {
  combo: comboRate,
  duplicate: duplicateRate,
  unique: uniqueRate,
  hybrid: hybridRate,
};

const OCCUPANCY = [
  { numOfAdults: 2, childAges: [] },
  { numOfAdults: 2, childAges: [] },
  { numOfAdults: 2, childAges: [] },
];

function App() {
  const [roomData, setRoomData] = useState(null);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [selectedByRoomIndex, setSelectedByRoomIndex] = useState({});

  // 🔁 Initial auto-selection
  useEffect(() => {
    autoSelectRoomRecommendations({
      occupancy: OCCUPANCY,
      roomRatesJson: RATE_CASES.combo,
      onAutoSelectionDone: setRoomData,
    });
  }, []);

  if (!roomData) return null;

  const activeStandardRoomMap = roomData[activeRoomIndex];

  // 🔒 Engine guarantee: cheapest = first std room → first item
  const [[, cheapestRoomList]] = activeStandardRoomMap.entries();
  const cheapestOverall = cheapestRoomList[0];
  const cheapestKey = `${cheapestOverall.reccomendationId}-${cheapestOverall.rateId}`;

  /**
   * Manual selection handler
   * - Locks selection
   * - Recalculates ONLY subsequent rooms
   * - Jumps to next room
   */
  const handleManualSelect = (roomIndex, selectedRoom) => {
    const newSelected = {
      ...selectedByRoomIndex,
      [roomIndex]: selectedRoom,
    };

    // 🔐 Build locked rates from selections up to this room
    const lockedRates = {};
    Object.values(newSelected).forEach((sel) => {
      lockedRates[sel.rateId] = (lockedRates[sel.rateId] || 0) + 1;
    });

    const newRoomData = { ...roomData };
    let currentLockedRates = { ...lockedRates };

    // 🔁 Recompute only remaining rooms
    for (let i = roomIndex + 1; i < OCCUPANCY.length; i++) {
      const stdRoomMap = prepareRecommendationForOccupancy({
        occupancy: OCCUPANCY[i],
        roomRatesJson: RATE_CASES.combo,
        lockedRates: currentLockedRates,
      });

      newRoomData[i] = stdRoomMap;

      const [[, cheapestList]] = stdRoomMap.entries();
      const cheapest = cheapestList[0];

      currentLockedRates[cheapest.rateId] =
        (currentLockedRates[cheapest.rateId] || 0) + 1;
    }

    setSelectedByRoomIndex(newSelected);
    setRoomData(newRoomData);

    // 👉 Auto-jump to next room
    if (roomIndex + 1 < OCCUPANCY.length) {
      setActiveRoomIndex(roomIndex + 1);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Room Rate Engine – Debug View</h2>

      {/* -------- ROOM TABS -------- */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {Object.keys(roomData).map((idx) => (
          <button
            key={idx}
            onClick={() => setActiveRoomIndex(Number(idx))}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid #555",
              cursor: "pointer",
              background:
                Number(idx) === activeRoomIndex ? "#4caf50" : "#2a2a2a",
              color: Number(idx) === activeRoomIndex ? "#000" : "#fff",
            }}
          >
            Room {Number(idx) + 1}
          </button>
        ))}
      </div>

      {/* -------- ACTIVE ROOM -------- */}
      {Array.from(activeStandardRoomMap.entries()).map(
        ([stdRoomId, roomList]) => (
          <div
            key={stdRoomId}
            style={{
              marginBottom: "16px",
              padding: "12px",
              background: "#1e1e1e",
              borderRadius: "6px",
            }}
          >
            <h4 style={{ color: "#9cdcfe" }}>Standard Room {stdRoomId}</h4>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {roomList.map((roomItem) => {
                const key = `${roomItem.reccomendationId}-${roomItem.rateId}`;

                const manualSelection = selectedByRoomIndex[activeRoomIndex];

                const isManualSelected =
                  manualSelection &&
                  manualSelection.rateId === roomItem.rateId &&
                  manualSelection.reccomendationId ===
                    roomItem.reccomendationId;

                const isAutoSelected = !manualSelection && key === cheapestKey;

                return (
                  <div
                    key={key}
                    onClick={() =>
                      handleManualSelect(activeRoomIndex, roomItem)
                    }
                    style={{
                      cursor: "pointer",
                      border: isManualSelected
                        ? "2px solid orange"
                        : isAutoSelected
                          ? "2px solid #4caf50"
                          : "1px solid #666",
                      padding: "10px",
                      borderRadius: "6px",
                      minWidth: "220px",
                      background: isManualSelected
                        ? "#3a2a00"
                        : isAutoSelected
                          ? "#102a10"
                          : "#2a2a2a",
                    }}
                  >
                    {isManualSelected && <p>🟧 Manually Selected</p>}
                    {!isManualSelected && isAutoSelected && (
                      <p>✅ Auto Selected</p>
                    )}

                    <p>
                      <strong>Recommendation:</strong>{" "}
                      {roomItem.reccomendationId}
                    </p>
                    <p>
                      <strong>Rate ID:</strong> {roomItem.rateId}
                    </p>
                    <p>
                      <strong>Total Price:</strong> ₹
                      {roomItem.finalRateOfRecommendation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export default App;
