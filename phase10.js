// phase10.js

let phase10Deck = [];
let phase10PlayerHand = [];
let phase10Bots = [
    { hand: [], name: "Bot 1", phaseProgress: 1 },
    { hand: [], name: "Bot 2", phaseProgress: 1 },
    { hand: [], name: "Bot 3", phaseProgress: 1 }
];

let currentPhase = 1;
let currentCard = null;
let currentPlayer = 'player'; // 'player', 'bot1', 'bot2', 'bot3'
let gameDirection = 1; // 1 = forward, -1 = reverse
let phaseCompletedByPlayers = {};
let discardPile = [];

const PHASES = [
    { description: "Two sets of 3", sets: 2, setType: 'set', setCount: 3 },
    { description: "One set of 5", sets: 1, setType: 'set', setCount: 5 },
    { description: "One run of 4 + one set of 4", sets: 1, setType: 'set', setCount: 4, run: true, runLength: 4 },
    { description: "Two runs of 3", sets: 0, setType: 'run', run: true, runLength: 3, runCount: 2 },
    { description: "Three sets of 3", sets: 3, setType: 'set', setCount: 3 },
    { description: "One run of 5", sets: 0, setType: 'run', run: true, runLength: 5 },
    { description: "Two sets of 4 + one skip", sets: 2, setType: 'set', setCount: 4, skip: true },
    { description: "Seven cards of one color", colorMatch: true, colorCount: 7 },
    { description: "One run of 5 + one set of 2", sets: 1, setType: 'set', setCount: 2, run: true, runLength: 5 },
    { description: "One run of 7", sets: 0, setType: 'run', run: true, runLength: 7 }
];

function createPhase10Deck() {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const values = [...Array(12).keys()].map(i => i + 1); // 1–12
    let newDeck = [];

    colors.forEach(color => {
        values.forEach(value => {
            newDeck.push({ color, value });
            if (value !== 1) newDeck.push({ color, value }); // Two copies except 1
        });
    });

    // Wild cards worth 50 points
    for (let i = 0; i < 8; i++) {
        newDeck.push({ color: 'black', value: 50 });
    }

    return shuffle(newDeck);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function dealInitialCards() {
    phase10PlayerHand = phase10Deck.slice(0, 10);
    phase10Deck = phase10Deck.slice(10);

    phase10Bots.forEach(bot => {
        bot.hand = phase10Deck.slice(0, 10);
        phase10Deck = phase10Deck.slice(10);
    });

    discardPile = [phase10Deck.pop()];
    currentCard = discardPile[0];
    renderUI();
}

function drawCard(playerType) {
    if (phase10Deck.length === 0) {
        showMessage("No more cards to draw.");
        return;
    }
    const drawnCard = phase10Deck.pop();

    if (playerType === 'player') {
        phase10PlayerHand.push(drawnCard);
        showMessage(`You drew a ${drawnCard.value} ${drawnCard.color.toUpperCase()} card.`);
    } else {
        const botIndex = parseInt(playerType.replace('bot', '')) - 1;
        phase10Bots[botIndex].hand.push(drawnCard);
    }

    renderUI();
}

function discardCard(index) {
    const card = phase10PlayerHand.splice(index, 1)[0];
    discardPile.unshift(card);
    currentCard = card;

    checkPhaseCompletion('player');
    renderUI();
    nextTurn();
}

function checkPhaseCompletion(playerType) {
    const phase = PHASES[currentPhase - 1];
    const hand = playerType === 'player' ? phase10PlayerHand : phase10Bots[playerType.replace('bot', '') - 1].hand;
    const groups = groupByColorAndValue(hand);

    if (phase.sets && phase.setType === 'set') {
        const setCount = countSets(groups.values, phase.setCount);
        if (setCount >= phase.sets) {
            phaseCompletedByPlayers[playerType] = true;
            showMessage(`${playerType === 'player' ? 'You' : phase10Bots[playerType.replace('bot', '') - 1].name} completed Phase ${currentPhase}!`);
        }
    } else if (phase.run) {
        const runCount = countRuns(groups.colors);
        if (runCount >= (phase.runCount || 1)) {
            phaseCompletedByPlayers[playerType] = true;
            showMessage(`${playerType === 'player' ? 'You' : phase10Bots[playerType.replace('bot', '') - 1].name} completed Phase ${currentPhase}!`);
        }
    } else if (phase.colorMatch) {
        const colorCounts = {};
        hand.forEach(c => {
            colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
        });
        for (let color in colorCounts) {
            if (colorCounts[color] >= phase.colorCount) {
                phaseCompletedByPlayers[playerType] = true;
                showMessage(`${playerType === 'player' ? 'You' : phase10Bots[playerType.replace('bot', '') - 1].name} completed Phase ${currentPhase}!`);
                break;
            }
        }
    }

    if (Object.keys(phaseCompletedByPlayers).length === Object.keys(getAllPlayers()).length) {
        completePhaseForAll();
    }
}

function completePhaseForAll() {
    currentPhase++;
    phaseCompletedByPlayers = {};
    if (currentPhase <= 10) {
        document.getElementById('phase-number').textContent = currentPhase;
        document.getElementById('phase-description').textContent = PHASES[currentPhase - 1].description;
        resetRound();
    } else {
        endGame();
    }
}

function resetRound() {
    phase10Deck = createPhase10Deck();
    phase10PlayerHand = [];
    phase10Bots.forEach(bot => bot.hand = []);
    dealInitialCards();
}

function groupByColorAndValue(hand) {
    const colorGroups = {};
    const valueGroups = {};

    hand.forEach(card => {
        if (!colorGroups[card.color]) colorGroups[card.color] = [];
        if (!valueGroups[card.value]) valueGroups[card.value] = [];
        colorGroups[card.color].push(card);
        valueGroups[card.value].push(card);
    });

    return { colors: colorGroups, values: valueGroups };
}

function countSets(valueGroups, requiredCount) {
    let count = 0;
    for (let val in valueGroups) {
        if (valueGroups[val].length >= requiredCount) count++;
    }
    return count;
}

function countRuns(colorGroups) {
    let runCount = 0;
    for (let color in colorGroups) {
        const sorted = colorGroups[color].map(c => c.value).sort((a, b) => a - b);
        let currentRun = 1;
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === sorted[i - 1] + 1) {
                currentRun++;
                if (currentRun >= 4) runCount++;
            } else if (sorted[i] !== sorted[i - 1]) {
                currentRun = 1;
            }
        }
    }
    return runCount;
}

