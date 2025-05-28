// uno.js

let deck = [];
let discardPile = [];
let playerHand = [];
let botHand = [];
let currentPlayer = 'player'; // 'player' or 'bot'
let gameDirection = 1; // 1 for clockwise, -1 for counter-clockwise
let currentCard = null;
let unoCalled = { player: false, bot: false };
let gameActive = false;
let botThinkingTimeout = null;
let skipNextTurnFlag = false;

const colors = ['red', 'blue', 'green', 'yellow'];
const actionCards = ['skip', 'reverse', 'draw2'];
const wildCards = ['wild', 'wild4'];

function createDeck() {
    let newDeck = [];

    // Number cards
    colors.forEach(color => {
        newDeck.push({ color: color, value: '0', type: 'number' });
        for (let i = 1; i <= 9; i++) {
            newDeck.push({ color: color, value: String(i), type: 'number' });
            newDeck.push({ color: color, value: String(i), type: 'number' });
        }
    });

    // Action cards
    colors.forEach(color => {
        actionCards.forEach(action => {
            newDeck.push({ color: color, value: action, type: 'action' });
            newDeck.push({ color: color, value: action, type: 'action' });
        });
    });

    // Wild cards
    wildCards.forEach(wild => {
        for (let i = 0; i < 4; i++) {
            newDeck.push({ color: 'black', value: wild, type: 'wild' });
        }
    });

    return newDeck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealInitialCards() {
    playerHand = [];
    botHand = [];
    for (let i = 0; i < 7; i++) {
        drawCard('player', 1);
        drawCard('bot', 1);
    }
}

function drawCard(playerType, count) {
    let hand = playerType === 'player' ? playerHand : botHand;
    for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
            if (discardPile.length <= 1) {
                showMessage("No cards left in deck or discard pile.");
                return;
            }
            const topDiscardCard = discardPile.pop();
            deck = shuffleDeck(discardPile);
            discardPile = [topDiscardCard];
            showMessage("Deck reshuffled from discard pile!");
        }
        const card = deck.pop();
        if (card) hand.push(card);
    }
}

function renderHands() {
    const playerHandElement = document.getElementById('player-hand');
    const playerCardCountElement = document.getElementById('player-card-count');
    const botCardCountElement = document.getElementById('bot-card-count');

    playerHandElement.innerHTML = '';
    playerHand.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        if (currentPlayer === 'player' && isValidPlay(card)) {
            cardElement.classList.add('highlighted');
        } else if (currentPlayer === 'player') {
            cardElement.classList.add('disabled');
        }
        playerHandElement.appendChild(cardElement);
    });

    playerCardCountElement.textContent = playerHand.length;
    botCardCountElement.textContent = botHand.length;
}

function createCardElement(card, index = -1) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card', `bg-${card.color}`);
    if (index !== -1) cardElement.dataset.index = index;
    let cardContent = '';
    if (card.type === 'number') {
        cardContent = `<span class="card-value">${card.value}</span>`;
    } else if (card.type === 'action') {
        let icon = '';
        if (card.value === 'skip') icon = '🚫';
        else if (card.value === 'reverse') icon = '🔄';
        else if (card.value === 'draw2') icon = '+2';
        cardContent = `<span class="card-action-icon">${icon}</span>`;
    } else if (card.type === 'wild') {
        let text = '';
        if (card.value === 'wild') text = 'WILD';
        else if (card.value === 'wild4') text = '+4<br>WILD';
        cardContent = `<span class="card-wild-text">${text}</span>`;
    }
    cardElement.innerHTML = cardContent;
    return cardElement;
}

function renderDiscardPile() {
    const discardPileElement = document.getElementById('discard-pile');
    discardPileElement.innerHTML = '';
    if (currentCard) {
        const cardElement = createCardElement(currentCard);
        cardElement.classList.remove('highlighted', 'disabled');
        cardElement.classList.add(`bg-${currentCard.color}`);
        discardPileElement.appendChild(cardElement);
    } else {
        discardPileElement.innerHTML = '<span class="text-lg">Discard</span>';
        colors.forEach(c => discardPileElement.classList.remove(`bg-${c}`));
        discardPileElement.classList.add('bg-gray-800');
    }
}

function isValidPlay(card) {
    if (!currentCard) return true;
    if (card.type === 'wild') return true;
    return card.color === currentCard.color || card.value === currentCard.value;
}

