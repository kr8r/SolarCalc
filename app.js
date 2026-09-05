// Reference resistance values (NEC copper @ 75°C - Ohms per 1000 ft)
const NEC_COPPER_RESISTANCE = {
  "14": 3.07, "12": 1.93, "10": 1.21, "8": 0.764,
  "6": 0.480, "4": 0.302, "2": 0.190, "0": 0.120,
  "00": 0.096, "0000": 0.060
};

let currentTempUnit = 'F'; // 'F' or 'C'
let isDarkMode = false;

document.addEventListener('DOMContentLoaded', () => {
  loadSystemState();
  
  document.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('input', () => {
      sanitizeInputs();
      saveSystemState();
    });
  });
});

function applyLocationPreset(selectEl) {
  const val = selectEl.value;
  if (val === 'custom') return;

  const [lat, sun] = val.split('|');
  document.getElementById('latitude').value = lat;
  document.getElementById('sunHours').value = sun;
  calculateSystem();
}

function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (!element) return;

  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.classList.add('highlight-section');

  setTimeout(() => {
    element.classList.remove('highlight-section');
  }, 1500);
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark-mode', isDarkMode);
  document.getElementById('darkModeToggle').textContent = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
  saveSystemState();
  calculateSystem();
}

function toggleTempUnit() {
  const minTempInput = document.getElementById('minTemp');
  const tempCoeffInput = document.getElementById('tempCoeff');
  const toggleBtn = document.getElementById('tempUnitToggle');

  let minTempValue = parseFloat(minTempInput.value) || 0;
  let coeffValue = parseFloat(tempCoeffInput.value) || 0;

  if (currentTempUnit === 'F') {
    currentTempUnit = 'C';
    toggleBtn.textContent = 'Switch to °F';
    minTempInput.value = Math.round((minTempValue - 32) * (5 / 9));
    tempCoeffInput.value = (coeffValue * 1.8).toFixed(2);
  } else {
    currentTempUnit = 'F';
    toggleBtn.textContent = 'Switch to °C';
    minTempInput.value = Math.round((minTempValue * (9 / 5)) + 32);
    tempCoeffInput.value = (coeffValue / 1.8).toFixed(2);
  }

  document.querySelectorAll('.temp-unit-label').forEach(el => {
    el.textContent = `°${currentTempUnit}`;
  });

  calculateSystem();
}

function sanitizeInputs() {
  const nonNegativeIds = [
    'panelWatts', 'panelVoc', 'panelIsc', 'panelsSeries', 'parallelStrings',
    'sunHours', 'latitude', 'panelTilt', 'mpptMaxVolts', 'mpptMaxAmps', 
    'inverterWatts', 'inverterSurge', 'batVolts', 'batAh', 'wireDistance', 'maxDropTarget'
  ];

  nonNegativeIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== '' && parseFloat(el.value) < 0) {
      el.value = 0;
    }
  });

  ['batDoD', 'efficiency'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== '') {
      if (parseFloat(el.value) > 100) el.value = 100;
      if (parseFloat(el.value) < 0) el.value = 0;
    }
  });
}

function addApplianceRow(name = '', watts = '', hours = '', surgeMultiplier = '1', type = 'AC') {
  const container = document.getElementById('applianceList');
  const newRow = document.createElement('div');
  newRow.className = 'appliance-row';
  newRow.innerHTML = `
    <input type="text" placeholder="Appliance" class="app-name" value="${name}">
    <input type="number" placeholder="Watts" class="app-watts" value="${watts}" min="0">
    <input type="number" placeholder="Hours" class="app-hours" value="${hours}" step="0.5" max="24" min="0">
    <input type="number" placeholder="Mult." class="app-surge" value="${surgeMultiplier}" step="0.1" min="1">
    <select class="app-type">
      <option value="AC" ${type === 'AC' ? 'selected' : ''}>AC</option>
      <option value="DC" ${type === 'DC' ? 'selected' : ''}>DC</option>
    </select>
    <button type="button" class="btn-remove" onclick="removeApplianceRow(this)">×</button>
  `;
  container.appendChild(newRow);

  newRow.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', () => {
      sanitizeInputs();
      saveSystemState();
    });
  });

  saveSystemState();
}

