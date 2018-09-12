import WeaponAssets from "./weapons.js";
import WeaponSprite from "./weaponsprite.js";

export default class MergeUI {
    constructor(game, config) {
        this.game = game;
        this.app = new PIXI.Application({
            width: 1024,
            height: 768,
            antialias: true,
            resolution: 1,
            backgroundColor: 0xC040C0
        });
        document.getElementById('game').appendChild(this.app.view);

        this.cellSize = { w: config.grid.cellWidth, h: config.grid.cellHeight };
        this.gridSize = { w: config.grid.width, h: config.grid.height };
        this.sprites = {
            grid: null,
            cells: [].fill(null, 0, this.gridSize.w * this.gridSize.h),
            score: null,
            counters: [],
        };

        this.dragSprite = null;
        this.dragCellStart = null;

        // ensure that the canvas always resizes to fill the available area
        this.app.renderer.view.style.position = "absolute";
        this.app.renderer.view.style.display = "block";
        this.app.renderer.autoResize = true;
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        window.onresize = (e) => {
            this.app.renderer.resize(window.innerWidth, window.innerHeight);
            this.repositionSprites();
        }

    }

    getGridCellSprite(x, y) {
        return this.sprites.grid.children[y * this.gridSize.w + x];
    }

    init() {
        return new Promise((resolve, reject) => {
            this.loadAssets(WeaponAssets)
                .then(({ event, assets }) => {
                    console.log(assets);

                    this.sprites.grid = this.createGrid();
                    this.sprites.score = this.createScoreTextObject();

                    resolve();
                })
        })
    }

    createGrid() {
        const sprite = new PIXI.Container();
        for (let y = 0; y < this.gridSize.h; y++) {
            for (let x = 0; x < this.gridSize.w; x++) {
                let o = new PIXI.Graphics();
                o.beginFill(0x000000);
                o.alpha = 0.5
                o.drawRect(0, 0, this.cellSize.w, this.cellSize.h);
                o.endFill();
                o.x = x * this.cellSize.w + 20 * x;
                o.y = y * this.cellSize.h + 20 * y;
                sprite.addChild(o);
            }
        }
        sprite.x = this.app.view.width / 2 - sprite.width / 2;
        sprite.y = this.app.view.height / 2 - sprite.height / 2;

        this.app.stage.addChild(sprite);

        return sprite;
    }

    createScoreTextObject() {
        const sprite = new PIXI.Text(`G ${this.game.score}`, new PIXI.TextStyle({
            fontfamily: "Arial",
            fontSize: 48,
            fill: "white",
            stroke: '#000080',
            strokeThickness: 6,
            dropShadow: true,
            dropShadowColor: "#000000",
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 6,
        }));
        if (window.devicePixelRatio <= 1) {
            sprite.scale.x = sprite.scale.y = 0.5;
        }
        this.app.stage.addChild(sprite);
        sprite.position.set(10, this.headerHeight + 10);

        return sprite;
    }

    createWeaponSprite(producer, name, cellX, cellY) {

        const getCellAtCoords = (x, y) => {
            const result = this.sprites.grid.children.find((cell) => {
                const pos = { x: this.sprites.grid.x + cell.x, y: this.sprites.grid.y + cell.y };
                return (x >= pos.x && x <= pos.x + cell.width && y >= pos.y && y <= pos.y + cell.height);
            });
            return result;
        }

        const cellSprite = this.getGridCellSprite(cellX, cellY);

        let sprite = this.sprites.cells[cellY * this.gridSize.w + cellX];
        if (sprite) {
            throw "Cannot create weapon sprite in a cell that already has a weapon sprite!";
        }

        sprite = new WeaponSprite(producer, PIXI.loader.resources[name].texture, this.sprites.grid.x + cellSprite.x, this.sprites.grid.y + cellSprite.y);

        sprite.onDragStart = (e) => {
            this.dragSprite = e.object;
            this.dragSprite.oldPos = { x: this.dragSprite.sprite.x, y: this.dragSprite.sprite.y };
        };
        sprite.onDragMove = (e) => {
            if (this.dragSprite) {
                const newPos = e.pixievent.data.getLocalPosition(this.dragSprite.sprite.parent);
                console.log(`moving to ${newPos.x}, ${newPos.y}`);
                this.dragSprite.sprite.x = newPos.x - this.dragSprite.sprite.width / 2;
                this.dragSprite.sprite.y = newPos.y - this.dragSprite.sprite.height / 2;
            }
        }
        sprite.onDragEnd = (e) => {
            if (this.dragSprite) {
                const cellSprite = getCellAtCoords(this.dragSprite.sprite.x + this.dragSprite.sprite.width / 2,
                    this.dragSprite.sprite.y + this.dragSprite.sprite.height / 2);
                if (cellSprite) {
                    // TODO: Check if a weapon already exists in this cell
                    this.dragSprite.sprite.x = this.sprites.grid.x + cellSprite.x;
                    this.dragSprite.sprite.y = this.sprites.grid.y + cellSprite.y;
                } else {
                    this.dragSprite.sprite.x = this.dragSprite.oldPos.x;
                    this.dragSprite.sprite.y = this.dragSprite.oldPos.y;
                }
            }
            this.dragSprite = null;
        }

        this.sprites.cells[cellY * this.gridSize.w + cellX] = sprite;
        this.app.stage.addChild(sprite.sprite);

        return sprite;
    }

    getSpriteForProducer(prod) {
        return this.sprites.cells.find((e) => e.producer == prod);
    }

    createGoldCounter(producer, value, cellX, cellY) {
        const weaponSprite = this.getSpriteForProducer(producer);

        const x = weaponSprite.sprite.x + weaponSprite.sprite.width / 2;
        const y = weaponSprite.sprite.y;

        const counterSprite = new PIXI.Text(`+${this.game.engine.formatNumber(value, 0)}`, new PIXI.TextStyle({
            fontfamily: "Arial",
            fontSize: 32,
            fontWeight: "bold",
            fill: "white"
        }));

        // position it, set its velocity and add it to the stage
        counterSprite.x = x - counterSprite.width / 2;
        counterSprite.y = y;
        counterSprite.vy = -0.5;
        counterSprite.vx = 0;
        this.app.stage.addChild(counterSprite);
        this.sprites.counters.push(counterSprite);
    }

    loadAssets(assetArray) {
        return new Promise((resolve, reject) => {
            PIXI.loader
                .add(assetArray)
                .on("progress", (e) => {
                    console.log(`Loading assets: ${e.progress}%`);
                })
                .on("error", (e) => {
                    console.error(e);
                })
                .load((e, assets) => {
                    resolve({ event: e, assets });
                });
        });
    }

    repositionSprites() {
        this.sprites.grid.x = this.app.view.width / 2 - this.sprites.grid.width / 2;
        this.sprites.grid.y = this.app.view.height / 2 - this.sprites.grid.height / 2;

    }

    update(dt) {
        this.sprites.score.text = `G ${this.game.engine.formatNumber(this.game.score, 0)}`;

        this.sprites.counters = this.sprites.counters.filter((e) => {
            e.y += e.vy;
            e.x += e.vx;
            e.alpha -= 0.01;
            if (e.alpha <= 0) {
                e.destroy();
            }
            return e.alpha > 0;
        });
    }
}