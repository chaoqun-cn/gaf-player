/**
 * Copyright (C) 2022. All Rights Reserved.
 * 
 * @author chaoqun <1274590447@qq.com>
 * 
 * model matrix: move model around in 3d world space
 * view matrix: moving the objects in the scene to simulate the position of the camera being changed
 * projection matrix: convert world space coordinates into clip space coordinates
 * 
 * model space → { model matrix } → world space → { view matrix } → view space → { projection matrix } → clip space
 * 
 * perspective projection: map 3D coordinates into 2D drawing surface
 * 
 * The smaller Z values are rendered on top of the larger Z values.
 * The value of w is used as a divisor for the other components of the coordinate.
 */
import { RuntimeError } from '../core/errors' 
import vertexShaderSource from '../../static/shaders/vertex.glsl'
import fragmentShaderSource from '../../static/shaders/fragment.glsl'
import { mat4 } from 'gl-matrix'


/**
 * @param {WebGLYUVRenderer} yuvRenderer
 * @param {Number} fov Camera frustum vertical field of view.
 * @param {Number} aspect  Camera frustum aspect ratio.
 * @param {Number} near Camera frustum near plane.
 * @param {Number} far Camera frustum far plane.
 */
 function PerspectiveCamera(yuvRenderer, fov, aspect, near=0.1, far=100) {

    aspect = aspect || yuvRenderer.canvas.width / yuvRenderer.canvas.height

    const projectionMatrix = mat4.create()
    mat4.perspective(projectionMatrix, fov, aspect, near, far)

    this.projectionMatrix = {
        uname: 'projectionMatrix',
        needUpdate: true,
        matrix: projectionMatrix
    }

    this.yuvRenderer = yuvRenderer

}

PerspectiveCamera.prototype.mat4ops = ['setPosition']

PerspectiveCamera.prototype.setPosition = function(x, y, z) {
    const cameraMatrix = mat4.create()
    mat4.translate(
        cameraMatrix,
        cameraMatrix,
        [x, y, z]
    )

    this.viewMatrix = {
        uname: 'viewMatrix',
        needUpdate: true,
        matrix: mat4.invert(cameraMatrix, cameraMatrix)
    }
}

PerspectiveCamera.prototype.update = function() {
    const { viewMatrix, projectionMatrix, yuvRenderer } = this

    viewMatrix.needUpdate && 
    yuvRenderer._setUniformMatrix(viewMatrix.uname, viewMatrix.matrix) &&
    (viewMatrix.needUpdate = false)

    projectionMatrix.needUpdate && 
    yuvRenderer._setUniformMatrix(projectionMatrix.uname, projectionMatrix.matrix) &&
    (projectionMatrix.needUpdate = false)
}


/**
 * 
 * @param {WebGLYUVRenderer} yuvRenderer 
 */
function ViewController(yuvRenderer, aspect=16/9) {

    this._baseMatrix = mat4.create()
    mat4.scale(
        this._baseMatrix,
        this._baseMatrix,
        [1, 1 / aspect, 1]
    )

    this.modelMatrix = {
        uname: 'modelMatrix',
        needUpdate: true,
        matrix: mat4.create()
    }

    this.yuvRenderer = yuvRenderer
    this.scale(1, 1, 1)
}

ViewController.prototype.mat4ops = ['translate', 'scale', 'rotateOnAxis']

ViewController.prototype._mat4op = function(op, ...args) {
    const { matrix } = this.modelMatrix
    mat4[op](
        matrix,
        this._baseMatrix,
        ...args
    )
    this.modelMatrix.needUpdate = true
}

ViewController.prototype.translate = function(x , y, z) {
    this._mat4op('translate', [x, y, z])
}

ViewController.prototype.scale = function(x , y, z) {
    this._mat4op('scale', [x, y, z])
}


ViewController.prototype.rotateOnAxis = function(radian, axis=[0, 0, 1]) {
    this._mat4op('rotate', radian, [x, y, z])
}

ViewController.prototype.update = function() {
    const { modelMatrix, yuvRenderer } = this

    modelMatrix.needUpdate && 
    yuvRenderer._setUniformMatrix(modelMatrix.uname, modelMatrix.matrix) &&
    (modelMatrix.needUpdate = false)

}


