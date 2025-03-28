import { ShowError } from './error.js';
import { Render_Init } from './render.js';
import { InitShaders } from './shaders.js';

try {
  MainInit();
} catch(e) {
    ShowError(`Initialization: Uncaught exception:\n${e}`);
}

async function MainInit()
{
  /** @type {HTMLCanvasElement|null} */
  const surface = document.querySelector("#surface");
  const rend = await Render_Init(surface);
  if(!rend.api)
  {
    ShowError(`Unable to initialize renderer.`);
    return;
  }
  try {
    main(rend);
  } catch(e) {
    ShowError(`Main Uncaught exception:\n${e}`);
  };
}

const webgpuColor = [
// R  G  B  A
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 0, 1, 1]
];

const vertices = new Float32Array([
// X     Y     Z     W        VERTEX COLOR
   0.0,  0.5,  0.0,  1.0,  ...webgpuColor[0], 
  -0.5, -0.5,  0.0,  1.0,  ...webgpuColor[1], 
   0.5, -0.5,  0.0,  1.0,  ...webgpuColor[2],
]);



function main(rend)
{
  const margin = 0.15;
  let surfaceWidth = window.innerWidth * (1 - margin);
  let surfaceHeight = window.innerHeight * (1 - margin);
  let size = (surfaceWidth < surfaceHeight) ? surfaceWidth :surfaceHeight;

  const shSrcPack = InitShaders(rend.api);
  if(!shSrcPack)
    ShowError(`Unable to obtain shaders,`);
  
  const clearColor = {r: 0.08, g: 0.08, b: 0.08, a: 1.0};
  const vertexAttributes = [];
  vertexAttributes.push(rend.packVertexAttribute(0, 4, false, 32, 0, `float`));
  vertexAttributes.push(rend.packVertexAttribute(1, 4, false, 0, 16, `float`));

  let packedBuffer = [];
  packedBuffer.push(rend.packVertexBuffer(vertices, `triangles`, 32, `vertex`, `array_buffer`, `static_draw`));
  let renderAttribute = rend.packRenderAttribute(clearColor, null, null, `triangles`);

  rend.configure(null, null, size, size);
  rend.setShaders(shSrcPack);
  rend.setVertexBuffers(packedBuffer);
  rend.setVertexAttributes(0, vertexAttributes);
  rend.setRenderAttribute(renderAttribute);
  rend.setClearColor(clearColor);
  rend.build(0);
  rend.draw(0);
}