function removeApplianceRow(btn) {
  btn.parentElement.remove();
  saveSystemState();
}

function addPresetAppliance(selectEl) {
  const value = selectEl.value;
  if (!value) return;

  const [name, watts, hours, surge, type] = value.split('|');
  addApplianceRow(name, watts, hours, surge, type || 'AC');
  selectEl.value = "";
}

function saveSystemState() {
  const appliances = [];
  const names = document.querySelectorAll('.app-name');
  const watts = document.querySelectorAll('.app-watts');
  const hours = document.querySelectorAll('.app-hours');
  const surges = document.querySelectorAll('.app-surge');
  const types = document.querySelectorAll('.app-type');

  names.forEach((nameInput, index) => {
    appliances.push({
      name: nameInput.value,
      watts: watts[index].value,
      hours: hours[index].value,
      surge: surges[index].value,
      type: types[index] ? types[index].value : 'AC'
    });
  });

  const state = {
    isDarkMode: isDarkMode,
    currentTempUnit: currentTempUnit,
    panelWatts: document.getElementById('panelWatts').value,
    panelVoc: document.getElementById('panelVoc').value,
    panelIsc: document.getElementById('panelIsc').value,
    tempCoeff: document.getElementById('tempCoeff').value,
    minTemp: document.getElementById('minTemp').value,
    panelsSeries: document.getElementById('panelsSeries').value,
    parallelStrings: document.getElementById('parallelStrings').value,
    latitude: document.getElementById('latitude').value,
    panelTilt: document.getElementById('panelTilt').value,
    panelAzimuth: document.getElementById('panelAzimuth').value,
    seasonProfile: document.getElementById('seasonProfile').value,
    sunHours: document.getElementById('sunHours').value,
    mpptMaxVolts: document.getElementById('mpptMaxVolts').value,
    mpptMaxAmps: document.getElementById('mpptMaxAmps').value,
    inverterWatts: document.getElementById('inverterWatts').value,
    inverterSurge: document.getElementById('inverterSurge').value,
    batVolts: document.getElementById('batVolts').value,
    batAh: document.getElementById('batAh').value,
    batDoD: document.getElementById('batDoD').value,
    efficiency: document.getElementById('efficiency').value,
    wireDistance: document.getElementById('wireDistance').value,
    wireGauge: document.getElementById('wireGauge').value,
    maxDropTarget: document.getElementById('maxDropTarget').value,
    appliances: appliances
  };

  localStorage.setItem('solar_calc_data', JSON.stringify(state));
}

function loadSystemState() {
  const savedJSON = localStorage.getItem('solar_calc_data');
  if (!savedJSON) {
    addApplianceRow("Refrigerator", "150", "12", "2", "AC");
    addApplianceRow("LED Lights", "30", "5", "1", "DC");
    return;
  }

  try {
    const state = JSON.parse(savedJSON);

    if (state.isDarkMode) {
      isDarkMode = true;
      document.body.classList.add('dark-mode');
      document.getElementById('darkModeToggle').textContent = '☀️ Light Mode';
    }

    if (state.currentTempUnit && state.currentTempUnit !== currentTempUnit) {
      currentTempUnit = state.currentTempUnit;
      const toggleBtn = document.getElementById('tempUnitToggle');
      if (toggleBtn) toggleBtn.textContent = currentTempUnit === 'F' ? 'Switch to °C' : 'Switch to °F';
      document.querySelectorAll('.temp-unit-label').forEach(el => {
        el.textContent = `°${currentTempUnit}`;
      });
    }

    const keys = [
      'panelWatts', 'panelVoc', 'panelIsc', 'tempCoeff', 'minTemp',
      'panelsSeries', 'parallelStrings', 'latitude', 'panelTilt', 'panelAzimuth',
      'seasonProfile', 'sunHours', 'mpptMaxVolts', 'mpptMaxAmps',
      'inverterWatts', 'inverterSurge', 'batVolts', 'batAh', 'batDoD',
      'efficiency', 'wireDistance', 'wireGauge', 'maxDropTarget'
    ];

    keys.forEach(key => {
      const el = document.getElementById(key);
      if (el && state[key] !== undefined) el.value = state[key];
    });

    if (Array.isArray(state.appliances) && state.appliances.length > 0) {
      document.getElementById('applianceList').innerHTML = '';
      state.appliances.forEach(app => {
        addApplianceRow(app.name, app.watts, app.hours, app.surge || '1', app.type || 'AC');
      });
    }

    calculateSystem();
  } catch (e) {
    console.error('Error loading state:', e);
  }
}

