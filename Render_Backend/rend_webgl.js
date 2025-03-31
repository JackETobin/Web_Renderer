import { Error } from '../debug.js';

// TODO: define webgl side internal objcects

// Necessities:
// Compiled Shaders & input names

/** 
* @typedef color
* @type {object}
* @property {number} r
* @property {number} g
* @property {number} b
* @property {number} a
*/

/**
* @typedef shader_package
* @type {object}
* @property {{ src: object, entry: string }} vert
* @property {{ src: object, entry: string }} frag
*/

/**
* @typedef buffer_attribute
* @type {object}
* @property {number} shaderLocation
* @property {number} numComponents
* @property {*} format
* @property {boolean} normalized
* @property {number} stride
* @property {number} offset
*/

/**
* @typedef buffer_package
* @type {object}
* @property {object} data
* @property {buffer_attribute[]} attributes
* @property {number} numVertices
*/

/**
* @typedef render_attribute
* @type {object}
* @property {color} clearColor
* @property {number} clearDepth
* @property {number} drawCount
* @property {*} clearStencil
* @property {!*} primative
* @property {*} clearOp
*/

/**
* @typedef internal
* @type {object}
* @property {object[]} program
* @property {buffer_package[]} buffer
* @property {!render_attribute} render
*/

/** @type {internal} */
let l_Internal = {
  program: [],
  buffer: [],
  render: null
};

/**
* @typedef context
* @type {object}
* @property {object} api
* @property {object} surface
*/

/** @type {context} */
let l_Context;

/** @param {!HTMLCanvasElement} surface */
export function
GL_Initialize(surface)
{
  let selected = `webgl2`;
  let api = surface.getContext(selected);
  if(!api)
  {
    selected = `webgl`;
    api = surface.getContext(selected);
  }
  if(api)
  {
    l_Context = {api: api, surface: surface};
    console.log(`${selected} initialized.`);
    return {
      api:                selected,
      configure:          GL_Configure,
      setShaders:         GL_SetShaders,
      setAttributes:      GL_SetAttributes,
      setVertexBuffers:   GL_SetVertexBuffers,
      setClearColor:      GL_SetClearColor,
      setRenderAttribute: GL_SetRenderAttribute,
      buildPipeline:      GL_BuildPipeline,
      draw:               GL_Draw
    };
  }
  return null;
}

function
GL_SetClearColor()
{

}

/**
* @typedef config_pack
* @type {object}
* @property {!object} apiSelected
* @property {!object} surface
* @property {number} width
* @property {number} height
*/

/** @param {!config_pack} config */
function
GL_Configure(config)
{
  // Error(`Configure.`);
  l_Context.surface.width = (config.width != null) ?
    config.width : l_Context.surface.getBoundingClientRect().width;

  l_Context.surface.height = (config.height != null) ?
    config.height : l_Context.surface.getBoundingClientRect().height;

  return;
}

/**
 * @param {!string} src 
 * @param {!*} type 
 */
function 
GL_CompileShader(src, type)
{
  const shader = l_Context.api.createShader(type);
  l_Context.api.shaderSource(shader, src);
  l_Context.api.compileShader(shader);
  if(!l_Context.api.getShaderParameter(shader, l_Context.api.COMPILE_STATUS))
  {
    const err = l_Context.api.getShaderInfoLog(shader)
    Error(`Shader compilation error:\n${err}`);
    return;
  }
  return shader;
}

/** @param {!object} shaderPair */
function
GL_BuildProgram(shaderPair)
{
  let program = l_Context.api.createProgram();
  l_Context.api.attachShader(program, shaderPair.vert);
  l_Context.api.attachShader(program, shaderPair.frag);
  l_Context.api.linkProgram(program);
  if(!l_Context.api.getProgramParameter(program, l_Context.api.LINK_STATUS))
  {
    const err = l_Context.api.getProgramInfoLog(program);
    Error(`Shader link error:\n${err}`);
    return;
  }
  return program;
}

/** @param {!shader_package[]} shadPackList */
function
GL_SetShaders(shadPackList)
{
  for(let i = 0; i < shadPackList.length; i++)
  {
    let shaderPair = {
      vert: GL_CompileShader(shadPackList[i].vert.src, l_Context.api.VERTEX_SHADER),
      frag: GL_CompileShader(shadPackList[i].frag.src, l_Context.api.FRAGMENT_SHADER)
    }
    l_Internal.program.push(GL_BuildProgram(shaderPair));
  }
  return;
}

