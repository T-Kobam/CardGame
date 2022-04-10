// 2/15 カードを配って、意思決定を行い、ラウンドを終了する流れまで実装
// ただし、詳細な動きは未実装。流れだけを作れた

config = {
    "suits": ["H", "D", "C", "S"], // カードの絵柄
    "ranks": ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"], // カードの数字

    // html関連
    "menu": document.getElementById("menu"),
    "game": document.getElementById("game"),
    "action": document.getElementById("action"),
    "betting": document.getElementById("betting"),
    "nextGame": document.getElementById("next-game"),
    "suitsName": { "H": "heart", "D": "diamond", "C": "club", "S": "spade" },
}

const sleepSec = async (second) => {
    await new Promise(resolve => setTimeout(resolve, second * 1000));
}

/**
 * カードClass
 * カード1枚の状態を決定する
 */
class Card {
    constructor(suit, rank) {
        this.suit = suit // スート
        this.rank = rank // ランク
    }

   /**
    * カードのランクを基準とした整数のスコアを返す
    * 2-10はそのまま数値を返す
    * {"J", "Q", "K"}を含む、フェースカードは10を返す
    * "A"が1なのか11なのかを判断するには手札全体の知識が必要なので、「A」はとりあえず11を返す
    * @returns カードの数値
    */
    getRankNumber() {
        if (this.rank >= 2 && this.rank <= 10) {
            return parseInt(this.rank);
        } else if (this.rank === "A") {
            return 11;
        }

        return 10;
    }
}

/**
 * デッキClass
 * カードの集合体
 */
class Deck {
   /**
    * ゲームタイプの指定
    * @param {*} gameType {"blackjack"}から選択(ポーカー追加予定)
    */
    constructor(gameType) {
        this.gameType = gameType;   // このデッキが扱うゲームタイプ
        this.cards = [];            // カードの配列

        // ゲームタイプによって、カードを初期化
        if (this.gameType === "blackjack") {
            this.resetDeck();
        }
    }
    