function resetSystemState() {
  if (confirm('Reset all values to defaults?')) {
    localStorage.removeItem('solar_calc_data');
    location.reload();
  }
}

// --- GEOGRAPHIC & SOLAR INCIDENCE GEOMETRY DERATING ENGINE ---
function calculateSolarDerating(latDeg, tiltDeg, azimuthDeg, season) {
  const latRad = latDeg * (Math.PI / 180);
  const tiltRad = tiltDeg * (Math.PI / 180);
  const aziRad = (azimuthDeg - 180) * (Math.PI / 180); // Deviation from South

  // Solar Declination Angle (delta) by Season
  let declinationDeg = 0;
  if (season === 'summer') declinationDeg = 23.45; // Summer Solstice
  else if (season === 'winter') declinationDeg = -23.45; // Winter Solstice
  else declinationDeg = 0; // Equinox

  const decRad = declinationDeg * (Math.PI / 180);

  // Solar Elevation at Solar Noon (Hour Angle omega = 0)
  const sinSolarNoonAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad);
  const noonAltRad = Math.asin(Math.max(-1, Math.min(1, sinSolarNoonAlt)));

  if (noonAltRad <= 0) return 0.05; // polar night or sub-horizon sun

  // Angle of Incidence (cos theta) at Solar Noon
  const cosIncidence = Math.sin(noonAltRad) * Math.cos(tiltRad) + 
                       Math.cos(noonAltRad) * Math.sin(tiltRad) * Math.cos(aziRad);

  const rawDerate = Math.max(0.05, cosIncidence);
  return Math.min(1.0, rawDerate);
}

