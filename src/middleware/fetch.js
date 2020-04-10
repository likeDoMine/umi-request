import 'isomorphic-fetch';
import { timeout2Throw, cancel2Throw, getEnv } from '../utils';

// 是否已经警告过
let warnedCoreType = false;

// 默认缓存判断，开放缓存判断给非 get 请求使用
function __defaultValidateCache(url, options) {
  const { method = 'get' } = options;
  return method.toLowerCase() === 'get';
}

/**
 * lamia
 * fetchMiddleware: 请求的中间件
 * @param {*} ctx: 请求中间层封装
 * req: {
 *  url: 地址
 *  options: {
 *    method： 请求方式，
 *    params： url请求参数，
 *    data： 提交的数据
 *    headers： fetch 原有参数，
 *    timeout： 超时时长, 默认毫秒, 写操作慎用，
 *    prefix： 前缀, 一般用于覆盖统一设置的prefix，
 *    suffix： 后缀, 比如某些场景 api 需要统一加 .json，
 *    credentials： fetch 请求包含 cookies 信息，
 *    useCache： 是否使用缓存（仅支持浏览器客户端），
 *    validateCache： 缓存策略函数
 *    ttl：缓存时长, 0 为不过期
 *    maxCache： 最大缓存数
 *    requestType：post请求时数据类型，
 *    parseResponse：是否对 response 做处理简化，
 *    charset：字符集，
 *    responseType： 如何解析返回的数据
 *    throwErrIfParseFail：当 responseType 为 'json', 对请求结果做 JSON.parse 出错时是否抛出异常，
 *    getResponse： 是否获取源response, 返回结果将包裹一层，
 *    errorHandler： 异常处理, 或者覆盖统一的异常处理，
 *    cancelToken：取消请求的 Token
 *  }
 * }
 * cache: 缓存配置
 * responseInterceptors 响应拦截器， 处理响应返回值
 *
 *
 * @param {*} next: 执行下一步
 */
export default function fetchMiddleware(ctx, next) {
  // 如果ctx不存在，则执行下一步
  if (!ctx) return next();

  // 获取对应的ctx
  const { req: { options = {}, url = '' } = {}, cache, responseInterceptors } = ctx;

  const {
    // 超时时长, 默认毫秒, 写操作慎用
    timeout = 0,

    // __umiRequestCoreType__： 内核请求类型
    __umiRequestCoreType__ = 'normal',

    // 是否使用缓存（仅支持浏览器客户端）
    useCache = false,

    // 请求方式
    method = 'get',

    // url请求参数
    params,

    // 缓存时长, 0 为不过期
    ttl,

    // 缓存策略函数
    validateCache = __defaultValidateCache,
  } = options;

  //  核心请求类型如果并非正常类型
  if (__umiRequestCoreType__ !== 'normal') {
    //  如果是开发环境，则给出友好提示
    if (process && process.env && process.env.NODE_ENV === 'development' && warnedCoreType === false) {
      warnedCoreType = true;
      console.warn(
        '__umiRequestCoreType__ is a internal property that use in umi-request, change its value would affect the behavior of request! It only use when you want to extend or use request core.'
      );
    }
    // 开启下一步请求
    return next();
  }

  // 定义请求适配器
  const adapter = fetch;

  // 如果请求适配器不存在，则直接异常报错
  if (!adapter) {
    throw new Error('Global fetch not exist!');
  }

  // 从缓存池检查是否有缓存数据
  const isBrowser = getEnv() === 'BROWSER';
  const needCache = validateCache(url, options) && useCache && isBrowser;
  if (needCache) {
    let responseCache = cache.get({
      url,
      params,
      method,
    });
    if (responseCache) {
      responseCache = responseCache.clone();
      responseCache.useCache = true;
      ctx.res = responseCache;
      return next();
    }
  }

  let response;
  // 超时处理、取消请求处理
  if (timeout > 0) {
    response = Promise.race([cancel2Throw(options, ctx), adapter(url, options), timeout2Throw(timeout, ctx.req)]);
  } else {
    response = Promise.race([cancel2Throw(options, ctx), adapter(url, options)]);
  }

  // 兼容老版本 response.interceptor
  responseInterceptors.forEach(handler => {
    response = response.then(res => {
      // Fix multiple clones not working, issue: https://github.com/github/fetch/issues/504
      let clonedRes = typeof res.clone === 'function' ? res.clone() : res;
      return handler(clonedRes, options);
    });
  });

  return response.then(res => {
    // 是否存入缓存池
    if (needCache) {
      if (res.status === 200) {
        const copy = res.clone();
        copy.useCache = true;
        cache.set({ url, params, method }, copy, ttl);
      }
    }

    ctx.res = res;
    return next();
  });
}
