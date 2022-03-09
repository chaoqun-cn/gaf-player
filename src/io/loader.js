/**
 * Copyright (C) 2022. All Rights Reserved.
 * 
 * @author chaoqun <1274590447@qq.com>
 * 
 */
import EventEmitter from 'events'
import { UnmplementedError } from "../core/errors"

export class BaseLoader {

    constructor() {
        this._type = this.constructor.name
        this._emitter = new EventEmitter()
    }

    on(event, listener) {
        this._emitter.addListener(event, listener)
    }

    off(event, listener) {
        this._emitter.removeListener(event, listener)
    }

    open(dataSource) {
        throw new UnmplementedError('unimplemented pure virtual function')
    }

    abort() {
        throw new UnmplementedError('unimplemented pure virtual function')
    }

    _onData(e) {
        this._emitter.emit('data', e)
    }

    _onOpen(e) {
        this._emitter.emit('open', e)
    }

    _onProgress(e) {
        this._emitter.emit('progress', e)
    }

    _onClose(e) {
        this._emitter.emit('close', e)
    }

    _onAbort(e) {
        this._emitter.emit('abort', e) 
    }

    _onError(e) {
        this._emitter.emit('error', e)
    }
}
