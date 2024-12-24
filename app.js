document.addEventListener('DOMContentLoaded', (event) => {
    let watchId, startTime, totalDistance = 0, lastPosition = null;
    const status = document.getElementById('status');
    const timeDisplay = document.getElementById('time');
    const distanceDisplay = document.getElementById('distance');
    const startBtn = document.getElementById('start');
    const pauseBtn = document.getElementById('pause');
    const stopBtn = document.getElementById('stop');
    const gpsSignal = document.getElementById('gps-signal');

    // Check for geolocation support
    if ("geolocation" in navigator) {
        startBtn.addEventListener('click', startTracking);
        pauseBtn.addEventListener('click', pauseTracking);
        stopBtn.addEventListener('click', stopTracking);
    } else {
        alert('Geolocation is not supported by your browser');
    }

    function startTracking() {
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
        startTime = new Date();
        watchId = navigator.geolocation.watchPosition(updatePosition, showError, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        });
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        status.style.display = 'block';
    }

    function updatePosition(position) {
        if (lastPosition) {
            const distance = calculateDistance(lastPosition, position.coords);
            if (distance < 1000) { // Filter out impossible speeds
                totalDistance += distance;
                distanceDisplay.textContent = (totalDistance / 1000).toFixed(2) + ' km';
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
    }

    function stopTracking() {
        navigator.geolocation.clearWatch(watchId);
        const endTime = new Date();
        const runData = {
            distance: totalDistance / 1000,
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
        distanceDisplay.textContent = '0.00 km';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        status.style.display = 'none';
    }
});
