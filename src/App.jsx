import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Tabs,
  Tab,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";


import {
  autoSelectRoomRecommendations,
  getFinalSelectedRecommendation,
  prepareRecommendationForOccupancy,
} from "./roomRateEngine/PrepEngineNew";

// Create a beautiful, soothing theme
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#9c27b0",
      light: "#ba68c8",
      dark: "#7b1fa2",
    },
    background: {
      default: "#f5f7fa",
      paper: "#ffffff",
    },
    success: {
      main: "#2e7d32",
      light: "#4caf50",
    },
    warning: {
      main: "#ed6c02",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          padding: "10px 24px",
        },
      },
    },
  },
});

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

  const handleRemoveRoom = (idx) => {
    if (roomOccupancyData.length > 1) {
      const newData = roomOccupancyData.filter((_, i) => i !== idx);
      setRoomOccupancyData(newData);
      if (activeRoomIndex >= newData.length) {
        setActiveRoomIndex(newData.length - 1);
      }
    }
  };

  // Transform occupancy data to engine format (numberOfAdults -> numOfAdults)
  const transformOccupancyForEngine = (occupancyData) => {
    return occupancyData.map((occ) => ({
      numOfAdults: occ.numberOfAdults,
      childCount: occ.childCount,
      childAges: occ.childAges,
    }));
  };

  // 🔁 Initial auto-selection
  useEffect(() => {
    if (!roomratesJson) return;
    autoSelectRoomRecommendations({
      occupancy: transformOccupancyForEngine(roomOccupancyData),
      roomRatesJson: roomratesJson,
      onAutoSelectionDone: (finalRoomData) => {
        setRoomData(finalRoomData);

        const finalSelectedRoomIndex = Object.entries(finalRoomData)?.reduce(
          (prev, curr, idx) => {
            const [, stdRoomMap] = curr;
            const [[, cheapestRoomList]] = Array.from(stdRoomMap.entries());
            const cheaperstRoom = cheapestRoomList[0];

            prev[idx] = cheaperstRoom;
            return prev;
          },
          {},
        );

        setSelectedByRoomIndex(finalSelectedRoomIndex);
      },
    });
  }, [roomOccupancyData, roomratesJson]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setUploadedRateJson(JSON.parse(ev.target.result));
      } catch {
        alert("Invalid JSON file. Please upload a valid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Initial form view (before JSON upload)
  if (!roomratesJson) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, color: "primary.main" }}>
              Room Rate Configuration
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Configure your room occupancy and upload rate data to get started
            </Typography>

            <Stack spacing={4}>
              {roomOccupancyData?.map((occItem, idx) => {
                return (
                  <Card key={idx} variant="outlined" sx={{ p: 3 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={2}
                    >
                      <Typography variant="h6" color="primary">
                        Room {idx + 1}
                      </Typography>
                      {roomOccupancyData.length > 1 && (
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleRemoveRoom(idx)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>

                    <Grid container spacing={3} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Number of Adults"
                          type="number"
                          value={occItem.numberOfAdults || ""}
                          onChange={(e) =>
                            handleChange(e.target.value, "numberOfAdults", idx)
                          }
                          inputProps={{ min: 1 }}
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Number of Children"
                          type="number"
                          value={occItem.childCount || ""}
                          onChange={(e) =>
                            handleChange(e.target.value, "childCount", idx)
                          }
                          inputProps={{ min: 0 }}
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>

                    {occItem.childAges.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Children Ages
                        </Typography>
                        <Grid container spacing={2}>
                          {occItem.childAges.map((_, childIdx) => {
                            return (
                              <Grid item xs={12} sm={6} md={4} key={childIdx}>
                                <TextField
                                  fullWidth
                                  label={`Child ${childIdx + 1} Age`}
                                  type="number"
                                  value={occItem.childAges[childIdx] || ""}
                                  onChange={(e) =>
                                    handleChange(
                                      e.target.value,
                                      "childAges",
                                      idx,
                                      childIdx,
                                    )
                                  }
                                  inputProps={{ min: 0, max: 17 }}
                                  variant="outlined"
                                  size="small"
                                />
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    )}

                    {idx === roomOccupancyData.length - 1 && (
                      <Box mt={3}>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() =>
                            setRoomOccupancyData((prev) => [
                              ...prev,
                              { numberOfAdults: 2, childCount: 0, childAges: [] },
                            ])
                          }
                        >
                          Add Another Room
                        </Button>
                      </Box>
                    )}
                  </Card>
                );
              })}

              <Divider />

              <Box>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Type of Rate</InputLabel>
                  <Select
                    value={typeOfRate}
                    label="Type of Rate"
                    onChange={(e) => setTypeOfRate(e.target.value)}
                  >
                    <MenuItem value="combo">Combo</MenuItem>
                    <MenuItem value="unique">Unique</MenuItem>
                    <MenuItem value="duplicate">Duplicate</MenuItem>
                    <MenuItem value="hybrid">Hybrid</MenuItem>
                  </Select>
                </FormControl>

                <Card variant="outlined" sx={{ p: 3, bgcolor: "background.default" }}>
                  <Typography variant="h6" gutterBottom>
                    Upload Rate JSON File
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Please upload a valid JSON file containing room rate data
                  </Typography>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                    sx={{ py: 1.5 }}
                  >
                    Choose JSON File
                    <input
                      type="file"
                      accept=".json"
                      hidden
                      onChange={handleFileUpload}
                    />
                  </Button>
                </Card>
              </Box>
            </Stack>
          </Paper>
        </Container>
      </ThemeProvider>
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
    let newSelected = Object.entries(selectedByRoomIndex).reduce(
      (prev, curr) => {
        const [roomIdx, roomData] = curr;
        if (Number(roomIdx) < roomIndex) {
          prev[roomIdx] = roomData;
        }
        return prev;
      },
      {},
    );
    newSelected = {
      ...newSelected,
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
    for (let i = roomIndex + 1; i < roomOccupancyData.length; i++) {
      const transformedOccupancy = {
        numOfAdults: roomOccupancyData[i].numberOfAdults,
        childCount: roomOccupancyData[i].childCount,
        childAges: roomOccupancyData[i].childAges,
      };
      const stdRoomMap = prepareRecommendationForOccupancy({
        occupancy: transformedOccupancy,
        roomRatesJson: roomratesJson,
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
    if (roomIndex + 1 < roomOccupancyData.length) {
      setActiveRoomIndex(roomIndex + 1);
    }
  };

  const finalRecommendation = getFinalSelectedRecommendation({
    occupancyData: roomOccupancyData,
    recommendationObj: roomratesJson?.recommendations,
    selectedRoomsAndRates: selectedByRoomIndex,
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        {/* Left Sidebar - Room Selection */}
        <Paper
          elevation={0}
          sx={{
            width: 320,
            minHeight: "100vh",
            borderRight: "1px solid",
            borderColor: "divider",
            p: 3,
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            Select Rooms
          </Typography>

          <Stack spacing={2}>
            {Object.keys(roomData).map((idx) => {
              const roomIdx = Number(idx);
              const isActive = roomIdx === activeRoomIndex;
              const selectedRoom = selectedByRoomIndex[roomIdx];
              const isSelected = !!selectedRoom;

              return (
                <Card
                  key={idx}
                  onClick={() => setActiveRoomIndex(roomIdx)}
                  sx={{
                    cursor: "pointer",
                    border: isActive ? 2 : 1,
                    borderColor: isActive ? "primary.main" : "divider",
                    bgcolor: isActive ? "action.selected" : "background.paper",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                      transform: "translateY(-2px)",
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Room {roomIdx + 1}
                      </Typography>
                      {isSelected && (
                        <CheckCircleIcon color="success" fontSize="small" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {roomOccupancyData[roomIdx]?.numberOfAdults || 0} Adults
                      {roomOccupancyData[roomIdx]?.childCount > 0 &&
                        `, ${roomOccupancyData[roomIdx]?.childCount} Children`}
                    </Typography>
                    {selectedRoom && (
                      <Box mt={1}>
                        <Chip
                          label={`₹${selectedRoom.finalRateOfRecommendation}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>

          {finalRecommendation?.finalSelectedRecommendation && (
            <Box mt={4}>
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Final Recommendation
                </Typography>
                <Typography variant="body2">
                  {finalRecommendation.finalSelectedRecommendation}
                </Typography>
              </Alert>
            </Box>
          )}
        </Paper>

        {/* Right Panel - Room Options */}
        <Box sx={{ flex: 1, p: 4, overflow: "auto" }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>
            Room {activeRoomIndex + 1} - Available Options
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Select a room option below. Options are grouped by standard room type.
          </Typography>

          <Stack spacing={3}>
            {Array.from(activeStandardRoomMap.entries()).map(
              ([stdRoomId, roomList]) => (
                <Box key={stdRoomId}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ mb: 2, color: "primary.main", fontWeight: 600 }}
                  >
                    Standard Room {stdRoomId}
                  </Typography>

                  <Grid container spacing={2}>
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
                        <Grid item xs={12} sm={6} md={4} key={key}>
                          <Card
                            onClick={() =>
                              handleManualSelect(activeRoomIndex, roomItem)
                            }
                            sx={{
                              cursor: "pointer",
                              border: isManualSelected
                                ? 2
                                : isAutoSelected
                                  ? 2
                                  : 1,
                              borderColor: isManualSelected
                                ? "warning.main"
                                : isAutoSelected
                                  ? "success.main"
                                  : "divider",
                              bgcolor: isManualSelected
                                ? "action.selected"
                                : isAutoSelected
                                  ? "action.selected"
                                  : "background.paper",
                              transition: "all 0.2s",
                              "&:hover": {
                                transform: "translateY(-4px)",
                                boxShadow: 4,
                                borderColor: isManualSelected
                                  ? "warning.main"
                                  : isAutoSelected
                                    ? "success.main"
                                    : "primary.main",
                              },
                              height: "100%",
                            }}
                          >
                            <CardContent>
                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                mb={1}
                              >
                                {isManualSelected && (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Selected"
                                    color="warning"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                )}
                                {!isManualSelected && isAutoSelected && (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Auto Selected"
                                    color="success"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                )}
                                {!isManualSelected && !isAutoSelected && (
                                  <Chip
                                    icon={<RadioButtonUncheckedIcon />}
                                    label="Available"
                                    variant="outlined"
                                    size="small"
                                  />
                                )}
                              </Box>

                              <Divider sx={{ my: 1.5 }} />

                              <Stack spacing={1}>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Recommendation ID
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {roomItem.reccomendationId}
                                  </Typography>
                                </Box>

                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Rate ID
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {roomItem.rateId}
                                  </Typography>
                                </Box>

                                <Divider />

                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Total Price
                                  </Typography>
                                  <Typography
                                    variant="h5"
                                    color="primary"
                                    fontWeight={700}
                                  >
                                    ₹{roomItem.finalRateOfRecommendation}
                                  </Typography>
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              ),
            )}
          </Stack>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