// --- 24-HOUR SIMULATOR ENGINE & GRAPH CANVAS ---
function render24HourSimulation(effectiveArrayWatts, effectiveSunHours, efficiency, usableBatteryWh, totalDailyLoadWh) {
  const canvas = document.getElementById('simCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const hourlySolarWatts = [];
  const hourlyLoadWatts = [];
  const hourlySoC = [];

  const avgHourlyLoadW = totalDailyLoadWh / 24;

  const peakSolarW = effectiveArrayWatts * efficiency;
  const solarWindowHours = Math.min(12, Math.max(4, effectiveSunHours * 1.8));
  const sunriseHour = 13 - (solarWindowHours / 2);
  const sunsetHour = 13 + (solarWindowHours / 2);

  for (let h = 0; h < 24; h++) {
    hourlyLoadWatts.push(avgHourlyLoadW);

    if (h >= sunriseHour && h <= sunsetHour) {
      const normTime = (h - sunriseHour) / (sunsetHour - sunriseHour);
      const solarRatio = Math.sin(normTime * Math.PI);
      hourlySolarWatts.push(peakSolarW * solarRatio);
    } else {
      hourlySolarWatts.push(0);
    }
  }

  let currentCapWh = usableBatteryWh;
  let lowestSoC = 100;

  for (let h = 0; h < 24; h++) {
    const netWh = hourlySolarWatts[h] - hourlyLoadWatts[h];
    currentCapWh = Math.min(usableBatteryWh, Math.max(0, currentCapWh + netWh));
    const soc = usableBatteryWh > 0 ? (currentCapWh / usableBatteryWh) * 100 : 0;
    hourlySoC.push(soc);
    if (soc < lowestSoC) lowestSoC = soc;
  }

  document.getElementById('sim24LowestSoc').textContent = `${Math.round(lowestSoC)}%`;
  document.getElementById('sim24PeakWatts').textContent = Math.round(peakSolarW).toLocaleString();
  
  const statusEl = document.getElementById('sim24Status');
  if (lowestSoC <= 0) {
    statusEl.textContent = "CRITICAL - Battery depletes overnight before sunrise!";
    statusEl.className = "status-warn";
  } else if (lowestSoC < 20) {
    statusEl.textContent = "WARNING - High overnight battery discharge depth.";
    statusEl.className = "status-warn";
  } else {
    statusEl.textContent = "STABLE - Balanced 24-hour generation/consumption cycle.";
    statusEl.className = "status-ok";
  }

  const padLeft = 35;
  const padBottom = 25;
  const padTop = 15;
  const padRight = 35;

  const graphW = width - padLeft - padRight;
  const graphH = height - padTop - padBottom;

  const maxPowerScale = Math.max(peakSolarW, avgHourlyLoadW * 1.5, 100);

  ctx.strokeStyle = isDarkMode ? '#333' : '#e0e0e0';
  ctx.lineWidth = 1;

  for (let p = 0; p <= 4; p++) {
    const y = padTop + (graphH * (p / 4));
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }

  ctx.fillStyle = isDarkMode ? '#aaa' : '#666';
  ctx.font = '9px Arial';
  ctx.textAlign = 'center';
  for (let h = 0; h <= 24; h += 4) {
    const x = padLeft + (graphW * (h / 24));
    ctx.fillText(`${h}:00`, x, height - 8);
  }

  ctx.beginPath();
  ctx.moveTo(padLeft, padTop + graphH);
  for (let h = 0; h < 24; h++) {
    const x = padLeft + (graphW * (h / 23));
    const y = padTop + graphH - (graphH * (hourlySolarWatts[h] / maxPowerScale));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(padLeft + graphW, padTop + graphH);
  ctx.closePath();
  ctx.fillStyle = isDarkMode ? 'rgba(251, 192, 45, 0.25)' : 'rgba(251, 192, 45, 0.35)';
  ctx.fill();

  ctx.beginPath();
  for (let h = 0; h < 24; h++) {
    const x = padLeft + (graphW * (h / 23));
    const y = padTop + graphH - (graphH * (hourlySolarWatts[h] / maxPowerScale));
    if (h === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#fbc02d';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  for (let h = 0; h < 24; h++) {
    const x = padLeft + (graphW * (h / 23));
    const y = padTop + graphH - (graphH * (hourlyLoadWatts[h] / maxPowerScale));
    if (h === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#d32f2f';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  for (let h = 0; h < 24; h++) {
    const x = padLeft + (graphW * (h / 23));
    const y = padTop + graphH - (graphH * (hourlySoC[h] / 100));
    if (h === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#0288d1';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  document.getElementById('calcSocProgression').textContent = 
    `Lowest SoC: ${Math.round(lowestSoC)}% at 6:00 AM | Geometrically Derated Peak: ${Math.round(peakSolarW)} W at 1:00 PM`;
}

// --- Weather & Autonomy Stress Test Logic ---
function updateStressTest() {
  const simBaseSunHours = parseFloat(document.getElementById('simSunHours').value) || 0;
  const simBadDays = parseInt(document.getElementById('simBadDays').value) || 1;

  document.getElementById('sunHoursVal').textContent = `${simBaseSunHours.toFixed(1)} hrs`;
  document.getElementById('badDaysVal').textContent = `${simBadDays} day${simBadDays > 1 ? 's' : ''}`;

  const latDeg = parseFloat(document.getElementById('latitude').value) || 0;
  const tiltDeg = parseFloat(document.getElementById('panelTilt').value) || 0;
  const azimuthDeg = parseFloat(document.getElementById('panelAzimuth').value) || 180;
  const season = document.getElementById('seasonProfile').value;
  const derateFactor = calculateSolarDerating(latDeg, tiltDeg, azimuthDeg, season);

  const series = parseFloat(document.getElementById('panelsSeries').value) || 0;
  const parallel = parseFloat(document.getElementById('parallelStrings').value) || 0;
  const panelWatts = parseFloat(document.getElementById('panelWatts').value) || 0;
  const nameplateArrayWatts = series * parallel * panelWatts;
  
  const efficiency = (parseFloat(document.getElementById('efficiency').value) || 0) / 100;
  const batVolts = parseFloat(document.getElementById('batVolts').value) || 0;
  const batAh = parseFloat(document.getElementById('batAh').value) || 0;
  const batDoD = (parseFloat(document.getElementById('batDoD').value) || 0) / 100;
  const usableBatteryWh = (batVolts * batAh) * batDoD;

  let acDailyWh = 0;
  let dcDailyWh = 0;
  const wattInputs = document.querySelectorAll('.app-watts');
  const hourInputs = document.querySelectorAll('.app-hours');
  const typeInputs = document.querySelectorAll('.app-type');

  wattInputs.forEach((input, index) => {
    const w = parseFloat(input.value) || 0;
    const h = parseFloat(hourInputs[index].value) || 0;
    const type = typeInputs[index] ? typeInputs[index].value : 'AC';

    if (type === 'AC') {
      acDailyWh += (w * h);
    } else {
      dcDailyWh += (w * h);
    }
  });

  const totalDailyLoadWh = (acDailyWh / 0.90) + dcDailyWh;

  const lowYieldFactor = 0.20; 
  const stormyDailyYieldWh = nameplateArrayWatts * derateFactor * simBaseSunHours * efficiency * lowYieldFactor;
  const dailyDeficit = totalDailyLoadWh - stormyDailyYieldWh;
  const totalDeficitOverPeriod = dailyDeficit * simBadDays;

  const remainingStorageWh = Math.max(0, usableBatteryWh - totalDeficitOverPeriod);
  const finalSocPercent = usableBatteryWh > 0 ? Math.round((remainingStorageWh / usableBatteryWh) * 100) : 0;

  document.getElementById('simDailyYield').textContent = Math.round(stormyDailyYieldWh).toLocaleString();
  document.getElementById('simDailyDeficit').textContent = dailyDeficit > 0 ? `-${Math.round(dailyDeficit).toLocaleString()}` : '+0';
  document.getElementById('simFinalSoc').textContent = `${finalSocPercent}%`;

  const statusEl = document.getElementById('simStatus');
  if (totalDeficitOverPeriod <= 0) {
    statusEl.textContent = "Safe - Solar generation covers daily consumption even in bad weather.";
    statusEl.className = "status-ok";
  } else if (remainingStorageWh > 0) {
    statusEl.textContent = `Sufficient - Battery storage retains ${finalSocPercent}% usable charge after ${simBadDays} stormy days.`;
    statusEl.className = "status-ok";
  } else {
    const daysUntilDepletion = dailyDeficit > 0 ? (usableBatteryWh / dailyDeficit) : 0;
    statusEl.textContent = `CRITICAL DEFICIT - Battery bank completely depleted after ${daysUntilDepletion.toFixed(1)} days!`;
    statusEl.className = "status-warn";
  }

  document.getElementById('calcAutonomyDeriv').textContent = 
    `Usable Wh: ${Math.round(usableBatteryWh)} Wh / Daily Deficit: ${Math.round(dailyDeficit)} Wh/day = ${finalSocPercent}% SoC after ${simBadDays} bad weather days`;
}

function exportSpecSheet() {
  window.print();
}

function calculateSystem() {
  sanitizeInputs();
  saveSystemState();

  const panelWatts = parseFloat(document.getElementById('panelWatts').value) || 0;
  const panelVoc = parseFloat(document.getElementById('panelVoc').value) || 0;
  const panelIsc = parseFloat(document.getElementById('panelIsc').value) || 0;
  const tempCoeff = parseFloat(document.getElementById('tempCoeff').value) || 0;
  const minTemp = parseFloat(document.getElementById('minTemp').value) || 0;

  const series = parseFloat(document.getElementById('panelsSeries').value) || 0;
  const parallel = parseFloat(document.getElementById('parallelStrings').value) || 0;
  
  const latDeg = parseFloat(document.getElementById('latitude').value) || 0;
  const tiltDeg = parseFloat(document.getElementById('panelTilt').value) || 0;
  const azimuthDeg = parseFloat(document.getElementById('panelAzimuth').value) || 180;
  const season = document.getElementById('seasonProfile').value;
  const baseSunHours = parseFloat(document.getElementById('sunHours').value) || 0;

  const mpptMaxVolts = parseFloat(document.getElementById('mpptMaxVolts').value) || 0;
  const mpptMaxAmps = parseFloat(document.getElementById('mpptMaxAmps').value) || 0;
  const inverterWatts = parseFloat(document.getElementById('inverterWatts').value) || 0;
  const inverterSurge = parseFloat(document.getElementById('inverterSurge').value) || 0;

  const batVolts = parseFloat(document.getElementById('batVolts').value) || 0;
  const batAh = parseFloat(document.getElementById('batAh').value) || 0;
  const batDoD = (parseFloat(document.getElementById('batDoD').value) || 0) / 100;
  const efficiency = (parseFloat(document.getElementById('efficiency').value) || 0) / 100;

  const wireDistance = parseFloat(document.getElementById('wireDistance').value) || 0;
  const wireGauge = document.getElementById('wireGauge').value;
  const maxDropTarget = parseFloat(document.getElementById('maxDropTarget').value) || 3;

  const totalPanels = series * parallel;
  const nameplateArrayWatts = totalPanels * panelWatts;
  
  // Calculate Geometric Solar Incidence Derating
  const derateFactor = calculateSolarDerating(latDeg, tiltDeg, azimuthDeg, season);
  const effectiveArrayWatts = nameplateArrayWatts * derateFactor;
  const effectiveSunHours = baseSunHours * derateFactor;

  const arrayVoc = series * panelVoc;
  const arrayIsc = parallel * panelIsc;

  const stcRefTemp = currentTempUnit === 'F' ? 77 : 25;
  const deltaTemp = minTemp - stcRefTemp; 
  const coldVocMultiplier = 1 + ((deltaTemp * tempCoeff) / 100);
  const arrayVocCold = arrayVoc * coldVocMultiplier;

  let acDailyWh = 0;
  let dcDailyWh = 0;
  let acRunningWatts = 0;
  let acSurgeWatts = 0;

  const wattInputs = document.querySelectorAll('.app-watts');
  const hourInputs = document.querySelectorAll('.app-hours');
  const surgeInputs = document.querySelectorAll('.app-surge');
  const typeInputs = document.querySelectorAll('.app-type');

  wattInputs.forEach((input, index) => {
    const w = parseFloat(input.value) || 0;
    const h = parseFloat(hourInputs[index].value) || 0;
    const s = parseFloat(surgeInputs[index].value) || 1;
    const type = typeInputs[index] ? typeInputs[index].value : 'AC';

    if (type === 'AC') {
      acRunningWatts += w;
      acSurgeWatts += (w * s);
      acDailyWh += (w * h);
    } else {
      dcDailyWh += (w * h);
    }
  });

  const inverterInversionEfficiency = 0.90;
  const grossAcDailyWh = acDailyWh / inverterInversionEfficiency;
  const totalDailyLoadWh = grossAcDailyWh + dcDailyWh;

  const dailyYieldWh = nameplateArrayWatts * effectiveSunHours * efficiency;
  const rawBatteryWh = batVolts * batAh;
  const usableBatteryWh = rawBatteryWh * batDoD;
  
  const effectiveGenWatts = effectiveArrayWatts * efficiency;
  const chargeTimeHours = effectiveGenWatts > 0 ? (usableBatteryWh / effectiveGenWatts) : 0;
  const daysAutonomy = totalDailyLoadWh > 0 ? (usableBatteryWh / totalDailyLoadWh) : 0;

  const ohmPer1000Ft = NEC_COPPER_RESISTANCE[wireGauge] || 0;
  const totalWireLengthFt = wireDistance * 2;
  const totalResistance = (totalWireLengthFt / 1000) * ohmPer1000Ft;
  const voltageDrop = arrayIsc * totalResistance;
  const percentDrop = arrayVoc > 0 ? (voltageDrop / arrayVoc) * 100 : 0;
  const powerLossWatts = Math.pow(arrayIsc, 2) * totalResistance;

  document.getElementById('resTotalPanels').textContent = totalPanels;
  document.getElementById('resArrayWatts').textContent = nameplateArrayWatts.toLocaleString();
  document.getElementById('resDerateFactor').textContent = `${Math.round(derateFactor * 100)}%`;
  document.getElementById('resEffectiveSunHours').textContent = effectiveSunHours.toFixed(1);

  document.getElementById('resArrayVoc').textContent = arrayVoc.toFixed(1);
  document.getElementById('resColdTempLabel').textContent = minTemp;
  document.getElementById('resArrayVocCold').textContent = arrayVocCold.toFixed(1);
  document.getElementById('resArrayIsc').textContent = arrayIsc.toFixed(1);

  const vocCheckEl = document.getElementById('resVocCheck');
  vocCheckEl.textContent = arrayVoc <= mpptMaxVolts ? "(Safe STC)" : "(EXCEEDS MPPT VOLTS!)";
  vocCheckEl.className = arrayVoc <= mpptMaxVolts ? "status-ok" : "status-warn";

  const coldVocCheckEl = document.getElementById('resColdVocCheck');
  coldVocCheckEl.textContent = arrayVocCold <= mpptMaxVolts ? "(Safe Cold)" : "(EXCEEDS MPPT VOLTS IN COLD!)";
  coldVocCheckEl.className = arrayVocCold <= mpptMaxVolts ? "status-ok" : "status-warn";

  const iscCheckEl = document.getElementById('resIscCheck');
  iscCheckEl.textContent = arrayIsc <= mpptMaxAmps ? "(Safe)" : "(EXCEEDS MPPT AMPS!)";
  iscCheckEl.className = arrayIsc <= mpptMaxAmps ? "status-ok" : "status-warn";

  document.getElementById('resRunningWatts').textContent = acRunningWatts.toLocaleString();
  document.getElementById('resSurgeWatts').textContent = acSurgeWatts.toLocaleString();

  const inverterCheckEl = document.getElementById('resInverterCheck');
  inverterCheckEl.textContent = acRunningWatts <= inverterWatts ? "(Safe)" : "(OVERLOAD RISK!)";
  inverterCheckEl.className = acRunningWatts <= inverterWatts ? "status-ok" : "status-warn";

  const surgeCheckEl = document.getElementById('resSurgeCheck');
  surgeCheckEl.textContent = acSurgeWatts <= inverterSurge ? "(Safe)" : "(SURGE OVERLOAD RISK!)";
  surgeCheckEl.className = acSurgeWatts <= inverterSurge ? "status-ok" : "status-warn";

  document.getElementById('resDailyYield').textContent = Math.round(dailyYieldWh).toLocaleString();
  document.getElementById('resDailyLoad').textContent = 
    `${Math.round(totalDailyLoadWh).toLocaleString()} Wh/day (${Math.round(grossAcDailyWh)} Wh AC + ${Math.round(dcDailyWh)} Wh DC)`;
  
  const balanceEl = document.getElementById('resEnergyBalance');
  if (dailyYieldWh >= totalDailyLoadWh) {
    balanceEl.textContent = `Surplus of +${Math.round(dailyYieldWh - totalDailyLoadWh)} Wh/day`;
    balanceEl.className = "status-ok";
  } else {
    balanceEl.textContent = `Deficit of -${Math.round(totalDailyLoadWh - dailyYieldWh)} Wh/day`;
    balanceEl.className = "status-warn";
  }

  document.getElementById('resBatWh').textContent = Math.round(usableBatteryWh).toLocaleString();
  document.getElementById('resChargeTime').textContent = chargeTimeHours.toFixed(1);
  document.getElementById('resAutonomy').textContent = daysAutonomy.toFixed(2);

  const storageUsagePercent = usableBatteryWh > 0 ? Math.min(Math.round((totalDailyLoadWh / usableBatteryWh) * 100), 100) : 0;
  const barEl = document.getElementById('batteryProgressBar');
  document.getElementById('resStorageUsagePercent').textContent = `${storageUsagePercent}% of usable storage`;
  barEl.style.width = `${storageUsagePercent}%`;
  barEl.style.backgroundColor = storageUsagePercent > 100 ? '#d32f2f' : '#2e7d32';

  document.getElementById('resVoltsDrop').textContent = voltageDrop.toFixed(2);
  document.getElementById('resPercentDrop').textContent = percentDrop.toFixed(2);
  document.getElementById('resPowerLoss').textContent = powerLossWatts.toFixed(1);

  const dropStatusEl = document.getElementById('resDropStatus');
  dropStatusEl.textContent = percentDrop <= maxDropTarget ? "(Within Target)" : "(EXCEEDS TARGET DROP!)";
  dropStatusEl.className = percentDrop <= maxDropTarget ? "status-ok" : "status-warn";

  document.getElementById('calcTiltDerate').textContent = 
    `Lat: ${latDeg}° | Tilt: ${tiltDeg}° | Azi: ${azimuthDeg}° | Season: ${season.toUpperCase()} → Derating: ${Math.round(derateFactor * 100)}% (${nameplateArrayWatts}W → ${Math.round(effectiveArrayWatts)}W)`;

  document.getElementById('calcColdVoc').textContent = 
    `${arrayVoc.toFixed(1)} V × (1 + (${deltaTemp}°${currentTempUnit} × ${tempCoeff}% / 100)) = ${arrayVocCold.toFixed(1)} V at ${minTemp}°${currentTempUnit}`;

  document.getElementById('calcVocIsc').textContent = 
    `Voc: ${series} × ${panelVoc}V = ${arrayVoc.toFixed(1)}V | Isc: ${parallel} × ${panelIsc}A = ${arrayIsc.toFixed(1)}A`;

  document.getElementById('calcInverter').textContent = 
    `Running AC: ${acRunningWatts}W vs ${inverterWatts}W | Peak AC Surge: ${acSurgeWatts}W vs ${inverterSurge}W`;

  document.getElementById('calcLoadSplit').textContent = 
    `(${Math.round(acDailyWh)} AC Wh / 0.90 Eff = ${Math.round(grossAcDailyWh)} Wh) + ${Math.round(dcDailyWh)} DC Wh = ${Math.round(totalDailyLoadWh)} Total Wh`;

  document.getElementById('calcBat').textContent = 
    `(${batVolts} V × ${batAh} Ah) × ${batDoD * 100}% DoD = ${Math.round(usableBatteryWh)} Wh`;

  document.getElementById('calcWireDrop').textContent = 
    `${arrayIsc.toFixed(1)} A × (${totalWireLengthFt} ft / 1000 × ${ohmPer1000Ft} Ω) = ${voltageDrop.toFixed(2)} V drop (${percentDrop.toFixed(2)}%)`;

  // Visual Interactive SVG Diagram Updates
  document.getElementById('svgArrayPower').textContent = `${Math.round(effectiveArrayWatts)} W`;
  document.getElementById('svgArrayVolts').textContent = `${arrayVoc.toFixed(1)} V`;
  document.getElementById('svgBatVolts').textContent = `${batVolts} V`;
  document.getElementById('svgBatCap').textContent = `${Math.round(usableBatteryWh)} Wh`;

  document.getElementById('svgAcLoad').textContent = `${acRunningWatts} W AC`;
  document.getElementById('svgDcLoad').textContent = `${Math.round(dcDailyWh / 24)} W DC avg`;

  const mpptBox = document.getElementById('svgMpptBox');
  const mpptStatus = document.getElementById('svgMpptStatus');
  if (arrayVocCold > mpptMaxVolts || arrayIsc > mpptMaxAmps) {
    mpptBox.classList.add('warn');
    mpptStatus.textContent = 'OVERLOAD';
  } else {
    mpptBox.classList.remove('warn');
    mpptStatus.textContent = 'OK';
  }

  const invBox = document.getElementById('svgInverterBox');
  const invStatus = document.getElementById('svgInverterStatus');
  if (acRunningWatts > inverterWatts || acSurgeWatts > inverterSurge) {
    invBox.classList.add('warn');
    invStatus.textContent = 'OVERLOAD';
  } else {
    invBox.classList.remove('warn');
    invStatus.textContent = 'OK';
  }

  document.getElementById('placeholderText').style.display = 'none';
  document.getElementById('diagramCard').style.display = 'block';
  document.getElementById('sim24Card').style.display = 'block';
  document.getElementById('stressTestCard').style.display = 'block';
  document.getElementById('results').style.display = 'block';
  document.getElementById('derivationSection').style.display = 'block';

  render24HourSimulation(effectiveArrayWatts, effectiveSunHours, efficiency, usableBatteryWh, totalDailyLoadWh);
  updateStressTest();
}