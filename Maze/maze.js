import {Debug, Warn, Error, Assert, Abort} from '../debug.js';

import {Renderer} from '../Render/render.js'

export class Maze
{
    /** @type Renderer */
    #rend = null;

    /** @type number */
    #width = 0;

    /** @type number */
    #height = 0;

    /** @type number */
    #margin = 0.9;

    /** @type number */
    #dimensions = 0;

    /** @type number */
    #vertices = 0;

    #l_BuildVertexGrid()
    {
        let index = 0;
        let distW = (this.#margin * 2) / this.#width;
        let distH = (this.#margin * 2) / this.#height;
        let grid;
        let gridFormat;
        let gridStride;
  
        try{
          grid = new Float16Array(((this.#width + 1) * (this.#height + 1)) * 2);
          gridFormat = 'float16x2';
          gridStride = 4;
        } catch(a) {
          grid = new Float32Array(((this.#width + 1) * (this.#height + 1)) * 2);
          gridFormat = 'float32x2';
          gridStride = 8;
        }
        let posY = this.#margin;
        for(let y = 0; y < this.#height + 1; y++)
        {
          let posX = this.#margin;
          for(let x = 0; x < this.#width + 1; x++)
          {
            grid.set([posX, posY], index);
            index += 2;
            posX -= distW;
          }
          posY -= distH;
        }

        const dimensions = new Uint32Array(2);
        dimensions.set([this.#width, this.#height], 0);

        this.#dimensions = this.#rend.bufferAlloc(
          "Grid Dimensions", 
          dimensions.byteLength, 
          this.#rend.bufferType.storage);
        this.#rend.bufferWrite(this.#dimensions, 0, dimensions);

        this.#vertices = this.#rend.bufferAlloc(
          "Grid Vertices", 
          grid.byteLength, 
          this.#rend.bufferType.vertex, 
          gridStride, 
          gridFormat);
        this.#rend.bufferWrite(this.#vertices, 0, grid);
    }

    /** 
    * @param {number} width 
    * @param {number} height */
    async init(width, height)
    {
        if(!width || !height)
        {
            const missing = (!width) ? "Width" : "Height";
            Abort(`Maze initialization missing field: ${missing}`);
            return;
        }
        this.#rend = new Renderer();
        await this.#rend.init();
        this.#width = width;
        this.#height = height;
        this.#l_BuildVertexGrid();
    }

    #wallSet = 0;
    #lineList = 0;
    #lineCount = 0;

    /** @param {number} fill_In */
    fill(fill_In)
    {
        let cellCount = (this.#width * this.#height) / 2;
        const maze = new Uint8Array(cellCount);
        maze.fill(fill_In, 0, cellCount - 1);

        let augWidth = this.#width + (this.#width % 4);
        let augHeight = this.#height + (this.#height % 4);
        const walls = new Uint8Array(augWidth * augHeight);

        let wallIndex = 0;
        for(let y = 0; y < this.#height; y += 2)
        {
          for(let x = 0; x < this.#width; x += 2)
          {
            walls.set([maze[this.#width * y + x]], wallIndex);
            walls.set([maze[(this.#width * (y + 1)) + x + 1]], wallIndex + 1);
            wallIndex += 2;
          }
        }
  
        this.#wallSet = this.#rend.bufferAlloc("Wall Set", walls.byteLength, this.#rend.bufferType.storage);
        this.#rend.bufferWrite(this.#wallSet, 0, walls);

        this.#lineCount = (4 * this.#height * this.#width);
        this.#lineList = this.#rend.bufferAlloc("Line list", this.#lineCount * 2, this.#rend.bufferType.index);
    }

    build()
    {

    }

    pack()
    {

    }

    setLines()
    {

    }

    #workGroupSize = 4;
    draw()
    {
        const workGroupCount = Math.ceil(this.#width / this.#workGroupSize);
        this.#rend.setComputePipeline([this.#dimensions, this.#wallSet, this.#lineList], this.#rend.computeType.lines);
        this.#rend.compute(workGroupCount);

        this.#rend.setRenderPipeline([this.#vertices], [this.#lineList]);
        this.#rend.draw(this.#vertices, this.#lineList, this.#lineCount);
    }
}