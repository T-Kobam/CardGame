// 2/15 カードを配って、意思決定を行い、ラウンドを終了する流れまで実装
// ただし、詳細な動きは未実装。流れだけを作れた

config = {
    "suits": ["H", "D", "C", "S"], // カードの絵柄
    "ranks": ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"], // カードの数字
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
    * @param {*} gameType {"blackjack"}から選択
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
        this.gameStatus = 'betting';
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
            if (this.bet === 0) {
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
                else return new GameDecision("hit", 0);
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
    }

    /*
       return Number : 手札の合計

       合計が21を超える場合、手札の各エースについて、合計が21以下になるまで10を引きます。
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
    onPlayer;

   /**
    * 
    * @param {*} gameType ゲームタイプ({"blackjack"}から選択)
    * @param {*} betDenominations プレイヤーが選択できるベットの単位(デフォルトは[5,20,50,100])
    */
    constructor(gameType, betDenominations = [5, 20, 50, 100]) {
        this.gameType = gameType;
        this.betDenominations = betDenominations;
        
        // テーブルのカードのデッキ
        this.deck = new Deck(this.gameType);
        
        // プレイしているゲームに応じて、プレイヤー、gamePhases、ハウスの表現が異なるかもしれません。
        // 今回はとりあえず3人のAIプレイヤーとハウス、「betting」フェースの始まりにコミットしましょう。
        this.players = []
        
        // プレイヤーをここで初期化してください
        this.house = new Player('house', 'house', this.gameType);
        this.players.push(new Player("AI1", "ai", this.gameType));
        this.players.push(new Player("AI2", "ai", this.gameType));
        this.onPlayer = this.players[0];
        this.gamePhase = 'betting'

        // これは各ラウンドの結果をログに記録するための文字列の配列です。
        this.resultsLog = []
    }

    /*
        Player player : テーブルは、Player.promptPlayer()を使用してGameDecisionを取得し、GameDecisionとgameTypeに応じてPlayerの状態を更新します。
        return Null : このメソッドは、プレーヤの状態を更新するだけです。

        EX:
        プレイヤーが「ヒット」し、手札が21以上の場合、gameStatusを「バスト」に設定し、チップからベットを引きます。
    */
    evaluateMove(Player) {
        const decision = Player.promptPlayer(this.house);
        
        if (decision.action === "bet") {
            Player.bet = decision.amount;
        } else if (decision.action === "hit") {
            Player.hand.push(this.deck.drawOne());
            if (Player.getHandScore() > 21) {
                Player.gameStatus = "bust";
                Player.chip -= Player.bet;
            }
        } else if (decision.action === "double") {
            Player.hand.push(this.deck.drawOne());
            Player.hand.push(this.deck.drawOne());
            if (Player.getHandScore() > 21) {
                Player.gameStatus = "bust";
                Player.chip -= Player.bet;
            }
        }
        else if (decision.action === "stand") {
            Player.gameStatus = "stand";
        }
    }

    /*
       return String : 新しいターンが始まる直前の全プレイヤーの状態を表す文字列。
        NOTE: このメソッドの出力は、各ラウンドの終了時にテーブルのresultsLogメンバを更新するために使用されます。
    */
    blackjackEvaluateAndGetRoundResults() {
        this.resultsLog.push('Round End: ', JSON.stringify(this.house), this.players.map((it) => { return JSON.stringify(it); }));
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
    blackjackClearPlayerHandsAndBets() {
        for (const player of this.players) {
            player.hand = [];
            player.bet = 0;
        }
        this.house.hand = [];
    }
    
    /*
       return Player : 現在のプレイヤー
    */
    getTurnPlayer() {
        return this.onPlayer;
    }

    /*
       Number userData : テーブルモデルの外部から渡されるデータです。 
       return Null : このメソッドはテーブルの状態を更新するだけで、値を返しません。
    */
    haveTurn(userData) {
        //TODO: ここから挙動をコードしてください。

        
    }

    /*
        return Boolean : テーブルがプレイヤー配列の最初のプレイヤーにフォーカスされている場合はtrue、そうでない場合はfalseを返します。
    */
    onFirstPlayer() {
        //TODO: ここから挙動をコードしてください。
        return this.onPlayer === this.players[0];
    }

    /*
        return Boolean : テーブルがプレイヤー配列の最後のプレイヤーにフォーカスされている場合はtrue、そうでない場合はfalseを返します。
    */
    onLastPlayer() {
        //TODO: ここから挙動をコードしてください。
        return this.onPlayer === this.players[1];
    }
    
    /*
        全てのプレイヤーがセット{'broken', 'bust', 'stand', 'surrender'}のgameStatusを持っていればtrueを返し、持っていなければfalseを返します。
    */
    allPlayerActionsResolved() {
        //TODO: ここから挙動をコードしてください。
        for (let player of this.players) {
            if (player.gameStatus != "bust" && player.gameStatus != "stand") {
                return false;
            }
        }
        return true;
    }

    // 自作: プレイヤーがbetを行う
    bettingPhase() {
        for (let player of this.players) {
            this.evaluateMove(player);
        }
    }

    // 自作: アクションを取る
    takingAction() {
        for (let player of this.players) {
            this.evaluateMove(player);
        }
    }
}

// ゲーム開始
// ブラックジャックを選択
let table1 = new Table("blackjack");

// betを行う
table1.bettingPhase();
table1.blackjackAssignPlayerHands();
while (!table1.allPlayerActionsResolved()) {
    table1.takingAction();
}
table1.blackjackEvaluateAndGetRoundResults();
// while(table1.gamePhase != 'roundOver'){
//     table1.haveTurn();
// }

// 初期状態では、ハウスと2人以上のA.Iプレーヤーが戦います。
console.log(table1.resultsLog);