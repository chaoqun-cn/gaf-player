/**
 * Copyright (C) 2022. All Rights Reserved.
 * 
 * @author chaoqun <1274590447@qq.com>
 * 
 */

export default class CaptionPrinter {

    /**
     * 
     * @param {HTMLCanvasElement} canvas 
     * @param {Object} options 
     */
    constructor(canvas, options) {

        this.canvas = canvas
        this._2dCtx = canvas.getContext('2d')

        this._options = Object.assign({
            widthLimit: canvas.width * .8,
            linesLimit: 2
        }, options)

        this.captionList = ['a brown fox quickly jumps over the lazy dog', '一只棕色的狐狸迅速跳过了懒惰的狗']
    
        this.applyStyle()
    }

    shoot() {
        this.applyStyle()
        console.log(this._2dCtx)
        this._2dCtx.strokeStyle = 'rgba(255, 255, 255, 1)'
        this._2dCtx.fillText(this.captionList.shift(), this.canvas.width / 2, this.canvas.height - 30)
    }

    setSize(width, height) {
        Object.assign(this.canvas, {
            width,
            height
        })
    }

    applyStyle() {
        Object.assign(this._2dCtx, {
            fillStyle: 'rgba(255, 255, 255, 1)',
            font: '24px lighter serif',
            textAlign: 'center'
        })

    }

    attach() {

    }

    /**
     * split str into char
     * 
     * @param {String} str 
     * \u4e00-\u9fa5	Chinese
     * \u0030-\u0039	Number
     * \u0041-\u005a	Upper case letters
     * \u0061-\u007a	Lower case letters
     */
    tokenizer(str) {
        return /[\u4e00-\u9fa5]+/g.test(str) ? str.split('') : str.split(/\s+/g)
    }
}