/** @param {string} target */
function
GL_SetTarget(target)
{
  let returnTarget = null;
  switch(target) {
    case `array_buffer`:
      returnTarget = l_Context.api.ARRAY_BUFFER;
      break;
    case `element_array_buffer`:
      returnTarget = l_Context.api.ELEMENT_ARRAY_BUFFER;
      break;
    case `copy_read_buffer`:            // WebGL2 only
      returnTarget = l_Context.api.COPY_READ_BUFFER;
      break;
    case `copy_write_buffer`:           // WebGL2 only
      returnTarget = l_Context.api.COPY_WRITE_BUFFER;
      break;
    case `transform_feedback_buffer`:   // WebGL2 only
      returnTarget = l_Context.api.TRANSFORM_FEEDBACK_BUFFER;
      break;
    case `uniform_buffer`:              // WebGL2 only
      returnTarget = l_Context.api.UNIFORM_BUFFER;
      break;
    case `pixel_pack_buffer`:           // WebGL2 only
      returnTarget = l_Context.api.PIXEL_PACK_BUFFER;
      break;
    case `pixel_unpack_buffer`:         // WebGL2 only
      returnTarget = l_Context.api.PIXEL_UNPACK_BUFFER;
      break;
    default:
      Error(`Unknown buffer target: ${target}`);
  }
  return returnTarget;
}

/** @param {string} usage */
function
GL_SetUsage(usage)
{
  let targetUsage = null;
  switch(usage) {
    case `static_draw`:
      targetUsage = l_Context.api.STATIC_DRAW;
      break;
    case `dynamic_draw`:
      targetUsage = l_Context.api.DYNAMIC_DRAW;
      break;
    case `stream_draw`:
      targetUsage = l_Context.api.STREAM_DRAW;
      break;
    case `static_read`:
      targetUsage = l_Context.api.STATIC_READ;
      break;
    case `dynamic_read`:
      targetUsage = l_Context.api.DYNAMIC_READ;
      break;
    case `stream_read`:
      targetUsage = l_Context.api.STREAM_READ;
      break;
    case `static_copy`:
      targetUsage = l_Context.api.STATIC_COPY;
      break;
    case `dynamic_copy`:
      targetUsage = l_Context.api.DYNAMIC_COPY;
      break;
    case `stream_copy`:
      targetUsage = l_Context.api.STREAM_COPY;
      break;
    default:
      Error(`Unknown buffer usage: ${usage}`);
  }
  return targetUsage;
}

/**
* @typedef vertex_buffer_obj
* @type {object}
* @property {!object} buffer
* @property {!number} numVertices
* @property {!string} target
* @property {!string} usage
*/

/** @param {!vertex_buffer_obj} bufferPackage */
function 
GL_BindBuffer(bufferPackage)
{
  const newBufferGPU = l_Context.api.createBuffer();
  if(!newBufferGPU)
  {
    Error("Unable to allocate GPU side buffer.");
    return;
  }
  const target = GL_SetTarget(bufferPackage.target);
  const usage = GL_SetUsage(bufferPackage.usage)
  l_Context.api.bindBuffer(target, newBufferGPU);
  l_Context.api.bufferData(target, bufferPackage.buffer, usage);
  return newBufferGPU;
}

/** @param {!vertex_buffer_obj[]} bufferListCPU */
function
GL_SetVertexBuffers(bufferListCPU)
{
  for(let i = 0; i < bufferListCPU.length; i++)
    l_Internal.buffer.push({
  data: GL_BindBuffer(bufferListCPU[i]), 
  attributes: [], 
  numVertices: bufferListCPU[i].numVertices});
  return;
}

/** @param {!string} format */
function
GL_SetFormat(format)
{
  let returnFormat = null;
  switch(format) {
    case `byte`:
      returnFormat = l_Context.api.BYTE;
      break;
    case `unsigned_byte`:
      returnFormat = l_Context.api.UNSIGNED_BYTE;
      break;
    case `short`:
      returnFormat = l_Context.api.SHORT;
      brl_Contextak;
    case `unsigned_short`:
      returnFormat = l_Context.api.UNSIGNED_SHORT;
      break;
    case `int`:
      returnFormat = l_Context.api.INT;
      break;
    case `unsigned_int`:
      returnFormat = l_Context.api.UNSIGNED_INT;
      break;
    case `int_2_10_10_10_rev`:
      returnFormat = l_Context.api.INT_2_10_10_10_REV;
      break;
    case `unsigned_int_2_10_10_10_rev`:
      returnFormat = l_Context.api.UNSIGNED_INT_2_10_10_10_REV;
      break;
    case `float`:
      returnFormat = l_Context.api.FLOAT;
      break;
    case `half_float`:
      returnFormat = l_Context.api.HALF_FLOAT;
      break;
    default:
      Error(`Unknown format: ${format}`);
  }
  return returnFormat;
}

