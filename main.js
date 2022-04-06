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
    "suitsName": { "H": "heart", "D": "diamond", "C": "club", "S": "spade" },
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
    promptPlayer(userData) {
        // typeがAIの場合、houseの情報を受け取る
        // ベーシックストラテジーに基づいた戦略を取る
        if (this.type === "ai") {
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

        // houseの場合
        if (this.type === "house") {
            return this.getHandScore() >= 17 ? new GameDecision("stand", 0) : new GameDecision("hit", 0);
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
        for (const card of this.hand) {
            if (card.rank === "A") hasAce = true;
            score += card.getRankNumber();
        }

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
        this.turnCounter = 0;
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
    evaluateMove(player) {
        // Playerの処理判断
        const decision = player.promptPlayer(this.house);
        
        // Playerがbettingの状態の場合
        if (player.gameStatus === "betting") {
            player.bet = decision.amount;
            player.gameStatus = "acting";
        }
        // Playerがactingの状態の場合(hit, double, stand, surrender)
        else if (player.gameStatus === "acting") {
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
            for (const player of this.players) {
                player.hand.push(this.deck.drawOne());
            }
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
        for (const player of this.players) {
            player.hand = [];
            player.bet = 0;
            player.gameStatus = "betting";
        }
        this.house.hand = [];
        this.deck.resetDeck();
    }
    
    /*
       return Player : 現在のプレイヤー
    */
    getTurnPlayer() {
        return this.players[this.turnCounter];
    }

    /*
       Number userData : テーブルモデルの外部から渡されるデータです。 
       return Null : このメソッドはテーブルの状態を更新するだけで、値を返しません。
    */
    haveTurn(userData) {
        if (this.gamePhase === "betting") {
            // console.log("start betting : ", this.getTurnPlayer());
            this.evaluateMove(this.getTurnPlayer());
            this.turnCounter++;

            if (this.onLastPlayer()) {
                // 先頭に戻す
                this.turnCounter = 0;

                // カードを配る
                this.blackjackAssignPlayerHands();

                // gamePhaseを変更
                this.gamePhase = "dealCards";
            }
        }
        else if (this.gamePhase === "dealCards") {
            this.gamePhase = "acting";
        }
        else if (this.gamePhase === "acting") {
            // console.log("start acting : ", this.getTurnPlayer());
            
            // 全Playerのactingが終了した場合
            if (this.allPlayerActionsResolved()) {
                if (this.house.gameStatus === "roundOver") {
                    this.turnCounter = 0;
                    this.gamePhase = "evaluating";
                } else {
                    this.evaluateMove(this.house);
                }
            } else {
                this.turnCounter += (this.getTurnPlayer().gameStatus === "roundOver") ? 1 : 0;
                this.evaluateMove(this.getTurnPlayer());
            }
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
        return this.turnCounter === 0;
    }

    /*
        return Boolean : テーブルがプレイヤー配列の最後のプレイヤーにフォーカスされている場合はtrue、そうでない場合はfalseを返します。
    */
    onLastPlayer() {
        return this.turnCounter === this.players.length;
    }
    
    /*
        全てのプレイヤーがセット{'broken', 'bust', 'stand', 'surrender'}のgameStatusを持っていればtrueを返し、持っていなければfalseを返します。
    */
    allPlayerActionsResolved() {
        for (let player of this.players) {
            if (player.gameStatus != "roundOver") {
                return false;
            }
        }
        return true;
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
// ブラックジャックを選択
// let table1 = new Table("blackjack", "AI-2", "ai");

// for (let i = 0; i < 10; i++) {
//     table1.gamePhase = 'betting';
//     while(table1.gamePhase != 'roundOver'){
//         table1.haveTurn();
//     }
// }
// // 初期状態では、ハウスと2人以上のA.Iプレーヤーが戦います。
// console.log(table1.resultsLog);


// ボタンが押下されたことによるリスナー作成

// メイン画面
// Start Game が押下されたら画面を切り替える
// ただし、名前が入力されていない場合はエラー表示
// TODO: プレイヤーの人数を可変にする
let table;
document.getElementById("start-btn").addEventListener("click", () => {
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
    ["AI-1", userName, "AI-3"].forEach((it) => {
        createUserHandDiv(it);
    });

    // 画面を切り替える
    displayNone(config.menu);
    displayBlock(config.game);

    if (userType === "ai") { 
        displayNone(config.betting);
    }

    renderTable(table);
});

const renderTable = async (table) => {
    // カードを配った後、画面に反映する
    if (table.gamePhase === "dealCards") {
        table.players.forEach((player) => {
            if (player.type === "ai" ) {
                player.hand.forEach((it) => {
                    createCardDiv(player.name, it)
                })
            }
        });

        document.getElementById("house-status").innerHTML = "Waiting for actions";

        createCardDiv(table.house.name, table.house.hand[0]);
    } else if (table.gamePhase === "acting") {
        const onPlayer = table.getTurnPlayer();
        if (onPlayer.gameStatus !== "roundOver") {
            if (onPlayer.type === "ai") {
                await new Promise(resolve => setTimeout(() => {
                    resetCardDiv(onPlayer.name);
                    onPlayer.hand.forEach((it) => {
                        createCardDiv(onPlayer.name, it);
                    });
                    resolve();
                }, 1000));
            }
        }

        if (table.allPlayerActionsResolved()) {
            await new Promise(resolve => setTimeout(() => {
                resetCardDiv(table.house.name);
                table.house.hand.forEach((it) => {
                    createCardDiv(table.house.name, it);
                });
                resolve();
            }, 2000));
        }
    }
    else if (table.gamePhase === "evaluating") {
        console.log("evaluating");
    }
    else if (table.gamePhase === "roundOver") {
        return;
    }

    table.haveTurn();
    renderTable(table);
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
document.getElementById("bet-btn").addEventListener("click", () => {
    let totalBet = 0;
    [5, 10, 20, 50].forEach((num, index) => {
        totalBet += betValue[index].value * num;
    });

    if (totalBet <= 0) {
        alert("ベットしてください");
        return;
    }

    displayNone(config.betting);
    displayBlock(config.action);

    createCardDiv("AI-2", new Card("S", "J"));
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
 * @param name 
 */
// TODO: nameではなくPlayerインスタンスを使用する
 const createUserHandDiv = (name) => {
    const usersHandDiv = document.getElementById("users-hand");
    usersHandDiv.innerHTML +=
    `
    <div class="col-md-auto mx-2">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <h2 class="text-white text-center">${name}</h2>
            </div>
            <div class="w-100"></div>
            <div>
                <p class="text-white ${name}">Status:<span>bet</span> Bet:<span>10</span> Chip:<span>100</span></p>
            </div>
        </div>
    
        <div class="row justify-content-center" id="${name}-hand"></div>
    `;
};

const createCardDiv = (name, card) => {
    const userHandDiv = document.getElementById(`${name}-hand`);
    userHandDiv.innerHTML +=
    `
    <div class="card mx-1" style="width: 5rem; height: 7rem;">
        <img class="card-img-top img-fluid w-50 mx-auto" src="images/suits/${config.suitsName[card.suit]}.png" alt="Card image cap">
        <div class="card-body">
            <h2 class="card-title text-center">${card.rank}</h2>
        </div>
    </div>
    `;
};

const resetCardDiv = (name) => {
    document.getElementById(`${name}-hand`).innerHTML = "";
}