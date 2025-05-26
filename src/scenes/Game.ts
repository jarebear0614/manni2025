import { Tilemaps, Renderer, Input, Types, GameObjects } from 'phaser';
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
    corset: GameObjects.Sprite;
    hair: GameObjects.Sprite;
    skirt: GameObjects.Sprite;

    
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

    wKey: Input.Keyboard.Key | undefined;
    aKey: Input.Keyboard.Key | undefined;
    sKey: Input.Keyboard.Key | undefined;
    dKey: Input.Keyboard.Key | undefined;

    facingRight: boolean = true;
    standing: boolean = true;

    jumping: boolean = false;
    jumpVelocity = -250;

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

        this.load.image('transparent', 'assets/transparent.png');

        this.load.atlasXML('player', 'assets/player_sheet.png', 'assets/player_sheet.xml');

        //character
        this.load.spritesheet('player_base', 'assets/character/base.png', 
        {
            frameWidth: 80,
            frameHeight: 64
        });

        this.load.spritesheet('player_corset', 'assets/character/corset.png', 
        {
            frameWidth: 80,
            frameHeight: 64
        });

        this.load.spritesheet('player_hair', 'assets/character/hair.png', 
        {
            frameWidth: 80,
            frameHeight: 64
        });

        this.load.spritesheet('player_skirt', 'assets/character/skirt.png', 
        {
            frameWidth: 80,
            frameHeight: 64
        });
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
        this.configureInput();
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

        //this.player = this.physics.add.sprite(100, 0, 'player', 'p1_stand.png');
        
        this.player = this.physics.add.sprite(0, 0, 'player_base', 0).setOrigin(0, 0);
        this.player.body.setSize(32, 64, true);
        this.player.setFlipX(true);

        this.corset = this.add.sprite(0, 0, 'player_corset', 0).setOrigin(0, 0);        
        this.corset.setFlipX(true);

        this.hair = this.add.sprite(0, 0, 'player_hair', 0).setOrigin(0, 0);
        this.hair.setFlipX(true);

        this.skirt = this.add.sprite(0, 0, 'player_skirt', 0).setOrigin(0, 0);
        this.skirt.setFlipX(true);

        Align.scaleToGameWidth(this.player, 0.08, this);
        Align.scaleToGameWidth(this.corset, 0.08, this);
        Align.scaleToGameWidth(this.hair, 0.08, this);
        Align.scaleToGameWidth(this.skirt, 0.08, this);

        this.anims.create({
            key: 'base_walk',
            frames: this.anims.generateFrameNumbers('player_base', {
                    start: 10,
                    end: 17
                }
            ),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'base_jump',
            frames: this.anims.generateFrameNumbers('player_base', {
                    start: 30,
                    end: 33
                }
            ),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'base_idle',
            frames: this.anims.generateFrameNumbers('player_base', {
                    start: 0,
                    end: 5
                }
            ),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'corset_walk',
            frames: this.anims.generateFrameNumbers('player_corset', {
                    start: 10,
                    end: 17
                }
            ),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'corset_jump',
            frames: this.anims.generateFrameNumbers('player_corset', {
                    start: 30,
                    end: 33
                }
            ),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'corset_idle',
            frames: this.anims.generateFrameNumbers('player_corset', {
                    start: 0,
                    end: 5
                }
            ),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'hair_walk',
            frames: this.anims.generateFrameNumbers('player_hair', {
                    start: 10,
                    end: 17
                }
            ),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'hair_jump',
            frames: this.anims.generateFrameNumbers('player_hair', {
                    start: 30,
                    end: 33
                }
            ),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'hair_idle',
            frames: this.anims.generateFrameNumbers('player_hair', {
                    start: 0,
                    end: 5
                }
            ),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'skirt_walk',
            frames: this.anims.generateFrameNumbers('player_skirt', {
                    start: 10,
                    end: 17
                }
            ),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'skirt_jump',
            frames: this.anims.generateFrameNumbers('player_skirt', {
                    start: 30,
                    end: 33
                }
            ),
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'skirt_idle',
            frames: this.anims.generateFrameNumbers('player_skirt', {
                    start: 0,
                    end: 5
                }
            ),
            frameRate: 15,
            repeat: 0
        });

        this.physics.add.collider(this.player, groundLayer);
        groundLayer.setCollisionByExclusion([-1], true);
    }

    private configureInput() 
    {
        this.wKey = this.input.keyboard?.addKey(Input.Keyboard.KeyCodes.W);
        this.aKey = this.input.keyboard?.addKey(Input.Keyboard.KeyCodes.A);
        this.sKey = this.input.keyboard?.addKey(Input.Keyboard.KeyCodes.S);
        this.dKey = this.input.keyboard?.addKey(Input.Keyboard.KeyCodes.D);
    }

    update(_: number)
    {
        this.cameras.main.setBounds(0, 0, this.xLimit, this.yLimit);

        this.isPreviousUpDown = this.isUpDown;
        this.isPreviousLeftDown = this.isLeftDown;
        this.isPreviousRightDown = this.isRightDown;
        this.isPreviousDownDown = this.isDownDown;

        this.isUpDown = this.isTouchUpDown || this.cursors!.up.isDown || this.wKey!.isDown;
        this.isLeftDown = this.isTouchLeftDown || this.cursors!.left.isDown || this.aKey!.isDown;
        this.isRightDown = this.isTouchRightDown || this.cursors!.right.isDown || this.dKey!.isDown;
        this.isDownDown = this.isTouchDownDown || this.cursors!.down.isDown || this.sKey!.isDown;

        this.standing = this.player.body.blocked.down || this.player.body.touching.down

        let vel: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

        if (this.isUpDown && !this.jumping && this.standing) 
        {
            this.player.body.setVelocityY(this.jumpVelocity);
            this.jumping = true;            

            if(this.player.anims.isPlaying)
            {
                this.player.anims.stop();
                this.corset.anims.stop();
                this.hair.anims.stop();
                this.skirt.anims.stop();
            }

            this.player.anims.play('base_jump');
            this.corset.anims.play('corset_jump');
            this.hair.anims.play('hair_jump');
            this.skirt.anims.play('skirt_jump');
        } 
        else if(!this.isUpDown)
        {
            if(this.standing)
            {
                this.jumping = false;
            }
        }

        if (this.isRightDown) 
        {
            vel.x = this.playerVelocity;
            if(!this.facingRight)
            {
                this.player.setFlipX(true);
                this.corset.setFlipX(true);
                this.hair.setFlipX(true);
                this.skirt.setFlipX(true);
                this.facingRight = true;
            }
        }
        if (this.isLeftDown) 
        {
            vel.x = -this.playerVelocity;            
            if(this.facingRight)
            {
                this.player.setFlipX(false);
                this.corset.setFlipX(false);
                this.hair.setFlipX(false);
                this.skirt.setFlipX(false);
                this.facingRight = false;
            }
        }

        vel = vel.normalize().scale(this.playerVelocity);
        if(Math.abs(vel.x) > 0) 
        {
            this.player.setVelocityX(vel.x);   
            if(!this.jumping)
            {
                this.player.anims.play('base_walk', true);
                this.corset.anims.play('corset_walk', true);
                this.hair.anims.play('hair_walk', true);
                this.skirt.anims.play('skirt_walk', true);
            }
        } else 
        {
            if(!this.jumping)
            {
                this.player.anims.stop();                
                this.corset.anims.stop();
                this.hair.anims.stop();
                this.skirt.anims.stop();

                this.player.anims.play('base_idle');
                this.corset.anims.play('corset_idle');
                this.hair.anims.play('hair_idle');
                this.skirt.anims.play('skirt_idle');
            }
        }

        if( (!this.isLeftDown && this.isPreviousLeftDown) ||
            (!this.isRightDown && this.isPreviousRightDown)) 
        {
            this.player.setVelocityX(0);
        }

        this.cameras.main.centerOn(this.player.x, this.player.y);      
        this.cameras.main.setBounds(0, 0, this.xLimit, this.yLimit);
        
        this.hair.setPosition(this.player.body.x - this.player.body.offset.x, this.player.body.y);
        this.corset.setPosition(this.player.body.x - this.player.body.offset.x, this.player.body.y);
        this.skirt.setPosition(this.player.body.x - this.player.body.offset.x, this.player.body.y);
    }
}