function postCallBackMat4opsInvoke(obj, cb) {
    return new Proxy(obj, {
        get(target, key) {
            if(target.mat4ops && target.mat4ops.includes(key)) {
                Promise.resolve().then(cb)
            }

            return Reflect.get(target, key)
        }
    })
}


export default class WebGLYUVRenderer {

    static SHOWMODE = {
        RGBA: 'rgba',
        GRAY: 'gray'
    }

    static PIXFMT = {
        PIX_YUV420P : {tag: 0, title: 'yuv420p', samples: ['samplerY', 'samplerU', 'samplerV']},
        PIX_NV12    : {tag: 1, title: 'nv12', samples: ['samplerY', 'samplerUV']},
        PIX_NV21    : {tag: 2, title: 'nv21', samples: ['samplerY', 'samplerUV']}
    }

    static isSupport(pixfmt) {
        const key = Object.keys(this.PIXFMT).find(
            key => pixfmt == this.PIXFMT[key]
                || pixfmt === this.PIXFMT[key].title
        )
        return key ? this.PIXFMT[key] : undefined
    }

    static view = [
        -1.0, -1.0, 0.0,  // left,  bottom
         1.0, -1.0, 0.0,  // right, bottom
        -1.0,  1.0, 0.0,  // left,  top
         1.0,  1.0, 0.0   // right, top
    ]

    static st = [
        0.0, 0.0, 
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0, 
    ]

    static builtIns = {
        viewController: Symbol('viewController'),
        camera: Symbol('camera'),
         
    }

    constructor(canvas, options={}) {

        if(!(canvas instanceof HTMLCanvasElement)) {
            throw new RuntimeError('WebGLYUVRenderer need a canvas')
        }

        const glCtx = this._glCtx = canvas.getContext('webgl2') 
            || canvas.getContext('webgl') 
            || canvas.getContext('experimental-webgl')

        if (!glCtx) {
            throw new RuntimeError('User agent not support webgl')
        }
        
        this.canvas = canvas;
        this.options = options
        this._init();
    }

