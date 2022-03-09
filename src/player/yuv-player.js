/**
 * Copyright (C) 2022. All Rights Reserved.
 * 
 * @author chaoqun <1274590447@qq.com>
 * 
 * https://media.w3.org/2010/05/sintel/trailer.mp4
 */

import EventEmitter from 'events'
import { RuntimeError } from '../core/errors' 
import BlobLoader from '../io/blob-loader'
import WebGLYUVRenderer from '../core/gl'
import CaptionPrinter from '../core/caption-printer'

/**
 * @type {CanvasRenderingContext2D}
 */
let canvasCtx


class YUVPlayer {

    constructor(options) {

        this._options = Object.assign({}, options)

        this.createAndMountCanvas()

        this.initRenderer()
    }

    createAndMountCanvas() {
        const el = (typeof this._options.el === 'string') ? 
            document.querySelector(this._options.el) : this._options.el

        if(!el) {
            throw new RuntimeError('no mount point (el) specified')
        }

        const patch = (oldNode, newNode) => {
            let pnode
            if (oldNode.nodeType === 1 && (pnode = oldNode.parentNode)) {
                pnode.insertBefore(newNode, oldNode.nextSibling) &&  oldNode.remove()
            }
        }
        patch(el, this._createElement())
    }

    _createElement({
        containerId = 'gaf-player',
        mainCanvasId = 'gaf-main-canvas',
        subCanvasId = 'gaf-sub-canvas'
    } = {}) {
        const commonStyle = 'display: block; border: none;'
        const template = `
        <div id="${containerId}" style="position: relative; /*display: inline-block;*/">
            <canvas id="${mainCanvasId}" style="${commonStyle}"></canvas>
            <canvas id="${subCanvasId}" style="${commonStyle} background-color: transparent;
                position: absolute;left: 0; top: 0; z-index: 9;">
            </canvas></div>
        `
        const xmlDoc = new DOMParser().parseFromString(template, 'text/html')
        const container = xmlDoc.getElementById(containerId)

        const mainCanvas = container.querySelector(`#${mainCanvasId}`)
        const subCanvas = container.querySelector(`#${subCanvasId}`)

        this.canvass = {
            mainCanvas,
            subCanvas
        }

        return container
    }
 

    initRenderer() {

        const {mainCanvas, subCanvas} = this.canvass

        const frameRenderer = this.frameRenderer = new WebGLYUVRenderer(mainCanvas, {
            flipY: true
        })
        frameRenderer.setSize(960, 540)
        frameRenderer.clearScreen()

        // const { viewController, camera } = frameRenderer.eject()
        Object.assign(window, frameRenderer.eject())

        const captionPrinter = this.captionPrinter = new CaptionPrinter(subCanvas)
        captionPrinter.setSize(960, 540)
        captionPrinter.shoot()
    }

    play(media) {
        (this.media = media) && this._attachLoader()
    }

    _attachLoader() {
        const {resolution, frameRate} = this._options
        const {w, h} = this.parseResolution(resolution)

        const loader = this._loader = new BlobLoader({
            rate:      frameRate,
            chunkSize: (w * h * 3) >> 1 ,            
        })

        loader.on('data', (frame) => {
            this.frameRenderer.render(w, h, frame)
            frame = null
        })

        loader.on('finish', (e) => console.log(e))

        loader.open(this.media)
    }
   
    parseResolution(resolution) {
       const ret = resolution.match(/(\d+)x(\d+)/i)
       return {
           w: ret[1],
           h: ret[2]
       }
    }
}

export default YUVPlayer