import {Debug, Warn, Error} from './debug.js';

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

const 
gridVertices = new Float32Array([
  -0.9, -0.9,
   0.9, -0.9,
   0.9,  0.9,
  -0.9,  0.9
]);

// const
// playerIndices = new Uint16Array([
//   0, 1, 2,
//   0, 2, 3
// ]);

Init_Surface();

async function
Init_Surface()
{
  const surface = document.getElementById('surface');
  const header = document.getElementById('head');
  const title = document.createElement('title');
  const context = surface.getContext('webgpu');
  const adapter = (!navigator.gpu) ? Debug('WebGPU unsupported.') : await navigator.gpu.requestAdapter();
  const device = (!adapter) ? Debug('No suitable adapter available.') : await adapter.requestDevice();
  try{
    title.innerText = TITLE;
    header.appendChild(title);
    main({surface: surface, context : context, device: device});
  } catch(e) {
    title.innerText = 'Not ' + TITLE;
    header.appendChild(title);
    Error(`Error:/n${e}`);
  }
}

/** 
 * @param {api_obj} api 
 * @param {number} width
 * @param {number} height
 * @param {number} margin
 */
function
BuildVertexGrid(api, width, height, margin)
{
  let index = 0;
  let distW = (margin * 2) / width;
  let distH = (margin * 2) / height;
  let grid;
  let gridFormat;
  let gridStride;
  // let arrayLength = ((width + 1) * (height + 1)) * 2;
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
  const dimensionsBuffer = api.device.createBuffer({
    label: 'Grid Dimensions',
    size: dimensions.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  api.device.queue.writeBuffer(dimensionsBuffer, 0, dimensions);

  // Buffer for the grid vertices
  const vertexBuffer = api.device.createBuffer({
    label: 'Grid Vertices',
    size: grid.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  api.device.queue.writeBuffer(vertexBuffer, 0, grid);

  const vertexBufferLayout = {
    arrayStride: gridStride,
    attributes: [{
      format: gridFormat,
      offset: 0,
      shaderLocation: 0
    }]
  };

  return {
    dimensionsBuffer: dimensionsBuffer,
    vertexBuffer: vertexBuffer,
    layout: vertexBufferLayout,
    length: grid.length,
    bytelength: grid.byteLength
  };
}

/** @param {api_obj} api */
async function 
main(api)
{
  console.log('Main');
  const size = (window.innerWidth < window.innerHeight) ? 
                window.innerWidth : window.innerHeight;
  api.surface.width = api.surface.height = size;

  const surfaceFormat = navigator.gpu.getPreferredCanvasFormat();
  api.context.configure({
    device: api.device,
    format: surfaceFormat
  });

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
      // console.log(GRID_WIDTH * y + x);
      // console.log((GRID_WIDTH * (y + 1)) + x + 1);
      walls.set([maze[GRID_WIDTH * y + x]], wallIndex);
      walls.set([maze[(GRID_WIDTH * (y + 1)) + x + 1]], wallIndex + 1);
      wallIndex += 2;
    }
  }

  // Storage buffer for the wall dictation cells
  const wallSetStorage = api.device.createBuffer({
    label: 'Line List',
    size: walls.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  api.device.queue.writeBuffer(wallSetStorage, 0, walls);
  
  // Storage buffer for the line list
  const lineCount = (2 * GRID_HEIGHT * GRID_WIDTH);
  let lineListInitializer = new Uint16Array(lineCount * 2); 
  maze.fill(0, 0, lineListInitializer.length - 1);

  const lineList = api.device.createBuffer({
    label: 'Line List',
    size: lineListInitializer.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
  });
  api.device.queue.writeBuffer(lineList, 0, lineListInitializer);
  
  const grid = BuildVertexGrid(api, GRID_WIDTH, GRID_HEIGHT, GRID_MARGIN);

  const vertex = `
    @vertex
    fn main(@location(0) line: vec2<f32>) -> @builtin(position) vec4<f32> 
    {
        return vec4<f32>(line, 0.0, 1.0);
    }`;

  const fragment = `
    @fragment
    fn main() -> @location(0) vec4<f32> 
    {
        return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    }`;

  const compute = `
    @group(0) @binding(0) var<storage> dim: vec2<u32>;

    @group(0) @binding(1) var<storage> walls: array<u32>;
    @group(0) @binding(2) var<storage, read_write> lines: array<u32>;

    @compute
    @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn compmain(@builtin(global_invocation_id) comp_id: vec3u)
    {
      let id = (comp_id.y * dim.x) + comp_id.x;
      let section = id / 8;
      let block = ((id % 8)) / 2;
      let ws = dim.x / 4;
      let wv = dim.x + 1;

      let p1 = 4 * (((section / ws) * wv) + (section % ws));
      let p2 = 2 * (((block / 2) * wv) + (block % 2));
      let p3 = (id % 2) * (wv + 1);
      let vo = p1 + p2 + p3;
      let vl = vo + wv + 1;

      var cellPair = (walls[section] >> ((block * 4)));
      cellPair &= 0x000000FF;

      let bCell = u32((id % 2) * 4);
      var cell = (cellPair >> bCell) & 0x0000000F;
      
      let lineIndex = id * 4;
      lines[lineIndex] =     (((cell >> 0) & 0x01) * vo) | ((((cell >> 0) & 0x01) << 16) * (vo + 1));
      lines[lineIndex + 1] = (((cell >> 1) & 0x01) * vl) | ((((cell >> 1) & 0x01) << 16) * (vl - 1));
      lines[lineIndex + 2] = (((cell >> 2) & 0x01) * vo) | ((((cell >> 2) & 0x01) << 16) * (vl - 1));
      lines[lineIndex + 3] = (((cell >> 3) & 0x01) * vl) | ((((cell >> 3) & 0x01) << 16) * (vo + 1));
    }`;

  const bindGroupLayouts = [
    api.device.createBindGroupLayout({
    label: 'Cell bind group layout',
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: 'read-only-storage' }
    },
    {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: 'read-only-storage' }
    },
    {
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: 'storage' }
    }]
  }),
    api.device.createBindGroupLayout({
        label: 'Cell bind group layout',
        entries: [{
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'read-only-storage' }
        }]
      })
    ];

  const bindGroups = [
    api.device.createBindGroup({
      label: 'Line List Generation',
      layout: bindGroupLayouts[0],
      entries: [{
        binding: 0,
        resource: { buffer: grid.dimensionsBuffer }
      },
      {
        binding: 1,
        resource: { buffer: wallSetStorage }
      },
      {
        binding: 2,
        resource: { buffer: lineList }
      }]
    }),
      api.device.createBindGroup({
      label: 'Render Grid',
      layout: bindGroupLayouts[1],
      entries: [{
        binding: 0,
        resource: { buffer: lineList }
      }]
    })
  ];

  const pipelineLayouts = [api.device.createPipelineLayout({
    label: 'Compute pipeline layout',
    bindGroupLayouts: [ bindGroupLayouts[0] ]
  }),
  api.device.createPipelineLayout({
    label: 'Render pipeline layout',
    bindGroupLayouts: [ bindGroupLayouts[1] ]
  })];

  const computePipeline = api.device.createComputePipeline({
    label: 'Compute pipeline',
    layout: pipelineLayouts[0],
    compute: {
      module: api.device.createShaderModule({
        code: compute
      }),
      entryPoint: 'compmain'
    }
  });

  const renderPipeline = api.device.createRenderPipeline({
      layout: pipelineLayouts[1],
      vertex: {
          module: api.device.createShaderModule({
              code: vertex
          }),
          entryPoint: "main",
          buffers: [grid.layout]
      },
      fragment: {
          module: api.device.createShaderModule({
              code: fragment
          }),
          entryPoint: "main",
          targets: [{
              format: surfaceFormat
          }]
      },
      primitive:{
          topology: 'line-list'
          // stripIndexFormat: 'uint32'
      }
  });

  let encoder = api.device.createCommandEncoder();
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, bindGroups[0]);
  const workGroupCount = Math.ceil(GRID_WIDTH / WORKGROUP_SIZE);
  computePass.dispatchWorkgroups(workGroupCount, workGroupCount);
  computePass.end();

  const lineListRead = api.device.createBuffer({
    label: 'Line List',
    size: lineList.size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });
 encoder.copyBufferToBuffer(lineList, 0, lineListRead, 0, lineList.size);
 api.device.queue.submit([encoder.finish()]);
 await Promise.all([lineListRead.mapAsync(GPUMapMode.READ)]);
 const lineListPrint = new Uint16Array(lineListRead.getMappedRange());
 console.log(lineListPrint);

 const textureView = api.context.getCurrentTexture().createView();
 encoder = api.device.createCommandEncoder();
 const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
          view: textureView,
          clearValue: [0.1, 0.1, 0.25, 1], //background color
          loadOp:'clear',
          storeOp: 'store'
      }]
  });
  renderPass.setPipeline(renderPipeline);
  renderPass.setVertexBuffer(0, grid.vertexBuffer);
  renderPass.setIndexBuffer(lineList, 'uint16', 0);
  renderPass.setBindGroup(0, bindGroups[1]);
  // renderPass.draw(grid.length / 2, 1, 0, 0);
  renderPass.drawIndexed(lineList.size / 2, 1, 0);
  renderPass.end();
  
  api.device.queue.submit([encoder.finish()]);
}

// function
// Update()
// {
//    
// }

// setInterval(Update, UPDATE_INTERVAL);
// return;
// }