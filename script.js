// script.js

document.addEventListener('DOMContentLoaded', () => {
    const unoContainer = document.getElementById('uno-container');
    const phase10Container = document.getElementById('phase10-container');

    document.getElementById('play-uno').addEventListener('click', () => {
        hideAll();
        unoContainer.classList.remove('hidden');
        startGame(); // From uno.js
    });

    document.getElementById('play-phase10').addEventListener('click', () => {
        hideAll();
        phase10Container.classList.remove('hidden');
        startPhase10(); // From phase10.js
    });

    function hideAll() {
        unoContainer.classList.add('hidden');
        phase10Container.classList.add('hidden');
    }
});
