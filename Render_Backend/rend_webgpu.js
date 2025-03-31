import { Error } from '../debug.js';

// TODO: Setup configurable formats and labling

/** 
* @typedef color
* @type {object}
* @property {number} r
* @property {number} g
* @property {number} b
* @property {number} a
*/

/**
* @typedef color_attachment
* @type {object}
* @property {color} clearValue
* @property {number} depthSlice
* @property {!string} loadOp
* @property {!string} storeOp
* @property {object} resolveTarget
* @property {!object} view
*/

/**
* @typedef depth_stencil_attachment
* @type {object}
* @property {number} depthClearValue
* @property {string} depthLoadOp
* @property {boolean} depthReadOnly
* @property {string} depthStoreOp
* @property {number} stencilClearValue
* @property {string} stencilLoadOp
* @property {boolean} stencilReadOnly
* @property {string} stencilStoreOp
* @property {!object} view
*/

/**
* @typedef render_attribute
* @type {object}
* @property {!color_attachment[]} colorAttachments
* @property {depth_stencil_attachment} depthStencilAttachment
* @property {string} label
* @property {number} maxDrawCount
* @property {!number} drawCount
* @property {object} occlusionQuerySet
* @property {object[]} timestampWrites
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
* @property {number} offset
* @property {string} format
*/

/**
* @typedef vertex_buffer_props
* @type {object}
* @property {*} buffer
* @property {string} primative
* @property {buffer_attribute[]} attributes
* @property {number} numVertices
* @property {number} stride
* @property {string} stepMode
*/

/** 
* @typedef internal 
* @type {object}
* @property {*} presentFormat
* @property {string} alphaMode
* @property {color} clearColor
* @property {shader_package[]} shaderPair
* @property {vertex_buffer_props[]} vertexBuffer
* @property {object} commandEncoder
* @property {object} renderPass
* @property {object} pipeline
* @property {number} drawCount
*/

/** @type {internal} */
let l_Internal = {
  presentFormat: null,
  alphaMode: null,
  clearColor: null,
  shaderPair: [],
  vertexBuffer: [],
  commandEncoder: null,
  renderPass: null,
  pipeline: null,
  drawCount: 0
};

/**
* @typedef context
* @type {object}
* @property {object} api
* @property {object} device
* @property {object} surface
*/

/** @type {context} */
let l_Context;

/** @param {HTMLCanvasElement} surface */
export async function
GPU_Initialize(surface)
{
  const api = surface.getContext('webgpu');
  const adapter = (!!api) ? await navigator.gpu.requestAdapter() : null;
  const device = (!!adapter) ? await adapter.requestDevice() : null;
  if(api && device)
  {
    l_Context = {api: api, device: device, surface: surface};
    console.log(`webgpu initialized.`);
    return {
      api:                "webgpu",
      configure:          GPU_Configure,
      setShaders:         GPU_SetShaders,
      setAttributes:      GPU_SetAttributes,
      setVertexBuffers:   GPU_SetVertexBuffers,
      setClearColor:      GPU_SetClearColor,
      setRenderAttribute: GPU_SetRenderAttribute,
      buildPipeline:      GPU_BuildPipeline,
      draw:               GPU_Draw
    };
  }
  return null;
}

/** @param {string} format */
function
GPU_SetPresentFormat(format)
{
    let returnFormat = null;
  switch(format)
  {
    case 'rbga16f':
      returnFormat = 'rgba16float';
      break;
    case 'rbga8un':
      returnFormat = 'rgba8unorm';
      break;
    case 'bgra8un':
      returnFormat = 'bgra8unorm';
      break;
    case 'current':
      returnFormat = navigator.gpu.getCurrentTexture();
      break;
    default:
      returnFormat = navigator.gpu.getPreferredCanvasFormat();
  }
  return returnFormat;
}

/** @param {string} alphaMode */
function
GPU_SetAlphaMode(alphaMode)
{
  switch(alphaMode) {
    default:
      return 'premultiplied';
  }
}

/**
* @typedef config_pack
* @type {object}
* @property {string} presentFormat
* @property {string} alphaMode
* @property {number} width
* @property {number} height
*/

/** @param {!config_pack} config */
export function
GPU_Configure(config)
{
  l_Context.surface.width = (config.width != null) ?
    config.width : l_Context.surface.getBoundingClientRect().width;

  l_Context.surface.height = (config.height != null) ?
    config.height : l_Context.surface.getBoundingClientRect().height;
  
  l_Internal.presentFormat = GPU_SetPresentFormat(config.format);
  l_Internal.alphaMode = GPU_SetAlphaMode(config.alphaMode);

  l_Context.api.configure({
    device: l_Context.device, 
    format: l_Internal.presentFormat,
    alphaMode: l_Internal.alphaMode});
  
  return;
}

