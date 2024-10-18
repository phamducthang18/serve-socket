const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'JACK', 'QUEEN', 'KING', 'ACE'];

function getCardImageLinks() {
    const links = [];

    for (let suit of suits) {
        for (let value of values) {
            let valueCode = value[0];
            if (value === '10') {
                valueCode = '0';  
            }
            let suitCode = suit[0];
            let cardCode = `${valueCode}${suitCode}`;

            let imageUrl = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
            let card = {
                'value': cardCode,
                'imageUrl': imageUrl,
            };
            links.push(card);
        }
    }

    return links;
}

function getRandomElement(array) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

function getTenCard(numberUser, numberCard = 10) {
    if (numberUser > 4) {
        return; 
    }

    let allCard = getCardImageLinks(); 
    let allUsers =[];
   
    for (let i = 0; i < numberUser; i++) {
        let cards = [];
        for (let j = 0; j < numberCard; j++) {
            if (allCard.length === 0) {
                console.log(`Không còn lá bài nào để phát cho User ${i + 1}.`);
                break; 
            }

            let card = getRandomElement(allCard);
            cards.push(card);
            
            allCard = allCard.filter(c => c.value !== card.value);
            
        }
         allUsers.push(cards);
    }
    return allUsers;
}

module.exports = { getCardImageLinks, getTenCard };
