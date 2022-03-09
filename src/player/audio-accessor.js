/**
 * Copyright (C) 2022. All Rights Reserved.
 * 
 * @author chaoqun <1274590447@qq.com>
 */

class AudioAccessor extends AudioWorkletProcessor {

    constructor() {
        super()
    }

    static get parameterDescriptors() {
        return []
    }


    process(inputs, outputs, parameters) {
        this.callBeforeProcessHook()

        outputs.forEach((output, index) => {
            const input = inputs.find(input => input.length == output.length)
            output.forEach((channel, index) => {
                channel = input[index]
            })
        })
        
        this.callAfterProcessHook()
    }

    callBeforeProcessHook() {
        this.beforeProcessHook && this.beforeProcessHook()
    }

    callAfterProcessHook() {
        this.afterProcessHook && this.afterProcessHook()
    }
}

AudioWorkletGlobalScope.registerProcessor('audio-accessor', AudioAccessor)
