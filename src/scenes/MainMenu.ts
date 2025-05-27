import { Scene } from 'phaser';

export class MainMenu extends Scene
{

    constructor ()
    {
        super('MainMenu');
    }

    init() 
    {

        this.cameras.main.setBackgroundColor(0x000000);
    }

    create ()
    {
        this.scene.start('Game');
    }
}
