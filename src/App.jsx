import { useEffect, useState } from 'react';
import './App.css';

import comboRate from './roomRateEngine/RatesJson/comboRate.json';
import uniqueRate from './roomRateEngine/RatesJson/unique.json';
import hybridRate from './roomRateEngine/RatesJson/hybridRate.json';
import duplicateRate from './roomRateEngine/RatesJson/duplicateRate.json';
import { autoSelectRoomRecommendations } from './roomRateEngine/prepareRecommendationRates';

const RATE_CASES = {
  combo: comboRate,
  duplicate: duplicateRate,
  unique: uniqueRate,
  hybrid: hybridRate
};

function App() {
  const [roomData, setRoomData] = useState(null);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);

  useEffect(() => {
    autoSelectRoomRecommendations({
      occupancy: [
        { numOfAdults: 2, childAges: [] },
        { numOfAdults: 2, childAges: [] },
        { numOfAdults: 2, childAges: [] }
      ],
      roomRatesJson: RATE_CASES.duplicate,
      onAutoSelectionDone: (finalResult) => {
        console.log('AUTO SELECT RESULT', finalResult);
        setRoomData(finalResult);
      }
    });
  }, []);

  if (!roomData) return null;

  // 🔒 Engine guarantee:
  // Cheapest = first standardized room → first recommendation
  const activeStandardRoomMap = roomData[activeRoomIndex];
  const [[, cheapestRoomList]] = activeStandardRoomMap.entries();
  const cheapestOverall = cheapestRoomList[0];
  const cheapestKey = `${cheapestOverall.reccomendationId}-${cheapestOverall.rateId}`;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Room Rate Engine – Debug View</h2>

      {/* -------- TABS -------- */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {Object.keys(roomData).map((idx) => (
          <button
            key={idx}
            onClick={() => setActiveRoomIndex(Number(idx))}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              border: '1px solid #555',
              background:
                Number(idx) === activeRoomIndex ? '#4caf50' : '#2a2a2a',
              color:
                Number(idx) === activeRoomIndex ? '#000' : '#fff'
            }}
          >
            Room {Number(idx) + 1}
          </button>
        ))}
      </div>

      {/* -------- ACTIVE TAB CONTENT -------- */}
      <div
        style={{
          border: '2px solid #444',
          padding: '16px',
          borderRadius: '8px'
        }}
      >
        <h3>
          Room {activeRoomIndex + 1} (Occupancy Index: {activeRoomIndex})
        </h3>

        {Array.from(activeStandardRoomMap.entries()).map(
          ([standardRoomId, roomList], stdIdx) => (
            <div
              key={standardRoomId}
              style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#1e1e1e',
                borderRadius: '6px'
              }}
            >
              <h4 style={{ color: '#9cdcfe' }}>
                Standard Room #{stdIdx + 1}
              </h4>

              <p style={{ fontSize: '12px', opacity: 0.8 }}>
                stdRoomId: {standardRoomId}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {roomList.map((roomItem) => {
                  const isAutoSelected =
                    `${roomItem.reccomendationId}-${roomItem.rateId}` ===
                    cheapestKey;

                  return (
                    <div
                      key={`${roomItem.rateId}-${roomItem.roomId}`}
                      style={{
                        border: isAutoSelected
                          ? '2px solid #4caf50'
                          : '1px solid #666',
                        padding: '10px',
                        borderRadius: '6px',
                        minWidth: '220px',
                        background: isAutoSelected
                          ? '#102a10'
                          : '#2a2a2a'
                      }}
                    >
                      {isAutoSelected && (
                        <p
                          style={{
                            color: '#4caf50',
                            fontSize: '12px',
                            marginBottom: '6px'
                          }}
                        >
                          ✅ Auto-Selected (Cheapest Overall)
                        </p>
                      )}

                      <p><strong>Recommendation:</strong> {roomItem.reccomendationId}</p>
                      <p><strong>Rate ID:</strong> {roomItem.rateId}</p>
                      <p><strong>Room ID:</strong> {roomItem.roomId}</p>
                      <p><strong>Total Price:</strong> ₹{roomItem.finalRateOfRecommendation}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;
