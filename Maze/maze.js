import {Debug, Warn, Assert, Abort} from '../debug.js';

import {Renderer} from '../Render/render.js'

/**
 * @typedef cell
 * @type {object}
 * @property {boolean} N
 * @property {boolean} S
 * @property {boolean} E
 * @property {boolean} W
 */

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

    /** 
    * @param {number} width_In 
    * @param {number} height_In */
    setDimensions(width_In, height_In)
    {
      if(!width_In || !height_In)
        {
            const missing = (!width_In) ? "Width" : "Height";
            Abort(`Setting maze dimensions missing field: ${missing}`);
            return;
        }
        this.#width = width_In;
        this.#height = height_In;
        return;
    }

    /** @type number */
    #wallSet = 0;

    /** @type number */
    #lineList = 0;

    /** @type number */
    #lineCount = 0;

    // TODO: This should be stripped as well in liu of a maze algorithm.
    /** @param {number} fill_In */
    fill(fill_In)
    {
      /** @type cell[] */
      const maze = this.buildCellArray()
      const mazeWalls = this.pack(maze);
      
      if(!this.#wallSet)
        this.#wallSet = this.#rend.bufferAlloc("Wall Set", mazeWalls.byteLength, this.#rend.bufferType.storage);
      this.#rend.bufferWrite(this.#wallSet, 0, mazeWalls);

      this.#lineCount = (4 * this.#height * this.#width);
      if(!this.#lineList)
        this.#lineList = this.#rend.bufferAlloc("Line list", this.#lineCount * 2, this.#rend.bufferType.index);
    }

    /** @returns {cell[]} cellArray */
    buildCellArray()
    {
      /** @type {cell} */
      let defaultCell = {N:true, S:true, E:true, W:true};
      let cellCount = this.#width * this.#height;
      let cellArray = new Array();
      for(let i = 0; i < cellCount; i++)
        cellArray.push(defaultCell);
      return cellArray;
    }

    /**
     * @param {cell[]} cellArray_In
     * @returns {Uint8Array} wallArray
     */
    pack(cellArray_In)
    {
      let cellCount = this.#width * this.#height;
      let wallArray = new Uint8Array(cellCount / 2);
      for(let i = 0; i < cellCount / 2; i++)
      {
        // TODO: Make this into a goddamned compute shader, this is the worst...
        let c = i * 2;
        wallArray[i] |= (cellArray_In[c].N * 1);
        wallArray[i] |= (cellArray_In[c].S * 2);
        wallArray[i] |= (cellArray_In[c].E * 4);
        wallArray[i] |= (cellArray_In[c].W * 8);

        wallArray[i] |= (cellArray_In[c + 1].N * 16);
        wallArray[i] |= (cellArray_In[c + 1].S * 32);
        wallArray[i] |= (cellArray_In[c + 1].E * 64);
        wallArray[i] |= (cellArray_In[c + 1].W * 128);
      }
      return wallArray;
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