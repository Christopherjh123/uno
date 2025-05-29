// uno.js - Contains the Uno game logic and UI rendering

(function() { // Use an IIFE to encapsulate the Uno game logic

    // --- Uno Game UI HTML ---
    const unoGameHTML = `
        <h1 class="text-4xl font-bold mb-6 text-blue-400 text-center">UNO!</h1>
        <div id="uno-game-specific-container" class="game-container">
            <div class="player-info flex justify-between items-center mb-4" id="bot-info">
                <span class="text-xl font-semibold">Bot's Hand: <span id="bot-card-count">0</span> cards</span>
            </div>

            <div class="game-area-content flex justify-center items-center gap-8">
                <div class="deck-area flex flex-col items-center">
                    <div id="deck" class="card deck-card cursor-pointer"></div>
                    <span class="text-sm mt-2">Draw Pile</span>
                </div>
                <div class="discard-area flex flex-col items-center">
                    <div id="discard-pile" class="card bg-gray-800 flex items-center justify-center text-white text-3xl">
                        <span class="text-lg">Discard</span>
                    </div>
                    <span class="text-sm mt-2">Discard Pile</span>
                </div>
            </div>

            <div id="message-box" class="message-box mt-4 mb-4">
                Welcome to Uno! Click 'Start Game' to begin.
            </div>

            <div class="player-info flex justify-between items-center mt-4" id="player-info">
                <span class="text-xl font-semibold">Your Hand: <span id="player-card-count">0</span> cards</span>
                <button id="uno-button" class="uno-button disabled">UNO!</button>
            </div>
            <div id="player-hand" class="hand mb-4">
                </div>

            <div class="flex justify-center mt-4 gap-4">
                <button id="start-game-button" class="btn btn-primary">Start Game</button>
                <button id="reset-game-button" class="btn btn-secondary hidden">Reset Game</button>
            </div>
        </div>

        <div id="color-picker-modal" class="modal-overlay">
            <div class="modal-content">
                <h2 class="text-2xl font-bold mb-6">Choose a Color</h2>
                <div class="flex justify-center gap-4 mb-6">
                    <div class="color-option bg-red" data-color="red"></div>
                    <div class="color-option bg-blue" data-color="blue"></div>
                    <div class="color-option bg-green" data-color="green"></div>
                    <div class="color-option bg-yellow" data-color="yellow"></div>
                </div>
            </div>
        </div>

        <div id="game-over-modal" class="modal-overlay">
            <div class="modal-content">
                <h2 id="game-over-message" class="text-3xl font-bold mb-4"></h2>
                <button id="play-again-button" class="btn btn-primary mt-4">Play Again</button>
            </div>
        </div>
    `;

    // --- Game State Variables (now within the Uno module) ---
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
    let skipNextTurnFlag = false; // Flag to indicate if the next turn should be skipped

    // --- DOM Elements (will be assigned after HTML is rendered) ---
    let deckElement, discardPileElement, playerHandElement, botCardCountElement,
        playerCardCountElement, messageBox, colorPickerModal, gameOverModal,
        gameOverMessage, startGameButton, resetGameButton, playAgainButton,
        unoButton, botInfo, playerInfo;

    // --- Card Data Structure ---
    const colors = ['red', 'blue', 'green', 'yellow'];
    const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const actionCards = ['skip', 'reverse', 'draw2']; // +2
    const wildCards = ['wild', 'wild4']; // Wild, +4

    // --- Game Functions (now within the Uno module) ---

    function createDeck() { /* ... (same as before) ... */
        let newDeck = [];
        colors.forEach(color => {
            newDeck.push({ color: color, value: '0', type: 'number' });
            for (let i = 1; i <= 9; i++) {
                newDeck.push({ color: color, value: String(i), type: 'number' });
                newDeck.push({ color: color, value: String(i), type: 'number' });
            }
        });
        colors.forEach(color => {
            actionCards.forEach(action => {
                newDeck.push({ color: color, value: action, type: 'action' });
                newDeck.push({ color: color, value: action, type: 'action' });
            });
        });
        wildCards.forEach(wild => {
            for (let i = 0; i < 4; i++) {
                newDeck.push({ color: 'black', value: wild, type: 'wild' });
            }
        });
        return newDeck;
    }

    function shuffleDeck(deck) { /* ... (same as before) ... */
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    function dealInitialCards() { /* ... (same as before) ... */
        playerHand = [];
        botHand = [];
        for (let i = 0; i < 7; i++) {
            drawCard('player', 1);
            drawCard('bot', 1);
        }
    }

    function drawCard(playerType, count) { /* ... (same as before) ... */
        let hand = playerType === 'player' ? playerHand : botHand;
        for (let i = 0; i < count; i++) {
            if (deck.length === 0) {
                if (discardPile.length <= 1) {
                    showMessage("No cards left in deck or discard pile. Game might be stuck.");
                    return;
                }
                const topDiscardCard = discardPile.pop();
                deck = shuffleDeck(discardPile);
                discardPile = [topDiscardCard];
                showMessage("Deck reshuffled from discard pile!");
            }
            const card = deck.pop();
            if (card) {
                hand.push(card);
            }
        }
        renderHands();
    }

    function renderHands() { /* ... (same as before) ... */
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

    function createCardElement(card, index = -1) { /* ... (same as before) ... */
        const cardElement = document.createElement('div');
        cardElement.classList.add('card', `bg-${card.color}`);
        if (index !== -1) {
            cardElement.dataset.index = index;
        }

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

    function renderDiscardPile() { /* ... (same as before) ... */
        discardPileElement.innerHTML = '';
        if (currentCard) {
            const cardElement = createCardElement(currentCard);
            cardElement.classList.remove('highlighted', 'disabled');
            cardElement.classList.add(`bg-${currentCard.color}`);
            discardPileElement.appendChild(cardElement);
        } else {
            discardPileElement.innerHTML = '<span class="text-lg">Discard</span>';
            discardPileElement.classList.remove(...colors.map(c => `bg-${c}`));
            discardPileElement.classList.add('bg-gray-800');
        }
    }

    function isValidPlay(card) { /* ... (same as before) ... */
        if (!currentCard) return true;
        if (card.type === 'wild') return true;
        return card.color === currentCard.color || card.value === currentCard.value;
    }

    function playCard(playerType, card, cardIndex) { /* ... (same as before) ... */
        let hand = playerType === 'player' ? playerHand : botHand;

        hand.splice(cardIndex, 1);
        discardPile.push(card);
        currentCard = { ...card };

        unoCalled[playerType] = false;

        const requiresColorChoice = applyCardEffect(card, playerType);

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
                unoButton.classList.remove('disabled');
            }
        } else {
             unoButton.classList.add('disabled');
        }

        if (!requiresColorChoice) {
            setTimeout(() => {
                nextTurn();
            }, 700);
        }
    }

    function applyCardEffect(card, playerType) { /* ... (same as before) ... */
        let requiresColorChoice = false;

        if (card.type === 'action') {
            if (card.value === 'skip') {
                showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a Skip card! Next player's turn is skipped.`);
                skipNextTurnFlag = true;
            } else if (card.value === 'reverse') {
                showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a Reverse card! Direction changed.`);
                gameDirection *= -1;
            } else if (card.value === 'draw2') {
                showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a +2 card! Next player draws 2 cards.`);
                const nextPlayer = getNextPlayer(false);
                drawCard(nextPlayer, 2);
                skipNextTurnFlag = true;
            }
        } else if (card.type === 'wild') {
            if (card.value === 'wild') {
                showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a Wild card.`);
                if (playerType === 'player') {
                    requiresColorChoice = true;
                    showColorPicker();
                } else {
                    const chosenColor = botChooseColor(botHand);
                    currentCard.color = chosenColor;
                    showMessage(`Bot chose ${chosenColor.toUpperCase()}!`);
                    setTimeout(() => {
                        nextTurn();
                    }, 500);
                }
            } else if (card.value === 'wild4') {
                showMessage(`${playerType === 'player' ? 'You' : 'Bot'} played a +4 Wild card! Next player draws 4 cards.`);
                const nextPlayer = getNextPlayer(false);
                drawCard(nextPlayer, 4);
                skipNextTurnFlag = true;

                if (playerType === 'player') {
                    requiresColorChoice = true;
                    showColorPicker();
                } else {
                    const chosenColor = botChooseColor(botHand);
                    currentCard.color = chosenColor;
                    showMessage(`Bot chose ${chosenColor.toUpperCase()}!`);
                    setTimeout(() => {
                        nextTurn();
                    }, 500);
                }
            }
        }
        return requiresColorChoice;
    }

    function getNextPlayer() { /* ... (same as before) ... */
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

    function nextTurn() { /* ... (same as before) ... */
        if (botThinkingTimeout) {
            clearTimeout(botThinkingTimeout);
            botThinkingTimeout = null;
        }

        getNextPlayer();

        if (currentPlayer === 'player') {
            playerInfo.classList.add('current-player');
            botInfo.classList.remove('current-player');
        } else {
            botInfo.classList.add('current-player');
            playerInfo.classList.remove('current-player');
        }

        showMessage(`${currentPlayer === 'player' ? 'Your' : 'Bot\'s'} turn!`);
        renderHands();

        if (currentPlayer === 'bot') {
            botThinkingTimeout = setTimeout(botPlay, 1500);
        }
    }

    function botPlay() { /* ... (same as before) ... */
        const playableCards = botHand.filter(card => isValidPlay(card));

        if (playableCards.length > 0) {
            let cardToPlay = null;

            const nonWildPlayable = playableCards.filter(card => card.type !== 'wild');
            if (nonWildPlayable.length > 0) {
                const actionPlayable = nonWildPlayable.filter(card => card.type === 'action');
                if (actionPlayable.length > 0) {
                    cardToPlay = actionPlayable[0];
                } else {
                    cardToPlay = nonWildPlayable[0];
                }
            } else {
                const wildPlayable = playableCards.filter(card => card.type === 'wild');
                if (wildPlayable.length > 0) {
                    const regularWild = wildPlayable.find(card => card.value === 'wild');
                    const wild4 = wildPlayable.find(card => card.value === 'wild4');

                    if (regularWild) {
                        cardToPlay = regularWild;
                    } else if (wild4) {
                        cardToPlay = wild4;
                    }
                }
            }

            if (cardToPlay) {
                const cardIndex = botHand.indexOf(cardToPlay);
                showMessage(`Bot played a ${cardToPlay.value.toUpperCase()} ${cardToPlay.color !== 'black' ? cardToPlay.color.toUpperCase() : ''} card.`);
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

    function botChooseColor(hand) { /* ... (same as before) ... */
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

    function showColorPicker() { /* ... (same as before) ... */
        colorPickerModal.classList.add('active');
    }

    function hideColorPicker() { /* ... (same as before) ... */
        colorPickerModal.classList.remove('active');
    }

    function chooseColor(color) { /* ... (same as before) ... */
        currentCard.color = color;
        showMessage(`Color changed to ${color.toUpperCase()}!`);
        hideColorPicker();
        setTimeout(() => {
            nextTurn();
        }, 500);
    }

    function showMessage(message) { /* ... (same as before) ... */
        messageBox.textContent = message;
    }

    function endGame(winner) { /* ... (same as before) ... */
        gameActive = false;
        let message = '';
        if (winner === 'player') {
            message = "Congratulations! You won the game!";
        } else {
            message = "Bot won! Better luck next time!";
        }
        gameOverMessage.textContent = message;
        gameOverModal.classList.add('active');
        resetGameButton.classList.remove('hidden');
        startGameButton.classList.add('hidden');
        unoButton.classList.add('disabled');
        clearTimeout(botThinkingTimeout);
    }

    function resetGame() { /* ... (same as before) ... */
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

        if (playerHandElement) playerHandElement.innerHTML = '';
        if (discardPileElement) {
            discardPileElement.innerHTML = '<span class="text-lg">Discard</span>';
            discardPileElement.classList.remove(...colors.map(c => `bg-${c}`));
            discardPileElement.classList.add('bg-gray-800');
        }
        if (botCardCountElement) botCardCountElement.textContent = '0';
        if (playerCardCountElement) playerCardCountElement.textContent = '0';
        showMessage("Welcome to Uno! Click 'Start Game' to begin.");
        hideColorPicker();
        gameOverModal.classList.remove('active');
        startGameButton.classList.remove('hidden');
        resetGameButton.classList.add('hidden');
        unoButton.classList.add('disabled');
        if (playerInfo) playerInfo.classList.remove('current-player');
        if (botInfo) botInfo.classList.remove('current-player');
    }

    function startGame() { /* ... (same as before) ... */
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
        renderDiscardPile();
        renderHands();

        gameActive = true;
        startGameButton.classList.add('hidden');
        resetGameButton.classList.remove('hidden');

        if (!(currentCard.type === 'wild' && currentCard.value === 'wild')) {
             showMessage(`${currentPlayer === 'player' ? 'Your' : 'Bot\'s'} turn!`);
             if (currentPlayer === 'player') {
                 playerInfo.classList.add('current-player');
             } else {
                 botInfo.classList.add('current-player');
                 botThinkingTimeout = setTimeout(botPlay, 1500);
             }
        }
    }

    // --- Event Listener Management ---
    let unoEventListeners = []; // To store references to event listeners for proper cleanup

    function addUnoEventListener(element, eventType, handler) {
        element.addEventListener(eventType, handler);
        unoEventListeners.push({ element, eventType, handler });
    }

    function removeUnoEventListeners() {
        unoEventListeners.forEach(({ element, eventType, handler }) => {
            element.removeEventListener(eventType, handler);
        });
        unoEventListeners = [];
    }


    // --- Public Initialization Function ---
    window.initUnoGame = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Uno game container not found:', containerId);
            return;
        }

        // Render Uno HTML into the container
        container.innerHTML = unoGameHTML;

        // Assign DOM elements after they are rendered
        deckElement = document.getElementById('deck');
        discardPileElement = document.getElementById('discard-pile');
        playerHandElement = document.getElementById('player-hand');
        botCardCountElement = document.getElementById('bot-card-count');
        playerCardCountElement = document.getElementById('player-card-count');
        messageBox = document.getElementById('message-box');
        colorPickerModal = document.getElementById('color-picker-modal');
        gameOverModal = document.getElementById('game-over-modal');
        gameOverMessage = document.getElementById('game-over-message');
        startGameButton = document.getElementById('start-game-button');
        resetGameButton = document.getElementById('reset-game-button');
        playAgainButton = document.getElementById('play-again-button');
        unoButton = document.getElementById('uno-button');
        botInfo = document.getElementById('bot-info');
        playerInfo = document.getElementById('player-info');

        // Attach event listeners using the helper function
        addUnoEventListener(playerHandElement, 'click', (event) => {
            if (!gameActive || currentPlayer !== 'player') {
                showMessage("It's not your turn!");
                return;
            }
            const cardElement = event.target.closest('.card');
            if (!cardElement || cardElement.classList.contains('disabled')) {
                return;
            }
            const cardIndex = parseInt(cardElement.dataset.index);
            const cardToPlay = playerHand[cardIndex];
            if (isValidPlay(cardToPlay)) {
                playCard('player', cardToPlay, cardIndex);
                deckElement.dataset.drawnAndCanPlay = 'false';
            } else {
                showMessage("You cannot play that card!");
            }
        });

        addUnoEventListener(deckElement, 'click', () => {
            if (!gameActive || currentPlayer !== 'player') {
                showMessage("It's not your turn!");
                return;
            }
            if (deckElement.dataset.drawnAndCanPlay === 'true') {
                showMessage("You chose to pass your turn.");
                deckElement.dataset.drawnAndCanPlay = 'false';
                nextTurn();
                return;
            }
            const playableCardsInHand = playerHand.filter(card => isValidPlay(card));
            if (playableCardsInHand.length > 0) {
                showMessage("You have playable cards, but you chose to draw.");
            }
            showMessage("You drew a card.");
            drawCard('player', 1);
            const drawnCard = playerHand[playerHand.length - 1];
            if (isValidPlay(drawnCard)) {
                showMessage("You drew a playable card. Click it to play, or click the deck again to pass.");
                renderHands();
                deckElement.dataset.drawnAndCanPlay = 'true';
            } else {
                showMessage("You drew a card and cannot play. Turn passed.");
                nextTurn();
            }
        });

        addUnoEventListener(unoButton, 'click', () => {
            if (!gameActive || currentPlayer !== 'player') {
                showMessage("It's not your turn!");
                return;
            }
            if (playerHand.length === 1) {
                unoCalled.player = true;
                showMessage("You called UNO!");
                unoButton.classList.add('disabled');
            } else {
                showMessage("You can only call UNO when you have one card left!");
            }
        });

        addUnoEventListener(colorPickerModal, 'click', (event) => {
            const colorOption = event.target.closest('.color-option');
            if (colorOption) {
                const chosenColor = colorOption.dataset.color;
                chooseColor(chosenColor);
            }
        });

        addUnoEventListener(startGameButton, 'click', startGame);
        addUnoEventListener(resetGameButton, 'click', resetGame);
        addUnoEventListener(playAgainButton, 'click', startGame);

        // Initial setup for Uno when loaded
        resetGame();
        // Store a reference to this game instance for cleanup
        window.unoGameInstance = { destroy: removeUnoEventListeners };
    };

})(); // End of IIFE
