document.addEventListener('DOMContentLoaded', (event) => {
    let watchId, startTime, totalDistance = 0, lastPosition = null, timeInterval;
    const status = document.getElementById('status');
    const timeDisplay = document.getElementById('time');
    const distanceDisplay = document.getElementById('distance');
    const startBtn = document.getElementById('start');
    const pauseBtn = document.getElementById('pause');
    const stopBtn = document.getElementById('stop');
    const gpsSignal = document.getElementById('gps-signal');
    const gpsSignalText = document.getElementById('gps-signal-text');

    // Check for geolocation support
    if ("geolocation" in navigator) {
        startBtn.addEventListener('click', startTracking);
        pauseBtn.addEventListener('click', pauseTracking);
        stopBtn.addEventListener('click', stopTracking);
        navigator.geolocation.getCurrentPosition(showGPSStrength, showError, {enableHighAccuracy: true});
    } else {
        alert('Geolocation is not supported by your browser');
    }

    function showGPSStrength(position) {
        updateGPSSignal(position.coords.accuracy);
    }

    function startTracking() {
        startTime = new Date(); // Set start time here
        console.log('Start time set:', startTime);
        if (navigator.permissions) {
            navigator.permissions.query({name:'geolocation'}).then(result => {
                if (result.state === 'granted') {
                    startGPS();
                } else if (result.state === 'prompt') {
                    navigator.geolocation.getCurrentPosition(startGPS, showError, {enableHighAccuracy: true});
                } else {
                    alert('Please enable location services to use this app.');
                }
            });
        } else {
            navigator.geolocation.getCurrentPosition(startGPS, showError, {enableHighAccuracy: true});
        }
    }

    function startGPS() {
        console.log('GPS started');
        watchId = navigator.geolocation.watchPosition(updatePosition, showError, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        });
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        status.style.display = 'block';
        status.style.animation = 'blink 1s infinite';
        timeInterval = setInterval(updateTime, 1000); // Update time every second
    }

    // ... rest of the code remains unchanged ...
});

    function updatePosition(position) {
        if (lastPosition) {
            const distance = calculateDistance(lastPosition, position.coords);
            if (distance < 1609.34) { // Filter out impossible speeds (1 mile in meters)
                totalDistance += distance;
                distanceDisplay.textContent = (totalDistance / 1609.34).toFixed(2) + ' mi';
            }
        }
        lastPosition = position.coords;
        updateGPSSignal(position.coords.accuracy);
    }

    function calculateDistance(pos1, pos2) {
        const R = 6371e3; // Earth's mean radius in meters
        const lat1 = pos1.latitude * Math.PI / 180;
        const lat2 = pos2.latitude * Math.PI / 180;
        const deltaLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
        const deltaLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in meters
    }

    function updateGPSSignal(accuracy) {
        let signalStrength = 100 - Math.min(accuracy, 100);
        gpsSignal.style.width = `${signalStrength}%`;
        gpsSignal.style.backgroundColor = `hsl(${signalStrength * 1.2}, 100%, 50%)`;
        if (signalStrength >= 80) {
            gpsSignalText.textContent = 'GPS Signal: Excellent';
        } else if (signalStrength >= 60) {
            gpsSignalText.textContent = 'GPS Signal: Good';
        } else if (signalStrength >= 40) {
            gpsSignalText.textContent = 'GPS Signal: Fair';
        } else if (signalStrength >= 20) {
            gpsSignalText.textContent = 'GPS Signal: Poor';
        } else {
            gpsSignalText.textContent = 'GPS Signal: Weak';
        }
    }

    function updateTime() {
        const currentTime = new Date();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000);
        const hours = Math.floor(elapsedTime / 3600);
        const minutes = Math.floor((elapsedTime % 3600) / 60);
        const seconds = elapsedTime % 60;
        timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function showError(error) {
        switch(error.code) {
            case error.PERMISSION_DENIED:
                alert("User denied the request for Geolocation.");
                break;
            case error.POSITION_UNAVAILABLE:
                alert("Location information is unavailable.");
                break;
            case error.TIMEOUT:
                alert("The request to get user location timed out.");
                break;
            case error.UNKNOWN_ERROR:
                alert("An unknown error occurred.");
                break;
        }
    }

    function pauseTracking() {
        navigator.geolocation.clearWatch(watchId);
        pauseBtn.disabled = true;
        startBtn.disabled = false;
        status.style.animation = 'none';
        clearInterval(timeInterval);
    }

    function stopTracking() {
        navigator.geolocation.clearWatch(watchId);
        const endTime = new Date();
        const runData = {
            distance: totalDistance / 1609.34,
            time: (endTime - startTime) / 1000,
            startDateTime: startTime.toISOString()
        };
        saveRunData(runData);
        resetApp();
    }

    function saveRunData(data) {
        // Here you would implement saving the run data, perhaps to localStorage or a server
        console.log('Run Data:', data);
    }

    function resetApp() {
        totalDistance = 0;
        lastPosition = null;
        timeDisplay.textContent = '00:00:00';
        distanceDisplay.textContent = '0.00 mi';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        status.style.display = 'none';
        status.style.animation = 'none';
        clearInterval(timeInterval);
    }
});
