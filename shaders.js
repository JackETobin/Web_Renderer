//Shader source BEGIN
// Vertex shaders:

const wgl1VertSrc = `
precision mediump float;

attribute vec4 aPosition;
attribute vec4 vColor;

varying vec4 fColor;

void main() {
    gl_Position = aPosition;
    fColor = vColor;
}`;

const wgl2VertSrc = `#version 300 es
precision mediump float;

in vec4 aPosition;
in vec4 vColor;

out vec4 fColor;

void main() {
  gl_Position = aPosition;
  fColor = vColor;
}`;

const wgpuVertSrc = `
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@vertex
fn vertex_main(@location(0) position: vec4f,
               @location(1) color: vec4f) -> VertexOut
{
  var output : VertexOut;
  output.position = position;
  output.color = color;
  return output;
}`;

// Fragment shaders:

const wgl1FragSrc = `
precision mediump float;

varying vec4 fColor;

void main() {
    gl_FragColor = vec4(1, 0, 0.5, 1);
}`;

const wgl2FragSrc = `#version 300 es
precision mediump float;

in  vec4 fColor;
out vec4 outColor;

void main() {
  outColor = vec4(0.294, 0.0, 0.51, 1.0);
}`;

const wgpuFragSrc = `
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}
  
@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}`;

// Shader source END
//Functionality BEGIN

import { ShowError } from './error.js';

export function InitShaders(apiName)
{
  let shadSrcPackage = [];
  switch(apiName) 
  {
    case 'webgl':
      shadSrcPackage.push({
        vert: { src: wgl1VertSrc,
                entry: `main`}, 
        frag: { src: wgl1FragSrc,
                entry: `main`}
      });
      break;
    case 'webgl2':
      shadSrcPackage.push({
        vert: { src: wgl2VertSrc, 
                entry: `main`}, 
        frag: { src: wgl2FragSrc,
                entry: `main`}
      });
      break;
    case 'webgpu':
      shadSrcPackage.push({
        vert: { src: wgpuVertSrc,
                entry: `vertex_main`}, 
        frag: { src: wgpuFragSrc, 
                entry: `fragment_main`}
      });
      break;
    default:
      ShowError(`Unknown graphics API:\t${apiName}`);
      return null;
  }
    return shadSrcPackage;
}

// export function CompileShader(glContext, shadSrc, shadType)
// {
//     const shader = glContext.createShader(shadType);
//     glContext.shaderSource(shader, shadSrc);
//     glContext.compileShader(shader);
//     if(!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS))
//     {
//       const err = glContext.getShaderInfoLog(shader)
//       ShowError(`Shader compilation error:\n${err}`);
//       return;
//     }
//     return shader;
// }