// request请求封装
import request, { extend, fetch } from './request';

// 中间封装
import Onion from './onion';

// Request插件封装
import { RequestError, ResponseError } from './utils';

//  统一导出
export { extend, RequestError, ResponseError, Onion, fetch };

// 默认导出 request
export default request;
