document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    const leaderboards = [
        // Scores (higher is better)
        { title: 'Block Puzzle', key: 'blockPuzzleHighScore', unit: ' pts', type: 'score', url: 'block_puzzle.html' },
        { title: 'Bubble Shooter', key: 'bubbleShooterHighScore', unit: ' pts', type: 'score', url: 'bubble_shooter.html' },
        { title: 'Javelin Throw', key: 'javelinBestScore', unit: 'm', type: 'score', url: 'javelin_throw.html' },
        { title: 'Long Jump', key: 'longJumpBestScore', unit: 'm', type: 'score', url: 'long_jump.html' },
        // Times (lower is better)
        { title: '100m Sprint (Easy)', key: 'sprintBestTime_easy', unit: 's', type: 'time', url: 'sprint.html' },
        { title: '100m Sprint (Medium)', key: 'sprintBestTime_medium', unit: 's', type: 'time', url: 'sprint.html' },
        { title: '100m Sprint (Hard)', key: 'sprintBestTime_hard', unit: 's', type: 'time', url: 'sprint.html' },
        { title: 'Swimming (Easy)', key: 'swimmingBestTime_easy', unit: 's', type: 'time', url: 'swimming.html' },
        { title: 'Swimming (Medium)', key: 'swimmingBestTime_medium', unit: 's', type: 'time', url: 'swimming.html' },
        { title: 'Swimming (Hard)', key: 'swimmingBestTime_hard', unit: 's', type: 'time', url: 'swimming.html' },
        // Levels (higher is better)
        { title: 'Archery', key: 'archerySavedLevel', unit: ' Level', type: 'level', url: 'archery.html' },
        { title: 'Target Practice', key: 'targetSavedLevel', unit: ' Level', type: 'level', url: 'target_practice.html' },
        { title: 'Skeet Shooting', key: 'skeetSavedRound', unit: ' Round', type: 'level', url: 'skeet_shooting.html' },
        { title: 'Basketball', key: 'basketballSavedChallenge', unit: ' Level', type: 'level', url: 'basketball.html' },
        { title: 'Hoop Stack', key: 'hoopStackLevel', unit: ' Level', type: 'level', url: 'hoop_stack.html' },
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
            } else if (lb.type === 'level') {
                // Handle 0-indexed vs 1-indexed levels for display
                let displayValue = parseInt(value);
                if (lb.key !== 'skeetSavedRound' && lb.key !== 'hoopStackLevel') {
                    displayValue += 1; // 0-indexed keys need +1 for display
                }
                scoreDisplay = `${displayValue}${lb.unit}`;
                icon = '📈';
            } else {
                scoreDisplay = `${parseInt(value)}${lb.unit}`;
                icon = '🏆';
            }

            scoreDiv.innerHTML = `
                <div class="game-info">
                    <span class="game-title">${lb.title}</span>
                    <span class="game-score">${icon} ${scoreDisplay}</span>
                </div>
                <a href="${lb.url}" class="play-now-btn">Play Now</a>
            `;
            container.appendChild(scoreDiv);
        }
    });

    if (!hasScores) {
        container.innerHTML = '<p>You haven\'t set any high scores yet. Go play some games!</p>';
    }
});