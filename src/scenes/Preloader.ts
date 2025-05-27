import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        this.cameras.main.setBackgroundColor(0x000000);
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.image('forestTiles', 'assets/forest/forest-extruded.png');
        this.load.tilemapTiledJSON('forest', 'assets/forest/forest.tmj');

        this.load.image('transparent', 'assets/transparent.png');
        this.load.spritesheet('bulbs', 'assets/bulbs.png', { frameWidth: 32, frameHeight: 32 });

        this.load.atlasXML('player', 'assets/player_sheet.png', 'assets/player_sheet.xml');
        
        //background
        this.load.image('bg1', 'assets/night/Layer 1.png');
        this.load.image('bg2', 'assets/night/Layer 2.png');
        this.load.image('bg3', 'assets/night/Layer 3.png');
        this.load.image('bg4', 'assets/night/Layer 4.png');
        this.load.image('bg5', 'assets/night/Layer 5.png');

        this.load.image('bg1nightfall', 'assets/nightfall/Layer 1.png');
        this.load.image('bg2nightfall', 'assets/nightfall/Layer 2.png');
        this.load.image('bg3nightfall', 'assets/nightfall/Layer 3.png');
        this.load.image('bg4nightfall', 'assets/nightfall/Layer 4.png');
        this.load.image('bg5nightfall', 'assets/nightfall/Layer 5.png');

        //character
        this.load.spritesheet('player_base', 'assets/character/base.png', { frameWidth: 80, frameHeight: 65 });
        this.load.spritesheet('player_corset', 'assets/character/corset.png', { frameWidth: 80, frameHeight: 65 });
        this.load.spritesheet('player_hair', 'assets/character/hair.png', { frameWidth: 80, frameHeight: 65 });
        this.load.spritesheet('player_skirt', 'assets/character/skirt.png', { frameWidth: 80, frameHeight: 65 });

        this.load.image('rightcontrol', 'assets/rightcontrol.png');
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        
        this.scene.start('Game');
    }
}
