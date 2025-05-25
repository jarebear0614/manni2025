import { Scene } from 'phaser'

export class BaseScene extends Scene {

    gameWidth: number;
    gameHeight: number;

    create() {
        this.gameWidth = parseFloat(this.game.config.width.toString());
        this.gameHeight = parseFloat(this.game.config.height.toString());
    }


    getGameWidth(): number {
        return this.gameWidth;
    }

    getGameHeight(): number {
        return this.gameHeight;
    }
}