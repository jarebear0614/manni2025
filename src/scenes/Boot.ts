import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    init() 
    {
        this.cameras.main.setBackgroundColor(0x000000);
    }

    preload ()
    {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

    }

    create ()
    {

        this.scene.start('Preloader');
    }
}
