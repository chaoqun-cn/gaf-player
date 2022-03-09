export function defineAspect(obj, key, val, getterAdvisor, setterAdvisor) {

    const property = Object.getOwnPropertyDescriptor(obj, key)
    if (property && !property.configurable) {
        return
    }

    const {get: getter, set: setter} = property || {}

    val = val || obj[key]

    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get() {
            const value = getter ? getter.call(obj) : val
            return getterAdvisor ? getterAdvisor(value) : value
        },
        set(newVal) {
            const preVal = getter ? getter.call(obj) : val
            if (preVal === newVal) {
                return
            }
            newVal = setterAdvisor ? setterAdvisor(newVal, preVal) : newVal
            if (setter) {
                setter.call(obj, newVal)
            } else {
                val = newVal
            }
        }
    })
}