function getAllPlayers() {
    return {
        player: phase10PlayerHand,
        bot1: phase10Bots[0].hand,
        bot2: phase10Bots[1].hand,
        bot3: phase10Bots[2].hand
    };
}

function isValidPlay(playerType, card) {
    const hand = playerType === 'player' ? phase10PlayerHand : phase10Bots[playerType.replace('bot', '') - 1].hand;
    return card.color === currentCard.color || card.value === currentCard.value || card.type === 'wild';
}

function nextTurn() {
    const players = Object.keys(getAllPlayers());
    const currentIndex = players.indexOf(currentPlayer);
    const nextIndex = (currentIndex + gameDirection + players.length) % players.length;
    currentPlayer = players[nextIndex];
    showMessage(`${getPlayerName(currentPlayer)}'s turn!`);

    if (currentPlayer.startsWith('bot')) {
        setTimeout(() => botPlay(currentPlayer), 1500);
    }
}

function getPlayerName(type) {
    if (type === 'player') return 'You';
    return phase10Bots[parseInt(type.replace('bot', '')) - 1].name;
}

function botPlay(botType) {
    const botIndex = parseInt(botType.replace('bot', '')) - 1;
    const botHand = phase10Bots[botIndex].hand;
    const playableCards = botHand.filter(card => isValidPlay(botType, card));

    if (playableCards.length > 0) {
        const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
        const cardIndex = botHand.indexOf(cardToPlay);
        phase10Bots[botIndex].hand.splice(cardIndex, 1);
        discardPile.unshift(cardToPlay);
        currentCard = cardToPlay;
        checkPhaseCompletion(botType);
        showMessage(`${getPlayerName(botType)} played a ${cardToPlay.value} ${cardToPlay.color.toUpperCase()} card.`);
    } else {
        drawCard(botType);
    }

    renderUI();
    nextTurn();
}

function updateScores() {
    // Score calculation can be added here based on remaining cards
}

function renderUI() {
    const handElement = document.getElementById('phase10-player-hand');
    const discardElement = document.getElementById('discard-pile');

    handElement.innerHTML = '';
    phase10PlayerHand.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `card bg-${card.color} text-white p-2 rounded-lg text-center cursor-pointer`;
        cardEl.textContent = card.value;
        cardEl.addEventListener('click', () => discardCard(index));
        handElement.appendChild(cardEl);
    });

    discardElement.innerHTML = '';
    const topCard = discardPile[0];
    const cardEl = document.createElement('div');
    cardEl.className = `card bg-${topCard.color} text-white p-2 rounded-lg text-center`;
    cardEl.textContent = topCard.value;
    discardElement.appendChild(cardEl);
}

function showMessage(message) {
    document.getElementById('phase10-message').textContent = message;
}

function startPhase10() {
    phase10Deck = createPhase10Deck();
    phase10PlayerHand = [];
    phase10Bots.forEach(bot => bot.hand = []);
    phaseCompletedByPlayers = {};
    currentPhase = 1;
    document.getElementById('phase-number').textContent = currentPhase;
    document.getElementById('phase-description').textContent = PHASES[0].description;
    dealInitialCards();
    currentPlayer = 'player';
    showMessage("Your turn! Draw or play cards.");
}

function resetGame() {
    phase10Deck = createPhase10Deck();
    phase10PlayerHand = [];
    phase10Bots.forEach(bot => bot.hand = []);
    currentPhase = 1;
    document.getElementById('phase-number').textContent = currentPhase;
    document.getElementById('phase-description').textContent = PHASES[0].description;
    dealInitialCards();
    showMessage("Game reset! Good luck!");
}

function endGame() {
    // Calculate final scores
    let scores = {};
    scores['You'] = phase10PlayerHand.reduce((sum, c) => sum + c.value, 0);
    phase10Bots.forEach((bot, i) => {
        scores[bot.name] = bot.hand.reduce((sum, c) => sum + c.value, 0);
    });

    let winner = Object.keys(scores).reduce((a, b) => scores[a] < scores[b] ? a : b);

    showMessage(`🎉 Game Over! Winner: ${winner} with ${scores[winner]} points!`);
}

// Event Listeners
document.getElementById('phase10-draw-button')?.addEventListener('click', () => {
    drawCard('player');
});
document.getElementById('phase10-reset-button')?.addEventListener('click', resetGame);

// Start Game
startPhase10();
