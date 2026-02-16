import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import roomsApiData from './roomrates/itineraryData.json';
import occupancyArr from './roomrates/userOccupancy.json';
import { getRoomsRecommendation } from './roomrates/utilityFinal';

function App() {
  const [currentRoomSelectionIndex, setCurrentRoomSelectionIndex] = useState(0);
  const [count, setCount] = useState(0);

  const [alreadySelectedRate, setRoomSelectedRate] = useState([]);

  useEffect(() => {
    getRoomsRecommendation({
      userOccupancyArr: occupancyArr,
      roomsApiData,
      currentRoomSelectionIndex,
      alreadySelectedRate,
    });
  }, []);

  const handleSelectRate = (rateId) => {
    setRoomSelectedRate((prev) => [...prev, rateId]);
    setCurrentRoomSelectionIndex((prev) => prev + 1);
    getRoomsRecommendation({
      userOccupancyArr: occupancyArr,
      roomsApiData,
      currentRoomSelectionIndex: currentRoomSelectionIndex + 1,
      alreadySelectedRate: [...alreadySelectedRate, rateId],
    });
  };

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <button
        onClick={() => handleSelectRate('48cedfdb-a650-4a20-b5fe-023fd51e7253')}
      >
        Select rate
      </button>

      <button
        onClick={() => handleSelectRate('b1b99b54-c1d5-419a-b8c7-4fdb19589314')}
      >
        Select 2nd rate
      </button>
    </>
  );
}

export default App;
