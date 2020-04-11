/**
 * 响应的封装
 * safeJsonParse： 安全json的格式化封装
 * readerGBK：将对应的文件类型，转化成对应的GBK的格式
 * ResponseError： 请求的响应错误
 * getEnv： 获取对应的环境变量， NODE环境、浏览器BROWSER
 * RequestError： 请求体的错误封装
 */

import { safeJsonParse, readerGBK, ResponseError, getEnv, RequestError } from '../utils';

// parseResponse中间件的封装
export default function parseResponseMiddleware(ctx, next) {
  // 定义copy
  let copy;

  // 执行中间件
  return next()
    .then(() => {
      // ctx不存在，则阻止执行
      if (!ctx) return;

      // 从ctx获取对应的 res， req；
      const { res = {}, req = {} } = ctx;

      // 获取req对应的参数
      const {
        options: {
          responseType = 'json',
          charset = 'utf8',
          getResponse = false,
          throwErrIfParseFail = false,
          parseResponse = true,
        } = {},
      } = req || {};

      // 响应的格式化不存在，则返回
      if (!parseResponse) {
        return;
      }

      // 如果res不存在，或者res.clone不存在； 则返回
      if (!res || !res.clone) {
        return;
      }

      // 只在浏览器环境对 response 做克隆， node 环境如果对 response 克隆会有问题：https://github.com/bitinn/node-fetch/issues/553
      copy = getEnv() === 'BROWSER' ? res.clone() : res;

      // 是否使用缓存
      copy.useCache = res.useCache || false;

      // 解析数据
      if (charset === 'gbk') {
        // 对数据进行gbk格式化
        try {
          return res
            .blob()
            .then(readerGBK)
            .then(d => safeJsonParse(d, false, copy, req));
        } catch (e) {
          throw new ResponseError(copy, e.message, null, req, 'ParseError');
        }
        // 如果responseType === 'json'，则对获取的结果级格式化
      } else if (responseType === 'json') {
        return res.text().then(d => safeJsonParse(d, throwErrIfParseFail, copy, req));
      }
      try {
        // 其他如text, blob, arrayBuffer, formData
        return res[responseType]();
      } catch (e) {
        throw new ResponseError(copy, 'responseType not support', null, req, 'ParseError');
      }
    })
    .then(body => {
      // 请求结果重新组装后返回
      if (!ctx) return;
      const { res = {}, req = {} } = ctx;

      const { options: { getResponse = false } = {} } = req || {};

      if (!copy) {
        return;
      }
      if (copy.status >= 200 && copy.status < 300) {
        // 提供源response, 以便自定义处理
        if (getResponse) {
          ctx.res = { data: body, response: copy };
          return;
        }
        ctx.res = body;
        return;
      }
      throw new ResponseError(copy, 'http error', body, req, 'HttpError');
    })
    .catch(e => {
      // 如果请求体存在异常，则返回对应的请求体错误
      if (e instanceof RequestError || e instanceof ResponseError) {
        throw e;
      }
      // 对未知错误进行处理
      const { req, res } = ctx;
      e.request = e.request || req;
      e.response = e.response || res;
      e.type = e.type || e.name;
      e.data = e.data || undefined;
      throw e;
    });
}