function playCard(playerType, card, cardIndex) {
    let hand = playerType === 'player' ? playerHand : botHand;
    hand.splice(cardIndex, 1);
    discardPile.push(card);
    currentCard = { ...card };
    unoCalled[playerType] = false;

    applyCardEffect(card, playerType);

    renderHands();
    renderDiscardPile();

    if (hand.length === 0) {
        endGame(playerType);
        return;
    }

    if (hand.length === 1) {
        showMessage(`${playerType === 'player' ? 'You' : 'Bot'} has one card left!`);
        if (playerType === 'bot') {
            unoCalled.bot = true;
            showMessage("Bot calls UNO!");
        } else {
            document.getElementById('uno-button').classList.remove('disabled');
        }
    } else {
        document.getElementById('uno-button').classList.add('disabled');
    }

    setTimeout(() => nextTurn(), 700);
}

function applyCardEffect(card, playerType) {
    if (card.type === 'action') {
        if (card.value === 'skip') {
            showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a Skip card!`);
            skipNextTurnFlag = true;
        } else if (card.value === 'reverse') {
            showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a Reverse card!`);
            gameDirection *= -1;
        } else if (card.value === 'draw2') {
            showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a +2 card!`);
            const nextPlayer = getNextPlayer(false);
            drawCard(nextPlayer, 2);
            skipNextTurnFlag = true;
        }
    } else if (card.type === 'wild') {
        if (card.value === 'wild') {
            showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a Wild card.`);
            if (playerType === 'player') {
                showColorPicker();
            } else {
                const chosenColor = botChooseColor(botHand);
                currentCard.color = chosenColor;
                showMessage(`Bot chose ${chosenColor.toUpperCase()}!`);
                setTimeout(() => nextTurn(), 500);
            }
        } else if (card.value === 'wild4') {
            showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a +4 Wild card!`);
            const nextPlayer = getNextPlayer(false);
            drawCard(nextPlayer, 4);
            skipNextTurnFlag = true;
            if (playerType === 'player') {
                showColorPicker();
            } else {
                const chosenColor = botChooseColor(botHand);
                currentCard.color = chosenColor;
                showMessage(`Bot chose ${chosenColor.toUpperCase()}!`);
                setTimeout(() => nextTurn(), 500);
            }
        }
    }
}

function getNextPlayer() {
    let nextPlayerCandidate;
    if (gameDirection === 1) {
        nextPlayerCandidate = (currentPlayer === 'player' ? 'bot' : 'player');
    } else {
        nextPlayerCandidate = (currentPlayer === 'player' ? 'bot' : 'player');
    }

    if (skipNextTurnFlag) {
        skipNextTurnFlag = false;
        currentPlayer = (nextPlayerCandidate === 'player' ? 'bot' : 'player');
    } else {
        currentPlayer = nextPlayerCandidate;
    }

    return currentPlayer;
}

function nextTurn() {
    if (botThinkingTimeout) {
        clearTimeout(botThinkingTimeout);
        botThinkingTimeout = null;
    }

    getNextPlayer();

    const playerInfo = document.getElementById('player-info');
    const botInfo = document.getElementById('bot-info');

    if (currentPlayer === 'player') {
        playerInfo.classList.add('current-player');
        botInfo.classList.remove('current-player');
    } else {
        botInfo.classList.add('current-player');
        playerInfo.classList.remove('current-player');
    }

    showMessage(`${currentPlayer === 'player' ? 'Your' : "Bot's"} turn!`);

    if (currentPlayer === 'bot') {
        botThinkingTimeout = setTimeout(botPlay, 1500);
    }
}

function botPlay() {
    const playableCards = botHand.filter(card => isValidPlay(card));

    if (playableCards.length > 0) {
        let cardToPlay = null;
        const nonWildPlayable = playableCards.filter(card => card.type !== 'wild');

        if (nonWildPlayable.length > 0) {
            const actionPlayable = nonWildPlayable.filter(card => card.type === 'action');
            cardToPlay = actionPlayable.length > 0 ? actionPlayable[0] : nonWildPlayable[0];
        } else {
            const wildPlayable = playableCards.filter(card => card.type === 'wild');
            if (wildPlayable.length > 0) {
                const regularWild = wildPlayable.find(card => card.value === 'wild');
                const wild4 = wildPlayable.find(card => card.value === 'wild4');
                cardToPlay = regularWild || wild4;
            }
        }

        if (cardToPlay) {
            const cardIndex = botHand.indexOf(cardToPlay);
            showMessage(`Bot played a ${cardToPlay.value.toUpperCase()} card.`);
            playCard('bot', cardToPlay, cardIndex);
            if (botHand.length === 1 && !unoCalled.bot) {
                unoCalled.bot = true;
                showMessage("Bot calls UNO!");
            }
        }
    } else {
        showMessage("Bot draws a card.");
        drawCard('bot', 1);
        const drawnCard = botHand[botHand.length - 1];
        if (isValidPlay(drawnCard)) {
            showMessage("Bot plays the drawn card.");
            playCard('bot', drawnCard, botHand.length - 1);
        } else {
            showMessage("Bot passes turn.");
            nextTurn();
        }
    }
}

function botChooseColor(hand) {
    const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
    hand.forEach(card => {
        if (colors.includes(card.color)) {
            colorCounts[card.color]++;
        }
    });

    let maxCount = -1;
    let chosenColor = colors[Math.floor(Math.random() * colors.length)];

    for (const color in colorCounts) {
        if (colorCounts[color] > maxCount) {
            maxCount = colorCounts[color];
            chosenColor = color;
        }
    }

    return chosenColor;
}

function showColorPicker() {
    document.getElementById('color-picker-modal').classList.add('active');
}

function chooseColor(color) {
    currentCard.color = color;
    showMessage(`Color changed to ${color.toUpperCase()}!`);
    hideColorPicker();
    setTimeout(() => nextTurn(), 500);
}

function hideColorPicker() {
    document.getElementById('color-picker-modal').classList.remove('active');
}

function showMessage(message) {
    const messageBox = document.getElementById('message-box');
    if (messageBox) messageBox.textContent = message;
}

function endGame(winner) {
    gameActive = false;
    let message = winner === 'player' ? "Congratulations! You won!" : "Bot won!";
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('game-over-modal').classList.add('active');
    document.getElementById('reset-game-button').classList.remove('hidden');
    document.getElementById('start-game-button').classList.add('hidden');
    document.getElementById('uno-button').classList.add('disabled');
    clearTimeout(botThinkingTimeout);
}

function resetGame() {
    deck = [];
    discardPile = [];
    playerHand = [];
    botHand = [];
    currentPlayer = 'player';
    gameDirection = 1;
    currentCard = null;
    unoCalled = { player: false, bot: false };
    gameActive = false;
    skipNextTurnFlag = false;
    clearTimeout(botThinkingTimeout);
    botThinkingTimeout = null;

    const playerHandElement = document.getElementById('player-hand');
    const discardPileElement = document.getElementById('discard-pile');
    const botCardCountElement = document.getElementById('bot-card-count');
    const playerCardCountElement = document.getElementById('player-card-count');

    if (playerHandElement) playerHandElement.innerHTML = '';
    if (discardPileElement) {
        discardPileElement.innerHTML = '<span class="text-lg">Discard</span>';
        colors.forEach(c => discardPileElement.classList.remove(`bg-${c}`));
        discardPileElement.classList.add('bg-gray-800');
    }
    if (botCardCountElement) botCardCountElement.textContent = '0';
    if (playerCardCountElement) playerCardCountElement.textContent = '0';

    showMessage("Welcome to Uno! Click 'Start Game' to begin.");

    hideColorPicker();
    document.getElementById('game-over-modal').classList.remove('active');
    document.getElementById('start-game-button').classList.remove('hidden');
    document.getElementById('reset-game-button').classList.add('hidden');
    document.getElementById('uno-button').classList.add('disabled');
    document.getElementById('player-info').classList.remove('current-player');
    document.getElementById('bot-info').classList.remove('current-player');
}

function startGame() {
    resetGame();
    deck = shuffleDeck(createDeck());

    do {
        currentCard = deck.pop();
    } while (currentCard && currentCard.value === 'wild4');

    discardPile.push(currentCard);

    if (currentCard.type === 'wild') {
        showMessage("First card is a Wild! Choose a starting color.");
        showColorPicker();
        currentCard.color = 'black';
    } else if (currentCard.type === 'action') {
        if (currentCard.value === 'skip') {
            showMessage("First card is a Skip! Player's first turn is skipped.");
            currentPlayer = 'bot';
        } else if (currentCard.value === 'reverse') {
            showMessage("First card is a Reverse! Direction reversed.");
            gameDirection *= -1;
        } else if (currentCard.value === 'draw2') {
            showMessage("First card is a +2! Player draws 2 cards.");
            drawCard('player', 2);
            currentPlayer = 'bot';
        }
    }

    dealInitialCards();
    renderHands();
    renderDiscardPile();
    gameActive = true;

    const startGameButton = document.getElementById('start-game-button');
    const resetGameButton = document.getElementById('reset-game-button');

    if (startGameButton) startGameButton.classList.add('hidden');
    if (resetGameButton) resetGameButton.classList.remove('hidden');

    if (!(currentCard.type === 'wild' && currentCard.value === 'wild')) {
        showMessage(`${currentPlayer === 'player' ? 'Your' : "Bot's"} turn!`);
        if (currentPlayer === 'player') {
            document.getElementById('player-info').classList.add('current-player');
        } else {
            document.getElementById('bot-info').classList.add('current-player');
            botThinkingTimeout = setTimeout(botPlay, 1500);
        }
    }
}
