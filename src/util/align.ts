import { BaseScene } from "../scenes/BaseScene";

export class Align {
    
    public static scaleToGameWidth(object: Phaser.GameObjects.Components.Size & Phaser.GameObjects.Components.Transform, percentage: number, scene: BaseScene) 
    {
        let width = scene.getGameWidth();
        object.displayWidth = width * percentage;
        object.scaleY = object.scaleX;
    }

    public static scaleToGameHeight(object: Phaser.GameObjects.Components.Size & Phaser.GameObjects.Components.Transform, percentage: number, scene: BaseScene) 
    {
        let height = scene.getGameHeight();
        object.displayHeight = height * percentage;
        object.scaleX = object.scaleY;
    }
}