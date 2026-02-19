import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import roomsApiData from './roomrates/itineraryData.json';
import occupancyArr from './roomrates/userOccupancy.json';
import { getRoomsRecommendation } from './roomrates/utilityFinal';
import comboRate from './roomRateEngine/RatesJson/comboRate.json'
import uniqueRate from './roomRateEngine/RatesJson/unique.json'
import hybridRate from './roomRateEngine/RatesJson/hybridRate.json'
import duplicateRate from './roomRateEngine/RatesJson/duplicateRate.json'

import { prepareRecommendationJson } from './roomRateEngine/prepareRecommendationRates';


function App() {
  // const [currentRoomSelectionIndex, setCurrentRoomSelectionIndex] = useState(0);
  // const [count, setCount] = useState(0);

  // const [alreadySelectedRate, setRoomSelectedRate] = useState([]);

  // useEffect(() => {
  //   getRoomsRecommendation({
  //     userOccupancyArr: occupancyArr,
  //     roomsApiData,
  //     currentRoomSelectionIndex,
  //     alreadySelectedRate,
  //   });
  // }, []);

  // const handleSelectRate = (rateId) => {
  //   setRoomSelectedRate((prev) => [...prev, rateId]);
  //   setCurrentRoomSelectionIndex((prev) => prev + 1);
  //   getRoomsRecommendation({
  //     userOccupancyArr: occupancyArr,
  //     roomsApiData,
  //     currentRoomSelectionIndex: currentRoomSelectionIndex + 1,
  //     alreadySelectedRate: [...alreadySelectedRate, rateId],
  //   });
  // };


  const [roomData, setRoomData] = useState(null)

  useEffect(() => {
    // const finalResult = prepareRecommendationJson({
    //   occupancy: [
    //     {
    //       "numOfAdults": 2,
    //       "childAges": [
    //       ]
    //     },
    //     {
    //       "numOfAdults": 2,
    //       "childAges": []
    //     },
    //     {
    //       "numOfAdults": 2,
    //       "childAges": [],
    //       "thirdRate": true
    //     }
    //   ],
    //   roomRatesJson: comboRate,
    //   occupancyIndex: 2,
    //   previousSelectedRates: {
    //     '6da712f7-3772-4dc0-b5ca-04894ef522af': 2,
    //   }
    // })
    // console.log('Case 1 occupancies(2A,2A,2A) combo', {
    //   result: finalResult
    // })

    // setRoomData(finalResult);


    const finalResult = prepareRecommendationJson({
      occupancy: [
        {
          "numOfAdults": 2,
          "childAges": [
          ]
        },
        {
          "numOfAdults": 2,
          "childAges": []
        },
        {
          "numOfAdults": 2,
          "childAges": []
        }
      ],
      roomRatesJson: duplicateRate,
      occupancyIndex: 2,
      previousSelectedRates: {
        '0f9d05f1-4a20-42a0-abfc-cec9bcd8ec71': 1,
        'e69df5a3-4946-4af6-b67c-9142c10bd1c4': 1,
      }
    })
    console.log('Case 1 occupancies(2A,2A,2A) combo', {
      result: finalResult
    })

    setRoomData(finalResult);

    /* This is another case */

    // const finalResult = prepareRecommendationJson({
    //   occupancy: [
    //     {
    //       "numOfAdults": 2,
    //       "childAges": []
    //     },
    //     {
    //       "numOfAdults": 2,
    //       "childAges": [1]
    //     },
    //     {
    //       "numOfAdults": 2,
    //       "childAges": [7]
    //     },
    //   ],
    //   roomRatesJson: uniqueRate,
    //   occupancyIndex: 2,
    //   previousSelectedRates: {
    //     '2ebd1d73-08bf-4864-b236-c7c66cd9fb4a': 1,
    //     'c37caeec-87c7-46b0-9427-1c00332a8879': 1
    //   }
    // })

    // setRoomData(finalResult);

    // console.log('Unique Case Occupancy list=[{adults:2,childAges:[]},{adults:2,childAges:[1]},{adults:2,childAges:[7]}]', {
    //   result: finalResult
    // })

    // console.log('Case 3 occupancies(2A1~CH(3yr),2A) Hybrid', {
    //   result: prepareRecommendationJson({
    //     occupancy: [
    //       {
    //         "numOfAdults": 2,
    //         "childAges": [
    //           3
    //         ]
    //       },
    //       {
    //         "numOfAdults": 2,
    //         "childAges": []
    //       },
    //       {
    //         "numOfAdults": 2,
    //         "childAges": []
    //       },
    //     ],
    //     roomRatesJson: hybridRate,
    //   })
    // })


    // console.log('Case 4 occupancies(2A1~CH(3yr),2A) duplicate', {
    //   result: prepareRecommendationJson({
    //     occupancy: [
    //       {
    //         "numOfAdults": 2,
    //         "childAges": []
    //       },
    //       {
    //         "numOfAdults": 2,
    //         "childAges": []
    //       },
    //       {
    //         "numOfAdults": 2,
    //         "childAges": []
    //       },
    //     ],
    //     roomRatesJson: duplicateRate,
    //   })
    // })

  }, [])

  if (!roomData) return null;

  return (
    <>
      {Object.entries(roomData).map(([roomIndex, stanardRoomMap]) => {
        console.log('stanardRoomMap', stanardRoomMap)
        return (
          <>
            <p>This is for {roomIndex}</p>
            {Array.from(stanardRoomMap).map(([standardRoomId, roomList]) => {
              return (
                <div>
                  <p>stdRoomId: {standardRoomId}</p>
                  {roomList.map((roomItem) => {
                    return (
                      <div style={{ border: '1px solid white', marginBottom: '10px' }}>
                        <p>reccomendationId: {roomItem?.reccomendationId}</p>
                        <p>rateId: {roomItem?.rateId}</p>
                        <p>roomId: {roomItem?.roomId}</p>
                        <p>stdRoomId: {roomItem?.stdRoomId}</p>
                        <p>finalRateOfRecommendation: {roomItem?.finalRateOfRecommendation}</p>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </>
        )
      })}

    </>
  )

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
