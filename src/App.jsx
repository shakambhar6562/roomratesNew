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
  const [roomratesJson, setUploadedRateJson] = useState(null);
  const [roomOccupancyData, setRoomOccupancyData] = useState([
    {
      numberOfAdults: 2,
      childCount: 0,
      childAges: [],
    },
  ]);

  const [typeOfRate, setTypeOfRate] = useState("combo");

  const handleChange = (value, type, idx, childIdx) => {
    const newRoomOccupancyData = [...roomOccupancyData];
    if (type === "childAges") {
      const finalVal = Number(value);
      newRoomOccupancyData[idx][type][childIdx] = finalVal;
      newRoomOccupancyData[idx].childCount =
        newRoomOccupancyData[idx].childAges.length;
    } else if (type === "childCount") {
      newRoomOccupancyData[idx].childCount = Number(value);
      const newChildAgesToBeadded =
        Number(value) - newRoomOccupancyData[idx].childAges.length;
      if (newChildAgesToBeadded < 0) {
        newRoomOccupancyData[idx].childAges = newRoomOccupancyData[
          idx
        ].childAges.slice(
          0,
          newRoomOccupancyData[idx].childAges.length + newChildAgesToBeadded,
        );
      } else {
        newRoomOccupancyData[idx].childAges = [
          ...newRoomOccupancyData[idx].childAges,
          ...Array.from({ length: newChildAgesToBeadded }, (_, i) => i + 1),
        ];
      }
    } else {
      newRoomOccupancyData[idx][type] = Number(value);
    }
    setRoomOccupancyData(newRoomOccupancyData);
  };

  console.log("roomOccupancyData", roomOccupancyData, roomratesJson);

  // 🔁 Initial auto-selection
  useEffect(() => {
    if (!roomratesJson) return;
    autoSelectRoomRecommendations({
      occupancy: roomOccupancyData,
      roomRatesJson: roomratesJson,
      onAutoSelectionDone: setRoomData,
    });
  }, [roomOccupancyData, roomratesJson]);

  if (!roomratesJson) {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "40px",
        }}
      >
        {roomOccupancyData?.map((occItem, idx) => {
          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <label htmlFor="adults">Adults</label>
                  <input
                    onChange={(e) =>
                      handleChange(e.target.value, "numOfAdults", idx)
                    }
                    name="numOfAdults"
                    style={{ width: "200px", height: "20px" }}
                    type="text"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <label htmlFor="Childs">Number Of Children</label>
                  <input
                    onChange={(e) =>
                      handleChange(e.target.value, "childCount", idx)
                    }
                    name="childCount"
                    style={{ width: "200px", height: "20px" }}
                    type="text"
                  />
                </div>
                {idx === 0 && (
                  <button
                    style={{
                      marginTop: "20px",
                      width: "150px",
                      height: "40px",
                      background: "white",
                      color: "black",
                    }}
                    onClick={() =>
                      setRoomOccupancyData((prev) => [
                        ...prev,
                        { numberOfAdults: 2, childCount: 0, childAges: [] },
                      ])
                    }
                  >
                    + Add
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "20px" }}>
                {occItem.childAges.map((_, childIdx) => {
                  return (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <label htmlFor="childAge">{`Age ${childIdx}`}</label>
                      <input
                        onChange={(e) =>
                          handleChange(
                            e.target.value,
                            "childAges",
                            idx,
                            childIdx,
                          )
                        }
                        name="childAge"
                        style={{ width: "200px" }}
                        type="text"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <label>Type of Rate</label>

        <select
          value={typeOfRate}
          onChange={(e) => setTypeOfRate(e.target.value)}
        >
          <option value="combo">Combo</option>
          <option value="unique">Unique</option>
          <option value="duplicate">Duplicate</option>
          <option value="hybrid">Hybrid</option>
        </select>

        <input
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                setUploadedRateJson(JSON.parse(ev.target.result));
              } catch {
                alert("Invalid JSON");
              }
            };
            reader.readAsText(file);
          }}
        />
      </div>
    );
  }

  if (!roomData) return null;

  const activeStandardRoomMap = roomData?.[activeRoomIndex];

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
