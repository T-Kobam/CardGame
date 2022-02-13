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

            if (this.getHandScore() <= 15) {
                return new GameDecision("hit", 0);
            }
            return new GameDecision("stand", 0);
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
        const decision = Player.promptPlayer();
        
        if (decision.action === "bet") {
            Player.bet = decision.amount;
        } else if (decision.action === "hit") {
            Player.hand.push(this.deck.drawOne());
            if (Player.getHandScore() > 21) {
                Player.gameStatus = "bust";
                Player.chip -= Player.bet;
            }
        }
    }

    /*
       return String : 新しいターンが始まる直前の全プレイヤーの状態を表す文字列。
        NOTE: このメソッドの出力は、各ラウンドの終了時にテーブルのresultsLogメンバを更新するために使用されます。
    */
    blackjackEvaluateAndGetRoundResults() {
        //TODO: ここから挙動をコードしてください。    
    }

    /*
       return null : デッキから2枚のカードを手札に加えることで、全プレイヤーの状態を更新します。
       NOTE: プレイヤーのタイプが「ハウス」の場合は、別の処理を行う必要があります。
    */
    blackjackAssignPlayerHands() {
        for (let i = 0; i < 2; i++) {
            this.players[0].hand.push(this.deck.drawOne());
            this.players[1].hand.push(this.deck.drawOne());
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
    }
    
    /*
       return Player : 現在のプレイヤー
    */
    getTurnPlayer() {
        return this.players;
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
    }

    /*
        return Boolean : テーブルがプレイヤー配列の最後のプレイヤーにフォーカスされている場合はtrue、そうでない場合はfalseを返します。
    */
    onLastPlayer() {
        //TODO: ここから挙動をコードしてください。
    }
    
    /*
        全てのプレイヤーがセット{'broken', 'bust', 'stand', 'surrender'}のgameStatusを持っていればtrueを返し、持っていなければfalseを返します。
    */
    allPlayerActionsResolved() {
        //TODO: ここから挙動をコードしてください。
    }
}