    _init() {

        const gl = this._glCtx
        const { pixfmt = WebGLYUVRenderer.PIXFMT.PIX_YUV420P, align, flipY } = this.options

        if (!(this.pixfmt = WebGLYUVRenderer.isSupport(pixfmt))) {
            throw new RuntimeError(`unsupported pixel format "${pixfmt}"`)
        }

        // specifies the pixel storage modes.
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, align || 1)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!flipY)

        const program = gl.program = gl.createProgram()
        
        gl.attachShader(program, this._compileShader(vertexShaderSource, gl.VERTEX_SHADER))
        gl.attachShader(program, this._compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER))

        // link shaders
        gl.linkProgram(program)
        if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program)
            gl.deleteProgram(program)
            throw new RuntimeError(
                `Errors while linking: ${info}`
            )
        }
        gl.useProgram(program)

        this._setAttributeBuffer('position', new Float32Array(WebGLYUVRenderer.view), 3)
        this._setAttributeBuffer('uv', new Float32Array(WebGLYUVRenderer.st), 2)

        this._addComps()
        this._loadTexture()
    }

    _addComps() {
        const aspect = this.options.aspect || 16 / 9

        const viewController = new ViewController(this, aspect)
        viewController.update()

        const camera = new PerspectiveCamera(this, Math.PI / 180 * 75)
        camera.setPosition(0, 0, 1)
        camera.update()

        this[WebGLYUVRenderer.builtIns.viewController] = viewController
        this[WebGLYUVRenderer.builtIns.camera] = camera
    }


    _loadTexture() {
        this.pixfmt.samples.forEach(sample => {
            this._createTexture(sample)
        })
    }


    _compileShader(source, type) {
        const gl = this._glCtx
        gl.shaders = gl.shaders || []

        const preprocess = () => {
            if (type == gl.FRAGMENT_SHADER) {
                source = 
                `
                ${
                    this.options.mode === WebGLYUVRenderer.SHOWMODE.GRAY 
                    ? '#define GRAY_MODE' : ''
                }
                ${
                    source.replace(
                        /#define(\s*?)PIX_FMT(\s*?)(\d+)/igm, 
                        `#define PIX_FMT ${this.pixfmt.tag}`
                    )
                }
                `
            }
        }
        
        preprocess()
        const shader = gl.createShader(type)
        gl.shaderSource(shader, source)
        gl.compileShader(shader)

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader)
            gl.deleteShader(shader)
            throw new RuntimeError(
                `Errors while compiling shader[type=${type}]: ${info}\n${source}`
            )
        }

        gl.shaders.push(shader)

        return shader
    }

     _createTexture(name, filter = this._glCtx.LINEAR) {
        const gl = this._glCtx
        gl.textureIndex = gl.textureIndex || 0
        gl.textures = gl.textures || {}

        const texture = gl.createTexture()
        gl.activeTexture(gl[`TEXTURE${gl.textureIndex}`])
        gl.bindTexture(gl.TEXTURE_2D, texture)

        // set texture parameters.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        gl.uniform1i(gl.getUniformLocation(gl.program, name), gl.textureIndex++)

        gl.textures[name] = texture
    }

    _setAttributeBuffer(attrName, attrValue, attrComp) {
        const gl = this._glCtx
        gl.buffers = gl.buffers || []

        // enable
        const attrLoc = gl.getAttribLocation(gl.program, attrName)
        gl.enableVertexAttribArray(attrLoc)
    
        // create and populate
        const attrBuf = gl.createBuffer()
        gl.bindBuffer(this._glCtx.ARRAY_BUFFER, attrBuf)
        gl.bufferData(this._glCtx.ARRAY_BUFFER, attrValue, this._glCtx.STATIC_DRAW)
    
        // describe
        this._glCtx.vertexAttribPointer(attrLoc, attrComp, this._glCtx.FLOAT, false, 0, 0)
    
        gl.buffers.push(attrBuf)
    }

    eject() {
        const {
            [WebGLYUVRenderer.builtIns.viewController]: viewController,
            [WebGLYUVRenderer.builtIns.camera]: camera
        } = this

        return {
            viewController: postCallBackMat4opsInvoke(viewController, () => viewController.update()),
            camera: postCallBackMat4opsInvoke(camera, () => camera.update())
        }
    }

    render(width, height, data) {
        const gl = this._glCtx
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        this.clearScreen()

        this._textureMap(width, height, data)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    _setUniformMatrix(uname, matrix) {
        const gl = this._glCtx
        gl.uniformMatrix4fv(
            gl.getUniformLocation(gl.program, uname),
            false,
            matrix
        )
        return true
    }

    _textureMap(width, height, data) {
        const gl = this._glCtx
        const uOffset = width * height;
        const vOffset = uOffset + (width >> 1) * (height >> 1);

        const {samplerY, samplerU, samplerV, samplerUV} = gl.textures

        this._populate0(width, height, data.subarray(0, uOffset), samplerY)
        switch(this.pixfmt.tag) {
            case WebGLYUVRenderer.PIXFMT.PIX_YUV420P.tag:
                this._populate0(width >> 1, height >> 1, data.subarray(uOffset, vOffset), samplerU)
                this._populate0(width >> 1, height >> 1, data.subarray(vOffset, data.length), samplerV)
                break
            case WebGLYUVRenderer.PIXFMT.PIX_NV12.tag:
            case WebGLYUVRenderer.PIXFMT.PIX_NV21.tag:
                this._populate0(width >> 1, height >> 1, data.subarray(uOffset, data.length), samplerUV, gl.LUMINANCE_ALPHA)

        }
    }

    _populate0(w, h, data, texture, format=this._glCtx.LUMINANCE) {

        const gl = this._glCtx

        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            format,
            w,
            h,
            0,
            format,
            gl.UNSIGNED_BYTE,
            data
        )

    }

    clearScreen() {
        
        const gl = this._glCtx

        gl.clearColor(0.0, 0.0, 0.0, 1.0)  
        gl.clearDepth(1.0)                
        gl.enable(gl.DEPTH_TEST)          
        gl.depthFunc(gl.LEQUAL)           
      
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }

    setSize(width, height) {
        Object.assign(
            this.canvas,
            { width, height }
        )
    }

    destroy() {
        const gl = this._glCtx
    
        const {program, shaders, buffers, textures} = this._glCtx.textures

        console.log(gl)
    }
}