   /**
    * Fisher–Yates shuffleアルゴリズムを使用して、カードをシャッフルする
    */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const targetIndex = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[targetIndex]] = [this.cards[targetIndex], this.cards[i]];
        }
    }

   /**
    * デッキの状態を初期化する
    */
    resetDeck() {
        // デッキの中身を初期化
        this.cards = [];

        // 新しく52枚のカードを挿入
        for (const suit of config.suits) {
            for (const rank of config.ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }
    
   /**
    * ポップされたカードを返す
    * @returns 先頭のカード
    */
    drawOne() {
        return this.cards.pop();
    }
}

class Player {
   /**
    * 
    * @param {*} name プレイヤーの名前
    * @param {*} type プレイヤーのタイプ("ai", "user", "house")
    * @param {*} gameType プレイヤーの初期化方法を決定するために使用({"blackjack"})
    * @param {*} chips ゲーム開始に必要なチップ(デフォルトは400)
    */
    constructor(name, type, gameType, chips = 400) {
        this.name = name;           // プレイヤーの名前
        this.type = type;           // プレイヤーのタイプ
        this.gameType = gameType;   // 現在のゲームタイプ
        this.hand = [];             // プレイヤーの手札(Cardクラスの配列)
        this.chips = chips;         // プレイヤーが所持しているチップ
        this.bet = 0;               // 現在のラウンドでベットしているチップ
        this.winAmount = 0;         // 勝利金額(整数)

        // プレイヤーのゲームの状態やアクションを表します。
        // ブラックジャックの場合、最初の状態は「betting」です。
        this.gameStatus = (this.type === "house") ? "acting" : "betting";
    }

    /*
       ?Number userData : モデル外から渡されるパラメータ。nullになることもあります。
       return GameDecision : 状態を考慮した上で、プレイヤーが行った決定。

        このメソッドは、どのようなベットやアクションを取るべきかというプレイヤーの決定を取得します。
        プレイヤーのタイプ、ハンド、チップの状態を読み取り、GameDecisionを返します。
        パラメータにuserData使うことによって、プレイヤーが「user」の場合、このメソッドにユーザーの情報を渡すことができますし、プレイヤーが 「ai」の場合、 userDataがデフォルトとしてnullを使います。
    */
    async promptPlayer(userData) {
        // typeがAIの場合、houseの情報を受け取る
        // ベーシックストラテジーに基づいた戦略を取る
        if (this.type === "ai") {
            await sleepSec(1);
            if (this.gameStatus === "betting") {
                return new GameDecision("bet", 50);
            }
            
            // houseのオープンカード
            const openCard = userData.hand[0];

            // 2枚とも同じsuitか(スプリットケース)
            if (this.hand[0].rank === this.hand[1].rank) {
                // A, 2, 3, 4, 6, 7, 8, 9の場合
                if (["A", "2", "3", "4", "6", "7", "8", "9"].includes(this.hand[0].rank)) {
                    return new GameDecision("hit", 0);
                }
                // ５の場合 
                else if (this.hand[0].rank === "5") {
                    if (["A", "10", "J", "Q", "K"].includes(openCard)) {
                        return new GameDecision("hit", 0)
                    } else {
                        return new GameDecision("double", this.bet)
                    }
                } 
                // 9の場合
                else if (this.hand[0].rank === "9") {
                    if (["A", "7", "10", "J", "Q", "K"].includes(openCard)) {
                        return new GameDecision("stand", 0);
                    } else {
                        return new GameDecision("hit", 0);
                    }
                } 
                // 10の場合
                else {
                    return new GameDecision("stand", 0);
                }
            }
            // Aceを含んでいるか(ソフトハンドケース)
            if (this.hand.some(card => card.rank === "A")) {
                // 2, 3の場合
                if (this.hand.some(card => ["2", "3"].includes(card.rank))) {
                    if (["5", "6"].includes(openCard)) {
                        return new GameDecision("double", this.bet);
                    }
                    else {
                        return new GameDecision("hit", 0);
                    }
                }
                // 4, 5の場合
                else if (this.hand.some(card => ["4", "5"].includes(card.rank))) {
                    if (["3", "4", "5", "6"].includes(openCard)) {
                        return new GameDecision("double", this.bet);
                    }
                    else {
                        return new GameDecision("hit", 0);
                    }
                }
                // 6の場合
                else if (this.hand.some(card => card.rank === "6")) {
                    if (["3", "4", "5", "6"].includes(openCard)) {
                        return new GameDecision("double", this.bet);
                    }
                    else {
                        return new GameDecision("hit", 0);
                    }
                }
                // 7の場合
                else if (this.hand.some(card => card.rank === "7")) {
                    if (["3", "4", "5", "6"].includes(openCard)) {
                        return new GameDecision("hit", 0);
                    }
                    else if (["2", "7", "8"].includes(openCard)) {
                        return new GameDecision("stand", 0);
                    }
                    else {
                        return new GameDecision("hit", 0);
                    }
                }
                else {
                    return new GameDecision("stand", 0);
                }

            }
            // ハードハンドケース
            if (this.getHandScore() >= 17) return new GameDecision("stand", 0);
            else if (this.getHandScore() <= 8) return new GameDecision("hit", 0);
            else if (this.getHandScore() >= 13) {
                if (["2", "3", "4", "5", "6"].includes(openCard)) return new GameDecision("stand", 0);
                return new GameDecision("hit", 0);
            }
            else if (this.getHandScore() === 12) {
                if (["4", "5", "6"].includes(openCard)) return new GameDecision("stand", 0);
                else return new GameDecision("hit", 0);
            }
            else if (this.getHandScore() === 11) {
                if (openCard === "A") return new GameDecision("hit", 0);
                else return new GameDecision("double", this.bet);
            }
            else if (this.getHandScore() === 10) {
                if (["A", "10", "J", "Q", "K"].includes(openCard)) return new GameDecision("hit", 0);
                else return new GameDecision("double", this.bet);
            }
            else if (this.getHandScore() === 9) {
                if (["3", "4", "5", "6"].includes(openCard)) return new GameDecision("double", this.bet);
                else return new GameDecision("hit", 0);
            }
            else return new GameDecision("hit", 0);
        }

        if (this.type === "user") {
            let bet = this.bet;
            if (this.gameStatus === "hit") {
                bet = 0;
            }
            return new GameDecision(this.gameStatus, bet);
        }

        if (this.type === "house") {
            await sleepSec(2);
            return (this.getHandScore() >= 17) ? new GameDecision("stand", 0) : new GameDecision("hit", 0);
        }
    }

   /**
    * 手札の合計を返す
    * 合計が21を超える場合、手札のAceについて合計が21以下になるまで10を引く
    * @returns 手札の合計
    */
    getHandScore() {
        let score = 0;
        let hasAce = false;
        this.hand.forEach(card => {
            if (card.rank === "A") {
                hasAce = true;
            }
            score += card.getRankNumber();
        });

        return (score > 21 && hasAce) ? score - 10 : score;
    }
}

class GameDecision {
    /*
        String action : プレイヤーのアクションの選択。（ブラックジャックでは、hit、standなど。）
        {'bet', 'surrender', 'stand', 'hit', 'double'}から設定
        Number amount : プレイヤーが選択する数値。

       これはPlayer.promptPlayer()は常にreturnする、標準化されたフォーマットです。
    */
    constructor(action, amount) {
        this.action = action; // アクション
        this.amount = amount; // プレイヤーが選択する数値
    }
}

class Table {
   /**
    * 
    * @param {*} gameType ゲームタイプ({"blackjack"}から選択)
    * @param {*} betDenominations プレイヤーが選択できるベットの単位(デフォルトは[5,20,50,100])
    */
    constructor(gameType, name, type, betDenominations = [5, 20, 50, 100]) {
        this.gameType = gameType;
        this.betDenominations = betDenominations;
        
        // テーブルのカードのデッキ
        this.deck = new Deck(this.gameType);
        
        // プレイしているゲームに応じて、プレイヤー、gamePhases、ハウスの表現が異なるかもしれません。
        // 今回はとりあえず3人のAIプレイヤーとハウス、「betting」フェースの始まりにコミットしましょう。
        this.players = []
        
        // プレイヤーをここで初期化してください
        this.house = new Player('house', 'house', this.gameType);
        this.players.push(new Player("AI-1", "ai", this.gameType));
        this.players.push(new Player(name, type, this.gameType));
        this.players.push(new Player("AI-3", "ai", this.gameType));
        this.playerNumber = 0;
        this.gamePhase = "betting";
        this.gameRound = 1;

        // これは各ラウンドの結果をログに記録するための文字列の配列です。
        this.resultsLog = []
    }

    /*
        Player player : テーブルは、Player.promptPlayer()を使用してGameDecisionを取得し、GameDecisionとgameTypeに応じてPlayerの状態を更新します。
        return Null : このメソッドは、プレーヤの状態を更新するだけです。

        EX:
        プレイヤーが「ヒット」し、手札が21以上の場合、gameStatusを「バスト」に設定し、チップからベットを引きます。
    */
    async evaluateMove(player) {
        // Playerの処理判断
        const decision = await player.promptPlayer(this.house);
        
        // Playerがbettingの状態の場合
        if (player.gameStatus === "betting") {
            player.bet = decision.amount;
            player.gameStatus = "acting";
        }
        // Playerがactingの状態の場合(hit, double, stand, surrender)
        else if (player.gameStatus === "acting" || player.type === "user") {
            if (decision.action === "stand") {
                player.gameStatus = "roundOver";
            }
            else if (decision.action === "surrender") {
                // TODO: 処理
            }
            else {
                player.hand.push(this.deck.drawOne());
                player.bet += decision.amount;
                // bustした場合
                if (player.getHandScore() > 21) {
                    player.gameStatus = "roundOver";
                }
            }
        }

        return;
    }

    /*
       return String : 新しいターンが始まる直前の全プレイヤーの状態を表す文字列。
        NOTE: このメソッドの出力は、各ラウンドの終了時にテーブルのresultsLogメンバを更新するために使用されます。
    */
    blackjackEvaluateAndGetRoundResults() {
        this.resultsLog.push(
            `${this.gameRound} Round End: `, 
            JSON.stringify({ name: this.house.name, hand: this.house.hand, total: this.house.getHandScore() }), 
            this.players.map((it) => { return JSON.stringify({ name: it.name, winAmount: it.winAmount, chips: it.chips, hand: it.hand, total: it.getHandScore() }); })
        );
    }

   /**
    * デッキから2枚のカードを手札に加える
    * 全プレイヤーの状態を更新する
    */
    blackjackAssignPlayerHands() {
        this.deck.shuffle();
        for (let i = 0; i < 2; i++) {
            this.players.forEach((player) => player.hand.push(this.deck.drawOne()));
            this.house.hand.push(this.deck.drawOne());
        }
    }

    /*
       return null : テーブル内のすべてのプレイヤーの状態を更新し、手札を空の配列に、ベットを0に設定します。
    */
   /**
    * 全プレイヤーの手札をからの配列に、ベットを0に設定する
    * 全プレイヤーの状態を更新
    */
    blackjackClearPlayerHandsAndBets() {
        this.players.forEach((player) => {
            player.hand = [];
            player.bet = 0;
            player.gameStatus = "betting";
        });
        this.house.hand = [];
        this.house.gameStatus = "betting";
        this.deck.resetDeck();
    }
    
    /*
       return Player : 現在のプレイヤー
    */
    getTurnPlayer() {
        return this.players[this.playerNumber];
    }

    /*
       Number userData : テーブルモデルの外部から渡されるデータです。 
       return Null : このメソッドはテーブルの状態を更新するだけで、値を返しません。
    */
    async haveTurn(userData) {
        if (this.gamePhase === "betting") {
            await this.evaluateMove(userData);

            if (this.onLastPlayer()) {
                this.playerNumber = 0;
                this.blackjackAssignPlayerHands();
                this.gamePhase = "dealCards";
                return;
            }

            this.playerNumber++;
        }
        else if (this.gamePhase === "dealCards") {
            this.gamePhase = "acting";
        }
        else if (this.gamePhase === "acting") {
            // console.log("start acting : ", this.getTurnPlayer());
            if (!this.allPlayerActionsResolved()) {
                await this.evaluateMove(userData);
                this.playerNumber += (userData.gameStatus === "roundOver") ? 1 : 0;
                if (this.playerNumber >= this.players.length) {
                    this.playerNumber = 0;
                }
                return;
            }

            // playerのactionが全て終了した場合、ディーラーがactionを行う 
            if (this.house.gameStatus === "roundOver") {
                this.gamePhase = "evaluating";
                return;
            }

            await this.evaluateMove(this.house);
        }
        else if (this.gamePhase === "evaluating") {
            this.evaluateResults();
            this.blackjackEvaluateAndGetRoundResults();
            this.blackjackClearPlayerHandsAndBets();
            this.gameRound++;
            this.gamePhase = "roundOver"
        }

        return;
    }

    /*
        return Boolean : テーブルがプレイヤー配列の最初のプレイヤーにフォーカスされている場合はtrue、そうでない場合はfalseを返します。
    */
    onFirstPlayer() {
        return this.playerNumber === 0;
    }

    /*
        return Boolean : テーブルがプレイヤー配列の最後のプレイヤーにフォーカスされている場合はtrue、そうでない場合はfalseを返します。
    */
    onLastPlayer() {
        return this.playerNumber === this.players.length - 1;
    }
    
    /*
        全てのプレイヤーがセット{'broken', 'bust', 'stand', 'surrender'}のgameStatusを持っていればtrueを返し、持っていなければfalseを返します。
    */
    allPlayerActionsResolved() {
        return this.players.every(player => player.gameStatus === "roundOver");
    }

    // 自作: 結果の評価
    evaluateResults() {
        for (const player of this.players) {
            if (player.getHandScore() > 21) {
                player.winAmount -= player.bet;
                player.chips -= player.bet;  
            }
            else if (this.house.getHandScore() > 21 || (player.getHandScore() > this.house.getHandScore())) {
                player.winAmount = player.bet;
                player.chips += player.bet;
            }
            else if (this.house.getHandScore() <= 21 && (player.getHandScore() <= this.house.getHandScore())) {
                player.winAmount -= player.bet;
                player.chips -= player.bet;
            }
        }
    }

    // 自作: chipが0になっていないかを確認
    isAnyOneChipsZero() {
        for (const player of this.players) {
            if (player.chips <= 0) {
                this.gamePhase = "roundOver";
            }
        }
        this.gamePhase = "betting";
    }
}

// ゲーム開始
// ボタンが押下されたことによるリスナー作成

// メイン画面
// Start Game が押下されたら画面を切り替える
// ただし、名前が入力されていない場合はエラー表示
// TODO: プレイヤーの人数を可変にする
let table;
document.getElementById("start-btn").addEventListener("click", async () => {
    const gameType = document.getElementById("game-type").value;
    if (gameType !== "blackjack") {
        alert("選択されたゲームは現在ご利用できません");
        return;
    }

    const name = document.getElementById("name").value;
    if (name.length === 0) {
        alert("名前を入力してください");
        return;
    }

    // nameを取得して、Tableインスタンスを作成
    const userType = (name.toLowerCase() === "ai") ? "ai" : "user";
    const userName = (name.toLowerCase() === "ai") ? "AI-2" : name;
    table = new Table(gameType, userName, userType);

    // 画面にプレイヤーを表示
    // TODO: Tableインスタンスからプレイヤーの名前の配列を取得したい
    table.players.forEach(player => createUserHandDiv(player));

    // 画面を切り替える
    displayNone(config.menu);
    displayBlock(config.game);

    await renderTable(table);
});

const renderTable = async (table) => {
    const onPlayer = table.getTurnPlayer();

    if (table.gamePhase === "betting") {
        document.getElementById(`${onPlayer.name}-name`).classList.add("border", "border-warning");
        await table.haveTurn(onPlayer);
        changeStatus(onPlayer);
        document.getElementById(`${onPlayer.name}-name`).classList.remove("border", "border-warning");

        if (table.getTurnPlayer().type === "ai") {
            await renderTable(table);
        } else {
            displayBlock(config.betting);
        }
    }
    else if (table.gamePhase === "dealCards") {
        document.getElementById("house-status").innerHTML = "Waiting for actions";

        // forEachはPromiseを持たないためfor loopを使用
        for(const player of table.players) {
            await sleepSec(0.5);
            for (const card of player.hand) {
                await sleepSec(0.2);
                createCardDiv(player.name, card);
            }
        }

        await sleepSec(0.5);
        createCardDiv(table.house.name, table.house.hand[0]);
        await sleepSec(0.2);
        createCardDiv(table.house.name, table.house.hand[1], false);

        await table.haveTurn();
        await renderTable(table);
    } 
    else if (table.gamePhase === "acting") {
        if (!table.allPlayerActionsResolved()) {
            document.getElementById(`${onPlayer.name}-name`).classList.add("border", "border-warning");
        }
        await table.haveTurn(onPlayer);

        if (onPlayer.gameStatus !== "roundOver" && onPlayer.type === "ai") {
            await sleepSec(0.5);
            createCardDiv(onPlayer.name, onPlayer.hand[onPlayer.hand.length - 1]);
        }

        if (onPlayer.type === "user") {
            await sleepSec(0.5);
            resetCardDiv(onPlayer.name);
            onPlayer.hand.forEach((it) => createCardDiv(onPlayer.name, it));    

        }

        if (table.allPlayerActionsResolved()) {
            await sleepSec(0.8);
            resetCardDiv(table.house.name);
            table.house.hand.forEach((it) => createCardDiv(table.house.name, it));    
        }
        changeStatus(onPlayer);
        document.getElementById(`${onPlayer.name}-name`).classList.remove("border", "border-warning");

        if (table.getTurnPlayer().type === "ai") {
            displayNone(config.action);
            await renderTable(table);
        } else {
            displayBlock(config.action);
        }
    }
    else if (table.gamePhase === "evaluating") {
        await table.haveTurn();
        table.players.forEach(player => changeStatus(player));
        await renderTable(table);
    }
    else if (table.gamePhase === "roundOver") {
        displayBlock(config.nextGame);
        betValue.forEach(bet => bet.value = 0);
        return;
    }

    // await renderTable(table);
};

// ベットの枚数調整ボタン
const betValue = document.querySelectorAll(".bet");
const plusBtn = document.querySelectorAll(".plus");
const minusBtn = document.querySelectorAll(".minus");
for (let i = 0; i < betValue.length; i++) {
    plusBtn[i].addEventListener("click", () => {
        const value = parseInt(betValue[i].value) + 1;
        betValue[i].value = value;
    });
    minusBtn[i].addEventListener("click", () => {
        const value = parseInt(betValue[i].value) - 1;
        betValue[i].value = (value < 0) ? 0 : value;
    });
}

// Betボタンが押下されたことによるリスナー作成
document.getElementById("bet-btn").addEventListener("click", async () => {
    let totalBet = 0;
    [5, 10, 20, 50].forEach((num, index) => {
        totalBet += betValue[index].value * num;
    });

    if (totalBet <= 0) {
        alert("ベットしてください");
        return;
    }

    displayNone(config.betting);
    table.players[1].bet = totalBet;

    await renderTable(table);
});

/**
 * 画面を非表示にする
 * @param element
 */
 const displayNone = (element) => {
    element.classList.add("d-none");
    element.classList.remove("d-block");
};

/**
 * 画面を表示する
 * @param element 
 */
const displayBlock = (element) => {
    element.classList.remove("d-none");
    element.classList.add("d-block");
};

/**
 * プレイヤーの手札、ステータスをusers-handの要素に追加する
 * @param player.name 
 */
// TODO: nameではなくPlayerインスタンスを使用する
const createUserHandDiv = (player) => {
    const usersHandDiv = document.getElementById("users-hand");
    usersHandDiv.innerHTML +=
    `
    <div class="col-md-auto mx-2">
        <div class="row justify-content-center">
            <div class="col-md-8" id="${player.name}-name">
                <h2 class="text-white text-center">${player.name}</h2>
            </div>
            <div class="w-100"></div>
            <div>
                <p class="text-white">Status: <span id="${player.name}-status">${player.gameStatus}</span> Bet: <span id="${player.name}-bet">${player.bet}</span> Chip: <span id="${player.name}-chips">${player.chips}</span></p>
            </div>
        </div>
    
        <div class="row justify-content-center" id="${player.name}-hand"></div>
    `;
};

const createCardDiv = (name, card, isShow = true) => {
    const userHandDiv = document.getElementById(`${name}-hand`);
    if (isShow) {
        userHandDiv.innerHTML +=
        `
        <div class="card mx-1" style="width: 5rem; height: 7rem;">
            <img class="card-img-top img-fluid w-50 mx-auto" src="images/suits/${config.suitsName[card.suit]}.png" alt="Card image cap">
            <div class="card-body">
                <h2 class="card-title text-center">${card.rank}</h2>
            </div>
        </div>
        `;
    } else {
        userHandDiv.innerHTML +=
        `
        <div class="card mx-1" style="width: 5rem; height: 7rem;">
            <div class="card-body">
                <h2 class="card-title text-center">?</h2>
            </div>
        </div>
        `;
        
    }
};

const resetCardDiv = (name) => {
    document.getElementById(`${name}-hand`).innerHTML = "";
}

const changeStatus = (player) => {
    document.getElementById(`${player.name}-status`).innerHTML = `${player.gameStatus}`;
    document.getElementById(`${player.name}-bet`).innerHTML = `${player.bet}`;
    document.getElementById(`${player.name}-chips`).innerHTML = `${player.chips}`;
}

config.nextGame.addEventListener("click", () => {
    displayNone(config.nextGame);
    table.players.forEach(player => resetCardDiv(player.name));
    resetCardDiv(table.house.name);
    table.gamePhase = "betting";
    renderTable(table);
});

document.getElementById("surrender").addEventListener("click", async () => {
    table.players[1].gameStatus = "surrender";
    await renderTable(table);
})

document.getElementById("stand").addEventListener("click", async () => {
    table.players[1].gameStatus = "stand";
    await renderTable(table);
})

document.getElementById("hit").addEventListener("click", async () => {
    table.players[1].gameStatus = "hit";
    await renderTable(table);
})

document.getElementById("double").addEventListener("click", async () => {
    table.players[1].gameStatus = "double";
    await renderTable(table);
})