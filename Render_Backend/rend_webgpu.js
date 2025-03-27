import { ShowError } from '../error.js';

// TODO: Modularize the renderpass settings
// TODO: Setup configurable formats and labling
// TODO: Check if it's possible to get the input binging location by name, that way the setup between api's gets more simple

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
* @property {number} offset
* @property {string} format
*/

/**
* @typedef vertex_buffer_props
* @type {object}
* @property {*} buffer
* @property {string} primative
* @property {buffer_attribute[]} attributes
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
  pipeline: null
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
    ShowError(`webgpu initialized.`);
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

// TODO: Build out a function that automatically packages shaders correctly
/** @param {!shader_package[]} shadPackList */
export function
GPU_SetShaders(shadPackList)
{
  // TODO: Take a list of shader indices and just call a shader import function from the shader file here??
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

// TODO: Build out a function that automatically packages vertex buffers correctly
/** @param {!vertex_buffer_props[]} bufferListCPU */
function
GPU_SetVertexBuffers(bufferListCPU)
{
  const gpu = l_Context.device;
  for(let i = 0; i < bufferListCPU.length; i++)
  {
    // TODO: Set the shader input locations in the vertex attributes
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
        ShowError(`Unknown attribute format: ${attributeList[i].format}`);
        return;
    }
    l_Internal.vertexBuffer[bufferIndex].attributes.push(attributeList[i]);
  }
  return;
}

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
* @typedef rander_attribute
* @type {object}
* @property {!color_attachment[]} colorAttachments
* @property {object} depthStencilAttachment
* @property {string} label
* @property {number} maxDrawCount
* @property {object} occlusionQuerySet
* @property {object[]} timestampWrites
*/


// TODO: Make configurable renderpass options
function
GPU_SetRenderAttribute()
{
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
  const renderPass = {
    colorAttachments: [
      {
        clearValue: l_Internal.clearColor,
        loadOp: 'clear',
        storeOp: 'store',
        view: l_Context.api.getCurrentTexture().createView()
      }
    ]
  };
  l_Internal.pipeline = pipeline;
  l_Internal.commandEncoder = commandEncoder;
  l_Internal.renderPass = renderPass;
}

function
GPU_Draw(index)
{
  const passEncoder = l_Internal.commandEncoder.beginRenderPass(l_Internal.renderPass);
  passEncoder.setPipeline(l_Internal.pipeline);
  passEncoder.setVertexBuffer(0, l_Internal.vertexBuffer[index].buffer);
  passEncoder.draw(3);
  passEncoder.end();

  l_Context.device.queue.submit([l_Internal.commandEncoder.finish()]);
}

  // if(api.context == null)
  // {
  //     ShowError("No available graphics support.");
  //     return;
  // }
  // api.surface.width = api.surface.getBoundingClientRect().width;
  // api.surface.height = api.surface.getBoundingClientRect().height;
  
  // const presentFormat = navigator.gpu.getPreferredCanvasFormat();
  // api.context.configure({
  //   device: api.device, 
  //   format: presentFormat,
  //   alphaMode: 'premultiplied'});

  // const shVertModule = api.device.createShaderModule({code: shVertGPU});
  // const shFragModule = api.device.createShaderModule({code: shFragGPU});
  // const vertexBuffer = api.device.createBuffer({
  //   size: vertices.byteLength,
  //   usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  // })
  // api.device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);
  // const vertexBuffers = [
  //   {
  //     attributes: [
  //       {
  //         shaderLocation: 0, // position
  //         offset: 0,
  //         format: "float32x4",
  //       },
  //       {
  //         shaderLocation: 1, // color
  //         offset: 16,
  //         format: "float32x4",
  //       },
  //     ],
  //     arrayStride: 32,
  //     stepMode: "vertex",
  //   },
  // ];
  
  // const pipelineDescriptor = {
  //   vertex: {
  //     module: shVertModule,
  //     entryPoint: "vertex_main",
  //     buffers: vertexBuffers,
  //   },
  //   fragment: {
  //     module: shFragModule,
  //     entryPoint: "fragment_main",
  //     targets: [
  //       {
  //         format: navigator.gpu.getPreferredCanvasFormat(),
  //       },
  //     ],
  //   },
  //   layout: "auto",
  //   primitive: {
  //     topology: "triangle-list",
  //   },
  // };
  
  // const pipeline = api.device.createRenderPipeline(pipelineDescriptor);

  // const commandEncoder = api.device.createCommandEncoder();
  // const clearColor = { r: 0.08, g: 0.08, b: 0.08, a: 1.0 }
  // const renderPass = {
  //   colorAttachments: [
  //     {
  //       clearValue: clearColor,
  //       loadOp: 'clear',
  //       storeOp: 'store',
  //       view: api.context.getCurrentTexture().createView()
  //     }
  //   ]
  // };
  // const passEncoder = commandEncoder.beginRenderPass(renderPass);
  // passEncoder.setPipeline(pipeline);
  // passEncoder.setVertexBuffer(0, vertexBuffer);
  // passEncoder.draw(3);
  // passEncoder.end();

  // api.device.queue.submit([commandEncoder.finish()]);