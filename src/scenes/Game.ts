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

class BulbConfig
{
    id: number = 0;
    gameObject: GameObjects.Sprite = null!;
    bulbIndex: number = 0;
    x: number = 0;
    y: number = 0;
    processed: boolean = false;
    overlapping: boolean = false;
}

class PoemLine
{
    text: string;
    xTrigger: number;
    flowerSpawnChance: number = 20.0;
    processed: boolean = false;
}

export class Game extends BaseScene
{
    camera: Phaser.Cameras.Scene2D.Camera;

    map: Tilemaps.Tilemap;
    tileset: Tilemaps.Tileset;
    bulbTileset: Tilemaps.Tileset;

    cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;

    player: Types.Physics.Arcade.SpriteWithDynamicBody;
    corset: GameObjects.Sprite;
    hair: GameObjects.Sprite;
    skirt: GameObjects.Sprite;

    bulbObjects: BulbConfig[] = [];
    bulbRandom: number[] = [1, 2, 3];
    bulbSpawnChance = 0.0;

    moduloBulb: number = 0;
    processedBulbSector: boolean = false;
    bulbSectors: boolean[] = [];
    
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

    tilemapOffset: number = 0;
    tilemapScale: number = 1.0;
    xLimit: number = 0.0;
    yLimit: number = 0.0;

    bg1: GameObjects.TileSprite;
    bg2: GameObjects.TileSprite;
    bg3: GameObjects.TileSprite;
    bg4: GameObjects.TileSprite;
    bg5: GameObjects.TileSprite;

    bg1nightfall: GameObjects.TileSprite;
    bg2nightfall: GameObjects.TileSprite;
    bg3nightfall: GameObjects.TileSprite;
    bg4nightfall: GameObjects.TileSprite;
    bg5nightfall: GameObjects.TileSprite;

    currentText: GameObjects.Text;

    poem: PoemLine[] = [];
    lastLineReached: boolean = false;

    rightButton: GameObjects.Image;
    
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
        
