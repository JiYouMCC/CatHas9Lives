var Camp;
(function (Camp) {
    Camp[Camp["Killer"] = 1] = "Killer";
    Camp[Camp["Werewolf"] = 2] = "Werewolf";
    Camp[Camp["People"] = 3] = "People";
    Camp[Camp["Optional"] = 4] = "Optional";
    Camp[Camp["Unknow"] = 5] = "Unknow";
})(Camp || (Camp = {}));
var CampZH = {
    Killer: "杀手阵营",
    Werewolf: "狼人阵营",
    People: "平民阵营",
    Optional: "可选阵营",
    Unknow: "未知阵营"
};
var CardType;
(function (CardType) {
    CardType[CardType["Identity"] = 1] = "Identity";
    CardType[CardType["Privilege"] = 2] = "Privilege";
    CardType[CardType["Resource"] = 3] = "Resource";
})(CardType || (CardType = {}));
var Card = (function () {
    function Card(cardName, cardType) {
        this.cardName = cardName;
        this.cardType = cardType;
        this.name = cardName;
        this.type = cardType;
    }
    return Card;
}());
var CardTableItem = (function () {
    function CardTableItem(theCard, cardCount) {
        this.theCard = theCard;
        this.cardCount = cardCount;
        this.card = theCard;
        this.count = cardCount;
    }
    return CardTableItem;
}());
var Player = (function () {
    function Player(playerName) {
        this.playerName = playerName;
        this.name = playerName;
        this.cards = [];
        this.camp = Camp.Unknow;
    }
    Player.prototype.hasCard = function (cardName) {
        for (var i = 0; i < this.cards.length; i++) {
            if (this.cards[i].name == cardName) {
                return true;
            }
        }
        return false;
    };
    Player.prototype.cardCount = function (cardName) {
        var result = 0;
        for (var i = 0; i < this.cards.length; i++) {
            if (this.cards[i].name == cardName) {
                result++;
            }
        }
        return result;
    };
    Player.prototype.typeCardCount = function (cardType) {
        var result = 0;
        for (var i = 0; i < this.cards.length; i++) {
            var card = this.cards[i];
            if (card.cardType == cardType) {
                result++;
            }
        }
        return result;
    };
    Player.prototype.giveCard = function (card) {
        this.cards.push(card);
    };
    Player.prototype.clearCards = function () {
        var result = [];
        for (var i = 0; i < this.cards.length; i++) {
            result.push(this.cards[i]);
        }
        this.cards = [];
        return result;
    };
    Player.prototype.setCamp = function (camp) {
        this.camp = camp;
    };
    return Player;
}());
var Rule = (function () {
    function Rule() {
    }
    return Rule;
}());
function makeCards(cardTable) {
    var cards = [];
    for (var i = 0; i < cardTable.length; ++i) {
        var cardTableItem = cardTable[i];
        for (var j = 0; j < cardTableItem.count; j++) {
            cards.push(cardTableItem.card);
        }
    }
    return cards;
}
function getCards(cards, cardType) {
    var result = [];
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (card.type == cardType) {
            if (result.indexOf(card.name) == -1) {
                result.push(card.name);
            }
        }
    }
    return result;
}
function license(rule) {
    var tempCards = makeCards(rule.cardTable);
    var tempPlayers = rule.players;
    var blocktime = 0;
    var abandonCards = [];
    var abandonCardsCount = tempCards.length - tempPlayers.length * rule.cardEach;
    var privilegeStrs = getCards(tempCards, CardType.Privilege);
    while (true) {
        abandonCards = [];
        blocktime = 0;
        tempCards = makeCards(rule.cardTable);
        for (var i = 0; i < tempPlayers.length; i++) {
            var player = tempPlayers[i];
            player.clearCards();
        }
        // Deside which card(s) to abandon
        for (var i = 0; i < abandonCardsCount; i++) {
            var card = undefined;
            var cardId = undefined;
            do {
                cardId = randomArray(tempCards);
                card = tempCards[cardId];
            } while (card.cardType == CardType.Identity);
            abandonCards.push(card);
            tempCards.splice(cardId, 1);
        }
        // License People Cards
        if (!licenseResource(tempCards, tempPlayers, rule.resourceRange)) {
            return { result: false, abandonCards: [], players: [] };
        }
        // 身份牌和特权牌
        var currentPID = 0;
        var blockCheck = false;
        while (tempCards.length > 0) {
            if (blocktime > rule.retryTime) {
                blockCheck = true;
                console.log("发牌无解，重发");
                break;
            }
            var cardId = randomArray(tempCards);
            var card = tempCards[cardId];
            var player = tempPlayers[currentPID];
            if (player.cards.length == rule.cardEach) {
                currentPID++;
                if (currentPID == tempPlayers.length) {
                    currentPID = 0;
                }
                continue;
            }
            if (card.cardType == CardType.Identity) {
                if (player.typeCardCount(CardType.Identity) > 0) {
                    blocktime++;
                    continue;
                }
            }
            var checkLimit = false;
            for (var i = privilegeStrs.length - 1; i >= 0; i--) {
                var privilege = privilegeStrs[i];
                if (card.name == privilege) {
                    if (player.hasCard(privilege)) {
                        checkLimit = true;
                        break;
                    }
                }
            }
            if (checkLimit) {
                blocktime++;
                continue;
            }
            player.giveCard(card);
            tempCards.splice(cardId, 1);
            currentPID++;
            if (currentPID == tempPlayers.length) {
                currentPID = 0;
            }
        }
        if (blockCheck) {
            continue;
        }
        //阵营判断
        calCamp(tempPlayers, rule.optionalCount);
        break;
    }
    return { result: true, abandonCards: abandonCards, players: tempPlayers };
}
function licenseResource(cards, players, resourceRange) {
    var resourceCards = [];
    for (var i = cards.length - 1; i >= 0; i--) {
        var card = cards[i];
        if (card.type == CardType.Resource) {
            resourceCards.push(card);
            cards.splice(i, 1);
        }
    }
    var minPeople = resourceRange[0];
    var maxPeople = resourceRange[1];
    if (resourceCards.length < minPeople * players.length || resourceCards.length > maxPeople * players.length) {
        return false;
    }
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        for (var j = 0; j < minPeople; j++) {
            player.giveCard(resourceCards.pop());
        }
    }
    while (resourceCards.length > 0) {
        var playerId = randomArray(players);
        var player = players[playerId];
        if (player.typeCardCount(CardType.Resource) < maxPeople) {
            player.giveCard(resourceCards.pop());
        }
    }
    return true;
}
function calCamp(players, optionalCount) {
    var unknowPlay = [];
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        if (player.hasCard("杀手牌")) {
            player.setCamp(Camp.Killer);
        }
        else if (player.hasCard("狼人牌")) {
            player.setCamp(Camp.Werewolf);
        }
        else {
            player.setCamp(Camp.Unknow);
            unknowPlay.push(player);
        }
    }
    for (var i = 0; i < optionalCount; i++) {
        var selectId = randomArray(unknowPlay);
        var selectPlayer = unknowPlay[selectId];
        selectPlayer.setCamp(Camp.Optional);
        unknowPlay.splice(selectId, 1);
    }
    for (var i = unknowPlay.length - 1; i >= 0; i--) {
        unknowPlay[i].setCamp(Camp.People);
    }
}
function randomArray(array) {
    return Math.floor(Math.random() * array.length);
}
//-----------------------------------------------
function getPlayers(playerCount) {
    var players = [];
    for (var i = 1; i <= playerCount; i++) {
        var playerName = document.getElementById("player_" + i).value;
        players.push(new Player(playerName));
    }
    return players;
}
function getCardTable() {
    var result = [];
    processCardStr(document.getElementById("cardIdentity").value, CardType.Identity, result);
    processCardStr(document.getElementById("cardResource").value, CardType.Resource, result);
    processCardStr(document.getElementById("cardPrivilege").value, CardType.Privilege, result);
    return result;
}
function processCardStr(str, cardType, cardTable) {
    var lineArray = str.split("\n");
    for (var i = 0; i < lineArray.length; i++) {
        var lineStr = lineArray[i];
        var itemArray = lineStr.split(",");
        cardTable.push(new CardTableItem(new Card(itemArray[0], cardType), +itemArray[1]));
    }
}
function doingLicense() {
    var cardTable = getCardTable();
    var rule = new Rule();
    var playerCount = +document.getElementById("playerCount").value;
    rule.players = getPlayers(playerCount);
    rule.cardEach = +document.getElementById("cardEach").value;
    rule.cardTable = cardTable;
    rule.optionalCount = +document.getElementById("optionalCount").value;
    rule.resourceRange = [+document.getElementById("resourceMin").value, +document.getElementById("resourceMax").value];
    rule.retryTime = 20;
    var result = license(rule);
    document.getElementById("result").innerHTML = "<th>编号</th><th>玩家姓名</th><th>阵营</th><th></th><th></th><th></th><th></th><th></th>";
    for (var i = 0; i < result.players.length; i++) {
        var player = result.players[i];
        var str = "<tr>";
        str += "<td>" + (i + 1).toString() + "</td>";
        str += "<td>" + player.name + "</td>";
        str += "<td class='camp" + player.camp + "'>" + CampZH[Camp[player.camp]] + "</td>";
        for (var j = 0; j < player.cards.length; j++) {
            var card = player.cards[j];
            str += "<td class='card" + card.cardType + "'>" + card.name + "</td>";
        }
        document.getElementById("result").innerHTML += str;
    }
}
/* [
        new CardTableItem(new Card("杀手牌", CardType.Identity), 1),
        new CardTableItem(new Card("狼人牌", CardType.Identity), 1),

        new CardTableItem(new Card("狙击手牌", CardType.Privilege), 2),
        new CardTableItem(new Card("束魂牌", CardType.Privilege), 2),
        new CardTableItem(new Card("巫医牌", CardType.Privilege), 2),
        new CardTableItem(new Card("防弹衣/狼毒牌", CardType.Privilege), 2),
        new CardTableItem(new Card("禁锢/反狙击牌", CardType.Privilege), 2),
        new CardTableItem(new Card("绝杀/特赦牌", CardType.Privilege), 2),
        new CardTableItem(new Card("诅咒/庇佑牌", CardType.Privilege), 2),
        new CardTableItem(new Card("纵火/圣人牌", CardType.Privilege), 2),
        new CardTableItem(new Card("保镖牌", CardType.Privilege), 3),
        new CardTableItem(new Card("阿米巴变形牌", CardType.Privilege), 3),

        new CardTableItem(new Card("庶民牌", CardType.Resource), 12)
    ];*/ 
