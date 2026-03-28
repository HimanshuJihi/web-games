document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    const leaderboards = [
        { title: 'Block Puzzle', key: 'blockPuzzleHighScore', unit: ' pts', type: 'score' },
        { title: 'Bubble Shooter', key: 'bubbleShooterHighScore', unit: ' pts', type: 'score' },
        { title: 'Javelin Throw', key: 'javelinBestScore', unit: 'm', type: 'score' },
        { title: 'Long Jump', key: 'longJumpBestScore', unit: 'm', type: 'score' },
        { title: '100m Sprint (Easy)', key: 'sprintBestTime_easy', unit: 's', type: 'time' },
        { title: '100m Sprint (Medium)', key: 'sprintBestTime_medium', unit: 's', type: 'time' },
        { title: '100m Sprint (Hard)', key: 'sprintBestTime_hard', unit: 's', type: 'time' },
        { title: 'Swimming (Easy)', key: 'swimmingBestTime_easy', unit: 's', type: 'time' },
        { title: 'Swimming (Medium)', key: 'swimmingBestTime_medium', unit: 's', type: 'time' },
        { title: 'Swimming (Hard)', key: 'swimmingBestTime_hard', unit: 's', type: 'time' },
    ];

    let hasScores = false;
    leaderboards.forEach(lb => {
        const value = localStorage.getItem(lb.key);
        if (value) {
            hasScores = true;
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'leaderboard-item';

            let scoreDisplay = '';
            let icon = '';

            if (lb.type === 'time') {
                scoreDisplay = `${parseFloat(value).toFixed(2)}${lb.unit}`;
                icon = '⏱️';
            } else {
                scoreDisplay = `${parseInt(value)}${lb.unit}`;
                icon = '🏆';
            }

            scoreDiv.innerHTML = `
                <span class="game-title">${lb.title}</span>
                <span class="game-score">${icon} ${scoreDisplay}</span>
            `;
            container.appendChild(scoreDiv);
        }
    });

    if (!hasScores) {
        container.innerHTML = '<p>You haven\'t set any high scores yet. Go play some games!</p>';
    }
});