/**
 * Copyright (C) 2022. All Rights Reserved.
 * 
 * @author chaoqun <1274590447@qq.com>
 * 
 * ArrayBuffer -> BaseAudioContext.createBuffer() -> BaseAudioContext.createBufferSource()
 *          |                                           ^
 *          |                                           |
 *           ----> BaseAudioContext.decodeAudioData() ---
 */

import EventEmitter from 'events'
import mp3 from '../../static/xiaoban.mp3'

class PCMPlayer {

    static defaultOptions = {
        volume: 10,
        encoding: '16bitInt',
        channels: 1,
        sampleRate: 8000,
        flushInterval: 1000
    }

    constructor(options) {
        this._emitter = new EventEmitter()

        this._options = Object.assign({}, 
            PCMPlayer.defaultOptions, options)

        // hold small audio snippets, typically less than 45 s
        this._audioBuffer = null
        this._loader = null

        // a handle of source node
        this._audioTrack = null

        this._middleNodeCollector = {}
        
    }

    destroy() {
        this._emitter.removeAllListeners()
        this._emitter = null
    }

    on(event, listener) {
        this._emitter.addListener(event, listener)
    }

    off(event, listener) {
        this._emitter.removeListener(event, listener)
    }

    play() {
        // An AudioBufferSourceNode can only be played once
        this._audioTrack = PCMPlayer.getAudioContext().createBufferSource()

        this._setUpAudioProcessGraph(this._audioTrack).then(() => {
            this._audioTrack.start()
        })

    }

    pause() {
        this._audioTrack && this._audioTrack.stop()
    }

    get volume() {
        return this._volume
    }

    set volume(vol) {
        this._volume = vol
        this._gainNode.gain.value = vol
    }

    attachLoader(loader) {
        
    }

    detachLoader() {

    }

    /**
     * A callback for loader to populate AudioBuffer
     * 
     * @param {Float32Array} samples pcm data between -1.0 and 1.0
     */
    _populateAudioBuffer(samples) {
        const {channels, sampleRate} = this._options

        if(!this._audioBuffer) {            
            this._audioBuffer = PCMPlayer.getAudioContext
                .createBuffer(channels, samples.length / channels, sampleRate)
        }

        for (let ch = 0; ch < this._audioBuffer.numberOfChannels; ch++) {
            // multiple channels are stored in separate buffers
            const channelBuffer = this._audioBuffer.getChannelData(ch);
            let offset = ch
            for (let i = 0; i < channelBuffer.length; i++) {
                channelBuffer[i] = samples[offset]
                offset += channels
            }
        }

        // emit
        this._emitter.emit('canplay')
    }

    _setUpAudioProcessGraph(sourceNode) {
        const audioCtx = PCMPlayer.getAudioContext()
        
        const analyserNode = this._middleNodeCollector.analyser || (() =>{
            const analyserNode = audioCtx.createAnalyser()
            analyserNode.fftSize = 2048
            
            return this._middleNodeCollector.analyser = analyserNode
        })()

        const gainNode = this._middleNodeCollector.gain || (() =>{
            const gainNode = audioCtx.createGain()

            return this._middleNodeCollector.gain = gainNode
        })()

        const stereoPannerNode = this._middleNodeCollector.stereoPanner || (() =>{
            const stereoPannerNode = audioCtx.createStereoPanner()

            return this._middleNodeCollector.stereoPanner = stereoPannerNode
        })()

        const audioWorkletNode = this._middleNodeCollector.audioWorklet || (() =>{
            const audioWorkletNode = new AudioWorkletNode(audioCtx, 'audio-accessor')
            audioWorkletNode.beforeProcessHook = () => {
                
                console.log('before hook')
            }
            return this._middleNodeCollector.audioWorklet = audioWorkletNode
        })()

        // connect audio nodes
        sourceNode.connect(analyserNode).connect(gainNode).connect(stereoPannerNode)
            .connect(audioWorkletNode).connect(audioCtx.destination)
        
       return audioCtx.resume()
    }

    static async getAudioContext() {
        if(!PCMPlayer.ctx) {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext)()
            audioCtx.onstatechange = () => {
                console.log(`PCMPlayer$audioContext statechange: ${audioCtx.state}`)
            }
            await audioCtx.audioWorklet.addModule('audio-accessor.js')
            PCMPlayer.ctx = audioCtx
        }
        return PCMPlayer.ctx
    }

    static isTypeArray(data) {
        return (data.buffer && data.buffer.constructor === ArrayBuffer)
    }
}

PCMPlayer.encodingType = {
    '8bitInt': Int8Array,
    '16bitInt': Int16Array,
    '32bitInt': Int32Array,
    '32bitFloat': Float32Array
}

export default PCMPlayer

// window.addEventListener('scroll', () => {
//     document.querySelectorAll('.g-col').forEach((node) => {
//         const tag = node.querySelector('.categorypack_tagtext')
//         if (tag && tag.textContent == '短剧') {
//             node.remove()
//         }
//     })
// })

