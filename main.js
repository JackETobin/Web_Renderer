import {Debug, Warn, Error} from './debug.js';

import {renderer} from './Render/render.js'

/**
* @typedef api_obj
* @type {object}
* @property {HTMLCanvasElement} surface
* @property {object} context
* @property {object} device
*/

/**
 * @typedef cell_obj
 * @type {object}
 * @property {boolean} north
 * @property {boolean} south
 * @property {boolean} east
 * @property {boolean} west
 */

const TITLE = 'Maze';

const GRID_WIDTH = 32;
const GRID_HEIGHT = 32;
const GRID_MARGIN = 0.9;
const WORKGROUP_SIZE = 4;

// const
// playerIndices = new Uint16Array([
//   0, 1, 2,
//   0, 2, 3
// ]);

main();

/** 
 * @param {renderer} rend 
 * @param {number} width
 * @param {number} height
 * @param {number} margin
 */
function
BuildVertexGrid(rend, width, height, margin)
{
  let index = 0;
  let distW = (margin * 2) / width;
  let distH = (margin * 2) / height;
  let grid;
  let gridFormat;
  let gridStride;
  
  try{
    grid = new Float16Array(((width + 1) * (height + 1)) * 2);
    gridFormat = 'float16x2';
    gridStride = 4;
  } catch(a) {
    grid = new Float32Array(((width + 1) * (height + 1)) * 2);
    gridFormat = 'float32x2';
    gridStride = 8;
  }
  let posY = margin;
  for(let y = 0; y < height + 1; y++)
  {
    let posX = margin;
    for(let x = 0; x < width + 1; x++)
    {
      grid.set([posX, posY], index);
      index += 2;
      posX -= distW;
    }
    posY -= distH;
  }

  const dimensions = new Uint32Array(2);
  dimensions.set([width, height], 0);

  const dimensionsBuffer = rend.bufferAlloc(
    "Grid Dimensions", 
    dimensions.byteLength, 
    rend.bufferType.storage);
  rend.bufferWrite(dimensionsBuffer, 0, dimensions);

  const vertexBuffer = rend.bufferAlloc(
    "Grid Vertices", 
    grid.byteLength, 
    rend.bufferType.vertex, 
    gridStride, 
    gridFormat);
  rend.bufferWrite(vertexBuffer, 0, grid);

  return {
    dimensions: dimensionsBuffer,
    vertices: vertexBuffer
  };
}

/** @param {api_obj} api */
async function 
main(api)
{
  const rend = new renderer();
  const header = document.getElementById('head');
  const title = document.createElement('title');
  const surfaceSize = (window.innerWidth < window.innerHeight) ? 
                window.innerWidth : window.innerHeight;
                
  try {
    await rend.init(surfaceSize);
    title.innerText = TITLE;
    header.appendChild(title);
  } catch(e) {
    title.innerText = 'Not ' + TITLE;
    header.appendChild(title);
    Error(`Error:/n${e}`);
  };

  let cellCount = (GRID_WIDTH * GRID_HEIGHT) / 2;
  const maze = new Uint8Array(cellCount);
  maze.fill(255, 0, cellCount - 1);

  let augWidth = GRID_WIDTH + (GRID_WIDTH % 2);
  let augHeight = GRID_HEIGHT + (GRID_HEIGHT % 2);
  const walls = new Uint8Array(augWidth * augHeight);

  let wallIndex = 0;
  for(let y = 0; y < GRID_HEIGHT; y += 2)
  {
    for(let x = 0; x < GRID_WIDTH; x += 2)
    {
      walls.set([maze[GRID_WIDTH * y + x]], wallIndex);
      walls.set([maze[(GRID_WIDTH * (y + 1)) + x + 1]], wallIndex + 1);
      wallIndex += 2;
    }
  }
  
  const wallSetStorage = rend.bufferAlloc("Wall Set", walls.byteLength, rend.bufferType.storage);
  rend.bufferWrite(wallSetStorage, 0, walls);

  const lineCount = (4 * GRID_HEIGHT * GRID_WIDTH);
  const lineList = rend.bufferAlloc("Line list", lineCount * 2, rend.bufferType.index);
  
  const grid = BuildVertexGrid(rend, GRID_WIDTH, GRID_HEIGHT, GRID_MARGIN);
  const workGroupCount = Math.ceil(GRID_WIDTH / WORKGROUP_SIZE);

  rend.setComputePipeline([grid.dimensions, wallSetStorage, lineList], rend.computeType.lines);
  rend.compute(workGroupCount);

  rend.setRenderPipeline([grid.vertices], [lineList]);
  rend.draw(grid.vertices, lineList, lineCount);
}