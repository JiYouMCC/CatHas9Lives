enum Camp {
    Killer = 1,
    Werewolf,
    People,
    Optional,
    KillerHelper,
    WereWolfHelper,
    Unknow
}

let CampZH = {
    Killer: "杀手",
    Werewolf: "狼人",
    People: "平民",
    Optional: "可选",
    KillerHelper: "杀助",
    WereWolfHelper: "狼崽",
    Unknow: "未知"

}
enum CardType {
    Identity = 1,
    Privilege,
    Resource
}

class Card {
    name: string;
    type: CardType;
    constructor(public cardName: string, public cardType: CardType) {
        this.name = cardName;
        this.type = cardType;
    }
}

class CardTableItem {
    card: Card;
    count: number;
    constructor(public theCard: Card, public cardCount: number) {
        this.card = theCard;
        this.count = cardCount;
    }
}

class Player {
    name: string;
    cards: Card[];
    camp: Camp;
    constructor(public playerName: string) {
        this.name = playerName;
        this.cards = [];
        this.camp = Camp.Unknow;
    }

    hasCard(cardName: string) {
        for (var i = 0; i < this.cards.length; i++) {
            if (this.cards[i].name == cardName) {
                return true;
            }
        }
        return false;
    }

    cardCount(cardName: string) {
        let result: number = 0;
        for (var i = 0; i < this.cards.length; i++) {
            if (this.cards[i].name == cardName) {
                result++;
            }
        }

        return result;
    }

    typeCardCount(cardType: CardType) {
        let result: number = 0;
        for (var i = 0; i < this.cards.length; i++) {
            let card: Card = this.cards[i];
            if (card.cardType == cardType) {
                result++;
            }
        }

        return result;

    }

    giveCard(card: Card) {
        this.cards.push(card);
    }

    clearCards() {
        let result: Array<Card> = [];
        for (var i = 0; i < this.cards.length; i++) {
            result.push(this.cards[i]);
        }

        this.cards = [];
        return result;
    }

    setCamp(camp: Camp) {
        this.camp = camp;
    }
}

class Rule {
    players: Array<Player>;
    cardEach: number;
    cardTable: Array<CardTableItem>;
    optionalCount: number;
    killerHelperCount: number;
    werewolfHelperCount: number;
    resourceRange: Array<number>;
    retryTime: number;
    keepResource: boolean;
}

function makeCards(cardTable: Array<CardTableItem>) {
    let cards: Array<Card> = [];
    for (var i = 0; i < cardTable.length; ++i) {
        let cardTableItem: CardTableItem = cardTable[i];
        for (var j = 0; j < cardTableItem.count; j++) {
            cards.push(cardTableItem.card);
        }
    }

    return cards;
}

function getCards(cards: Array<Card>, cardType: CardType) {
    let result: Array<string> = [];
    for (var i = 0; i < cards.length; i++) {
        let card: Card = cards[i];
        if (card.type == cardType) {
            if (result.indexOf(card.name) == -1) {
                result.push(card.name);
            }
        }
    }
    return result;
}

