import { Tilemaps } from 'phaser';
import { BaseScene } from './BaseScene';
import { TILE_SCALE, TILE_SIZE } from '../util/const';

export class Game extends BaseScene
{
    camera: Phaser.Cameras.Scene2D.Camera;

    map: Tilemaps.Tilemap;
    tileset: Tilemaps.Tileset;

    tilemapScale: number = 1.0;
    xLimit: number = 1000.0;
    yLimit: number = 1000.0;


    constructor ()
    {
        super('Game');
    }

    init() 
    {
        this.cameras.main.fadeOut(1);

        this.load.on('progress', (progress: number) => 
        {
            if(progress >= 1) 
            {
                this.cameras.main.fadeIn(300);
            }
        });
    }

    preload() 
    {
        this.load.image('forestTiles', 'assets/forest/forest-extruded.png');
        this.load.tilemapTiledJSON('forest', 'assets/forest/forest.tmj')
    }

    create ()
    {
        super.create();

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        this.configureTilemaps();
    }

    private configureTilemaps()
    {
        this.map = this.make.tilemap({key: 'forest'});
        this.tileset = this.map.addTilesetImage('forest', 'forestTiles', 32, 32, 0, 0)!;

        let groundLayer = this.map.createLayer('ground', this.tileset, 0, 0);

        this.tilemapScale = (this.getGameWidth() * TILE_SCALE) / TILE_SIZE;

        groundLayer?.setScale(this.tilemapScale, this.tilemapScale);

        this.xLimit = this.map.widthInPixels * this.tilemapScale;
        this.yLimit = this.map.heightInPixels * this.tilemapScale;
    }

    update()
    {
        this.cameras.main.setBounds(0, 0, this.xLimit, this.yLimit);
    }
}
