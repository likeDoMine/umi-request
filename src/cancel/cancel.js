'use strict';

/**
 * 当执行 “取消请求” 操作时会抛出 Cancel 对象作为异常
 * @class
 * @param {string=} message The message.
 */

 // 初始化Cancel Function对象
function Cancel(message) {
  this.message = message;
}

// 在Cancel.prototype定一个对象toString, 用来返回一个字符串
Cancel.prototype.toString = function toString() {
  return this.message ? `Cancel: ${this.message}` : 'Cancel';
};

// 定一个当前cancel的状态 _CANCEL_ =  true;
Cancel.prototype.__CANCEL__ = true;

export default Cancel;
