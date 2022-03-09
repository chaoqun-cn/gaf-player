/**
 * Copyright (C) 2022. All Rights Reserved.
 * 
 * @author chaoqun <1274590447@qq.com>
 * 
 */


/**
 * func(a, b, c) => fun(a)(b)(c)
 * 
 * @param {Function} func 
 * @returns {Function} curried func
 */
export function curry(func) {

    return function curried(...args) {
        if(args.length >= func.length) {
            this.__proto__ = func.prototype
            return func.apply(this, args)
        } else {
            return function(...rest) {
                return curried.apply(this, args.concat(rest))
            }
        }
    }
}