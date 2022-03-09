class Clock {

    constructor(autoStart = true) {
 
        this._startTime = autoStart ? Date.now() : 0
        this._lastTime = this._startTime

        this.autoStart = autoStart
    }

    reset() {
        this._startTime = this._lastTime = this.autoStart ? Date.now() : 0
    }

    _statusGuard() {
        this._startTime || (this._startTime = Date.now())
    }

    getElapsedTime() {
        this._statusGuard()

        return (this._lastTime = Date.now()) && this._lastTime - this._startTime
    }

    getDelta() {
        this._statusGuard()

        const delta = Date.now() - this._lastTime
        this._lastTime += delta

        return delta
    }

}

export default Clock