        (this.renderer as Renderer.WebGL.WebGLRenderer).pipelines.addPostPipeline('rainPostFX', RainFX);
        this.cameras.main.setPostPipeline(RainFX);
    }

    create ()
    {
        super.create();

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        this.configureBackgrounds();

        this.configureTilemaps();
        this.configurePlayer();
        this.configureInput();

        this.configureBulbObjects();  
        this.configurePoemLines();   
        
        this.currentText = this.add.text(0, 0, 'test', {fontFamily: 'Arial', fontSize: 48, color: '#ffffff'})
            .setStroke("#000000", 4)
            .setScrollFactor(0)
            .setAlpha(0.0);

        this.rightButton = this.add.image(this.getGameWidth() * 0.15, this.getGameHeight() * 0.94, 'rightcontrol').setInteractive({useHandCursor: true}).setScrollFactor(0);

        Align.scaleToGameWidth(this.rightButton, 0.06, this);

        this.rightButton.on('pointerdown', () => 
        {
            this.isTouchRightDown = true;
        });

        this.rightButton.on('pointerup', () => 
        {
            this.isTouchRightDown = false;
        });

        this.scale.setParentSize(window.innerWidth, window.innerHeight);
    }

    private configureBackgrounds()
    {
        this.bg1 = this.add.tileSprite(0, -191, 0, 0, 'bg1').setOrigin(0, 0).setScrollFactor(0, 0);
        this.bg2 = this.add.tileSprite(0, 0, 0, 0, 'bg2').setOrigin(0, 0).setScrollFactor(0, 0);
        this.bg3 = this.add.tileSprite(0, 0, 0, 0, 'bg3').setOrigin(0, 0).setScrollFactor(0, 0);
        this.bg4 = this.add.tileSprite(0, 0, 0, 0, 'bg4').setOrigin(0, 0).setScrollFactor(0, 0);
        this.bg5 = this.add.tileSprite(0, 0, 0, 0, 'bg5').setOrigin(0, 0).setScrollFactor(0, 0);
        this.bg1.setScale(this.getGameWidth() / this.bg1.displayWidth, this.getGameHeight() / this.bg1.displayHeight);
        this.bg2.setScale(this.getGameWidth() / this.bg2.displayWidth, this.getGameHeight() / this.bg2.displayHeight);
        this.bg3.setScale(this.getGameWidth() / this.bg3.displayWidth, this.getGameHeight() / this.bg3.displayHeight);
        this.bg4.setScale(this.getGameWidth() / this.bg4.displayWidth, this.getGameHeight() / this.bg4.displayHeight);
        this.bg5.setScale(this.getGameWidth() / this.bg5.displayWidth, this.getGameHeight() / this.bg5.displayHeight);

        this.bg1nightfall = this.add.tileSprite(0, -191, 0, 0, 'bg1nightfall').setOrigin(0, 0).setScrollFactor(0, 0).setAlpha(0);
        this.bg2nightfall = this.add.tileSprite(0, 0, 0, 0, 'bg2nightfall').setOrigin(0, 0).setScrollFactor(0, 0).setAlpha(0);
        this.bg3nightfall = this.add.tileSprite(0, 0, 0, 0, 'bg3nightfall').setOrigin(0, 0).setScrollFactor(0, 0).setAlpha(0);
        this.bg4nightfall = this.add.tileSprite(0, 0, 0, 0, 'bg4nightfall').setOrigin(0, 0).setScrollFactor(0, 0).setAlpha(0);
        this.bg5nightfall = this.add.tileSprite(0, 0, 0, 0, 'bg5nightfall').setOrigin(0, 0).setScrollFactor(0, 0).setAlpha(0);
        this.bg1nightfall.setScale(this.getGameWidth() / this.bg1nightfall.displayWidth, this.getGameHeight() / this.bg1nightfall.displayHeight);
        this.bg2nightfall.setScale(this.getGameWidth() / this.bg2nightfall.displayWidth, this.getGameHeight() / this.bg2nightfall.displayHeight);
        this.bg3nightfall.setScale(this.getGameWidth() / this.bg3nightfall.displayWidth, this.getGameHeight() / this.bg3nightfall.displayHeight);
        this.bg4nightfall.setScale(this.getGameWidth() / this.bg4nightfall.displayWidth, this.getGameHeight() / this.bg4nightfall.displayHeight);
        this.bg5nightfall.setScale(this.getGameWidth() / this.bg5nightfall.displayWidth, this.getGameHeight() / this.bg5nightfall.displayHeight);
    }

    private configureTilemaps()
    {
        this.map = this.make.tilemap({key: 'forest'});
        this.tileset = this.map.addTilesetImage('forest', 'forestTiles', 32, 32, 0, 0)!;
        this.bulbTileset = this.map.addTilesetImage('bulbs', 'bulbs', 32, 32, 0, 0)!;

        this.xLimit = this.map.widthInPixels * this.tilemapScale;
        this.yLimit = this.map.heightInPixels * this.tilemapScale;
    }

    private configurePlayer()
    {
        this.cursors = this.input.keyboard?.createCursorKeys();

        this.tilemapScale = (this.getGameWidth() * TILE_SCALE) / TILE_SIZE;

        let groundLayer = this.map.createLayer('ground', this.tileset, 0, 0)!.setOrigin(0, 0);
        groundLayer?.setScale(this.tilemapScale, this.tilemapScale);      

        this.tilemapOffset = this.getGameHeight() - groundLayer.displayHeight;
        groundLayer.setPosition(0, this.tilemapOffset);

        let decorationLayer = this.map.createLayer('decoration', this.bulbTileset, 0, 0)!.setOrigin(0, 0);
        decorationLayer.setScale(this.tilemapScale, this.tilemapScale);
        decorationLayer.setPosition(0, this.tilemapOffset);
        
        this.player = this.physics.add.sprite(100, 0, 'player_base', 0).setOrigin(0, 0);
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

    private configureBulbObjects() {
        let transportObjects = this.map.getObjectLayer('bulbs')!.objects;
        let idx = 0;

        for (const transportTile of transportObjects) {
            const { id, x, y, width, height, properties } = transportTile;

            let bulbIndex : number | undefined;
            idx++;

            for (const property of properties) {
                switch (property.name) {
                    case 'bulb_index':
                        bulbIndex = property.value;
                        break;
                }
            }

            if(bulbIndex == -1)
            {
                let idx = Math.round(Math.random()*(this.bulbRandom.length - 1));
                bulbIndex = this.bulbRandom[idx];
            }

            let sprite = this.physics.add.sprite(x! * this.tilemapScale, y! * this.tilemapScale + this.tilemapOffset, 'transparent').setOrigin(0, 0);
            sprite.body.setAllowGravity(false);
            sprite.body.setSize(width, height, false);
            //Align.scaleToGameWidth(sprite, TILE_SCALE, this);

            this.bulbObjects.push({id: id, gameObject: sprite, bulbIndex: bulbIndex!, x: x! * this.tilemapScale, y: y! * this.tilemapScale, processed: false, overlapping: false});
        }
    }

    private configurePoemLines() {
        let transportObjects = this.map.getObjectLayer('poem')!.objects;

        for (const transportTile of transportObjects) {
            const { x, properties } = transportTile;

            let text : string | undefined;
            let bulbSpawnChance: number | undefined = 0.20;

            for (const property of properties) {
                switch (property.name) {
                    case 'text':
                        text = property.value;
                        break;
                    case 'bulbSpawnChance':
                        bulbSpawnChance = parseFloat(property.value);
                        break;
                }
            }

            this.poem.push({
                text: text!,
                flowerSpawnChance: bulbSpawnChance,
                xTrigger: x! * this.tilemapScale,
                processed: false
            });
        }
    }

    update(_: number)
    {
        this.cameras.main.setBounds(0, 0, this.xLimit, this.getGameHeight());

        this.isPreviousUpDown = this.isUpDown;
        this.isPreviousLeftDown = this.isLeftDown;
        this.isPreviousRightDown = this.isRightDown;
        this.isPreviousDownDown = this.isDownDown;

        this.isUpDown = this.isTouchUpDown || this.cursors!.up.isDown || this.wKey!.isDown;
        this.isLeftDown = this.isTouchLeftDown || this.cursors!.left.isDown || this.aKey!.isDown;
        this.isRightDown = this.isTouchRightDown || this.cursors!.right.isDown || this.dKey!.isDown;
        this.isDownDown = this.isTouchDownDown || this.cursors!.down.isDown || this.sKey!.isDown;

        this.standing = this.player.body.blocked.down || this.player.body.touching.down


        let currentModulo = Math.floor(this.player.body.x / (TILE_SIZE * this.tilemapScale));
        if(currentModulo > this.moduloBulb && this.standing)
        {
            this.moduloBulb = currentModulo;
            if(!this.bulbSectors[this.moduloBulb])
            {
                this.bulbSectors[this.moduloBulb] = true;

                if(Math.random() < this.bulbSpawnChance) 
                {
                    let bulbIndex = this.bulbRandom[Math.round(Math.random()*(this.bulbRandom.length - 1))];
                    this.spawnFlower(this.moduloBulb * TILE_SIZE * this.tilemapScale, this.player.body.y + this.player.displayHeight / 2, bulbIndex);
                }
            }
        }

        this.processBulbOverlaps();

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

        //this.bg1.tilePositionX += (this.camera.scrollX - this.lastCameraX) * 0.05;
        this.bg2.tilePositionX += (this.camera.scrollX - this.lastCameraX) * 0.10;
        this.bg3.tilePositionX += (this.camera.scrollX - this.lastCameraX) * 0.20;
        this.bg4.tilePositionX += (this.camera.scrollX - this.lastCameraX) * 0.30;
        this.bg5.tilePositionX += (this.camera.scrollX - this.lastCameraX) * 0.40;

        this.bg2nightfall.tilePositionX += (this.camera.scrollX - this.lastCameraX) * 0.10;
        this.bg3nightfall.tilePositionX += (this.camera.scrollX - this.lastCameraX) * 0.20;
        this.bg4nightfall.tilePositionX += (this.camera.scrollX - this.lastCameraX) * 0.30;
        this.bg5nightfall.tilePositionX += (this.camera.scrollX - this.lastCameraX) * 0.40;

        for(let i = 0; i < this.poem.length; ++i)
        {
            let line = this.poem[i];

            if(line.processed)
                continue;


            if(this.player.body.x >= line.xTrigger)
            {
                line.processed = true;

                this.bulbSpawnChance = line.flowerSpawnChance;

                let fadeOutTween = this.tweens.add({
                    targets: this.currentText,
                    alpha: { from: this.currentText.alpha, to: 0 },
                    ease: 'Linear',
                    duration: 400,
                    repeat: 0,
                    yoyo: false
                });

                fadeOutTween.onCompleteHandler = () => 
                {
                    this.currentText.text = line.text;
                    this.currentText.alpha = 0;

                    this.currentText.setPosition(this.getGameWidth() / 2 - this.currentText.displayWidth / 2, this.getGameHeight() * 0.35);
                    
                    this.tweens.killTweensOf(this.currentText);

                    this.tweens.add({
                        targets: this.currentText,
                        alpha: { from: 0, to: 1 },
                        ease: 'Linear',
                        duration: 1400,
                        repeat: 0,
                        yoyo: false
                    })
                };
            }
        }

        if(!this.lastLineReached && this.poem.filter((f) => { return !f.processed; }).length == 0)
        {
            this.lastLineReached = true;

            this.cameras.main.resetPostPipeline(true);            

            this.tweens.add({
                targets: this.bg1nightfall,
                alpha: { from: 0, to: 1 },
                ease: 'Linear',
                duration: 1000,
                repeat: 0,
                yoyo: false
            });

            this.tweens.add({
                targets: this.bg2nightfall,
                alpha: { from: 0, to: 1 },
                ease: 'Linear',
                duration: 1000,
                repeat: 0,
                yoyo: false
            });

            this.tweens.add({
                targets: this.bg3nightfall,
                alpha: { from: 0, to: 1 },
                ease: 'Linear',
                duration: 1000,
                repeat: 0,
                yoyo: false
            });

            this.tweens.add({
                targets: this.bg4nightfall,
                alpha: { from: 0, to: 1 },
                ease: 'Linear',
                duration: 1000,
                repeat: 0,
                yoyo: false
            });

            this.tweens.add({
                targets: this.bg5nightfall,
                alpha: { from: 0, to: 1 },
                ease: 'Linear',
                duration: 1000,
                repeat: 0,
                yoyo: false
            });
        }

        this.lastCameraX = this.camera.scrollX;
    }

    lastCameraX: number = 0;

    private processBulbOverlaps() 
    {
        let filteredBulbObjects = this.bulbObjects.filter((f) => {
            if (this.player.body.x >= f.x - f.gameObject.displayWidth * 3 &&
                this.player.body.x <= f.x + f.gameObject.displayWidth * 3) {
                return true;
            }
        });

        for (let i = 0; i < filteredBulbObjects.length; ++i) {
            if (!filteredBulbObjects[i].processed) {
                if (this.physics.overlap(this.player, filteredBulbObjects[i].gameObject)) {
                    filteredBulbObjects[i].overlapping = true;
                }

                else {
                    if (filteredBulbObjects[i].overlapping) {
                        filteredBulbObjects[i].processed = true;
                        this.spawnFlower(filteredBulbObjects[i].x, filteredBulbObjects[i].y + this.tilemapOffset, filteredBulbObjects[i].bulbIndex);
                    }
                }
            }
        }
    }

    private spawnFlower(x: number, y: number, bulbIndex: number)
    {
        
        let flower = this.add.sprite(x, y, 'bulbs', bulbIndex);
        Align.scaleToGameWidth(flower, TILE_SCALE, this);

        flower.setPosition(flower.x + flower.displayWidth / 2, flower.y + flower.displayHeight / 2);
        let displayWidth = flower.displayWidth;

        flower.displayWidth = 1;
        this.tweens.add({
            targets: flower,
            displayWidth: { from: 0, to: displayWidth },
            ease: 'Linear',
            duration: 400,
            repeat: 0,
            yoyo: false
        });
    }
}