function license(rule: Rule) {
    let tempCards: Array<Card> = makeCards(rule.cardTable);
    let tempPlayers: Array<Player> = rule.players;
    let blocktime: number = 0;
    let abandonCards: Array<Card> = [];
    let abandonCardsCount: number = tempCards.length - tempPlayers.length * rule.cardEach;
    let privilegeStrs: Array<string> = getCards(tempCards, CardType.Privilege);

    while (true) {
        abandonCards = [];
        blocktime = 0;
        tempCards = makeCards(rule.cardTable);
        for (var i = 0; i < tempPlayers.length; i++) {
            let player: Player = tempPlayers[i];
            player.clearCards();
        }

        // Deside which card(s) to abandon 先弃牌
        for (var i = 0; i < abandonCardsCount; i++) {
            let card: Card = undefined;
            let cardId: number = undefined;
            do {
                cardId = randomArray(tempCards);
                card = tempCards[cardId];

            } while (card.cardType == CardType.Identity || (rule.keepResource && card.cardType == CardType.Resource));
            abandonCards.push(card);
            tempCards.splice(cardId, 1);
        }

        // License People Cards 发资源牌（水牌）
        if (!licenseResource(tempCards, tempPlayers, rule.resourceRange)) {
            return { result: false, abandonCards: [], players: [] };
        }

        // 身份牌和特权牌
        let currentPID = 0;
        let blockCheck = false;
        while (tempCards.length > 0) {
            if (blocktime > rule.retryTime) {
                blockCheck = true;
                console.log("发牌无解，重发");
                break;
            }
            let cardId: number = randomArray(tempCards);
            let card: Card = tempCards[cardId];
            let player: Player = tempPlayers[currentPID];

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

            // 身份牌不能多拿，不然重发这一张
            let checkLimit = false; 
            for (var i = privilegeStrs.length - 1; i >= 0; i--) {
                let privilege = privilegeStrs[i];
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
        calCamp(tempPlayers, rule.optionalCount, rule.killerHelperCount, rule.werewolfHelperCount);
        break;
    }

    return { result: true, abandonCards: abandonCards, players: tempPlayers };
}

function licenseResource(cards: Array<Card>, players: Array<Player>, resourceRange: Array<number>) {
    let resourceCards: Array<Card> = [];
    for (var i = cards.length - 1; i >= 0; i--) {
        let card: Card = cards[i];
        if (card.type == CardType.Resource) {
            resourceCards.push(card);
            cards.splice(i, 1);
        }
    }

    let minPeople: number = resourceRange[0];
    let maxPeople: number = resourceRange[1];

    if (resourceCards.length < minPeople * players.length || resourceCards.length > maxPeople * players.length) {
        return false;
    }

    for (var i = 0; i < players.length; i++) {
        let player: Player = players[i];
        for (var j = 0; j < minPeople; j++) {
            player.giveCard(resourceCards.pop());
        }
    }

    while (resourceCards.length > 0) {
        let playerId: number = randomArray(players);
        let player: Player = players[playerId];
        if (player.typeCardCount(CardType.Resource) < maxPeople) {
            player.giveCard(resourceCards.pop());
        }
    }

    return true;
}

function calCamp(players: Array<Player>, optionalCount, killerHelperCount, werewolfHelperCount) {
    let unknowPlay: Array<Player> = [];
    for (var i = 0; i < players.length; i++) {
        let player: Player = players[i];
        if (player.hasCard("杀手牌")) {
            player.setCamp(Camp.Killer);
        } else if (player.hasCard("狼人牌")) {
            player.setCamp(Camp.Werewolf);
        } else {
            player.setCamp(Camp.Unknow);
            unknowPlay.push(player);
        }
    }

    for (var i = 0; i < optionalCount; i++) {
        let selectId: number = randomArray(unknowPlay);
        let selectPlayer: Player = unknowPlay[selectId];
        selectPlayer.setCamp(Camp.Optional);
        unknowPlay.splice(selectId, 1);
    }

    for (var i = 0; i < killerHelperCount; i++) {
        let selectId: number = randomArray(unknowPlay);
        let selectPlayer: Player = unknowPlay[selectId];
        selectPlayer.setCamp(Camp.KillerHelper);
        unknowPlay.splice(selectId, 1);
    }

    for (var i = 0; i < werewolfHelperCount; i++) {
        let selectId: number = randomArray(unknowPlay);
        let selectPlayer: Player = unknowPlay[selectId];
        selectPlayer.setCamp(Camp.WereWolfHelper);
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

function getPlayers(playerCount: number) {
    let playerNames: string = (<HTMLInputElement>document.getElementById("players")).value;
    let nameArray = playerNames.split("\n");

    let players: Array<Player> = [];
    for (var i = 0; i < Math.min(nameArray.length, playerCount); i++) {
        players.push(new Player(nameArray[i]));
    }

    if (playerCount > nameArray.length) {
        for (var i = 1; i <= playerCount - nameArray.length; i++)
            players.push(new Player("没名字玩家" + i));
    }


    return players;
}

function getCardTable() {
    let result: Array<CardTableItem> = [];
    processCardStr((<HTMLInputElement>document.getElementById("cardIdentity")).value, CardType.Identity, result);
    processCardStr((<HTMLInputElement>document.getElementById("cardResource")).value, CardType.Resource, result);
    processCardStr((<HTMLInputElement>document.getElementById("cardPrivilege")).value, CardType.Privilege, result);
    return result;
}

function processCardStr(str: string, cardType: CardType, cardTable: Array<CardTableItem>) {
    let lineArray = str.split("\n");
    for (var i = 0; i < lineArray.length; i++) {
        let lineStr: string = lineArray[i];
        let itemArray = lineStr.split(",");
        cardTable.push(new CardTableItem(new Card(itemArray[0], cardType), +itemArray[1]));
    }
}

function doingLicense() {
    let cardTable: Array<CardTableItem> = getCardTable();
    let rule: Rule = new Rule();
    let playerCount: number = +(<HTMLInputElement>document.getElementById("playerCount")).value;

    rule.players = getPlayers(playerCount);
    rule.cardEach = +(<HTMLInputElement>document.getElementById("cardEach")).value;
    rule.cardTable = cardTable;
    rule.optionalCount = +(<HTMLInputElement>document.getElementById("optionalCount")).value;
    rule.killerHelperCount = +(<HTMLInputElement>document.getElementById("killerHelperCount")).value;
    rule.werewolfHelperCount = +(<HTMLInputElement>document.getElementById("werewolfHelperCount")).value;
    rule.keepResource = (<HTMLInputElement>document.getElementById("keepResource")).checked;

    rule.resourceRange = [+(<HTMLInputElement>document.getElementById("resourceMin")).value, +(<HTMLInputElement>document.getElementById("resourceMax")).value];
    rule.retryTime = 20;

    let result = license(rule);

    let titleStr: string = "<tr><th>编号</th><th>玩家姓名</th><th>身份</th>";

    for (var i = 0; i < rule.cardEach; i++) {
        titleStr += "<th class='card_item'></th>";
    }
    titleStr += "</tr>";
    document.getElementById("result").innerHTML = titleStr;

    for (var i = 0; i < result.players.length; i++) {
        let player: Player = result.players[i];
        let str = "<tr>";
        str += "<td>" + (i + 1).toString() + "</td>";
        str += "<td>" + player.name + "</td>";
        str += "<td class='camp" + player.camp + "'>" + CampZH[Camp[player.camp]] + "</td>";
        for (var j = 0; j < player.cards.length; j++) {
            let card: Card = player.cards[j];
            str += "<td class='card" + card.cardType + "'>" + card.name + "</td>";
        }
        str += "</tr>";

        document.getElementById("result").innerHTML += str;
    }

    let abandonStr: string = "<tr><td>弃牌</td><td colspan=" + (rule.cardEach + 2) + ">";
    for (var i = 0; i < result.abandonCards.length; i++) {
        let card: Card = result.abandonCards[i];
        abandonStr += "【" + card.name + "】";
    }

    abandonStr += "</td></tr>";
    document.getElementById("result").innerHTML += abandonStr;
}

interface RuleTable {
    playerCount: number;
    cardEach: number;
    optionalCount: number;
    killerHelperCount: number;
    werewolfHelperCount: number;
    resourceRange: Array<number>;
    keepResource: boolean;
    cardIdentity: string;
    cardResource: string;
    cardPrivilege: string;
}

function setRule(rule: RuleTable) {
    (<HTMLInputElement>document.getElementById("playerCount")).value = rule.playerCount.toString();
    (<HTMLInputElement>document.getElementById("cardEach")).value = rule.cardEach.toString();
    (<HTMLInputElement>document.getElementById("optionalCount")).value = rule.optionalCount.toString();
    (<HTMLInputElement>document.getElementById("killerHelperCount")).value = rule.killerHelperCount.toString();
    (<HTMLInputElement>document.getElementById("werewolfHelperCount")).value = rule.werewolfHelperCount.toString();
    (<HTMLInputElement>document.getElementById("resourceMin")).value = rule.resourceRange[0].toString();
    (<HTMLInputElement>document.getElementById("resourceMax")).value = rule.resourceRange[1].toString();
    (<HTMLInputElement>document.getElementById("keepResource")).checked = rule.keepResource;
    (<HTMLInputElement>document.getElementById("cardIdentity")).value = rule.cardIdentity;
    (<HTMLInputElement>document.getElementById("cardResource")).value = rule.cardResource;
    (<HTMLInputElement>document.getElementById("cardPrivilege")).value = rule.cardPrivilege;
}

let rule_7: RuleTable = {
    playerCount: 7,
    cardEach: 5,
    optionalCount: 1,
    killerHelperCount: 0,
    werewolfHelperCount: 0,
    resourceRange: [1, 2],
    keepResource: false,
    cardIdentity: "杀手牌,1\n狼人牌,1",
    cardResource: "庶民牌,12",
    cardPrivilege: "狙击手牌,2\n束魂牌,2\n巫医牌,2\n防弹衣/狼毒牌,2\n禁锢/反狙击牌,2\n绝杀/特赦牌,2\n诅咒/庇佑牌,2\n纵火/圣人牌,2\n保镖牌,3\n阿米巴变形牌,3"
}

let rule_9: RuleTable = {
    playerCount: 9,
    cardEach: 5,
    optionalCount: 0,
    killerHelperCount: 1,
    werewolfHelperCount: 1,
    resourceRange: [2, 2],
    keepResource: true,
    cardIdentity: "杀手牌,1\n狼人牌,1",
    cardResource: "资源牌,18",
    cardPrivilege: "纵火/圣人牌,2\n绝杀/特赦牌,2\n禁锢/反狙击牌,2\n防弹衣/狼毒牌,2\n狙击手牌,3\n束魂牌,3\n巫医牌,3\n诅咒/庇佑牌,3\n保镖牌,4\n变形牌,4"
}

let rule_single: RuleTable = {
    playerCount: 12,
    cardEach: 1,
    optionalCount: 0,
    killerHelperCount: 0,
    werewolfHelperCount: 0,
    resourceRange: [0, 1],
    keepResource: false,
    cardIdentity: "杀手牌,3",
    cardResource: "平民牌,9",
    cardPrivilege: ""
}

let rule_20:RuleTable = {
    playerCount: 12,
    cardEach: 1,
    optionalCount: 0,
    killerHelperCount: 0,
    werewolfHelperCount: 0,
    resourceRange: [0, 1],
    keepResource: false,
    cardIdentity: "杀手牌,3",
    cardResource: "平民牌,6",
    cardPrivilege: "警察牌,3"
}