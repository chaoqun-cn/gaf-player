/**
 * Copyright (C) 2022. All Rights Reserved.
 * 
 * @author chaoqun <1274590447@qq.com>
 * 
 */


import { RuntimeError } from "../core/errors"
import Clock from "../utils/clock"
import { BaseLoader } from "./loader"

class BlobLoader extends BaseLoader {

    constructor(options = {}) {
        super()

        this._finished = false

        this._offset = 0
        this._chunkSize = options.chunkSize || Infinity
        this._limitSize = options.limitSize || 1024 * 1024 * 4
        this._rate      = options.rate      || 25
        this._reader = null

        this._clock = new Clock(false)
        this._readedChunks = 0
     }

    // new Blob(['one, two, three'], {type : 'text/csv'})
    open(dataSource) {
        if (!(dataSource instanceof Blob)) {
            throw RuntimeError('unsupport data source')
        }

        this._resetState()
        this.dataSource = dataSource
        
        
        this._read()
    }

    _extractChunk() {
        return this._chunkSize < this._limitSize ? 
            this.dataSource.slice(this._offset, this._offset + this._chunkSize) : 
            this.dataSource.slice(this._offset, this._offset + this._limitSize)
    }

    _resetState() {
        this._finished = false

        this._offset = 0
        this._readedChunks = 0
        this._clock.reset()
    }

    _read() {

        !this._finished && requestAnimationFrame( this._read.bind(this) )

        let dfs = this._clock.getElapsedTime() / 1000 * this._rate - this._readedChunks

        while(dfs-- > 1) {
            
            Promise.resolve().then(
                this._read0.bind(this)
            )
        }
        
    }

    _read0() {
        if(this._finished) {
            return
        }

        let reader = this._reader = new FileReader()
        
        // reader.onloadstart = this._onOpen.bind(this)
        // reader.onloadend = this._onClose.bind(this)
        // reader.onerror = this._onError.bind(this)
        // reader.onabort = this._onAbort.bind(this)
        // reader.onprogress = this._onProgress.bind(this)

        reader.onload = this._onData.bind(this)

        reader.readAsArrayBuffer(this._extractChunk())
    }

    _onData({ target: reader }) {

        const bytes = reader.result.byteLength

        if(bytes === 0) {
            !this._finished && this._emitter.emit('finish', {
                'chunkCount': this._readedChunks,
                'timeCost': this._clock.getElapsedTime() / 1000,
                'size': this._offset
            })
            return this._finished = true
        } 
        (this._offset += bytes) && this._readedChunks++
        this._emitter.emit('data', new Uint8Array(reader.result))
    }
}

export default BlobLoader