/**
 * 
 * @param {number} bufferIndex 
 * @param {buffer_attribute[]} attributeList
 */
function
GL_SetAttributes(bufferIndex, attributeList)
{
  for(let i = 0; i < attributeList.length; i++)
  {
    attributeList[i].format = GL_SetFormat(attributeList[i].format);
    l_Internal.buffer[bufferIndex].attributes.push(attributeList[i]);
  }
  return;
}

/** @param {!string} primative */
function
GL_SetPrimative(primative)
{
  let returnPrimative = null;
  switch(primative)
  {
    case `point`:
    case `points`:
      returnPrimative = l_Context.api.POINTS;
      break;
    case `line`:
    case `lines`:
      returnPrimative = l_Context.api.LINES;
      break;
    case `line_strip`:
      returnPrimative = l_Context.api.LINE_STRIP;
      break;
    case `line_loop`:
      returnPrimative = l_Context.api.LINE_LOOP;
      break;
    case `triangle`:
    case `triangles`:
      returnPrimative = l_Context.api.TRIANGLES;
      break;
    case `triangle_fan`:
      returnPrimative = l_Context.api.TRIANGLE_FAN;
      break;
    case `triangle_strip`:
      returnPrimative = l_Context.api.TRIANGLE_STRIP;
      break;
    default:
      Error(`Unknown primative: ${primative}`);
  }
  return returnPrimative;
}

/**
 * @param {boolean} color 
 * @param {boolean} depth 
 * @param {boolean} stencil 
 */
function
GL_SetClearOp(color, depth, stencil)
{
  let op = 0;
  op = (color) ? (op | l_Context.api.COLOR_BUFFER_BIT) : op;
  op = (depth) ? (op | l_Context.api.DEPTH_BUFFER_BIT) : op;
  op = (stencil) ? (op | l_Context.api.STENCIL_BUFFER_BIT) : op;
  return op;
}

/**
 * @typedef render_attribute_package
 * @type {object}
 * @property {color} clearColor
 * @property {color} clearDepth
 * @property {color} clearStencil
 * @property {string} primative
 */

/** @param {render_attribute_package} rendAttrPack */
function
GL_SetRenderAttribute(rendAttrPack)
{
  l_Internal.render = {
    clearColor: (rendAttrPack.clearColor) ? rendAttrPack.clearColor : null,
    clearDepth: (rendAttrPack.clearDepth) ? rendAttrPack.clearDepth : null,
    clearStencil: (rendAttrPack.clearStencil) ? rendAttrPack.clearStencil : null,
    primative : GL_SetPrimative(rendAttrPack.primative),
    clearOp: GL_SetClearOp(
      (rendAttrPack.clearColor != null), 
      (rendAttrPack.clearDepth != null), 
      (rendAttrPack.clearStencil != null)),
    drawCount: 0
  }
}

function
GL_BuildPipeline(programIndex)
{
  l_Context.api.clearColor(
    l_Internal.render.clearColor.r, 
    l_Internal.render.clearColor.g, 
    l_Internal.render.clearColor.b, 
    l_Internal.render.clearColor.a);

  l_Context.api.useProgram(l_Internal.program[programIndex]);
  l_Context.api.viewport(0, 0, l_Context.surface.width, l_Context.surface.height);
  for(let i = 0; i < l_Internal.buffer.length; i++)
  {
    let attr = l_Internal.buffer[i].attributes;
    for(let j = 0; j < attr.length; j++)
    {
      l_Context.api.enableVertexAttribArray(attr[j].shaderLocation);
      l_Context.api.vertexAttribPointer(
      attr[j].shaderLocation,
      attr[j].numComponents,
      attr[j].format,
      attr[j].normalized,
      attr[j].stride,
      attr[j].offset);
    }
    l_Internal.render.drawCount += l_Internal.buffer[i].numVertices;
  }
}

function 
GL_Draw(temp)
{
  l_Context.api.clear(l_Internal.render.clearOp);
  l_Context.api.drawArrays(l_Internal.render.primative, 0, l_Internal.render.drawCount);
}