/** @param {!shader_package[]} shadPackList */
export function
GPU_SetShaders(shadPackList)
{
  const gpu = l_Context.device;
  for(let i = 0; i < shadPackList.length; i++)
  {
    let shaderPackage = shadPackList[i];
    // TODO: Add the label component for debugging
    shaderPackage.vert.src = gpu.createShaderModule({code: shaderPackage.vert.src});
    shaderPackage.frag.src = gpu.createShaderModule({code: shaderPackage.frag.src});
    l_Internal.shaderPair.push(shaderPackage);
  }
  return;
}

/** @param {!vertex_buffer_props[]} bufferListCPU */
function
GPU_SetVertexBuffers(bufferListCPU)
{
  const gpu = l_Context.device;
  for(let i = 0; i < bufferListCPU.length; i++)
  {
    let cpu = bufferListCPU[i];
    let bufferGPU = gpu.createBuffer({
     size: cpu.buffer.byteLength,
     usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    })
    gpu.queue.writeBuffer(bufferGPU, 0, cpu.buffer, 0, cpu.buffer.length);
    cpu.buffer = bufferGPU;
    l_Internal.vertexBuffer.push(cpu);
  }
  return;
}

/**
* @param {!number} vertexBuffer 
* @param {!buffer_attribute[]} attributeList 
*/
function
GPU_SetAttributes(bufferIndex, attributeList)
{
  
  for(let i = 0; i < attributeList.length; i++)
  {
    switch(attributeList[i].format) {
      case `float`:
        attributeList[i].format = `float32x4`;
        break;
      default:
        Error(`Unknown attribute format: ${attributeList[i].format}`);
        return;
    }
    l_Internal.vertexBuffer[bufferIndex].attributes.push(attributeList[i]);
  }
  return;
}

// TODO: Make configurable renderpass options
/** @param {render_attribute} renderAttribute */
function
GPU_SetRenderAttribute(renderAttribute)
{
  for(let i = 0; i < renderAttribute.colorAttachments.length; i++)
  {
    if(renderAttribute.colorAttachments[i].clearValue)
    {
      renderAttribute.colorAttachments[i].loadOp = `clear`;
      renderAttribute.colorAttachments[i].storeOp = `store`;
    }
    renderAttribute.colorAttachments[i].view = l_Context.api.getCurrentTexture().createView();
  }
  l_Internal.renderPass = renderAttribute;
  return;
}

/** @param {!color} color */
function
GPU_SetClearColor(color)
{
  l_Internal.clearColor = color;
  return;
}

/** @param {!number} index */
function
GPU_BuildPipeline(index)
{
  let vertexBuffers = [];
  for(let i = 0; i < l_Internal.vertexBuffer.length; i++)
  {
    l_Internal.drawCount += l_Internal.vertexBuffer[i].numVertices;
    vertexBuffers.push( 
    {
      attributes: l_Internal.vertexBuffer[i].attributes,
      arrayStride: l_Internal.vertexBuffer[i].stride,
      stepMode: l_Internal.vertexBuffer[i].stepMode,
    })
  }
  const pipelineDescriptor = {
    vertex: {
      module: l_Internal.shaderPair[index].vert.src,
      entryPoint: l_Internal.shaderPair[index].vert.entry,
      buffers: vertexBuffers,
    },
    fragment: {
      module: l_Internal.shaderPair[index].frag.src,
      entryPoint: l_Internal.shaderPair[index].frag.entry,
      targets: [
        {
          format: l_Internal.presentFormat,
        },
      ],
    },
    layout: "auto",
    primitive: {
      topology: "triangle-list",
    },
  };
  const pipeline = l_Context.device.createRenderPipeline(pipelineDescriptor);
  const commandEncoder = l_Context.device.createCommandEncoder();
  l_Internal.pipeline = pipeline;
  l_Internal.commandEncoder = commandEncoder;
}

function
GPU_Draw(index)
{
  const passEncoder = l_Internal.commandEncoder.beginRenderPass(l_Internal.renderPass);
  passEncoder.setPipeline(l_Internal.pipeline);
  passEncoder.setVertexBuffer(0, l_Internal.vertexBuffer[index].buffer);
  passEncoder.draw(l_Internal.drawCount);
  passEncoder.end();

  l_Context.device.queue.submit([l_Internal.commandEncoder.finish()]);
}