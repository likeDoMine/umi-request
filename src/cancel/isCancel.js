'use strict';

// 判断cancel的状态
export default function isCancel(value) {
  return !!(value && value.__CANCEL__);
}
