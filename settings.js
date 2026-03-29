document.addEventListener('DOMContentLoaded', () => {
    const bgmToggle = document.getElementById('bgm-toggle');
    const sfxToggle = document.getElementById('sfx-toggle');
    const resetBtn = document.getElementById('reset-progress-btn');
    const cacheBtn = document.getElementById('clear-cache-btn');

    // Initialize toggles based on localStorage
    let bgmEnabled = localStorage.getItem('bgmEnabled') !== 'false'; // default true
    let sfxEnabled = localStorage.getItem('sfxEnabled') !== 'false'; // default true

    bgmToggle.checked = bgmEnabled;
    sfxToggle.checked = sfxEnabled;

    // Event Listeners for toggles
    bgmToggle.addEventListener('change', () => {
        localStorage.setItem('bgmEnabled', bgmToggle.checked);
    });

    sfxToggle.addEventListener('change', () => {
        localStorage.setItem('sfxEnabled', sfxToggle.checked);
    });

    // Reset Progress Logic
    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all your game progress? This cannot be undone.')) {
            // List of all localStorage keys used for progress
            const progressKeys = [
                'archerySavedLevel',
                'targetSavedLevel',
                'skeetSavedRound',
                'basketballSavedChallenge',
                'sprintBestTime_easy',
                'sprintBestTime_medium',
                'sprintBestTime_hard',
                'swimmingBestTime_easy',
                'swimmingBestTime_medium',
                'swimmingBestTime_hard',
                'longJumpBestScore',
                'javelinBestScore',
                'hoopStackLevel',
                'blockPuzzleHighScore',
                'bubbleShooterHighScore',
                'bubbleShooterSave',
                'businessGameSave'
            ];
            
            progressKeys.forEach(key => localStorage.removeItem(key));
            
            alert('All game progress has been successfully reset!');
        }
    });

    // Clear Cache Logic
    cacheBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the cache and reload? This will re-download all game files.')) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    const unregisterPromises = registrations.map(registration => registration.unregister());
                    return Promise.all(unregisterPromises);
                }).then(() => {
                    return caches.keys().then(function(cacheNames) {
                        const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
                        return Promise.all(deletePromises);
                    });
                }).then(() => {
                    alert('Cache cleared! The application will now reload.');
                    window.location.reload(true);
                }).catch(error => {
                    console.error('Cache clearing failed:', error);
                    alert('Failed to clear cache. Please try clearing your browser data manually.');
                });
            } else {
                alert('Service workers are not supported in this browser. Please clear cache manually.');
            }
        }
    });
});