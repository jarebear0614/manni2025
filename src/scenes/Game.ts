import { Tilemaps, Renderer, Types } from 'phaser';
import { BaseScene } from './BaseScene';
import { TILE_SCALE, TILE_SIZE } from '../util/const';
import { Align } from '../util/align';

const rainFragShader = `
        #define DROP_WITH 0.008
        #define LIGHT 0.20
        #define SLOPE 4.0

        precision mediump float;

        uniform sampler2D uMainSampler;
        uniform float uTime;        

        varying vec2 outTexCoord;

        vec3 rnd(float vmax, float vmin){
            float vx = abs(sin(uTime))*(vmax + vmin) - vmin;
            float vy = abs(sin(vx))*(vmax + vmin) - vmin;
            float vz = fract(uTime)*(vmax + vmin) - vmin;
            return vec3(vx, vy, vz);
        }
        
        // Draws three lines per frame. Uses the equation: Y = 1 + SLOPE * X
        float plot(vec2 pos){
            vec3 offset = rnd(0.9, SLOPE);

            return  smoothstep(DROP_WITH, 0.0, abs(pos.y - (1.0 - SLOPE * pos.x) + offset.x)) + 
            smoothstep(DROP_WITH, 0.0, abs(pos.y - (1.0 - SLOPE * pos.x) + offset.y)) +
            smoothstep(DROP_WITH, 0.0, abs(pos.y - (1.0 - SLOPE * pos.x) + offset.z));
        }

        void main ()
        {

            vec4 pixel = texture2D(uMainSampler, outTexCoord);
            float isDrop = plot(outTexCoord);
            vec3 color = vec3(LIGHT);            

            gl_FragColor = vec4(pixel.rgb + isDrop * color * fract(uTime), 1.0);
        }
        `;

class RainFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game: Phaser.Game) {
        super({
            game,
            name: 'rainPostFX',
            fragShader: rainFragShader
        });
    }

    onPreRender() {
        this.set1f('uTime', this.game.loop.time);
    }
}

export class Game extends BaseScene
{
    camera: Phaser.Cameras.Scene2D.Camera;

    map: Tilemaps.Tilemap;
    tileset: Tilemaps.Tileset;

    cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;

    player: Types.Physics.Arcade.SpriteWithDynamicBody;
    playerVelocity: number = 256;

    isTouchUpDown: boolean = false;
    isTouchLeftDown: boolean = false;
    isTouchRightDown: boolean = false;
    isTouchDownDown: boolean = false;

    isUpDown: boolean = false;
    isLeftDown: boolean = false;
    isRightDown: boolean = false;
    isDownDown: boolean = false;

    isPreviousUpDown: boolean = false;
    isPreviousLeftDown: boolean = false;
    isPreviousRightDown: boolean = false;
    isPreviousDownDown: boolean = false;

    facingRight: boolean = true;

    interactKey: Phaser.Input.Keyboard.Key | undefined;

    isInteractKeyDown: boolean = false;
    isPreviousInteractKeyDown: boolean = false;

    tilemapScale: number = 1.0;
    xLimit: number = 0.0;
    yLimit: number = 0.0;

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
        this.load.tilemapTiledJSON('forest', 'assets/forest/forest.tmj');

        this.load.spritesheet('characters', 'assets/characters.png', {frameWidth: 16, frameHeight: 16, spacing: 1});
        this.load.image('transparent', 'assets/transparent.png');

        this.load.atlasXML('player', 'assets/player_sheet.png', 'assets/player_sheet.xml');

        (this.renderer as Renderer.WebGL.WebGLRenderer).pipelines.addPostPipeline('rainPostFX', RainFX);
        this.cameras.main.setPostPipeline(RainFX);
    }

    create ()
    {
        super.create();

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        this.configureTilemaps();
        this.configurePlayer();
    }

    private configureTilemaps()
    {
        this.map = this.make.tilemap({key: 'forest'});
        this.tileset = this.map.addTilesetImage('forest', 'forestTiles', 32, 32, 0, 0)!;

        this.xLimit = this.map.widthInPixels * this.tilemapScale;
        this.yLimit = this.map.heightInPixels * this.tilemapScale;
    }

    private configurePlayer()
    {
        this.cursors = this.input.keyboard?.createCursorKeys();

        let groundLayer = this.map.createLayer('ground', this.tileset, 0, 0)!;
        this.tilemapScale = (this.getGameWidth() * TILE_SCALE) / TILE_SIZE;
        groundLayer?.setScale(this.tilemapScale, this.tilemapScale);        

        this.player = this.physics.add.sprite(100, 0, 'player', 'p1_stand.png');

        Align.scaleToGameWidth(this.player, 0.05, this);

        this.anims.create({
            key: 'player_walk',
            frames: this.anims.generateFrameNames('player', {
                prefix: 'p1_walk',
                suffix: '.png',
                start: 1,
                end: 11
            }),
            frameRate: 5,
            repeat: -1
        });

        this.physics.add.collider(this.player, groundLayer);
        groundLayer.setCollisionByExclusion([-1], true);
    }

    update(_: number)
    {
        this.cameras.main.setBounds(0, 0, this.xLimit, this.yLimit);

        this.isPreviousUpDown = this.isUpDown;
        this.isPreviousLeftDown = this.isLeftDown;
        this.isPreviousRightDown = this.isRightDown;
        this.isPreviousDownDown = this.isDownDown;

        this.isUpDown = this.isTouchUpDown || this.cursors!.up.isDown;
        this.isLeftDown = this.isTouchLeftDown || this.cursors!.left.isDown;
        this.isRightDown = this.isTouchRightDown || this.cursors!.right.isDown;
        this.isDownDown = this.isTouchDownDown || this.cursors!.down.isDown;

        let vel: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

        if (this.isUpDown && this.player.body.onFloor()) 
        {
            vel.y = -this.playerVelocity;
        }

        if (this.isRightDown) 
        {
            vel.x = this.playerVelocity;
            if(!this.facingRight)
            {
                this.player.setFlipX(false);
                this.facingRight = true;
            }
        }
        if (this.isLeftDown) 
        {
            vel.x = -this.playerVelocity;            
            if(this.facingRight)
            {
                this.player.setFlipX(true);
                this.facingRight = false;
            }
        }

        vel = vel.normalize().scale(this.playerVelocity);
        if(vel.lengthSq() > 0) {
            this.player.setVelocity(vel.x, vel.y);    
            console.log('play animation');
            this.player.anims.play('player_walk', true);
        } else {
            console.log('stand');
            this.player.anims.stop();
            this.player.setFrame('p1_stand.png');
        }

        if( (!this.isLeftDown && this.isPreviousLeftDown) ||
            (!this.isRightDown && this.isPreviousRightDown)) {
                this.player.setVelocity(0, this.player.body.velocity.y);
        }

        this.cameras.main.centerOn(this.player.x, this.player.y);      
        this.cameras.main.setBounds(0, 0, this.xLimit, this.yLimit);
    }
}
