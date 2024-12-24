class RunTracker {
    constructor() {
        this.distance = 0;
        this.lastPosition = null;
        this.isTracking = false;
        this.startTime = null;
        this.elapsedTime = 0;
        this.watchId = null;
        this.timer = null;
        this.accuracyThreshold = 20; // meters
        this.speedThreshold = 8.94; // ~20mph in m/s
        this.initializeElements();
        this.setupEventListeners();
        this.checkGPSPermission();
    }

    initializeElements() {
        this.distanceElement = document.getElementById('distance');
        this.timeElement = document.getElementById('time');
        this.gpsIndicator = document.getElementById('gps-indicator');
        this.trackingText = document.getElementById('tracking');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startRun());
        this.pauseBtn.addEventListener('click', () => this.pauseRun());
        this.stopBtn.addEventListener('click', () => this.stopRun());
    }

    async checkGPSPermission() {
        if ('geolocation' in navigator) {
            try {
                const permission = await navigator.permissions.query({ name: 'geolocation' });
                if (permission.state === 'granted') {
                    this.startGPSWatch();
                } else if (permission.state === 'prompt') {
                    this.requestGPSPermission();
                }
            } catch (error) {
                this.updateGPSIndicator(0);
            }
        }
    }

    requestGPSPermission() {
        navigator.geolocation.getCurrentPosition(
            () => this.startGPSWatch(),
            error => this.handleGPSError(error),
            { enableHighAccuracy: true }
        );
    }

    startGPSWatch() {
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        this.watchId = navigator.geolocation.watchPosition(
            position => this.handlePosition(position),
            error => this.handleGPSError(error),
            options
        );
    }

    updateGPSIndicator(accuracy) {
        let color = '--gps-none';
        if (accuracy <= 5) color = '--gps-excellent';
        else if (accuracy <= 10) color = '--gps-good';
        else if (accuracy <= 20) color = '--gps-medium';
        else if (accuracy <= 30) color = '--gps-weak';

        this.gpsIndicator.style.background = `var(${color})`;
        this.gpsIndicator.style.boxShadow = `0 0 10px var(${color})`;
    }

    handlePosition(position) {
        const accuracy = position.coords.accuracy;
        this.updateGPSIndicator(accuracy);

        if (this.isTracking && accuracy <= this.accuracyThreshold) {
            this.updateDistance(position);
        }
    }

    updateDistance(position) {
        if (!this.lastPosition) {
            this.lastPosition = position;
            return;
        }

        const distance = this.calculateDistance(
            this.lastPosition.coords.latitude,
            this.lastPosition.coords.longitude,
            position.coords.latitude,
            position.coords.longitude
        );

        const timeElapsed = (position.timestamp - this.lastPosition.timestamp) / 1000;
        const speed = distance / timeElapsed;

        if (speed <= this.speedThreshold) {
            this.distance += distance;
            this.distanceElement.textContent = (this.distance / 1609.34).toFixed(2);
        }

        this.lastPosition = position;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    startRun() {
        this.isTracking = true;
        this.startTime = Date.now() - this.elapsedTime;
        this.timer = setInterval(() => this.updateTime(), 1000);
        this.trackingText.classList.remove('hidden');
        this.startBtn.classList.add('hidden');
        this.pauseBtn.classList.remove('hidden');
        this.stopBtn.classList.remove('hidden');
        
        if ('wakeLock' in navigator) {
            this.requestWakeLock();
        }
    }

    async requestWakeLock() {
        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            console.log(`${err.name}, ${err.message}`);
        }
    }

    pauseRun() {
        this.isTracking = false;
        clearInterval(this.timer);
        this.elapsedTime = Date.now() - this.startTime;
        this.trackingText.classList.add('hidden');
        this.startBtn.classList.remove('hidden');
        this.pauseBtn.classList.add('hidden');
    }

    stopRun() {
        this.isTracking = false;
        clearInterval(this.timer);
        this.saveRun();
        this.resetRun();
    }

    updateTime() {
        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor((elapsed / 1000) % 60);
        const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
        const hours = Math.floor((elapsed / (1000 * 60 * 60)) % 24);
        
        this.timeElement.textContent = 
            `${hours.toString().padStart(2, '0')}:${
             minutes.toString().padStart(2, '0')}:${
             seconds.toString().padStart(2, '0')}`;
    }

    saveRun() {
        const report = `Run Report\n
Date: ${new Date(this.startTime).toLocaleString()}
Distance: ${(this.distance / 1609.34).toFixed(2)} miles
Time: ${this.timeElement.textContent}`;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `run-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    resetRun() {
        this.distance = 0;
        this.lastPosition = null;
        this.startTime = null;
        this.elapsedTime = 0;
        this.distanceElement.textContent = '0.00';
        this.timeElement.textContent = '00:00:00';
        this.trackingText.classList.add('hidden');
        this.startBtn.classList.remove('hidden');
        this.pauseBtn.classList.add('hidden');
        this.stopBtn.classList.add('hidden');
        
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
    }

    handleGPSError(error) {
        console.error('GPS Error:', error);
        this.updateGPSIndicator(0);
    }
}

// Initialize the app
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

const runTracker = new RunTracker();
