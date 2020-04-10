/**
 * 实现一个简单的Map cache, 稍后可以挪到 utils中, 提供session local map三种前端cache方式.
 * 1. 可直接存储对象   2. 内存无5M限制   3.缺点是刷新就没了, 看反馈后期完善.
 */
import { parse, stringify } from 'qs';

/**
 * lamia
 * Map类型的缓存配置
 */
export class MapCache {
  constructor(options) {
    // lamia 声明对象cache
    this.cache = new Map();
    // lamia 声明对象timer
    this.timer = {};
    // lamia 初始化最大缓存配置
    this.extendOptions(options);
  }

  //  lamia this.maxCache定义maxCache
  extendOptions(options) {
    this.maxCache = options.maxCache || 0;
  }

  // lamia 获取值
  get(key) {
    return this.cache.get(JSON.stringify(key));
  }

  //  lamia 设置值
  set(key, value, ttl = 60000) {
    // 如果超过最大缓存数, 删除头部的第一个缓存.
    if (this.maxCache > 0 && this.cache.size >= this.maxCache) {
      // lamia this.cache.keys(): 获取所有的cache的keys， 获取第一个值
      const deleteKey = [...this.cache.keys()][0];
      // lamia 删除对象第一个this.cache的值
      this.cache.delete(deleteKey);

      // lamia 如果deleteKey，第一个对应的值所对应的timer已经存在，则清除对应的定时器
      if (this.timer[deleteKey]) {
        clearTimeout(this.timer[deleteKey]);
      }
    }

    //  lamia 获取cacheKey
    const cacheKey = JSON.stringify(key);

    // lamia 设置cacheKey对应的值： value
    this.cache.set(cacheKey, value);

    // lamia 如果需要设置过期时间，建立对应的定时器，当ttl时间到时，清除对应的cache， 并且清除定时器
    if (ttl > 0) {
      this.timer[cacheKey] = setTimeout(() => {
        this.cache.delete(cacheKey);
        delete this.timer[cacheKey];
      }, ttl);
    }
  }

  // lamia 删除key对应的cache， 及对应的timer
  delete(key) {
    const cacheKey = JSON.stringify(key);
    delete this.timer[cacheKey];
    return this.cache.delete(cacheKey);
  }

  //  lamia 清除定时器，清除cache;
  clear() {
    this.timer = {};
    return this.cache.clear();
  }
}

/**
 * 请求异常
 */
export class RequestError extends Error {
  constructor(text, request, type = 'RequestError') {
    super(text);
    this.name = 'RequestError';
    this.request = request;
    this.type = type;
  }
}

/**
 * 响应异常
 */
export class ResponseError extends Error {
  constructor(response, text, data, request, type = 'ResponseError') {
    super(text || response.statusText);
    this.name = 'ResponseError';
    this.data = data;
    this.response = response;
    this.request = request;
    this.type = type;
  }
}

/**
 * http://gitlab.alipay-inc.com/KBSJ/gxt/blob/release_gxt_S8928905_20180531/src/util/request.js#L63
 * 支持gbk
 */
export function readerGBK(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsText(file, 'GBK'); // setup GBK decoding
  });
}

/**
 * 安全的JSON.parse
 */
export function safeJsonParse(data, throwErrIfParseFail = false, response = null, request = null) {
  try {
    return JSON.parse(data);
  } catch (e) {
    if (throwErrIfParseFail) {
      throw new ResponseError(response, 'JSON.parse fail', data, request, 'ParseError');
    }
  } // eslint-disable-line no-empty
  return data;
}

export function timeout2Throw(msec, request) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new RequestError(`timeout of ${msec}ms exceeded`, request, 'Timeout'));
    }, msec);
  });
}

// If request options contain 'cancelToken', reject request when token has been canceled
export function cancel2Throw(opt) {
  return new Promise((_, reject) => {
    if (opt.cancelToken) {
      opt.cancelToken.promise.then(cancel => {
        reject(cancel);
      });
    }
  });
}

const toString = Object.prototype.toString;

// Check env is browser or node
export function getEnv() {
  let env;
  // Only Node.JS has a process variable that is of [[Class]] process
  if (typeof process !== 'undefined' && toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    env = 'NODE';
  }
  if (typeof XMLHttpRequest !== 'undefined') {
    env = 'BROWSER';
  }
  return env;
}

export function isArray(val) {
  return typeof val === 'object' && Object.prototype.toString.call(val) === '[object Array]';
}

export function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

export function isDate(val) {
  return typeof val === 'object' && Object.prototype.toString.call(val) === '[object Date]';
}

export function isObject(val) {
  return val !== null && typeof val === 'object';
}

export function forEach2ObjArr(target, callback) {
  if (!target) return;

  if (typeof target !== 'object') {
    target = [target];
  }

  if (isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      callback.call(null, target[i], i, target);
    }
  } else {
    for (let key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        callback.call(null, target[key], key, target);
      }
    }
  }
}

export function getParamObject(val) {
  if (isURLSearchParams(val)) {
    return parse(val.toString(), { strictNullHandling: true });
  }
  if (typeof val === 'string') {
    return [val];
  }
  return val;
}

export function reqStringify(val) {
  return stringify(val, { arrayFormat: 'repeat', strictNullHandling: true });
}

/**
 * lamia
 * 合并请求配置
 * @param {*} options
 * @param {*} options2Merge
 */
export function mergeRequestOptions(options, options2Merge) {
  return {
    ...options,
    ...options2Merge,
    headers: {
      ...options.headers,
      ...options2Merge.headers,
    },
    params: {
      ...getParamObject(options.params),
      ...getParamObject(options2Merge.params),
    },
    method: (options2Merge.method || options.method || 'get').toLowerCase(),
  };
}
