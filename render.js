import { ShowError } from './error.js';
// import { CompileShader } from './shaders.js';

import { GPU_Initialize } from './Render_Backend/rend_webgpu.js';
import { GL_Initialize } from './Render_Backend/rend_webgl.js';



/**
* @typedef universal_buffer_attribute
* @type {object}
* @property {number} shaderLocation
* @property {number} numComponents
* @property {boolean} normalized
* @property {number} stride
* @property {number} offset
* @property {*} format
*/

/**
* @typedef universal_buffer_package
* @type {object}
* @property {*} buffer
* @property {universal_buffer_attribute[]} attributes
* @property {number} stride
* @property {string} stepMode
* @property {string} primative
* @property {*} target
* @property {*} usage
*/

/**
* @typedef shader_package
* @type {object}
* @property {{ src: object, entry: string }} vert
* @property {{ src: object, entry: string }} frag
*/

/**
 * @typedef {render_backend_obj}
 * @type {object}
 * @property {string} api
 * @property {object} configure
 * @property {object} setShaders
 * @property {object} setVertexBuffers
 * @property {object} setClearColor
 * @property {object} buildPipeline
 * @property {object} draw
 */

/** @type {render_backend_obj} */
let l_Backend = null;

/**
 * 
 * @param {string} presentFormat 
 * @param {string} alphaMode 
 * @param {number} width 
 * @param {number} height 
 */
function
Render_Configure(presentFormat, alphaMode, width, height)
{
  const configPack = {
    presentFormat: (presentFormat) ? presentFormat : null,
    alphaMode: (alphaMode) ? alphaMode : null,
    height: (height) ? height : null,
    width: (width) ? width : null
  }
    l_Backend.configure(configPack);
    return;
}

/**
* @param {!number} shaderLocation
* @param {!number} numComponents
* @param {!boolean} normalized
* @param {!number} stride
* @param {!number} offset
* @param {!string} format
*/
function
Render_PackVertexAttribute(location, numComponents, normalized, stride, offset, format)
{
  let attribute = null;
  switch(l_Backend.api) {
    case `webgpu`:
      attribute = {
        shaderLocation: location,
        offset: offset,
        format: format
      };
      break;
    case `webgl2`:
    case `webgl`:
      attribute = {
        shaderLocation: location,
        numComponents: numComponents,
        format: format,
        normalized: normalized,
        stride: stride,
        offset: offset
      };
      break;
    default:
      ShowError(`Unknown backend api.`);
  }
  return attribute;
}

/**
* @param {!*} buffer
* @param {!string} primative
* @param {!number} stride
* @param {!string} stepMode
* @param {!string} target
* @param {!string} usage
*/
function
Render_PackVertexBuffer(vertexBuffer, primative, stride, stepMode, target, usage)
{
  let vertexBufferPackage;
  switch(l_Backend.api) {
    case `webgpu`:
      vertexBufferPackage = {
        buffer: vertexBuffer,
        primative: primative,
        attributes: [],
        stride: stride,
        stepMode: stepMode
      }
      break;
    case `webgl2`:
    case `webgl`:
      vertexBufferPackage = {
        buffer: vertexBuffer,
        target: target,
        usage: usage
      }
      break;
    default:
      ShowError(`Unknown backend api.`);
  }
  return vertexBufferPackage;
}

/**
* 
* @param {!object} packedBuffer 
* @param {!object[]} attributeList 
*/
function
Render_AttachAttribues(packedBuffer, attributeList)
{
  for(let i = 0; i < attributeList.length; i++)
    packedBuffer.attributes.push(attributeList[i]);
  return;
}

/**
 * @param {color} clearColor 
 * @param {number} clearDepth 
 * @param {*} clearStencil 
 * @param {string} primative 
 */
function
Render_PackRenderAttribute(clearColor, clearDepth, clearStencil, primative)
{
  return {
    clearColor: clearColor,
    clearDepth: clearDepth,
    clearStencil: clearStencil,
    primative: primative
  };
}

/** @param {rander_backend_obj} backend */
function
Render_SetObject(backend)
{
  return {
    api:                  backend.api,
    configure:            Render_Configure,
    setShaders:           backend.setShaders,
    packVertexAttribute:  Render_PackVertexAttribute,
    packVertexBuffer:     Render_PackVertexBuffer,
    setVertexAttributes:  backend.setAttributes,
    setVertexBuffers:     backend.setVertexBuffers,
    packRenderAttribute:  Render_PackRenderAttribute,
    setRenderAttribute:   backend.setRenderAttribute,
    setClearColor:        backend.setClearColor,
    build:                backend.buildPipeline,
    draw:                 backend.draw
  };
}

/** @param {!HTMLCanvasElement} surface */
export async function
Render_Init(surface)
{
  l_Backend = await GPU_Initialize(surface);
  if(l_Backend)
    return Object.freeze(Render_SetObject(l_Backend));
  l_Backend = GL_Initialize(surface)
  if(l_Backend)
    return Object.freeze(Render_SetObject(l_Backend));

  ShowError(`Unable to initialize renderer`);
  return null;
}