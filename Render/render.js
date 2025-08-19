import {Debug, Warn, Error, Assert, Abort} from '../debug.js';

const WORKGROUP_SIZE = 4;

const vertSrc = `
    @vertex
    fn vertMain(@location(0) line: vec2<f32>) -> @builtin(position) vec4<f32> 
    {
        return vec4<f32>(line, 0.0, 1.0);
    }`;

const fragSrc = `
    @fragment
    fn fragMain() -> @location(0) vec4<f32> 
    {
        return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    }`;

const computeLineList = `
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

/**
 * @typedef bufferType_Enum
 * @type {object}
 * @property {number}         undefined
 * @property {number}         vertex
 * @property {number}         index
 * @property {number}         uniform
 * @property {number}         storage
 */

/**
 * @typedef computeType_Enum
 * @type {object}
 * @property {number}         undefined
 * @property {number}         package
 * @property {number}         lines
 */

 /**
  * @typedef buffer_Obj
  * @type {object}
  * @property {object}        mem
  * @property {string}        type
  * @property {object}        layout
  */

 // TODO: Add an initialized bool and checks per function.
export class renderer
{
  /** @type bufferType_Enum */
  bufferType = Object.freeze({
    undefined: 0,
    vertex: 1,
    index: 2,
    uniform: 3,
    storage: 4,
  });
  /** @type computeType_Enum */
  computeType = Object.freeze({
    undefined: 0,
    package: 5,
    lines: 6
  });

  #device = null;
  #context = null;

  /** @type string */
  #surfaceFormat = null;

  /** @type buffer_Obj[] */
  #buffer = null;

  #computeBindGroup = null;
  #computePipeline = null;

  #renderBindGroup = null;
  #renderPipeline = null;

  /**
  * @param {number} surfaceSize_In 
  * @returns {renderer}
  */
  async init(surfaceSize_In)
  {
    const adapter = (!navigator.gpu) ? Abort('WebGPU unsupported.') : await navigator.gpu.requestAdapter();
    let surface = document.getElementById('surface');
    this.#context = surface.getContext('webgpu');
    this.#device = (!adapter) ? Abort('No suitable adapter available.') : await adapter.requestDevice();
    this.#device.label = "Current Device";
    if(!this.#context || !this.#device)
    {
      const missing = (!this.#context) ? "Context unavailable." : "Device unavailable.";
      Abort(missing);
    }
    surface.width = surface.height = surfaceSize_In;
    this.#surfaceFormat = navigator.gpu.getPreferredCanvasFormat();
    this.#buffer = new Array();
    return this;
  }
  
  #l_AllocBuffer(label_In, byteSize_In, usage_In)
  {
    const buffer = this.#device.createBuffer({
      label: label_In,
      size: byteSize_In,
      usage: usage_In
    });
    return buffer;
  }

  #l_PushBuffer(buffer_In, type_In, layout_In)
  {
    if(buffer_In != null)
      this.#buffer.push({
        mem: buffer_In,
        type: type_In, 
        layout: layout_In});
    return (this.#buffer.length - 1);
  }

  /**
   * @param {string}            label_In 
   * @param {number}            byteSize_In 
   * @param {bufferType_Enum}   usage_In
   * @param {number}            stride_In
   * @param {string}            format_In
   * @returns {number}          bufferIndex
   */
  bufferAlloc(label_In, byteSize_In, usage_In, stride_In, format_In)
  {
    let usage = 0;
    let layout = null;
    let newBuffer = null;
    let label = (label_In == null) ? "Unlabeled" : label_In;
    switch(usage_In) 
    {
      case this.bufferType.vertex:
        if(!stride_In || !format_In)
        {
          const missingInfo = (!stride_In) ? "stride" : "format";
          Warn(`Missing required information: ${missingInfo}.`);
          return -1;
        };
        usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        newBuffer = this.#l_AllocBuffer(label, byteSize_In, usage);
        layout = {
        arrayStride: stride_In,
        attributes: [{
            format: format_In,
            offset: 0,
            shaderLocation: 0
          }]
        };
        return this.#l_PushBuffer(newBuffer, "read-only-storage", layout);
      case this.bufferType.index:
        usage = GPUBufferUsage.INDEX | 
                GPUBufferUsage.STORAGE | 
                GPUBufferUsage.COPY_DST | 
                GPUBufferUsage.COPY_SRC;
        newBuffer = this.#l_AllocBuffer(label, byteSize_In, usage);
        return this.#l_PushBuffer(newBuffer, "storage", layout);
      case this.bufferType.uniform:
        usage = GPUBufferUsage.UNIFORM | 
                GPUBufferUsage.COPY_DST
        newBuffer = this.#l_AllocBuffer(label, byteSize_In, usage);
        return this.#l_PushBuffer(newBuffer, "read-only-storage", layout);
      case this.bufferType.storage:
        usage = GPUBufferUsage.STORAGE | 
                GPUBufferUsage.COPY_DST;
        newBuffer = this.#l_AllocBuffer(label, byteSize_In, usage);
        return this.#l_PushBuffer(newBuffer, "read-only-storage", layout);
      default:
        Warn("Unknown buffer type: unable to allocate buffer.");
    }
    return -1;
  }

  /**
  * @param {number}             bufferIndex_In 
  * @param {number}             offset_In 
  * @param {*}                  data_In 
  */
  bufferWrite(bufferIndex_In, offset_In, data_In)
  {
    this.#device.queue.writeBuffer(
      this.#buffer[bufferIndex_In].mem, 
      offset_In, 
      data_In);
  }

  /**
  * @param {number[]}           indexList_In
  * @param {computeType_Enum}   computeType_In
  */
  setComputePipeline(indexList_In, computeType_In)
  {
    if(!indexList_In)
    {
      Warn("Index list required for compute pipeline.");
      return;
    };

    /** @type string */
    let computeSrc = null;
    switch(computeType_In)
    {
      case this.computeType.lines:
        computeSrc = computeLineList;
        break;
      case this.computeType.package:
        Warn("Package operation unavailable.");
        return;
        break;
      default:
        Error("Unknown compute operation.");
        return;
    }

    const layoutEntries = [];
    const bindGroupEntries = [];
    for(let i = 0; i < indexList_In.length; i++)
    {
      layoutEntries.push({
        binding: i,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: this.#buffer[indexList_In[i]].type }
      });
      bindGroupEntries.push({
        binding: i, 
        resource: { buffer: this.#buffer[indexList_In[i]].mem }
      });
    }

    const bindGroupLayout =
      this.#device.createBindGroupLayout({
      label: "Compute Bind Group Layout",
      entries: layoutEntries
    })

    this.#computeBindGroup = this.#device.createBindGroup({
      label: "Compute Bind Group",
      layout: bindGroupLayout,
      entries: bindGroupEntries});

    const pipelineLayout = this.#device.createPipelineLayout({
      label: "Compute Pipeline Layout",
      bindGroupLayouts: [ bindGroupLayout ]
    })

    this.#computePipeline = this.#device.createComputePipeline({
      label: "Compute pipeline",
      layout: pipelineLayout,
      compute: {
        module: this.#device.createShaderModule({
          code: computeSrc
        }),
        entryPoint: "compmain"
      }
    });
  }

  /** @param {number}           workGroupCount_In */
  compute(workGroupCount_In)
  {
    let encoder = this.#device.createCommandEncoder(
      { label: "Compute Encoder"}
    );
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(this.#computePipeline);
    computePass.setBindGroup(0, this.#computeBindGroup);
    computePass.dispatchWorkgroups(workGroupCount_In, workGroupCount_In);
    computePass.end();

    this.#device.queue.submit([encoder.finish()]);
  }

  setRenderPipeline(vertexList_In, indexList_In)
  {
    if(!indexList_In)
    {
      Warn("Index list required for render pipeline.");
      return;
    };
    this.#context.configure({
      device: this.#device,
      format: this.#surfaceFormat,
      alphaMode: "premultiplied",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    });

    /** @type object[] */
    const layoutEntries = [];
    /** @type object[] */
    const bindGroupEntries = [];
    for(let i = 0; i < indexList_In.length; i++)
    {
      layoutEntries.push({
        binding: i,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" }
      });
      bindGroupEntries.push({
        binding: i, 
        resource: { buffer: this.#buffer[indexList_In[i]].mem }
      });
    }
    
    /** @type object[] */
    const bufferList = [];
    for(let i = 0; i < indexList_In.length; i++)
      bufferList.push(this.#buffer[vertexList_In[i]].layout);

    const bindGroupLayout =
      this.#device.createBindGroupLayout({
      label: "Render Bind Group Layout",
      entries: layoutEntries
    })

    this.#renderBindGroup = this.#device.createBindGroup({
      label: "Render Bind Group",
      layout: bindGroupLayout,
      entries: bindGroupEntries});

    const pipelineLayout = this.#device.createPipelineLayout({
      label: "Render Pipeline Layout",
      bindGroupLayouts: [ bindGroupLayout ]
    })

    this.#renderPipeline = this.#device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
          module: this.#device.createShaderModule({
            label: "Vertex Shader",
            code: vertSrc
          }),
          entryPoint: "vertMain",
          buffers: bufferList
      },
      fragment: {
          module: this.#device.createShaderModule({
            label: "Fragment Shader",
            code: fragSrc
          }),
          entryPoint: "fragMain",
          targets: [{
              format: navigator.gpu.getPreferredCanvasFormat()
          }]
      },
      primitive:{
          topology: 'line-list'
      }
    });
  }

  draw(vertexIndex_In, indexIndex_In, drawCount_In)
  {
    const textureView = this.#context.getCurrentTexture().createView({label: "View"});
    let encoder = this.#device.createCommandEncoder(
      { label: "Render Encoder" }
    );
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
         view: textureView,
         clearValue: [0.1, 0.1, 0.25, 1], //background color
         loadOp:"clear",
         storeOp: "store"
      }]
    });
    renderPass.setPipeline(this.#renderPipeline);
    renderPass.setVertexBuffer(0, this.#buffer[vertexIndex_In].mem);
    renderPass.setIndexBuffer(this.#buffer[indexIndex_In].mem, 'uint16', 0);
    renderPass.setBindGroup(0, this.#renderBindGroup);
    renderPass.drawIndexed(drawCount_In, 1, 0);
    renderPass.end();

    this.#device.queue.submit([encoder.finish()]);
  }

  async printBuffer(index_In)
  {
    const encoder = this.#device.createCommandEncoder();
    const buffer = this.#buffer[index_In].mem;
    const readBuffer = this.#device.createBuffer({
      label: 'Line List',
      size: buffer.size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });
    encoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, buffer.size);
    this.#device.queue.submit([encoder.finish()]);
    
    await Promise.all([readBuffer.mapAsync(GPUMapMode.READ)]);
    const printBuffer = new Uint16Array(readBuffer.getMappedRange());
    console.log(printBuffer);
  }
}